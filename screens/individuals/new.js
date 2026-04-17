import { S, addIndividualToState } from '../../state/index.js';
import { 
  saveIndividual, saveVerification, saveScreening, 
  saveTrainingRecord, saveVettingRecord, saveAuditEntry, genId 
} from '../../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
// Handles both new and edit flows for individuals and staff.
// Entry point determines the initial 'isStaff' context.
// This file uses a 3-tab "Smart Flow" to ensure regulatory compliance.

export function screen() {
  const { individualId, tab, entryPoint } = S.currentParams || {};
  const isEdit = !!individualId;
  const ind    = isEdit ? S.individuals.find(i => i.individualId === individualId) : null;
  
  // 1. Initialize draft state and enforce isStaff context
  if (!S._draft) {
    S._draft = isEdit ? { ...ind } : { 
      isStaff: entryPoint === 'staff' || (ind?.isStaff ?? false),
      functions: ind?.functions || [],
      noneSelected: ind?.noneSelected ?? (entryPoint !== 'staff'),
      status: 'Active'
    };
  }
  const d = S._draft;
  const activeTab = tab || 'identity';

  // 2. Logic Engine: Classification is derived from functions (The Gold Standard)
  const keyFns = ['director', 'amlco', 'senior'];
  const stdFns = ['cdd', 'screen', 'monitor', 'smr'];
  const hasKey = d.functions?.some(f => keyFns.includes(f));
  const hasStd = d.functions?.some(f => stdFns.includes(f));
  const classification = hasKey ? 'Key Personnel' : hasStd ? 'Standard AML/CTF Staff' : 'No AML/CTF functions';

  // 3. Tab Navigation Definitions
  const tabs = [
    { key: 'identity', label: '1. Identity' },
    { key: 'vetting',  label: '2. Vetting & Verification' },
    { key: 'training', label: '3. Training' }
  ];

  // 4. Smart Navigation Button Logic
  let btnLabel = 'Save Record';
  let nextTab  = null;

  if (activeTab === 'identity') {
    if (classification === 'No AML/CTF functions') {
      btnLabel = 'Save & Finish';
      nextTab  = 'exit'; 
    } else {
      btnLabel = 'Save & Continue to Vetting';
      nextTab  = 'vetting';
    }
  } else if (activeTab === 'vetting') {
    btnLabel = 'Save & Continue to Training';
    nextTab  = 'training';
  } else {
    btnLabel = 'Complete Onboarding';
    nextTab  = 'exit';
  }

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <button onclick="cancelIndividual()" class="btn-ghost" style="padding:0;">
            ← ${d.isStaff ? 'Staff Register' : 'Back'}
          </button>
          <h1 class="screen-title">${isEdit ? 'Edit Record' : 'New Individual'}</h1>
          <p class="screen-subtitle" style="font-size:var(--font-size-sm); color:var(--color-text-muted);">${d.fullName || 'New Record Entry'}</p>
        </div>
        <span class="badge ${d.isStaff ? 'badge-primary' : 'badge-neutral'}">
          ${d.isStaff ? 'Staff Context' : 'Client Context'}
        </span>
      </div>

      <div class="filter-tabs mb-4">
        ${tabs.map(t => {
          const showDot = (t.key === 'vetting' || t.key === 'training') && 
                          classification !== 'No AML/CTF functions' && 
                          activeTab !== t.key;
          
          return `
            <button onclick="indTab('${t.key}')" class="filter-tab ${activeTab === t.key ? 'active' : ''}" style="position:relative;">
              ${t.label}
              ${showDot ? `<span class="status-dot status-dot-action" style="position:absolute; top:4px; right:4px; width:6px; height:6px;"></span>` : ''}
            </button>`;
        }).join('')}
      </div>

      <div class="tab-content">
        ${activeTab === 'identity' ? tabIdentity(d, classification) : ''}
        ${activeTab === 'vetting'  ? tabVettingMerged(d, classification) : ''}
        ${activeTab === 'training' ? tabTraining(d) : ''}
      </div>

      <div class="flex gap-3 mt-4" style="border-top: 0.5px solid var(--color-border); padding-top: var(--space-4);">
        <button onclick="cancelIndividual()" class="btn-sec flex-1">Cancel</button>
        <button onclick="handleSmartSave('${nextTab}')" class="btn flex-2">
          ${btnLabel}
        </button>
      </div>
    </div>`;
}

// ─── TAB: IDENTITY ────────────────────────────────────────────────────────────
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
      <p class="text-xs text-muted mb-3">Recording everyone—including those with no AML functions—demonstrates regulatory consideration.</p>
      
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
          <div class="check-row-desc">This person performs no regulated tasks. Assessment confirmed.</div>
        </div>
      </label>

      <div class="card-inset" style="background:var(--color-surface-alt)">
        <span class="label">System Classification</span>
        <div class="font-medium ${classification === 'Key Personnel' ? 'text-danger' : 'text-primary'}" style="color:${classification === 'Key Personnel' ? 'var(--color-danger-text)' : 'var(--color-primary)'}">${classification}</div>
      </div>
    </div>`;
}

