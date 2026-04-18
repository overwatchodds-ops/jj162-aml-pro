import { S }                                    from '../../state/index.js';
import { getRequirements, getComplianceStatus } from '../../state/rules_matrix.js';
import { fmtDate }                              from '../../firebase/firestore.js';

// ─── STAFF FUNCTION MODEL ─────────────────────────────────────────────────────
const KEY_CODES = [
  'director_owner_beneficial_owner',
  'amlco_delegate',
  'senior_manager_aml_authority',
  'reporting_officer',
];

const STANDARD_CODES = [
  'processes_client_cdd_kyc_checks',
  'screens_clients_namescan',
  'supports_transaction_monitoring',
  'assists_smr_compliance_reporting',
];

function deriveFunctionsFromRole(role = '') {
  const r = String(role || '').toLowerCase();
  const out = [];

  if (
    r.includes('principal') ||
    r.includes('managing partner') ||
    r.includes('partner') ||
    r.includes('director') ||
    r.includes('owner')
  ) {
    out.push('director_owner_beneficial_owner');
  }

  if (r.includes('amlco')) {
    out.push('amlco_delegate');
  }

  if (r.includes('senior manager')) {
    out.push('senior_manager_aml_authority');
  }

  if (r.includes('reporting officer')) {
    out.push('reporting_officer');
  }

  return [...new Set(out)];
}

function normaliseFunctions(arr = []) {
  let selected = Array.isArray(arr) ? [...arr] : [];
  selected = selected.filter(Boolean);

  if (selected.includes('none_of_the_above') && selected.length > 1) {
    selected = selected.filter(code => code !== 'none_of_the_above');
  }

  return [...new Set(selected)];
}

function classificationFromFunctions(functions = []) {
  if (!functions.length || functions.includes('none_of_the_above')) return 'none';
  if (functions.some(code => KEY_CODES.includes(code))) return 'key';
  if (functions.some(code => STANDARD_CODES.includes(code))) return 'standard';
  return 'none';
}

function classificationLabel(classification) {
  if (classification === 'key') return 'Key Personnel';
  if (classification === 'standard') return 'Standard Staff';
  return 'No AML functions';
}

function screeningRequired(classification) {
  return classification === 'key' || classification === 'standard';
}

function trainingRequired(classification) {
  return classification === 'key' || classification === 'standard';
}

function vettingRequired(classification) {
  return classification === 'key';
}

function latestBy(items = [], field) {
  return [...items].sort((a, b) => (b?.[field] || '').localeCompare(a?.[field] || ''))[0];
}

// ─── COMPLIANCE STATUS PER INDIVIDUAL (NON-STAFF / LEGACY) ───────────────────
function individualStatus(ind) {
  const links = (S.links || []).filter(l => l.individualId === ind.individualId && l.status === 'active');
  if (!links.length) return { status: 'no_links', missing: [], satisfied: [] };

  const required = getRequirements(links, S.entities || []);

  const verifications = (S.verifications || []).filter(v => v.individualId === ind.individualId);
  const screenings    = (S.screenings    || []).filter(s => s.individualId === ind.individualId);
  const training      = (S.training      || []).filter(t => t.individualId === ind.individualId);
  const vetting       = (S.vetting       || []).filter(v => v.individualId === ind.individualId);

  const latestVer = [...verifications].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  const latestScr = [...screenings].sort((a,b)    => (b.date || '').localeCompare(a.date || ''))[0];
  const latestTrn = [...training].sort((a,b)      => (b.completedDate || '').localeCompare(a.completedDate || ''))[0];
  const latestVet = [...vetting].sort((a,b)       => (b.policeCheckDate || '').localeCompare(a.policeCheckDate || ''))[0];

  return getComplianceStatus(required, {
    verification: latestVer || null,
    screening:    { result: latestScr?.result, date: latestScr?.date },
    training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
    vetting:      latestVet || null,
  });
}

