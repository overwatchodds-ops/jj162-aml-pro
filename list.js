import { S }                                    from '../../state/index.js';
import { getRequirements, getComplianceStatus, ROLE_LABELS } from '../../state/rules_matrix.js';
import { fmtDate }                              from '../../firebase/firestore.js';

// ─── COMPLIANCE STATUS PER INDIVIDUAL ─────────────────────────────────────────
// Derives status from links + evidence in memory.
// Returns { status, missing, satisfied }

function individualStatus(ind) {
  const links    = S.links.filter(l => l.individualId === ind.individualId && l.status === 'active');
  if (!links.length) return { status: 'no_links', missing: [], satisfied: [] };

  const required = getRequirements(links, S.entities);

  // Build evidence object from latest records
  const verifications = (S.verifications || []).filter(v => v.individualId === ind.individualId);
  const screenings    = (S.screenings    || []).filter(s => s.individualId === ind.individualId);
  const training      = (S.training      || []).filter(t => t.individualId === ind.individualId);
  const vetting       = (S.vetting       || []).filter(v => v.individualId === ind.individualId);

  const latestVer  = verifications.sort((a,b) => b.createdAt?.localeCompare(a.createdAt))[0];
  const latestScr  = screenings.sort((a,b)    => b.date?.localeCompare(a.date))[0];
  const latestTrn  = training.sort((a,b)      => b.completedDate?.localeCompare(a.completedDate))[0];
  const latestVet  = vetting.sort((a,b)       => b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];

  const evidence = {
    verification: latestVer  || null,
    screening:    { result: latestScr?.result, date: latestScr?.date } || null,
    training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate } || null,
    vetting:      latestVet  || null,
  };

  return getComplianceStatus(required, evidence);
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  switch (status) {
    case 'compliant':      return `<span class="badge badge-success">Compliant</span>`;
    case 'action_required':return `<span class="badge badge-danger">Action required</span>`;
    case 'no_links':       return `<span class="badge badge-neutral">No connections</span>`;
    default:               return `<span class="badge badge-warning">Outstanding</span>`;
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
  const filter = S.currentParams?.filter || 'all';
  const search = S.currentParams?.search || '';

  let individuals = [...(S.individuals || [])];

  // Search
  if (search) {
    const q = search.toLowerCase();
    individuals = individuals.filter(i =>
      i.fullName?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q)
    );
  }

  // Compute status for each
  const withStatus = individuals.map(i => ({
    ...i,
    _status: individualStatus(i),
  }));

  // Filter by status
  const filtered = filter === 'all' ? withStatus : withStatus.filter(i => {
    if (filter === 'compliant')  return i._status.status === 'compliant';
    if (filter === 'action')     return i._status.status === 'action_required';
    if (filter === 'no_links')   return i._status.status === 'no_links';
    return true;
  });

  // Counts for filter tabs
  const counts = {
    all:       withStatus.length,
    compliant: withStatus.filter(i => i._status.status === 'compliant').length,
    action:    withStatus.filter(i => i._status.status === 'action_required').length,
    no_links:  withStatus.filter(i => i._status.status === 'no_links').length,
  };

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Individuals</h1>
          <p class="screen-subtitle">Every person connected to your firm — staff, owners, and client representatives.</p>
        </div>
        <button onclick="go('individual-new')" class="btn btn-sm">+ New individual</button>
      </div>

      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            class="search-inp"
            placeholder="Search individuals..."
            value="${search}"
            oninput="individualsSearch(this.value)"
          >
        </div>
        <div class="filter-tabs">
          ${[
            { key: 'all',      label: `All (${counts.all})` },
            { key: 'compliant',label: `Compliant (${counts.compliant})` },
            { key: 'action',   label: `Action (${counts.action})` },
            { key: 'no_links', label: `No links (${counts.no_links})` },
          ].map(f => `
            <button
              onclick="individualsFilter('${f.key}')"
              class="filter-tab ${filter === f.key ? 'active' : ''}"
            >${f.label}</button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-title">${search ? 'No individuals match your search.' : 'No individuals yet.'}</div>
          <div class="empty-state-sub">${search ? 'Try a different search term.' : 'Click "New individual" to add the first person to your register.'}</div>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Connections</th>
                <th>Status</th>
                <th>Last updated</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(i => `
                <tr onclick="go('individual-detail', { individualId: '${i.individualId}' })">
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-3);">
                      <div class="avatar">${initials(i.fullName)}</div>
                      <div>
                        <div style="font-weight:var(--font-weight-medium);">${i.fullName || '—'}</div>
                        <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${i.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>${connectionSummary(i.individualId)}</td>
                  <td>${statusBadge(i._status.status)}</td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${fmtDate(i.updatedAt)}</td>
                  <td style="text-align:right;">
                    <button
                      onclick="event.stopPropagation();go('individual-edit',{individualId:'${i.individualId}'})"
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
