import { S } from '../../state/index.js';
import {
  saveIndividual,
  saveScreening,
  saveTrainingRecord,
  saveVettingRecord,
  genId,
} from '../../firebase/firestore.js';

// ─── STAFF FUNCTION MODEL ─────────────────────────────────────────────────────
const STAFF_FUNCTIONS = {
  director_owner_beneficial_owner: {
    label: 'Director / owner / beneficial owner',
    desc: 'Has ownership or governance responsibility over the firm',
    level: 'key',
  },
  amlco_delegate: {
    label: 'AMLCO or delegate',
    desc: 'Holds formal responsibility for the AML/CTF program',
    level: 'key',
  },
  senior_manager_aml_authority: {
    label: 'Senior manager with AML/CTF authority',
    desc: 'Approves program, risk assessments or SMR decisions',
    level: 'key',
  },
  reporting_officer: {
    label: 'Reporting Officer',
    desc: 'Oversees suspicious matter reporting and escalation',
    level: 'key',
  },
  processes_client_cdd_kyc_checks: {
    label: 'Processes client CDD / KYC checks',
    desc: 'Collects and verifies client identity information',
    level: 'standard',
  },
  screens_clients_namescan: {
    label: 'Screens clients via NameScan or similar',
    desc: 'Runs PEP, sanctions or adverse media checks',
    level: 'standard',
  },
  supports_transaction_monitoring: {
    label: 'Supports transaction monitoring',
    desc: 'Reviews or flags unusual client activity',
    level: 'standard',
  },
  assists_smr_compliance_reporting: {
    label: 'Assists with SMR or compliance reporting',
    desc: 'Prepares or supports suspicious matter reports',
    level: 'standard',
  },
  none_of_the_above: {
    label: 'None of the above',
    desc: 'No AML/CTF functions are performed by this staff member',
    level: 'none',
  },
};

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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function esc(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function latestBy(items = [], field) {
  return [...items].sort((a, b) => (b?.[field] || '').localeCompare(a?.[field] || ''))[0];
}

function softBadge(text, tone = 'neutral') {
  const styles = {
    success: 'background:#dcfce7;color:#166534;',
    warning: 'background:#fef3c7;color:#92400e;',
    danger:  'background:#fee2e2;color:#991b1b;',
    info:    'background:#dbeafe;color:#1d4ed8;',
    neutral: 'background:#f1f5f9;color:#475569;',
    key:     'background:#fef3c7;color:#92400e;',
    standard:'background:#dbeafe;color:#1d4ed8;',
  };
  return `
    <span style="
      display:inline-flex;align-items:center;
      padding:3px 10px;border-radius:999px;
      font-size:10px;font-weight:700;
      ${styles[tone] || styles.neutral}
    ">${text}</span>`;
}

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
  selected = selected.filter(code => !!STAFF_FUNCTIONS[code]);

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

function classificationBadge(classification) {
  if (classification === 'key') return softBadge('Key Personnel', 'key');
  if (classification === 'standard') return softBadge('Standard Staff', 'standard');
  return softBadge('No AML functions', 'neutral');
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

function staffStatusFromDraft(d) {
  const classification = d.staffClassification || classificationFromFunctions(d.staffFunctions || []);
  const required = [];
  const satisfied = [];

  if (screeningRequired(classification)) {
    required.push('screening');
    if (d.screeningResult) satisfied.push('screening');
  }
  if (trainingRequired(classification)) {
    required.push('training');
    if (d.trainingCompletedDate && d.trainingProvider) satisfied.push('training');
  }
  if (vettingRequired(classification)) {
    required.push('police');
    required.push('bankruptcy');
    if (d.policeCheckDate) satisfied.push('police');
    if (d.bankruptcyCheckDate) satisfied.push('bankruptcy');
  }

  if (!required.length) return 'Not required';
  if (!satisfied.length) return 'Not started';
  if (satisfied.length === required.length) return 'Complete';
  return 'Incomplete';
}

function hydrateDraftFromIndividual(ind) {
  const screenings = (S.screenings || []).filter(s => s.individualId === ind.individualId);
  const training = (S.training || []).filter(t => t.individualId === ind.individualId);
  const vetting = (S.vetting || []).filter(v => v.individualId === ind.individualId);

  const latestScr = latestBy(screenings, 'date');
  const latestTrn = latestBy(training, 'completedDate');
  const latestVet = latestBy(vetting, 'policeCheckDate');

  let functions = ind.staffFunctions || ind.amlFunctions || ind.functions || [];
  if (!Array.isArray(functions) || !functions.length) {
    functions = deriveFunctionsFromRole(ind.role);
  }
  functions = normaliseFunctions(functions);

  const classification = ind.staffClassification || classificationFromFunctions(functions);

  return {
    ...ind,
    isStaff: true,
    staffFunctions: functions,
    staffClassification: classification,

    screeningProvider: latestScr?.provider || '',
    screeningDate: latestScr?.date || '',
    screeningResult: latestScr?.result || '',
    screeningReferenceId: latestScr?.referenceId || '',
    screeningNextDueDate: latestScr?.nextDueDate || '',

    trainingType: latestTrn?.type || (classification === 'key' ? 'enhanced' : 'standard'),
    trainingProvider: latestTrn?.provider || '',
    trainingCompletedDate: latestTrn?.completedDate || '',
    trainingExpiryDate: latestTrn?.expiryDate || '',
    trainingCertificateLink: latestTrn?.certificateLink || '',

    policeCheckDate: latestVet?.policeCheckDate || '',
    policeCheckResult: latestVet?.policeCheckResult || '',
    policeCheckRef: latestVet?.policeCheckRef || '',
    bankruptcyCheckDate: latestVet?.bankruptcyCheckDate || '',
    bankruptcyCheckResult: latestVet?.bankruptcyCheckResult || '',
    declDate: latestVet?.declDate || '',
    declNext: latestVet?.declNext || '',
    declSigned: latestVet?.declSigned || false,
  };
}

function newBlankDraft() {
  return {
    individualId: '',
    firmId: S.firmId,
    isStaff: true,
    fullName: '',
    role: '',
    dateOfBirth: '',
    address: '',
    email: '',
    phone: '',
    notes: '',
    staffFunctions: [],
    staffClassification: 'none',

    screeningProvider: '',
    screeningDate: '',
    screeningResult: '',
    screeningReferenceId: '',
    screeningNextDueDate: '',

    trainingType: 'standard',
    trainingProvider: '',
    trainingCompletedDate: '',
    trainingExpiryDate: '',
    trainingCertificateLink: '',

    policeCheckDate: '',
    policeCheckResult: '',
    policeCheckRef: '',
    bankruptcyCheckDate: '',
    bankruptcyCheckResult: '',
    declDate: '',
    declNext: '',
    declSigned: false,
  };
}

function ensureDraft() {
  const individualId = S.currentParams?.individualId;
  const existing = individualId
    ? (S.individuals || []).find(i => i.individualId === individualId)
    : null;

  if (existing) {
    if (!S._draft || S._draft.individualId !== individualId) {
      S._draft = hydrateDraftFromIndividual(existing);
    }
  } else {
    if (!S._draft || S._draft.individualId) {
      S._draft = newBlankDraft();
    }
  }

  if (!Array.isArray(S._draft.staffFunctions)) {
    S._draft.staffFunctions = [];
  }

  S._draft.staffFunctions = normaliseFunctions(S._draft.staffFunctions);
  S._draft.staffClassification = classificationFromFunctions(S._draft.staffFunctions);
}

function currentTab() {
  return S.currentParams?.tab || 'identity';
}

function isEditMode() {
  return !!S.currentParams?.individualId;
}

function currentRecordName() {
  return S._draft?.fullName || 'Staff member';
}

// ─── TAB RENDERERS ────────────────────────────────────────────────────────────
function renderFunctionOption(code, meta, selected) {
  return `
    <label style="
      display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);
      padding:var(--space-3);border:1px solid var(--color-border-light);border-radius:12px;
      cursor:pointer;background:${selected ? 'var(--color-primary-light)' : 'var(--color-surface)'};
    ">
      <div style="display:flex;align-items:flex-start;gap:var(--space-3);">
        <input
          type="checkbox"
          ${selected ? 'checked' : ''}
          onchange="toggleStaffFunction('${code}', this.checked)"
          style="margin-top:4px;"
        >
        <div>
          <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);">
            ${meta.label}
          </div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">
            ${meta.desc}
          </div>
        </div>
      </div>
      ${meta.level === 'key'
        ? softBadge('Key Personnel', 'key')
        : meta.level === 'standard'
          ? softBadge('Standard Staff', 'standard')
          : softBadge('None', 'neutral')}
    </label>`;
}

function renderIdentityTab() {
  const d = S._draft;
  const classification = d.staffClassification || classificationFromFunctions(d.staffFunctions || []);

  return `
    <div class="card">
      <div class="section-heading">Identity</div>

      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name *</label>
          <input type="text" class="inp" value="${esc(d.fullName || '')}" oninput="updateDraft('fullName', this.value)">
        </div>

        <div class="form-row span-2">
          <label class="label label-required">Job title / role *</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.role || '')}"
            oninput="updateDraft('role', this.value)"
            onchange="updateRole(this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Date of birth</label>
          <input type="date" class="inp" value="${esc(d.dateOfBirth || '')}" oninput="updateDraft('dateOfBirth', this.value)">
        </div>

        <div class="form-row span-2">
          <label class="label">Residential address</label>
          <input type="text" class="inp" value="${esc(d.address || '')}" oninput="updateDraft('address', this.value)" placeholder="12 Main St, Sydney NSW 2000">
        </div>

        <div class="form-row">
          <label class="label">Email</label>
          <input type="email" class="inp" value="${esc(d.email || '')}" oninput="updateDraft('email', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Phone</label>
          <input type="text" class="inp" value="${esc(d.phone || '')}" oninput="updateDraft('phone', this.value)">
        </div>

        <div class="form-row span-2">
          <label class="label">Notes</label>
          <textarea class="inp" rows="4" oninput="updateDraft('notes', this.value)" placeholder="Any additional notes...">${esc(d.notes || '')}</textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-3);">
        <div>
          <div class="section-heading" style="margin-bottom:4px;">AML/CTF functions</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
            Tick the AML/CTF functions this staff member performs. Classification is set automatically.
          </div>
        </div>
        ${classificationBadge(classification)}
      </div>

      <div style="font-size:10px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2);">
        Governance roles — Key Personnel
      </div>
      <div style="display:grid;gap:var(--space-3);margin-bottom:var(--space-4);">
        ${KEY_CODES.map(code => renderFunctionOption(code, STAFF_FUNCTIONS[code], (d.staffFunctions || []).includes(code))).join('')}
      </div>

      <div style="font-size:10px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2);">
        Operational roles — Standard Staff
      </div>
      <div style="display:grid;gap:var(--space-3);margin-bottom:var(--space-4);">
        ${STANDARD_CODES.map(code => renderFunctionOption(code, STAFF_FUNCTIONS[code], (d.staffFunctions || []).includes(code))).join('')}
      </div>

      <div style="display:grid;gap:var(--space-3);">
        ${renderFunctionOption('none_of_the_above', STAFF_FUNCTIONS.none_of_the_above, (d.staffFunctions || []).includes('none_of_the_above'))}
      </div>
    </div>
  `;
}

function renderScreeningTab() {
  const d = S._draft;
  const classification = d.staffClassification;

  if (!screeningRequired(classification)) {
    return `
      <div class="card empty-state">
        <div class="empty-state-title">No Screening Required</div>
        <p>This staff member has no AML/CTF functions requiring PEP or sanctions screening.</p>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-heading">Screening</div>
      <p class="screen-subtitle mb-4">Record the most recent PEP / sanctions screening for this staff member.</p>

      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label">Provider</label>
          <input type="text" class="inp"
            value="${esc(d.screeningProvider || '')}"
            placeholder="e.g. NameScan"
            oninput="updateDraft('screeningProvider', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Date</label>
          <input type="date" class="inp"
            value="${esc(d.screeningDate || '')}"
            oninput="updateDraft('screeningDate', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Result</label>
          <select class="inp" onchange="updateDraft('screeningResult', this.value)">
            <option value="">Select...</option>
            <option value="Clear" ${d.screeningResult === 'Clear' ? 'selected' : ''}>Clear</option>
            <option value="Potential match" ${d.screeningResult === 'Potential match' ? 'selected' : ''}>Potential match</option>
            <option value="Escalated" ${d.screeningResult === 'Escalated' ? 'selected' : ''}>Escalated</option>
          </select>
        </div>

        <div class="form-row">
          <label class="label">Reference ID</label>
          <input type="text" class="inp"
            value="${esc(d.screeningReferenceId || '')}"
            oninput="updateDraft('screeningReferenceId', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Next due</label>
          <input type="date" class="inp"
            value="${esc(d.screeningNextDueDate || '')}"
            oninput="updateDraft('screeningNextDueDate', this.value)">
        </div>
      </div>
    </div>`;
}

function renderTrainingTab() {
  const d = S._draft;
  const classification = d.staffClassification;

  if (!trainingRequired(classification)) {
    return `
      <div class="card empty-state">
        <div class="empty-state-title">No Training Required</div>
        <p>This staff member has no AML/CTF functions requiring training evidence.</p>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-heading">Training</div>
      <p class="screen-subtitle mb-4">Record the most recent AML/CTF training completed by this staff member.</p>

      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label">Training provider</label>
          <input type="text" class="inp"
            value="${esc(d.trainingProvider || '')}"
            placeholder="e.g. CPA Australia, internal"
            oninput="updateDraft('trainingProvider', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Completed date</label>
          <input type="date" class="inp"
            value="${esc(d.trainingCompletedDate || '')}"
            onchange="handleTrainingDateChange(this.value)">
        </div>

        <div class="form-row">
          <label class="label">Expiry date</label>
          <input type="date" class="inp"
            value="${esc(d.trainingExpiryDate || '')}"
            oninput="updateDraft('trainingExpiryDate', this.value)">
        </div>

        <div class="form-row span-2">
          <label class="label">Training type</label>
          <select class="inp" onchange="updateDraft('trainingType', this.value)">
            <option value="standard" ${d.trainingType === 'standard' ? 'selected' : ''}>Standard AML/CTF Awareness</option>
            <option value="enhanced" ${d.trainingType === 'enhanced' ? 'selected' : ''}>Enhanced (Key Personnel / AMLCO)</option>
          </select>
        </div>

        <div class="form-row span-2">
          <label class="label">Certificate link</label>
          <input type="text" class="inp"
            value="${esc(d.trainingCertificateLink || '')}"
            placeholder="Optional URL"
            oninput="updateDraft('trainingCertificateLink', this.value)">
        </div>
      </div>
    </div>`;
}

function renderVettingTab() {
  const d = S._draft;
  const classification = d.staffClassification;

  if (!vettingRequired(classification)) {
    return `
      <div class="card empty-state">
        <div class="empty-state-title">No Additional Vetting Required</div>
        <p>Police and bankruptcy checks are only required for Key Personnel.</p>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-heading">Vetting</div>
      <p class="screen-subtitle mb-4">Record police and bankruptcy checks for Key Personnel.</p>

      <div class="form-grid mb-4">
        <div class="form-row">
          <label class="label">Police check date</label>
          <input type="date" class="inp"
            value="${esc(d.policeCheckDate || '')}"
            oninput="updateDraft('policeCheckDate', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Police check result</label>
          <select class="inp" onchange="updateDraft('policeCheckResult', this.value)">
            <option value="">Select...</option>
            <option value="Pass" ${d.policeCheckResult === 'Pass' ? 'selected' : ''}>Pass</option>
            <option value="Review required" ${d.policeCheckResult === 'Review required' ? 'selected' : ''}>Review required</option>
          </select>
        </div>

        <div class="form-row span-2">
          <label class="label">Police check reference</label>
          <input type="text" class="inp"
            value="${esc(d.policeCheckRef || '')}"
            oninput="updateDraft('policeCheckRef', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Bankruptcy check date</label>
          <input type="date" class="inp"
            value="${esc(d.bankruptcyCheckDate || '')}"
            oninput="updateDraft('bankruptcyCheckDate', this.value)">
        </div>

        <div class="form-row">
          <label class="label">Bankruptcy check result</label>
          <select class="inp" onchange="updateDraft('bankruptcyCheckResult', this.value)">
            <option value="">Select...</option>
            <option value="Clear" ${d.bankruptcyCheckResult === 'Clear' ? 'selected' : ''}>Clear</option>
            <option value="Record found" ${d.bankruptcyCheckResult === 'Record found' ? 'selected' : ''}>Record found</option>
          </select>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section-heading">Annual declaration</div>
      <div class="form-grid">
        <div class="form-row">
          <label class="label">Declaration signed date</label>
          <input type="date" class="inp"
            value="${esc(d.declDate || '')}"
            onchange="handleDeclarationDateChange(this.value)">
        </div>

        <div class="form-row">
          <label class="label">Next declaration due</label>
          <input type="date" class="inp"
            value="${esc(d.declNext || '')}"
            oninput="updateDraft('declNext', this.value)">
        </div>

        <div class="form-row span-2">
          <label style="display:flex;align-items:center;gap:10px;font-size:var(--font-size-sm);color:var(--color-text-primary);">
            <input type="checkbox" ${d.declSigned ? 'checked' : ''} onchange="updateDraft('declSigned', this.checked)">
            Declaration signed
          </label>
        </div>
      </div>
    </div>`;
}

function renderActiveTab() {
  const tab = currentTab();
  if (tab === 'screening') return renderScreeningTab();
  if (tab === 'training') return renderTrainingTab();
  if (tab === 'vetting') return renderVettingTab();
  return renderIdentityTab();
}

// ─── PERSISTENCE ───────────────────────────────────────────────────────────────
function upsertById(arr, idField, record) {
  const existing = arr.findIndex(x => x[idField] === record[idField]);
  if (existing >= 0) {
    arr[existing] = record;
  } else {
    arr.unshift(record);
  }
}

async function saveCoreIndividual(d) {
  const individualId = d.individualId || genId('ind');
  const now = new Date().toISOString();

  const record = {
    individualId,
    firmId: S.firmId,
    isStaff: true,
    fullName: d.fullName,
    role: d.role,
    dateOfBirth: d.dateOfBirth || '',
    address: d.address || '',
    email: d.email || '',
    phone: d.phone || '',
    notes: d.notes || '',
    staffFunctions: normaliseFunctions(d.staffFunctions || []),
    staffClassification: classificationFromFunctions(d.staffFunctions || []),
    vettingStatus: staffStatusFromDraft(d),
    createdAt: d.createdAt || now,
    updatedAt: now,
  };

  await saveIndividual(individualId, record);
  if (!S.individuals) S.individuals = [];
  upsertById(S.individuals, 'individualId', record);
  S._draft = { ...S._draft, ...record };
  return record;
}

function screeningPayloadChanged(d, existing) {
  const next = {
    provider: d.screeningProvider || '',
    date: d.screeningDate || '',
    result: d.screeningResult || '',
    referenceId: d.screeningReferenceId || '',
    nextDueDate: d.screeningNextDueDate || '',
  };
  const prev = {
    provider: existing?.provider || '',
    date: existing?.date || '',
    result: existing?.result || '',
    referenceId: existing?.referenceId || '',
    nextDueDate: existing?.nextDueDate || '',
  };
  return JSON.stringify(next) !== JSON.stringify(prev);
}

function trainingPayloadChanged(d, existing) {
  const next = {
    provider: d.trainingProvider || '',
    completedDate: d.trainingCompletedDate || '',
    expiryDate: d.trainingExpiryDate || '',
    type: d.trainingType || '',
    certificateLink: d.trainingCertificateLink || '',
  };
  const prev = {
    provider: existing?.provider || '',
    completedDate: existing?.completedDate || '',
    expiryDate: existing?.expiryDate || '',
    type: existing?.type || '',
    certificateLink: existing?.certificateLink || '',
  };
  return JSON.stringify(next) !== JSON.stringify(prev);
}

function vettingPayloadChanged(d, existing) {
  const next = {
    policeCheckDate: d.policeCheckDate || '',
    policeCheckResult: d.policeCheckResult || '',
    policeCheckRef: d.policeCheckRef || '',
    bankruptcyCheckDate: d.bankruptcyCheckDate || '',
    bankruptcyCheckResult: d.bankruptcyCheckResult || '',
    declDate: d.declDate || '',
    declNext: d.declNext || '',
    declSigned: !!d.declSigned,
  };
  const prev = {
    policeCheckDate: existing?.policeCheckDate || '',
    policeCheckResult: existing?.policeCheckResult || '',
    policeCheckRef: existing?.policeCheckRef || '',
    bankruptcyCheckDate: existing?.bankruptcyCheckDate || '',
    bankruptcyCheckResult: existing?.bankruptcyCheckResult || '',
    declDate: existing?.declDate || '',
    declNext: existing?.declNext || '',
    declSigned: !!existing?.declSigned,
  };
  return JSON.stringify(next) !== JSON.stringify(prev);
}

async function saveEvidenceRecords(record) {
  const individualId = record.individualId;
  const d = S._draft;
  const classification = record.staffClassification;

  const screenings = (S.screenings || []).filter(s => s.individualId === individualId);
  const training = (S.training || []).filter(t => t.individualId === individualId);
  const vetting = (S.vetting || []).filter(v => v.individualId === individualId);

  const latestScr = latestBy(screenings, 'date');
  const latestTrn = latestBy(training, 'completedDate');
  const latestVet = latestBy(vetting, 'policeCheckDate');

  if (screeningRequired(classification)) {
    const hasScreeningData = d.screeningProvider || d.screeningDate || d.screeningResult || d.screeningReferenceId || d.screeningNextDueDate;
    if (hasScreeningData && screeningPayloadChanged(d, latestScr)) {
      const screeningRecord = {
        firmId: S.firmId,
        individualId,
        provider: d.screeningProvider || '',
        date: d.screeningDate || '',
        result: d.screeningResult || '',
        referenceId: d.screeningReferenceId || '',
        nextDueDate: d.screeningNextDueDate || '',
      };
      const screeningId = await saveScreening(screeningRecord);
      if (!S.screenings) S.screenings = [];
      S.screenings.unshift({ screeningId, ...screeningRecord, createdAt: new Date().toISOString() });
    }
  }

  if (trainingRequired(classification)) {
    const hasTrainingData = d.trainingProvider || d.trainingCompletedDate || d.trainingExpiryDate || d.trainingType || d.trainingCertificateLink;
    if (hasTrainingData && trainingPayloadChanged(d, latestTrn)) {
      const trainingRecord = {
        firmId: S.firmId,
        individualId,
        provider: d.trainingProvider || '',
        completedDate: d.trainingCompletedDate || '',
        expiryDate: d.trainingExpiryDate || '',
        type: d.trainingType || '',
        certificateLink: d.trainingCertificateLink || '',
      };
      const trainingId = await saveTrainingRecord(trainingRecord);
      if (!S.training) S.training = [];
      S.training.unshift({ trainingId, ...trainingRecord, createdAt: new Date().toISOString() });
    }
  }

  if (vettingRequired(classification)) {
    const hasVettingData =
      d.policeCheckDate || d.policeCheckResult || d.policeCheckRef ||
      d.bankruptcyCheckDate || d.bankruptcyCheckResult ||
      d.declDate || d.declNext || d.declSigned;

    if (hasVettingData && vettingPayloadChanged(d, latestVet)) {
      const vettingRecord = {
        firmId: S.firmId,
        individualId,
        policeCheckDate: d.policeCheckDate || '',
        policeCheckResult: d.policeCheckResult || '',
        policeCheckRef: d.policeCheckRef || '',
        bankruptcyCheckDate: d.bankruptcyCheckDate || '',
        bankruptcyCheckResult: d.bankruptcyCheckResult || '',
        declDate: d.declDate || '',
        declNext: d.declNext || '',
        declSigned: !!d.declSigned,
      };
      const vettingId = await saveVettingRecord(vettingRecord);
      if (!S.vetting) S.vetting = [];
      S.vetting.unshift({ vettingId, ...vettingRecord, createdAt: new Date().toISOString() });
    }
  }
}

async function handleSave(redirectAfter = true) {
  const d = S._draft || {};

  if (!d.fullName || !d.role) {
    window.toast('Full legal name and job title / role are required.', 'err');
    return;
  }

  try {
    const record = await saveCoreIndividual(d);
    await saveEvidenceRecords(record);

    record.vettingStatus = staffStatusFromDraft(S._draft);
    await saveIndividual(record.individualId, record);
    upsertById(S.individuals, 'individualId', record);
    S._draft = { ...S._draft, ...record };

    window.toast(isEditMode() ? 'Staff record updated.' : 'Staff member saved.', 'ok');

    if (redirectAfter) {
      window.go('staff-detail', { individualId: record.individualId });
    } else {
      window.render();
    }
  } catch (err) {
    console.error(err);
    window.toast('Save failed.', 'err');
  }
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  ensureDraft();

  const d = S._draft;
  const editMode = isEditMode();
  const title = editMode ? `Edit — ${esc(currentRecordName())}` : 'Add staff member';
  const activeTab = currentTab();

  const tabs = [
    { key: 'identity', label: 'Identity' },
    { key: 'screening', label: 'Screening' },
    { key: 'training', label: 'Training' },
    { key: 'vetting', label: 'Vetting' },
  ];

  const classification = d.staffClassification || 'none';
  const status = staffStatusFromDraft(d);

  return `
    <div class="screen-narrow">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-4);">
        <div>
          <button onclick="go('${editMode ? 'staff-detail' : 'staff'}'${editMode ? `,{individualId:'${d.individualId}'}` : ''})" class="btn-ghost" style="color:var(--color-text-muted);padding:0;font-size:var(--font-size-sm);margin-bottom:var(--space-2);">
            ← Staff
          </button>
          <h1 class="screen-title">${title}</h1>
        </div>
        ${editMode ? `<div>${softBadge('Editing — previous version preserved', 'warning')}</div>` : ''}
      </div>

      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap;">
        ${classificationBadge(classification)}
        ${status === 'Complete'
          ? softBadge('Complete', 'success')
          : status === 'Incomplete'
            ? softBadge('Incomplete', 'danger')
            : status === 'Not started'
              ? softBadge('Not started', 'warning')
              : softBadge('No checks required', 'neutral')}
      </div>

      <div class="card" style="padding-bottom:0;margin-bottom:var(--space-4);">
        <div style="display:flex;gap:var(--space-4);border-bottom:1px solid var(--color-border-light);overflow:auto;">
          ${tabs.map(t => `
            <button
              onclick="staffSetTab('${t.key}')"
              class="btn-ghost"
              style="
                padding:0 0 12px 0;
                border-bottom:2px solid ${activeTab === t.key ? 'var(--color-primary)' : 'transparent'};
                border-radius:0;
                color:${activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
                font-weight:${activeTab === t.key ? '600' : '500'};
                white-space:nowrap;
              "
            >${t.label}</button>
          `).join('')}
        </div>
      </div>

      ${renderActiveTab()}

      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">
        <button
          onclick="go('${editMode ? 'staff-detail' : 'staff'}'${editMode ? `,{individualId:'${d.individualId}'}` : ''})"
          class="btn-sec"
          style="min-width:180px;"
        >Cancel</button>

        <button
          onclick="handleStaffSave()"
          class="btn"
          style="min-width:220px;"
        >Save changes</button>
      </div>
    </div>`;
}

// ─── WINDOW ACTIONS ───────────────────────────────────────────────────────────
window.updateDraft = function(field, value) {
  if (!S._draft) ensureDraft();
  S._draft[field] = value;
};

window.updateRole = function(value) {
  if (!S._draft) ensureDraft();

  const previousFunctions = Array.isArray(S._draft.staffFunctions)
    ? [...S._draft.staffFunctions]
    : [];
  const hadNoFunctions = previousFunctions.length === 0;

  S._draft.role = value;

  if (!hadNoFunctions) {
    return;
  }

  const derived = normaliseFunctions(deriveFunctionsFromRole(value));
  const nextClassification = classificationFromFunctions(derived);

  const functionsChanged =
    JSON.stringify(previousFunctions) !== JSON.stringify(derived) ||
    S._draft.staffClassification !== nextClassification;

  S._draft.staffFunctions = derived;
  S._draft.staffClassification = nextClassification;

  if (functionsChanged) {
    window.render();
  }
};

window.toggleStaffFunction = function(code, checked) {
  if (!S._draft) ensureDraft();

  let selected = [...(S._draft.staffFunctions || [])];

  if (checked) {
    if (code === 'none_of_the_above') {
      selected = ['none_of_the_above'];
    } else {
      selected = selected.filter(x => x !== 'none_of_the_above');
      selected.push(code);
    }
  } else {
    selected = selected.filter(x => x !== code);
  }

  selected = normaliseFunctions(selected);
  S._draft.staffFunctions = selected;
  S._draft.staffClassification = classificationFromFunctions(selected);

  if (S._draft.staffClassification === 'key' && !S._draft.trainingType) {
    S._draft.trainingType = 'enhanced';
  } else if (S._draft.staffClassification === 'standard' && !S._draft.trainingType) {
    S._draft.trainingType = 'standard';
  }

  window.render();
};

window.staffSetTab = function(tab) {
  S.currentParams = { ...(S.currentParams || {}), tab };
  window.render();
};

window.handleTrainingDateChange = function(value) {
  if (!S._draft) ensureDraft();
  S._draft.trainingCompletedDate = value;

  if (value && !S._draft.trainingExpiryDate) {
    const date = new Date(value);
    date.setFullYear(date.getFullYear() + 1);
    S._draft.trainingExpiryDate = date.toISOString().split('T')[0];
  }

  window.render();
};

window.handleDeclarationDateChange = function(value) {
  if (!S._draft) ensureDraft();
  S._draft.declDate = value;
  S._draft.declSigned = !!value;

  if (value && !S._draft.declNext) {
    const date = new Date(value);
    date.setFullYear(date.getFullYear() + 1);
    S._draft.declNext = date.toISOString().split('T')[0];
  }

  window.render();
};

window.handleStaffSave = async function() {
  await handleSave(true);
};
