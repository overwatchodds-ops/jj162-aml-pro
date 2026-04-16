import { S }                                    from '../../state/index.js';
import { getRequirements, getComplianceStatus, ROLE_LABELS } from '../../state/rules_matrix.js';
import { fmtDate }                              from '../../firebase/firestore.js';

// ─── STAFF ROLES ──────────────────────────────────────────────────────────────
// Roles that count as "staff" for the Staff Vetting view
const STAFF_ROLES = ['AMLCO', 'Reporting Officer', 'Senior Manager', 'Principal',
                     'Principal / Managing Partner', 'Delegate', 'owner', 'staff'];

// ─── COMPLIANCE STATUS PER INDIVIDUAL ─────────────────────────────────────────
function individualStatus(ind) {
  const links = S.links.filter(l => l.individualId === ind.individualId && l.status === 'active');
  if (!links.length) return { status: 'no_links', missing: [], satisfied: [] };

  const required = getRequirements(links, S.entities);

  const verifications = (S.verifications || []).filter(v => v.individualId === ind.individualId);
  const screenings    = (S.screenings    || []).filter(s => s.individualId === ind.individualId);
  const training      = (S.training      || []).filter(t => t.individualId === ind.individualId);
  const vetting       = (S.vetting       || []).filter(v => v.individualId === ind.individualId);

  const latestVer = verifications.sort((a,b) => b.createdAt?.localeCompare(a.createdAt))[0];
  const latestScr = screenings.sort((a,b)    => b.date?.localeCompare(a.date))[0];
  const latestTrn = training.sort((a,b)      => b.completedDate?.localeCompare(a.completedDate))[0];
  const latestVet = vetting.sort((a,b)       => b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];

  return getComplianceStatus(required, {
    verification: latestVer || null,
    screening:    { result: latestScr?.result, date: latestScr?.date },
    training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
    vetting:      latestVet || null,
  });
}

// ─── VETTING STATUS FOR STAFF VIEW ────────────────────────────────────────────
// Simpler check — has the person been through police check + training?
function staffVettingStatus(ind) {
  const vetting  = (S.vetting  || []).filter(v => v.individualId === ind.individualId);
  const training = (S.training || []).filter(t => t.individualId === ind.individualId);
  const screening = (S.screenings || []).filter(s => s.individualId === ind.individualId);

  const hasVetting   = vetting.length  > 0 && vetting.some(v => v.policeCheckDate);
  const hasTraining  = training.length > 0 && training.some(t => t.completedDate);
  const hasScreening = screening.length > 0 && screening.some(s => s.result);

  if (hasVetting && hasTraining && hasScreening) return 'complete';
  if (!hasVetting && !hasTraining && !hasScreening) return 'not_started';
  return 'incomplete';
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  switch (status) {
    case 'compliant':
    case 'complete':      return `<span class="badge badge-success">Complete</span>`;
    case 'action_required':
    case 'incomplete':    return `<span class="badge badge-danger">Incomplete</span>`;
    case 'not_started':   return `<span class="badge badge-warning">Not started</span>`;
    case 'no_links':      return `<span class="badge badge-neutral">No connections</span>`;
    default:              return `<span class="badge badge-warning">Outstanding</span>`;
  }
}

