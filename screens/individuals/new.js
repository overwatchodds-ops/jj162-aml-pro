import { S, addIndividualToState } from '../../state/index.js';
import { 
  saveIndividual, saveVerification, saveScreening, 
  saveTrainingRecord, saveVettingRecord, saveAuditEntry, genId 
} from '../../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { individualId, tab, entryPoint } = S.currentParams || {};
  const isEdit = !!individualId;
  
  const ind = S.individuals.find(i => i.individualId === individualId) || 
              S.staff?.find(s => s.individualId === individualId);

  if (isEdit && ind && (!S._draft || S._draft.individualId !== individualId)) {
    S._draft = JSON.parse(JSON.stringify(ind)); 
  } 
  
  if (!S._draft) {
    const isStaff = entryPoint === 'staff';
    S._draft = { 
      isStaff: isStaff,
      functions: isStaff ? ['director', 'amlco', 'senior'] : [], 
      noneSelected: false, 
      role: ind?.role || '',
      status: 'Active'
    };
  }

  const d = S._draft;
  const activeTab = tab || 'identity';

  const keyFns = ['director', 'amlco', 'senior'];
  const stdFns = ['cdd', 'screen', 'monitor', 'smr'];
  const hasKey = d.functions?.some(f => keyFns.includes(f));
  const hasStd = d.functions?.some(f => stdFns.includes(f));
  
  const classification = hasKey || (!hasStd && !d.noneSelected && d.isStaff) 
    ? 'Key Personnel' 
    : hasStd ? 'Standard AML/CTF Staff' 
    : 'No AML/CTF functions';

  if (!d.trainingType && classification !== 'No AML/CTF functions') {
    d.trainingType = (classification === 'Key Personnel') ? 'enhanced' : 'standard';
  }

  const tabs = [
    { key: 'identity', label: '1. Identity' },
    { key: 'vetting',  label: '2. Vetting & Verification' },
    { key: 'training', label: '3. Training' }
  ];

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

  // FIXED: Standard map without nested backticks to prevent SyntaxErrors
  const tabButtons = tabs.map(t => {
    const isActive = activeTab === t.key ? 'active' : '';
    const showDot = (t.key === 'vetting' || t.key === 'training') && 
                    classification !== 'No AML/CTF functions' && 
                    activeTab !== t.key;
    const dotHtml = showDot ? '<span class="status-dot status-dot-action" style="position:absolute; top:4px; right:4px; width:6px; height:6px;"></span>' : '';
    
    return '<button onclick="indTab(\'' + t.key + '\')" class="filter-tab ' + isActive + '" style="position:relative;">' + 
             t.label + dotHtml + 
           '</button>';
  }).join('');

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <button onclick="cancelIndividual()" class="btn-ghost" style="padding:0;">
            ← ${d.isStaff ? 'Staff Register' : 'Back'}
          </button>
          <h1 class="screen-title">${isEdit ? 'Edit Record' : 'New Individual'}</h1>
          <p class="screen-subtitle" style="font-size:var(--font-size-sm); color:var(--color-text-muted);">${d.fullName || d.name || 'New Record Entry'}</p>
        </div>
        <span class="badge ${d.isStaff ? 'badge-primary' : 'badge-neutral'}">
          ${d.isStaff ? 'Staff Context' : 'Client Context'}
        </span>
      </div>

      <div class="filter-tabs mb-4">
        ${tabButtons}
      </div>

      <div class="tab-content">
        ${activeTab === 'identity' ? tabIdentity(d, classification) : ''}
        ${activeTab === 'vetting'  ? tabVettingMerged(d, classification) : ''}
        ${activeTab === 'training' ? tabTraining(d, classification) : ''}
      </div>

      <div class="flex gap-3 mt-4" style="border-top: 0.5px solid var(--color-border); padding-top: var(--space-4);">
        <button onclick="cancelIndividual()" class="btn-sec flex-1">Cancel</button>
        <button onclick="handleSmartSave('${nextTab}')" class="btn flex-2">
          ${btnLabel}
        </button>
      </div>
    </div>`;
}

// ─── TABS ───
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
          <input id="ind-name" type="text" class="inp" value="${d.fullName || d.name || ''}" oninput="updateDraft('fullName', this.value)">
        </div>
        <div class="form-row">
          <label class="label label-required">Date of birth</label>
          <input id="ind-dob" type="date" class="inp" value="${d.dateOfBirth||''}" oninput="updateDraft('dateOfBirth', this.value)">
        </div>
        <div class="form-row">
          <label class="label label-required">Job Title / Role</label>
          <input id="ind-role" type="text" class="inp" value="${d.role||''}" oninput="updateDraft('role', this.value)">
        </div>
      </div>

      <div class="section-heading">AML/CTF Functions</div>
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
          <div class="check-row-desc">Individual performs no regulated tasks. Assessment confirmed.</div>
        </div>
      </label>

      <div class="card-inset" style="background:var(--color-surface-alt)">
        <span class="label">System Classification</span>
        <div class="font-medium" style="color:${classification === 'Key Personnel' ? 'var(--color-danger-text)' : 'var(--color-primary)'}">${classification}</div>
      </div>
    </div>`;
}

