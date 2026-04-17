import { S, addIndividualToState } from '../../state/index.js';
import { 
  saveIndividual, saveVerification, saveScreening, 
  saveTrainingRecord, saveVettingRecord, saveAuditEntry, genId 
} from '../../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
// Handles new and edit flows. 
// Defaulting logic: All staff entries default to Key Personnel (highest safety).

export function screen() {
  const { individualId, tab, entryPoint } = S.currentParams || {};
  const isEdit = !!individualId;
  
  // 1. Find the individual in state
  const ind = S.individuals.find(i => i.individualId === individualId) || 
              S.staff?.find(s => s.individualId === individualId);

  // 2. State Sync: Ensure the draft matches the record if editing
  if (isEdit && ind && (!S._draft || S._draft.individualId !== individualId)) {
    S._draft = JSON.parse(JSON.stringify(ind)); 
  } 
  
  // 3. Logic: All staff default to Key Personnel tasks upon entry
  if (!S._draft) {
    const isStaff = entryPoint === 'staff';
    S._draft = { 
      isStaff: isStaff,
      // DEFAULT: Key Personnel tasks pre-selected for safety
      functions: isStaff ? ['director', 'amlco', 'senior'] : [], 
      noneSelected: false, 
      role: ind?.role || '',
      status: 'Active'
    };
  }

  const d = S._draft;
  const activeTab = tab || 'identity';

  // 4. Logic Engine: Classification derived from functions
  const keyFns = ['director', 'amlco', 'senior'];
  const stdFns = ['cdd', 'screen', 'monitor', 'smr'];
  const hasKey = d.functions?.some(f => keyFns.includes(f));
  const hasStd = d.functions?.some(f => stdFns.includes(f));
  
  // If no boxes are checked and 'noneSelected' is false, it stays Key Personnel
  const classification = hasKey || (!hasStd && !d.noneSelected && d.isStaff) 
    ? 'Key Personnel' 
    : hasStd ? 'Standard AML/CTF Staff' 
    : 'No AML/CTF functions';

  // 5. Auto-populate training type
  if (!d.trainingType && classification !== 'No AML/CTF functions') {
    d.trainingType = (classification === 'Key Personnel') ? 'enhanced' : 'standard';
  }

  const tabs = [
    { key: 'identity', label: '1. Identity' },
    { key: 'vetting',  label: '2. Vetting & Verification' },
    { key: 'training', label: '3. Training' }
  ];

  // 6. Smart Navigation
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
          <p class="screen-subtitle" style="font-size:var(--font-size-sm); color:var(--color-text-muted);">${d.fullName || d.name || 'New Record Entry'}</p>
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
      <p class="text-xs text-muted mb-3">Staff default to Key Personnel requirements unless reassessed.</p>
      
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

// ─── TAB: VETTING & VERIFICATION ──────────────────────────────────────────────
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
          <div class="form-row span-2">
            <label class="label">Scan ID / Reference</label>
            <input type="text
