import { S, addIndividualToState } from '../../state/index.js';
// Removed: saveLink, addLinkToState, rules_matrix imports as we are moving away from relational links.
import { 
  saveIndividual, saveVerification, saveScreening, 
  saveTrainingRecord, saveVettingRecord, saveAuditEntry, genId 
} from '../../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
// Handles both new and edit flows for individuals and staff.
// Entry point determines the initial 'isStaff' context.
// Replaces the old 'Connections' tab with a consolidated 'Vetting' engine.

export function screen() {
  const { individualId, tab, entryPoint } = S.currentParams || {};
  const isEdit = !!individualId;
  const ind    = isEdit ? S.individuals.find(i => i.individualId === individualId) : null;
  
  // Initialize draft state if not already present
  if (!S._draft) {
    S._draft = isEdit ? { ...ind } : { 
      // isStaff is now a persistent flag on the individual record
      isStaff: entryPoint === 'staff' || (ind?.isStaff ?? false),
      functions: ind?.functions || [],
      noneSelected: ind?.noneSelected ?? (entryPoint !== 'staff') 
    };
  }
  const d = S._draft;

  // Tab management - consolidated from 6 tabs down to 3
  const activeTab = tab || 'identity';
  const tabs = [
    { key: 'identity', label: '1. Identity' },
    { key: 'vetting',  label: '2. Vetting & Verification' },
    { key: 'training', label: '3. Training' }
  ];

  // Logic Engine: Classification is derived from functions, not manual selection
  const keyFns = ['director', 'amlco', 'senior'];
  const stdFns = ['cdd', 'screen', 'monitor', 'smr'];
  const hasKey = d.functions?.some(f => keyFns.includes(f));
  const hasStd = d.functions?.some(f => stdFns.includes(f));
  const classification = hasKey ? 'Key Personnel' : hasStd ? 'Standard AML/CTF Staff' : 'No AML/CTF functions';

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <button onclick="cancelIndividual()" class="btn-ghost" style="padding:0;">
            ← ${d.isStaff ? 'Staff Register' : 'Individuals'}
          </button>
          <h1 class="screen-title">${isEdit ? 'Edit — ' + (d.fullName || '') : 'New Record'}</h1>
        </div>
        <span class="badge ${d.isStaff ? 'badge-primary' : 'badge-neutral'}">
          ${d.isStaff ? 'Staff Context' : 'Client Context'}
        </span>
      </div>

      <div class="filter-tabs mb-4">
        ${tabs.map(t => `
          <button onclick="indTab('${t.key}')" class="filter-tab ${activeTab === t.key ? 'active' : ''}">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <div class="tab-content">
        ${activeTab === 'identity' ? tabIdentity(d, classification) : ''}
        ${activeTab === 'vetting'  ? tabVettingMerged(d, classification) : ''}
        ${activeTab === 'training' ? tabTraining(d) : ''}
      </div>

      <div class="flex gap-3 mt-4">
        <button onclick="cancelIndividual()" class="btn-sec flex-1">Cancel</button>
        <button onclick="saveIndividualRecord()" class="btn flex-2">
          ${isEdit ? 'Save changes' : 'Create record'}
        </button>
      </div>
    </div>`;
}

// ─── TAB 1: IDENTITY (THE COMPLIANCE DRIVER) ──────────────────────────────────
// Ticking functions here drives the requirements in the Vetting tab.
function tabIdentity(d, classification) {
  const FN_KEY = [
    { id:'director', label:'Director / owner / beneficial owner', desc:'Governance responsibility', type:'key' },
    { id:'amlco',    label:'AMLCO or delegate', desc:'Formal AML responsibility', type:'key' },
    { id:'senior',   label:'Senior manager', desc:'Approval authority', type:'key' },
    { id:'cdd',      label:'Processes CDD / KYC', desc:'Identity verification tasks', type:'std' },
    { id:'screen',   label:'Screens clients', desc:'PEP/Sanctions checks', type:'std' },
    { id:'monitor',  label:'Transaction monitoring', desc:'Reviews unusual activity', type:'std' },
    { id:'smr',      label:'SMR Reporting', desc:'Suspicious matter support', type:'std' },
  ];

  return `
    <div class="card">
      <div class="section-heading">Core identity</div>
      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name</label>
          <input id="ind-name" type="text" class="inp" value="${d.fullName||''}" oninput="updateDraft('fullName', this.value)">
        </div>
        <div class="form-row">
          <label class="label label-required">Date of birth</label>
          <input id="ind-dob" type="date" class="inp" value="${d.dateOfBirth||''}" oninput="updateDraft('dateOfBirth', this.value)">
        </div>
        <div class="form-row">
          <label class="label">Job Title / Role</label>
          <input id="ind-role" type="text" class="inp" value="${d.role||''}" oninput="updateDraft('role', this.value)">
        </div>
      </div>

      <div class="section-heading">AML/CTF Functions</div>
      <p class="text-xs text-muted mb-3">The classification is automatic based on tasks performed.</p>
      
      ${FN_KEY.map(f => `
        <label class="check-row ${d.functions?.includes(f.id) ? (f.type === 'key' ? 'selected' : 'selected-primary') : ''}">
          <input type="checkbox" ${d.functions?.includes(f.id) ? 'checked' : ''} onchange="toggleFunction('${f.id}')">
          <div>
            <div class="check-row-label">${f.label}</div>
            <div class="check-row-desc">${f.desc}</div>
          </div>
        </label>
      `).join('')}

      <label class="check-row ${d.noneSelected ? 'selected' : ''}" style="margin-top:var(--space-3)">
        <input type="checkbox" ${d.noneSelected ? 'checked' : ''} onchange="toggleNone()">
        <div>
          <div class="check-row-label">No AML/CTF functions</div>
          <div class="check-row-desc">Individual performs no regulated tasks. Record the assessment outcome.</div>
        </div>
      </label>

      <div class="card-inset" style="background:var(--color-surface-alt)">
        <span class="label">Derived Classification</span>
        <div class="font-medium ${classification === 'Key Personnel' ? 'text-danger' : 'text-primary'}">${classification}</div>
      </div>
    </div>`;
}

// ─── TAB 2: VETTING & VERIFICATION (SMART VIEW) ────────────────────────────────
// Merges ID Verification, Screening, and Background checks into one flow.
function tabVettingMerged(d, classification) {
  const isKey  = classification === 'Key Personnel';
  const isStd  = classification === 'Standard AML/CTF Staff';
  const isNone = classification === 'No AML/CTF functions';

  return `
    <div class="card">
      <div class="section-heading">1. Identity Verification</div>
      <div class="form-grid mb-4">
        <div class="form-row">
          <label class="label">ID Type</label>
          <select id="ver-id-type" class="inp">${['Passport','Driver Licence','Medicare'].map(t=>`<option>${t}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <label class="label">ID Number</label>
          <input id="ver-id-number" type="text" class="inp" placeholder="e.g. ABC123456">
        </div>
      </div>

      ${!isNone ? `
        <div class="divider"></div>
        <div class="section-heading">2. NameScan Screening</div>
        <div class="form-grid mb-4">
          <div class="form-row">
            <label class="label">Screening Date</label>
            <input id="scr-date" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-row">
            <label class="label">Result</label>
            <select id="scr-result" class="inp"><option>Clear</option><option>Hit - Investigate</option></select>
          </div>
        </div>
      ` : ''}

      ${isKey ? `
        <div class="divider"></div>
        <div class="section-heading">3. Background Checks (Fit & Proper)</div>
        <div class="form-grid">
          <div class="form-row">
            <label class="label">Police Check Date</label>
            <input id="vet-police-date" type="date" class="inp">
          </div>
          <div class="form-row">
            <label class="label">Bankruptcy Check Date</label>
            <input id="vet-bankrupt-date" type="date" class="inp">
          </div>
        </div>
      ` : ''}

      ${isNone ? `
        <div class="banner banner-success mt-4">
          <strong>Assessment complete.</strong> No further background vetting or NameScan screening is required for this role.
        </div>
      ` : ''}
    </div>`;
}

// ─── TAB 3: TRAINING ───────────────────────────────────────────────────────────
// Final evidence tab moved to last position.
function tabTraining(d) {
  return `
    <div class="card">
      <div class="section-heading">Training Evidence</div>
      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label">Training Type</label>
          <select id="trn-type" class="inp">
            <option value="standard">Standard AML/CTF training</option>
            <option value="enhanced">Enhanced (Key Personnel)</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">Completed Date</label>
          <input id="trn-completed" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-row">
          <label class="label">Provider</label>
          <input id="trn-provider" type="text" class="inp" placeholder="e.g. CPA Australia">
        </div>
      </div>
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.updateDraft = (key, val) => { S._draft[key] = val; };

window.toggleFunction = (id) => {
  let fns = S._draft.functions || [];
  if (fns.includes(id)) fns = fns.filter(f => f !== id);
  else fns.push(id);
  S._draft.functions = fns;
  S._draft.noneSelected = (fns.length === 0);
  render();
};

window.toggleNone = () => {
  S._draft.noneSelected = !S._draft.noneSelected;
  if (S._draft.noneSelected) S._draft.functions = [];
  render();
};

window.indTab = (tab) => {
  S.currentParams.tab = tab;
  render();
};

window.cancelIndividual = () => {
  const isStaff = S._draft?.isStaff;
  delete S._draft;
  go(isStaff ? 'staff' : 'individuals');
};

// saveIndividualRecord logic will now persist the isStaff flag and functional classification.
