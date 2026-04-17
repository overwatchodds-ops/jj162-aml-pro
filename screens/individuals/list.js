import { S } from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

// ─── VETTING STATUS FOR STAFF VIEW ────────────────────────────────────────────
// Driven by the classification derived from functional tasks
function staffVettingStatus(ind) {
  // Classification Engine (Matches new.js logic)
  const keyFns = ['director', 'amlco', 'senior'];
  const stdFns = ['cdd', 'screen', 'monitor', 'smr'];
  
  const fns = ind.functions || [];
  const hasKey = fns.some(f => keyFns.includes(f));
  const hasStd = fns.some(f => stdFns.includes(f));
  const isNone = ind.noneSelected === true || (!hasKey && !hasStd);

  // 1. Assessed (No AML Functions)
  if (isNone) return 'complete'; 

  // 2. Key Personnel Requirements
  // Requires: Police, Bankruptcy, NameScan, and Signed Declaration
  if (hasKey) {
    const isComplete = ind.policeResult && ind.bankruptResult && ind.nsResult && ind.declSigned;
    return isComplete ? 'complete' : 'incomplete';
  }

  // 3. Standard Staff Requirements
  // Requires: NameScan and Signed Declaration
  if (hasStd) {
    const isComplete = ind.nsResult && ind.declSigned;
    return isComplete ? 'complete' : 'incomplete';
  }

  return 'not_started';
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  switch (status) {
    case 'complete':      return `<span class="badge badge-success">Complete</span>`;
    case 'incomplete':    return `<span class="badge badge-danger">Incomplete</span>`;
    case 'not_started':   return `<span class="badge badge-warning">Not started</span>`;
    default:              return `<span class="badge badge-warning">Outstanding</span>`;
  }
}

// ─── ROLE SUMMARY ─────────────────────────────────────────────────────────────
function roleSummary(ind) {
  if (ind.role) {
    return `<span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${ind.role}</span>`;
  }
  return '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs);">No role assigned</span>';
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const isStaffView = S.currentScreen === 'staff';
  const filter      = S.currentParams?.filter || 'all';
  const search      = S.currentParams?.search || '';

  // 1. Context Filtering: Staff View only shows isStaff:true records
  let individuals = [...(S.individuals || [])];
  if (isStaffView) {
    individuals = individuals.filter(i => i.isStaff === true);
  }

  // 2. Search Logic
  if (search) {
    const q = search.toLowerCase();
    individuals = individuals.filter(i =>
      (i.fullName || i.name || '').toLowerCase().includes(q) ||
      (i.email || '').toLowerCase().includes(q)
    );
  }

  // 3. Compute Status based on the individual record properties
  const withStatus = individuals.map(i => ({
    ...i,
    _status: staffVettingStatus(i)
  }));

  // 4. Filter by Computed Status
  const filtered = filter === 'all' ? withStatus : withStatus.filter(i => i._status === filter);

  // 5. Counts for Tabs
  const counts = {
    all:         withStatus.length,
    complete:    withStatus.filter(i => i._status === 'complete').length,
    incomplete:  withStatus.filter(i => i._status === 'incomplete').length,
    not_started: withStatus.filter(i => i._status === 'not_started').length,
  };

  // 6. UI Config
  const title    = isStaffView ? 'Staff Vetting' : 'Individuals';
  const subtitle = isStaffView
    ? 'Vetting records for all firm staff with AML/CTF responsibilities.'
    : 'Every person connected to your firm — staff and clients.';
  const newBtn   = isStaffView ? '+ Add staff member' : '+ New individual';
  const newRoute = isStaffView ? 'staff-new' : 'individual-new';
  const emptyMsg = isStaffView
    ? 'No staff members found.'
    : 'No individuals found.';

  const filterTabs = [
    { key: 'all',         label: `All (${counts.all})` },
    { key: 'complete',    label: `Complete (${counts.complete})` },
    { key: 'incomplete',  label: `Incomplete (${counts.incomplete})` },
    { key: 'not_started', label: `Not started (${counts.not_started})` },
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
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
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
                      <div class="avatar">${initials(i.fullName || i.name)}</div>
                      <div>
                        <div style="font-weight:var(--font-weight-medium);">${i.fullName || i.name || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>${roleSummary(i)}</td>
                  <td>${statusBadge(i._status)}</td>
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
  S.currentParams = { ...S.currentParams, filter: filter };
  render();
};
