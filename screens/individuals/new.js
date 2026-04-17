import { S, addIndividualToState } from '../../state/index.js';
import { 
  saveIndividual, saveVerification, saveScreening, 
  saveTrainingRecord, saveVettingRecord, saveAuditEntry, genId 
} from '../../firebase/firestore.js';

export function screen() {
  const { individualId, tab, entryPoint } = S.currentParams || {};
  const isEdit = !!individualId;
  const isStaffView = entryPoint === 'staff' || S.currentScreen === 'staff' || S.currentScreen === 'staff-new';

  const ind = S.individuals.find(i => i.individualId === individualId) || 
              (S.staff || []).find(s => s.individualId === individualId);

  if (isEdit && ind && (!S._draft || S._draft.individualId !== individualId)) {
    S._draft = JSON.parse(JSON.stringify(ind)); 
  } 
  
  if (!S._draft) {
    S._draft = { isStaff: isStaffView, functions: [], noneSelected: false, role: ind?.role || '', status: 'Active' };
  } else if (isStaffView) {
    S._draft.isStaff = true;
  }

  const d = S._draft;
  const activeTab = tab || 'identity';
  const contextLabel = d.isStaff ? 'Staff Member' : 'Individual';
  const contextBadge = d.isStaff ? 'Staff Context' : 'Client Context';
  const contextSubtitle = d.isStaff 
    ? 'Manage vetting, background checks, and AML/CTF training for firm personnel.' 
    : 'Manage identity verification and onboarding requirements.';

  const keyFns = ['director', 'amlco', 'senior'];
  const stdFns = ['cdd', 'screen', 'monitor', 'smr'];
  const hasKey = d.functions?.some(f => keyFns.includes(f));
  const hasStd = d.functions?.some(f => stdFns.includes(f));
  
  const classification = hasKey || (!hasStd && !d.noneSelected && d.isStaff) 
    ? 'Key Personnel' 
    : hasStd ? 'Standard AML/CTF Staff' 
    : 'No AML/CTF functions';

  const tabs = [
    { key: 'identity', label: '1. Identity' },
    { key: 'vetting',  label: '2. Vetting & Verification' },
    { key: 'training', label: '3. Training' }
  ];

  const tabButtons = tabs.map(t => {
    const isActive = activeTab === t.key ? 'active' : '';
    const showDot = (t.key === 'vetting' || t.key === 'training') && 
                    classification !== 'No AML/CTF functions' && activeTab !== t.key;
    const dotHtml = showDot ? '<span class="status-dot status-dot-action" style="position:absolute; top:4px; right:4px; width:6px; height:6px;"></span>' : '';
    return '<button onclick="indTab(\'' + t.key + '\')" class="filter-tab ' + isActive + '" style="position:relative;">' + t.label + dotHtml + '</button>';
  }).join('');

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <button onclick="cancelIndividual()" class="btn-ghost" style="padding:0;">← ${d.isStaff ? 'Staff Register' : 'Back'}</button>
          <h1 class="screen-title">${isEdit ? 'Edit ' + contextLabel : 'New ' + contextLabel}</h1>
          <p class="screen-subtitle">${contextSubtitle}</p>
        </div>
        <span class="badge ${d.isStaff ? 'badge-primary' : 'badge-neutral'}">${contextBadge}</span>
      </div>
      <div class="filter-tabs mb-4">${tabButtons}</div>
      <div class="tab-content">
        ${activeTab === 'identity' ? tabIdentity(d, classification) : ''}
        ${activeTab === 'vetting'  ? tabVettingMerged(d, classification) : ''}
        ${activeTab === 'training' ? tabTraining(d) : ''}
      </div>
      <div class="flex gap-3 mt-4" style="border-top: 0.5px solid var(--color-border); padding-top: var(--space-4);">
        <button onclick="cancelIndividual()" class="btn-sec flex-1">Cancel</button>
        <button onclick="handleSmartSave('${activeTab === 'training' || (activeTab === 'identity' && classification === 'No AML/CTF functions') ? 'exit' : (activeTab === 'identity' ? 'vetting' : 'training')}')" class="btn flex-2">
          ${activeTab === 'training' || (activeTab === 'identity' && classification === 'No AML/CTF functions') ? 'Complete Onboarding' : 'Save & Continue'}
        </button>
      </div>
    </div>`;
}

function tabIdentity(d, classification) {
  const FN_KEY = [
    { id:'director', label:'Director / owner / beneficial owner', desc:'Governance responsibility' },
    { id:'amlco',    label:'AMLCO or delegate', desc:'Formal AML responsibility' },
    { id:'senior',   label:'Senior manager', desc:'Approval authority' },
    { id:'cdd',      label:'Processes CDD / KYC', desc:'Identity verification tasks' },
    { id:'screen',   label:'Screens clients', desc:'PEP/Sanctions checks' },
    { id:'monitor',  label:'Transaction monitoring', desc:'Reviews unusual activity' },
    { id:'smr',      label:'SMR Reporting', desc:'Suspicious matter support' }
  ];

  return `
    <div class="card">
      <div class="section-heading">Core identity</div>
      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name *</label>
          <input id="ind-name" type="text" class="inp" value="${d.fullName || d.name || ''}" oninput="updateDraft('fullName', this.value)">
        </div>
        <div class="form-row">
          <label class="label label-required">Date of birth *</label>
          <input type="date" class="inp" value="${d.dateOfBirth || ''}" oninput="updateDraft('dateOfBirth', this.value)">
        </div>
        <div class="form-row">
          <label class="label label-required">Job Title / Role *</label>
          <input type="text" class="inp" value="${d.role || ''}" oninput="updateDraft('role', this.value)">
        </div>
      </div>
      <div class="section-heading">AML/CTF Functions</div>
      ${FN_KEY.map(f => `
        <label class="check-row">
          <input type="checkbox" ${d.functions?.includes(f.id) ? 'checked' : ''} onchange="toggleFunction('${f.id}')">
          <div><div class="check-row-label">${f.label}</div><div class="check-row-desc">${f.desc}</div></div>
        </label>`).join('')}
      <div class="card-inset" style="background:var(--color-surface-alt)">
        <span class="label">System Classification</span>
        <div class="font-medium">${classification}</div>
      </div>
    </div>`;
}
function tabVettingMerged(d, classification) {
  const isKey = classification === 'Key Personnel';
  return `
    <div class="card">
      <div class="section-heading">Identity Verification</div>
      <div class="form-grid mb-4">
        <div class="form-row"><label class="label">ID Type</label><input type="text" class="inp" value="${d.idType || ''}" oninput="updateDraft('idType', this.value)"></div>
        <div class="form-row"><label class="label">ID Number</label><input type="text" class="inp" value="${d.idNumber || ''}" oninput="updateDraft('idNumber', this.value)"></div>
      </div>
      <div class="divider"></div>
      <div class="section-heading">NameScan Screening</div>
      <div class="form-grid mb-4">
        <div class="form-row"><label class="label">Result</label><select class="inp" onchange="updateDraft('nsResult', this.value)"><option value="">Select...</option><option ${d.nsResult==='Clear'?'selected':''}>Clear</option><option ${d.nsResult==='Hit'?'selected':''}>Hit</option></select></div>
      </div>
      ${isKey ? `
        <div class="divider"></div>
        <div class="section-heading">Background Checks</div>
        <div class="form-grid mb-4">
          <div class="form-row">
            <label class="label">Police Check</label>
            <select class="inp" onchange="updateDraft('policeResult', this.value)">
              <option value="">Select...</option>
              <option ${d.policeResult==='Pass'?'selected':''}>Pass</option>
              <option ${d.policeResult==='Fail'?'selected':''}>Fail</option>
            </select>
          </div>
          <div class="form-row">
            <label class="label">Bankruptcy Check</label>
            <select class="inp" onchange="updateDraft('bankruptResult', this.value)">
              <option value="">Select...</option>
              <option ${d.bankruptResult==='Clear'?'selected':''}>Clear</option>
              <option ${d.bankruptResult==='Found'?'selected':''}>Found</option>
            </select>
          </div>
        </div>
      ` : ''}
    </div>`;
}

function tabTraining(d) {
  return `
    <div class="card">
      <div class="section-heading">Training Evidence</div>
      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label">Training Provider</label>
          <input type="text" class="inp" value="${d.trainingProvider || ''}" oninput="updateDraft('trainingProvider', this.value)">
        </div>
      </div>
    </div>`;
}

window.updateDraft = (key, val) => { S._draft[key] = val; };
window.toggleFunction = (id) => {
  let fns = S._draft.functions || [];
  if (fns.includes(id)) fns = fns.filter(f => f !== id);
  else fns.push(id);
  S._draft.functions = fns;
  render();
};
window.indTab = (tab) => { S.currentParams.tab = tab; render(); };
window.cancelIndividual = () => { const isStaff = S._draft?.isStaff; delete S._draft; go(isStaff ? 'staff' : 'individuals'); };

window.handleSmartSave = async function(nextTab) {
  const success = await saveIndividualRecord(false); 
  if (!success) return; 
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
  const d = S._draft;
  if (!d.fullName && !d.name) { toast('Full legal name is required', 'err'); return false; }
  if (!d.role) { toast('Job Title / Role is required', 'err'); return false; }

  const iid = d.individualId || genId('ind');
  d.individualId = iid;
  const now = new Date().toISOString();
  const indData = { ...d, fullName: d.fullName || d.name, individualId: iid, firmId: S.firmId, updatedAt: now };

  try {
    await saveIndividual(iid, indData);
    const existingIdx = S.individuals.findIndex(i => i.individualId === iid);
    if (existingIdx > -1) S.individuals[existingIdx] = indData;
    else S.individuals.unshift(indData);
    if (shouldRedirect) {
      const isStaffContext = d.isStaff === true;
      delete S._draft;
      go(isStaffContext ? 'staff' : 'individual-detail', { individualId: iid });
    }
    return true;
  } catch (err) {
    toast('Save failed', 'err');
    return false;
  }
};