// ─── CONNECTION SUMMARY ───────────────────────────────────────────────────────
function connectionSummary(individualId) {
  const links = S.links.filter(l => l.individualId === individualId && l.status === 'active');
  if (!links.length) return '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs);">No connections yet</span>';

  return links.slice(0, 2).map(l => {
    const label = ROLE_LABELS[l.roleType] || l.roleType;
    if (l.linkedObjectType === 'firm') {
      return `<span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${label} — ${S.firm?.firmName || 'Firm'}</span>`;
    }
    const entity = S.entities.find(e => e.entityId === l.linkedObjectId);
    return `<span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${label} — ${entity?.entityName || 'Entity'}</span>`;
  }).join('<br>') + (links.length > 2 ? `<br><span style="font-size:10px;color:var(--color-text-muted);">+${links.length - 2} more</span>` : '');
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  // Detect context — staff view or general individuals view
  const isStaffView = S.currentScreen === 'staff';
  const filter      = S.currentParams?.filter || 'all';
  const search      = S.currentParams?.search || '';

  let individuals = [...(S.individuals || [])];

  // In staff view — only show individuals belonging to this firm
  if (isStaffView) {
    individuals = individuals.filter(i => i.firmId === S.firmId);
  }

  // Search
  if (search) {
    const q = search.toLowerCase();
    individuals = individuals.filter(i =>
      i.fullName?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q)
    );
  }

  // Compute status
  const withStatus = individuals.map(i => ({
    ...i,
    _status: isStaffView ? { status: staffVettingStatus(i) } : individualStatus(i),
  }));

  // Filter by status
  const filtered = filter === 'all' ? withStatus : withStatus.filter(i => {
    if (filter === 'complete'  || filter === 'compliant') return i._status.status === 'complete'   || i._status.status === 'compliant';
    if (filter === 'incomplete'|| filter === 'action')    return i._status.status === 'incomplete' || i._status.status === 'action_required';
    if (filter === 'not_started')                         return i._status.status === 'not_started';
    if (filter === 'no_links')                            return i._status.status === 'no_links';
    return true;
  });

  // Counts
  const counts = {
    all:         withStatus.length,
    complete:    withStatus.filter(i => i._status.status === 'complete' || i._status.status === 'compliant').length,
    incomplete:  withStatus.filter(i => i._status.status === 'incomplete' || i._status.status === 'action_required').length,
    not_started: withStatus.filter(i => i._status.status === 'not_started').length,
  };

  // Context-specific labels
  const title    = isStaffView ? 'Staff Vetting' : 'Individuals';
  const subtitle = isStaffView
    ? 'Vetting records for all firm staff with AML/CTF responsibilities.'
    : 'Every person connected to your firm — staff, owners, and client representatives.';
  const newBtn   = isStaffView ? '+ Add staff member' : '+ New individual';
  const newRoute = isStaffView ? 'staff-new' : 'individual-new';
  const emptyMsg = isStaffView
    ? 'No staff members yet. Add staff to begin vetting.'
    : 'No individuals yet. Click "New individual" to add the first person.';

  const filterTabs = isStaffView
    ? [
        { key: 'all',         label: `All (${counts.all})` },
        { key: 'complete',    label: `Complete (${counts.complete})` },
        { key: 'incomplete',  label: `Incomplete (${counts.incomplete})` },
        { key: 'not_started', label: `Not started (${counts.not_started})` },
      ]
    : [
        { key: 'all',      label: `All (${counts.all})` },
        { key: 'compliant',label: `Compliant (${counts.complete})` },
        { key: 'action',   label: `Action (${counts.incomplete})` },
        { key: 'no_links', label: `No links (${withStatus.filter(i => i._status.status === 'no_links').length})` },
      ];

  const detailRoute = isStaffView ? 'staff-detail' : 'individual-detail';
  const editRoute   = isStaffView ? 'staff-edit'   : 'individual-edit';

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">${title}</h1>
          <p class="screen-subtitle">${subtitle}</p>
        </div>
        <button onclick="go('${newRoute}')" class="btn btn-sm">${newBtn}</button>
      </div>

      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            class="search-inp"
            placeholder="Search ${isStaffView ? 'staff' : 'individuals'}..."
            value="${search}"
            oninput="individualsSearch(this.value)"
          >
        </div>
        <div class="filter-tabs">
          ${filterTabs.map(f => `
            <button
              onclick="individualsFilter('${f.key}')"
              class="filter-tab ${filter === f.key ? 'active' : ''}"
            >${f.label}</button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-title">${search ? 'No results match your search.' : emptyMsg}</div>
          ${!search && isStaffView ? `<button onclick="go('staff-new')" class="btn" style="margin-top:var(--space-4);">+ Add staff member</button>` : ''}
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>${isStaffView ? 'Role' : 'Connections'}</th>
                <th>Vetting status</th>
                <th>Last updated</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(i => `
                <tr onclick="go('${detailRoute}', { individualId: '${i.individualId}' })">
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-3);">
                      <div class="avatar">${initials(i.fullName)}</div>
                      <div>
                        <div style="font-weight:var(--font-weight-medium);">${i.fullName || '—'}</div>
                        <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${i.email || i.role || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>${connectionSummary(i.individualId)}</td>
                  <td>${statusBadge(i._status.status)}</td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${fmtDate(i.updatedAt)}</td>
                  <td style="text-align:right;">
                    <button
                      onclick="event.stopPropagation();go('${editRoute}',{individualId:'${i.individualId}'})"
                      class="btn-ghost"
                      style="color:var(--color-text-muted);"
                    >Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
}

window.individualsSearch = function(val) {
  S.currentParams = { ...S.currentParams, search: val };
  render();
};

window.individualsFilter = function(filter) {
  S.currentParams = { ...S.currentParams, filter };
  render();
};