// ─── STAFF STATUS (CLASSIFICATION-BASED) ──────────────────────────────────────
function staffVettingStatus(ind) {
  let functions = ind.staffFunctions || ind.amlFunctions || ind.functions || [];
  if (!Array.isArray(functions) || !functions.length) {
    functions = deriveFunctionsFromRole(ind.role);
  }
  functions = normaliseFunctions(functions);

  const classification = ind.staffClassification || classificationFromFunctions(functions);

  const screenings = (S.screenings || []).filter(s => s.individualId === ind.individualId);
  const training   = (S.training   || []).filter(t => t.individualId === ind.individualId);
  const vetting    = (S.vetting    || []).filter(v => v.individualId === ind.individualId);

  const latestScr = latestBy(screenings, 'date');
  const latestTrn = latestBy(training, 'completedDate');
  const latestVet = latestBy(vetting, 'policeCheckDate');

  const required = [];
  const satisfied = [];

  if (screeningRequired(classification)) {
    required.push('screening');
    if (latestScr?.result) satisfied.push('screening');
  }

  if (trainingRequired(classification)) {
    required.push('training');
    if (latestTrn?.completedDate && latestTrn?.provider) satisfied.push('training');
  }

  if (vettingRequired(classification)) {
    required.push('police');
    required.push('bankruptcy');
    if (latestVet?.policeCheckDate) satisfied.push('police');
    if (latestVet?.bankruptcyCheckDate) satisfied.push('bankruptcy');
  }

  let status = 'not_required';
  if (!required.length) {
    status = 'not_required';
  } else if (!satisfied.length) {
    status = 'not_started';
  } else if (satisfied.length === required.length) {
    status = 'complete';
  } else {
    status = 'incomplete';
  }

  return {
    status,
    classification,
    functions,
  };
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  switch (status) {
    case 'compliant':
    case 'complete':
      return `<span class="badge badge-success">Complete</span>`;
    case 'not_required':
      return `<span class="badge badge-neutral">No checks required</span>`;
    case 'action_required':
    case 'incomplete':
      return `<span class="badge badge-danger">Incomplete</span>`;
    case 'not_started':
      return `<span class="badge badge-warning">Not started</span>`;
    case 'no_links':
      return `<span class="badge badge-neutral">No connections</span>`;
    default:
      return `<span class="badge badge-warning">Outstanding</span>`;
  }
}

// ─── ROLE SUMMARY ─────────────────────────────────────────────────────────────
function roleSummary(ind, isStaffView, classification) {
  if (isStaffView) {
    const role = ind.role || 'No role assigned';
    const cls  = classificationLabel(classification);
    return `
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${role}</span>
        <span style="font-size:10px;color:var(--color-text-muted);">${cls}</span>
      </div>`;
  }

  if (ind.role) {
    return `<span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${ind.role}</span>`;
  }

  return '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs);">No role assigned</span>';
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const isStaffView = S.currentScreen === 'staff';
  const filter      = S.currentParams?.filter || 'all';
  const search      = S.currentParams?.search || '';

  let individuals = [...(S.individuals || [])];

  if (isStaffView) {
    individuals = individuals.filter(i => i.isStaff === true);
  }

  if (search) {
    const q = search.toLowerCase();
    individuals = individuals.filter(i =>
      i.fullName?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.role?.toLowerCase().includes(q)
    );
  }

  const withStatus = individuals.map(i => ({
    ...i,
    _status: isStaffView ? staffVettingStatus(i) : individualStatus(i),
  }));

  const filtered = filter === 'all' ? withStatus : withStatus.filter(i => {
    if (filter === 'complete' || filter === 'compliant') {
      return i._status.status === 'complete' ||
             i._status.status === 'compliant' ||
             i._status.status === 'not_required';
    }
    if (filter === 'incomplete' || filter === 'action') {
      return i._status.status === 'incomplete' || i._status.status === 'action_required';
    }
    if (filter === 'not_started') {
      return i._status.status === 'not_started';
    }
    if (filter === 'no_links') {
      return i._status.status === 'no_links';
    }
    return true;
  });

  const counts = {
    all:         withStatus.length,
    complete:    withStatus.filter(i =>
      i._status.status === 'complete' ||
      i._status.status === 'compliant' ||
      i._status.status === 'not_required'
    ).length,
    incomplete:  withStatus.filter(i =>
      i._status.status === 'incomplete' ||
      i._status.status === 'action_required'
    ).length,
    not_started: withStatus.filter(i => i._status.status === 'not_started').length,
  };

  const title    = isStaffView ? 'Staff' : 'Individuals';
  const subtitle = isStaffView
    ? 'Staff records for your firm.'
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
        { key: 'all',       label: `All (${counts.all})` },
        { key: 'compliant', label: `Compliant (${counts.complete})` },
        { key: 'action',    label: `Action (${counts.incomplete})` },
        { key: 'no_links',  label: `No links (${withStatus.filter(i => i._status.status === 'no_links').length})` },
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
                      </div>
                    </div>
                  </td>
                  <td>${roleSummary(i, isStaffView, i._status.classification)}</td>
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
window.individualsSearch = function(val) {
  S.currentParams = { ...S.currentParams, search: val };
  render();
};

window.individualsFilter = function(filter) {
  S.currentParams = { ...S.currentParams, filter };
  render();
};