// ─── TAB: VETTING & VERIFICATION ──────────────────────────────────────────────
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
          <select id="ver-id-type" class="inp">
            <option ${d.idType==='Passport'?'selected':''}>Passport</option>
            <option ${d.idType==='Driver Licence'?'selected':''}>Driver Licence</option>
            <option ${d.idType==='Medicare'?'selected':''}>Medicare</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">ID Number</label>
          <input id="ver-id-number" type="text" class="inp" value="${d.idNumber||''}" oninput="updateDraft('idNumber', this.value)">
        </div>
      </div>

      ${!isNone ? `
        <div class="divider"></div>
        <div class="section-heading">2. NameScan Screening</div>
        <div class="form-grid mb-4">
          <div class="form-row">
            <label class="label">Screening Date</label>
            <input id="scr-date" type="date" class="inp" value="${d.nsDate || new Date().toISOString().split('T')[0]}" oninput="updateDraft('nsDate', this.value)">
          </div>
          <div class="form-row">
            <label class="label">Result</label>
            <select id="scr-result" class="inp" onchange="updateDraft('nsResult', this.value)">
              <option value="">Select...</option>
              <option ${d.nsResult==='Clear'?'selected':''}>Clear</option>
              <option ${d.nsResult==='Hit'?'selected':''}>Hit - Investigate</option>
            </select>
          </div>
        </div>
      ` : ''}

      ${isKey ? `
        <div class="divider"></div>
        <div class="section-heading">3. Background Checks (Fit & Proper)</div>
        <div class="form-grid">
          <div class="form-row">
            <label class="label">Police Check Date</label>
            <input id="vet-police-date" type="date" class="inp" value="${d.policeDate||''}" oninput="updateDraft('policeDate', this.value)">
          </div>
          <div class="form-row">
            <label class="label">Bankruptcy Check Date</label>
            <input id="vet-bankrupt-date" type="date" class="inp" value="${d.bankruptDate||''}" oninput="updateDraft('bankruptDate', this.value)">
          </div>
        </div>
      ` : ''}

      ${isNone ? `
        <div class="banner banner-success mt-4">
          <strong>Assessment complete.</strong> No further background vetting or screening is required for roles with no AML functions.
        </div>
      ` : ''}
    </div>`;
}

// ─── TAB: TRAINING ────────────────────────────────────────────────────────────
function tabTraining(d) {
  return `
    <div class="card">
      <div class="section-heading">Training Evidence</div>
      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label">Training Type</label>
          <select id="trn-type" class="inp" onchange="updateDraft('trainingType', this.value)">
            <option value="standard" ${d.trainingType==='standard'?'selected':''}>Standard AML/CTF training</option>
            <option value="enhanced" ${d.trainingType==='enhanced'?'selected':''}>Enhanced (Key Personnel)</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">Completed Date</label>
          <input id="trn-completed" type="date" class="inp" value="${d.trainingDate || new Date().toISOString().split('T')[0]}" oninput="updateDraft('trainingDate', this.value)">
        </div>
        <div class="form-row">
          <label class="label">Provider</label>
          <input id="trn-provider" type="text" class="inp" value="${d.trainingProvider||''}" placeholder="e.g. CPA Australia" oninput="updateDraft('trainingProvider', this.value)">
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

window.handleSmartSave = async function(nextTab) {
  // Pass false to the save record function to prevent it from navigating away immediately
  await saveIndividualRecord(false); 
  
  if (nextTab === 'exit') {
    const isStaff = S._draft?.isStaff;
    delete S._draft;
    go(isStaff ? 'staff' : 'individuals');
  } else {
    indTab(nextTab);
    window.scrollTo(0,0);
  }
};

window.saveIndividualRecord = async function(shouldRedirect = true) {
  const { individualId } = S.currentParams || {};
  const isEdit = !!individualId;
  const d = S._draft;

  if (!d.fullName) { toast('Full legal name is required', 'err'); return; }

  const iid = isEdit ? individualId : genId('ind');
  const now = new Date().toISOString();

  const indData = {
    ...d,
    individualId: iid,
    firmId: S.firmId,
    updatedAt: now,
    createdAt: isEdit ? (d.createdAt || now) : now
  };

  try {
    await saveIndividual(iid, indData);
    addIndividualToState(indData);
    
    await saveAuditEntry({
      firmId: S.firmId,
      userId: S.individualId,
      action: isEdit ? 'individual_updated' : 'individual_created',
      targetId: iid,
      targetName: d.fullName,
      timestamp: now
    });

    if (shouldRedirect) {
      delete S._draft;
      go(d.isStaff ? 'staff' : 'individual-detail', { individualId: iid });
    }
  } catch (err) {
    console.error(err);
    toast('Save failed', 'err');
  }
};