function tabVettingMerged(d, classification) {
  const isKey  = classification === 'Key Personnel';
  const isNone = classification === 'No AML/CTF functions';

  return `
    <div class="card">
      <div class="section-heading">1. Identity Verification</div>
      <div class="form-grid mb-4">
        <div class="form-row">
          <label class="label">ID Type</label>
          <select id="ver-id-type" class="inp" onchange="updateDraft('idType', this.value)">
            <option value="">Select...</option>
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
        <div class="section-heading">3. Background Checks</div>
        <div class="form-grid mb-4">
          <div class="form-row">
            <label class="label">Police Check Date</label>
            <input id="vet-police-date" type="date" class="inp" value="${d.policeDate||''}" oninput="updateDraft('policeDate', this.value)">
          </div>
          <div class="form-row">
            <label class="label">Police Result</label>
            <select class="inp" onchange="updateDraft('policeResult', this.value)">
              <option value="">Select...</option>
              <option ${d.policeResult==='Pass'?'selected':''}>Pass</option>
              <option ${d.policeResult==='Fail'?'selected':''}>Fail</option>
            </select>
          </div>
          <div class="form-row">
            <label class="label">Bankruptcy Check Date</label>
            <input id="vet-bankrupt-date" type="date" class="inp" value="${d.bankruptDate||''}" oninput="updateDraft('bankruptDate', this.value)">
          </div>
          <div class="form-row">
            <label class="label">Bankruptcy Result</label>
            <select class="inp" onchange="updateDraft('bankruptResult', this.value)">
              <option value="">Select...</option>
              <option ${d.bankruptResult==='Clear'?'selected':''}>Clear</option>
              <option ${d.bankruptResult==='Finding'?'selected':''}>Finding</option>
            </select>
          </div>
        </div>
      ` : ''}

      ${!isNone ? `
        <div class="divider"></div>
        <div class="section-heading">4. Annual Declaration</div>
        <div class="form-grid mb-4">
          <div class="form-row">
            <label class="label">Declaration Date</label>
            <input id="vet-decl-date" type="date" class="inp" value="${d.declDate||''}" onchange="autoSetDeclNext(this.value)">
          </div>
          <div class="form-row">
            <label class="label">Next Declaration Due</label>
            <input id="vet-decl-next" type="date" class="inp" value="${d.declNext||''}" oninput="updateDraft('declNext', this.value)">
          </div>
        </div>
        <label class="check-row ${d.declSigned ? 'selected' : ''}">
          <input type="checkbox" ${d.declSigned ? 'checked' : ''} onchange="updateDraft('declSigned', this.checked); render();">
          <div>
            <div class="check-row-label">Declaration Signed</div>
            <div class="check-row-desc">Fit & proper suitability confirmed.</div>
          </div>
        </label>
      ` : ''}
    </div>`;
}

function tabTraining(d, classification) {
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
          <input id="trn-completed" type="date" class="inp" value="${d.trainingDate || new Date().toISOString().split('T')[0]}" onchange="autoSetTrainingExpiry(this.value)">
        </div>
        <div class="form-row">
          <label class="label">Next Training Due</label>
          <input id="trn-expiry" type="date" class="inp" value="${d.trainingExpiry||''}" oninput="updateDraft('trainingExpiry', this.value)">
        </div>
      </div>
    </div>`;
}

// ─── ACTIONS ───
window.updateDraft = (key, val) => { S._draft[key] = val; };

window.autoSetTrainingExpiry = (val) => {
  if (!val) return;
  const date = new Date(val);
  date.setFullYear(date.getFullYear() + 1);
  S._draft.trainingDate = val;
  S._draft.trainingExpiry = date.toISOString().split('T')[0];
  render();
};

window.autoSetDeclNext = (val) => {
  if (!val) return;
  const date = new Date(val);
  date.setFullYear(date.getFullYear() + 1);
  S._draft.declDate = val;
  S._draft.declNext = date.toISOString().split('T')[0];
  render();
};

window.toggleFunction = (id) => {
  let fns = S._draft.functions || [];
  if (fns.includes(id)) fns = fns.filter(f => f !== id);
  else fns.push(id);
  S._draft.functions = fns;
  S._draft.noneSelected = false; 
  delete S._draft.trainingType; 
  render();
};

window.toggleNone = () => {
  S._draft.noneSelected = !S._draft.noneSelected;
  if (S._draft.noneSelected) S._draft.functions = [];
  delete S._draft.trainingType;
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

  if (!d.fullName && !d.name) { toast('Full legal name is required', 'err'); return; }
  if (!d.role) { toast('Job Title / Role is required', 'err'); return; }

  // RE-USE EXISTING ID IF IT EXISTS
  const iid = isEdit ? individualId : (d.individualId || genId('ind'));
  d.individualId = iid;
  
  const now = new Date().toISOString();

  const indData = {
    ...d,
    fullName: d.fullName || d.name,
    individualId: iid,
    firmId: S.firmId,
    updatedAt: now,
    createdAt: isEdit ? (d.createdAt || now) : now
  };

  try {
    await saveIndividual(iid, indData);
    
    // UPSERT LOGIC
    const existingIdx = S.individuals.findIndex(i => i.individualId === iid);
    if (existingIdx > -1) {
      S.individuals[existingIdx] = indData;
    } else {
      S.individuals.unshift(indData);
    }
    
    await saveAuditEntry({
      firmId: S.firmId,
      userId: S.individualId,
      action: isEdit ? 'individual_updated' : 'individual_created',
      targetId: iid,
      targetName: indData.fullName,
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
