import { S }              from '../state/index.js';
import { MATRIX }         from '../state/matrix.js';
import { updateFirmProfile, saveAuditEntry, fmtDate } from '../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { tab } = S.currentParams || {};
  const activeTab = tab || 'details';
  const firm = S.firm || {};

  const tabs = [
    { key: 'details',   label: 'Firm details'   },
    { key: 'enrolment', label: 'AUSTRAC'         },
    { key: 'services',  label: 'Services'        },
    { key: 'risk',      label: 'Risk Assessment' },
    { key: 'program',   label: 'AML/CTF Program' },
  ];

  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="go('firm-profile')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Firm Profile</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">Edit firm profile</h1>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:2px;border-bottom:0.5px solid var(--color-border);margin-bottom:var(--space-5);overflow-x:auto;">
        ${tabs.map(t => `
          <button
            onclick="firmTab('${t.key}')"
            style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);padding:var(--space-2) var(--space-3);border:none;background:none;cursor:pointer;white-space:nowrap;font-family:var(--font-family);
              color:${activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)'};
              border-bottom:${activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent'};
              margin-bottom:-0.5px;"
          >${t.label}</button>
        `).join('')}
      </div>

      ${activeTab === 'details'   ? tabDetails(firm)   : ''}
      ${activeTab === 'enrolment' ? tabEnrolment(firm) : ''}
      ${activeTab === 'services'  ? tabServices(firm)  : ''}
      ${activeTab === 'risk'      ? tabRisk(firm)      : ''}
      ${activeTab === 'program'   ? tabProgram(firm)   : ''}
    </div>`;
}

// ─── TAB: DETAILS ─────────────────────────────────────────────────────────────
function tabDetails(firm) {
  return `
    <div class="card">
      <div class="section-heading">Firm details</div>
      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Firm / practice name</label>
          <input id="firm-name" type="text" class="inp" value="${firm.firmName||''}" placeholder="Wong & Associates">
        </div>
        <div class="form-row">
          <label class="label label-required">ABN</label>
          <input id="firm-abn" type="text" class="inp" value="${firm.abn||''}" placeholder="12 345 678 901">
        </div>
        <div class="form-row">
          <label class="label">ACN</label>
          <input id="firm-acn" type="text" class="inp" value="${firm.acn||''}" placeholder="123 456 789">
        </div>
        <div class="form-row">
          <label class="label">Registered address</label>
          <input id="firm-address" type="text" class="inp" value="${firm.address||''}" placeholder="123 Main St, Sydney NSW 2000">
        </div>
        <div class="form-row">
          <label class="label">Phone</label>
          <input id="firm-phone" type="tel" class="inp" value="${firm.phone||''}" placeholder="02 9999 0000">
        </div>
        <div class="form-row">
          <label class="label">Email</label>
          <input id="firm-email" type="email" class="inp" value="${firm.email||''}" placeholder="admin@firm.com.au">
        </div>

      </div>
      <div id="details-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('firm-profile')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveFirmDetails()" class="btn" style="flex:2;">Save details</button>
      </div>
    </div>`;
}

// ─── TAB: ENROLMENT ───────────────────────────────────────────────────────────
function tabEnrolment(firm) {
  const enrolment = firm.austracEnrolment || {};
  return `
    <div class="card">
      <div class="section-heading">AUSTRAC enrolment</div>
      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label">Enrolment ID</label>
          <input id="enr-id" type="text" class="inp" value="${enrolment.enrolmentId||''}" placeholder="AUSTRAC-2026-XXXXX">
        </div>
        <div class="form-row">
          <label class="label">Enrolment date</label>
          <input id="enr-date" type="date" class="inp" value="${enrolment.enrolmentDate||''}">
        </div>
        <div class="form-row">
          <label class="label">Status</label>
          <select id="enr-status" class="inp">
            <option value="active"   ${enrolment.status==='active'  ?'selected':''}>Active</option>
            <option value="pending"  ${enrolment.status==='pending' ?'selected':''}>Pending</option>
            <option value="inactive" ${enrolment.status==='inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">Next confirmation date</label>
          <input id="enr-next" type="date" class="inp" value="${enrolment.nextConfirmationDate||''}">
        </div>

      </div>
      <div class="banner banner-info" style="margin-top:var(--space-3);">
        Don't have an enrolment ID yet?
        <a href="https://www.austrac.gov.au/business/how-comply-guidance-and-resources/enrolment" target="_blank" style="color:var(--color-info-text);font-weight:var(--font-weight-medium);">Enrol via AUSTRAC Online →</a>
      </div>
      <div id="enr-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('firm-profile')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveFirmEnrolment()" class="btn" style="flex:2;">Save enrolment</button>
      </div>
    </div>`;
}

// ─── TAB: SERVICES ────────────────────────────────────────────────────────────
function tabServices(firm) {
  const selected = firm.designatedServices || [];
  const categories = [...new Set(MATRIX.map(m => m.category))];

  return `
    <div class="card">
      <div class="section-heading">Designated services</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Select every service your firm provides. This determines your AML/CTF scope and drives your risk assessment.</p>

      ${categories.map(cat => `
        <div style="margin-bottom:var(--space-4);">
          <div style="font-size:10px;font-weight:var(--font-weight-medium);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2);">${cat}</div>
          ${MATRIX.filter(m => m.category === cat).map(m => `
            <label class="check-row ${selected.includes(m.id) ? (m.status==='IN'?'selected-primary':'selected') : ''}">
              <input type="checkbox" ${selected.includes(m.id)?'checked':''} onchange="toggleService(${m.id},this)" style="margin-top:2px;flex-shrink:0;">
              <div style="flex:1;">
                <div class="check-row-label">${m.task}</div>
                <div class="check-row-desc">${m.table6 || 'Out of scope'}</div>
              </div>
              <span class="badge ${m.status==='IN'?'badge-danger':m.status==='OUT'?'badge-success':'badge-warning'}" style="flex-shrink:0;">
                ${m.status}
              </span>
            </label>`).join('')}
        </div>`).join('')}

      <div id="svc-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('firm-profile')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveFirmServices()" class="btn" style="flex:2;">Save services</button>
      </div>
    </div>`;
}

// ─── TAB: RISK ────────────────────────────────────────────────────────────────
function tabRisk(firm) {
  const risk = firm.riskAssessment || {};
  const ratings = ['Low','Medium','High'];

  return `
    <div class="card">
      <div class="section-heading">Firm risk assessment</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Assess your firm's overall AML/CTF risk based on the services you provide, your client base, and geographic exposure.</p>

      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

        <div class="form-row">
          <label class="label">Service risk</label>
          <select id="risk-service" class="inp">
            <option value="">Select...</option>
            ${ratings.map(r=>`<option value="${r}" ${risk.serviceRisk===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label">Client risk</label>
          <select id="risk-client" class="inp">
            <option value="">Select...</option>
            ${ratings.map(r=>`<option value="${r}" ${risk.clientRisk===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label">Geographic risk</label>
          <select id="risk-geo" class="inp">
            <option value="">Select...</option>
            ${ratings.map(r=>`<option value="${r}" ${risk.geographicRisk===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label">Proliferation financing risk</label>
          <select id="risk-pf" class="inp">
            <option value="">Select...</option>
            ${ratings.map(r=>`<option value="${r}" ${risk.pfRisk===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>

      </div>

      <div class="form-row" style="margin-top:var(--space-3);">
        <label class="label label-required">Overall risk rating</label>
        <select id="risk-overall" class="inp">
          <option value="">Select...</option>
          ${ratings.map(r=>`<option value="${r}" ${risk.rating===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <label class="label label-required">Assessed by</label>
        <input id="risk-by" type="text" class="inp" value="${risk.assessedBy||''}" placeholder="Staff member name">
      </div>

      <div class="form-row">
        <label class="label label-required">Assessed date</label>
        <input id="risk-date" type="date" class="inp" value="${risk.assessedDate||new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-row">
        <label class="label">Next review date</label>
        <input id="risk-next" type="date" class="inp" value="${risk.nextReviewDate||''}">
      </div>

      <div class="form-row">
        <label class="label">Methodology / notes</label>
        <textarea id="risk-methodology" class="inp" rows="4" placeholder="Describe the methodology used and key risk factors considered...">${risk.methodology||''}</textarea>
      </div>

      <div id="risk-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('firm-profile')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveFirmRisk()" class="btn" style="flex:2;">Save risk assessment</button>
      </div>
    </div>`;
}

// ─── TAB: PROGRAM ─────────────────────────────────────────────────────────────
function tabProgram(firm) {
  const program = firm.amlProgram || {};
  return `
    <div class="card">
      <div class="section-heading">AML/CTF Program</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Record the approval details for your firm's AML/CTF Program. The program document itself should be stored in your firm's document system.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Program version</label>
          <input id="prog-version" type="text" class="inp" value="${program.version||''}" placeholder="e.g. 1.0, 2.1">
        </div>
        <div class="form-row">
          <label class="label label-required">Approved by</label>
          <input id="prog-approved-by" type="text" class="inp" value="${program.approvedBy||''}" placeholder="Name of approver (AMLCO or principal)">
        </div>
        <div class="form-row">
          <label class="label label-required">Approved date</label>
          <input id="prog-approved-date" type="date" class="inp" value="${program.approvedDate||new Date().toISOString().split('T')[0]}" onchange="progAutoNextReview(this.value)">
        </div>
        <div class="form-row">
          <label class="label">Next review date</label>
          <input id="prog-next-review" type="date" class="inp" value="${program.nextReviewDate||''}">
        </div>
        <div class="form-row">
          <label class="label">Document link</label>
          <input id="prog-doc-link" type="url" class="inp" value="${program.documentLink||''}" placeholder="https://drive.google.com/...">
        </div>

      </div>

      <div class="banner banner-info" style="margin-top:var(--space-3);">
        AUSTRAC requires your AML/CTF Program to be reviewed at least annually. Set a next review date to receive a reminder.
      </div>

      <div id="prog-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('firm-profile')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveFirmProgram()" class="btn" style="flex:2;">Save program</button>
      </div>
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.firmTab = function(tab) {
  S.currentParams = { ...S.currentParams, tab };
  render();
};

// Track service selections in memory
let _serviceSelections = null;

window.toggleService = function(id, cb) {
  if (!_serviceSelections) {
    _serviceSelections = new Set(S.firm?.designatedServices || []);
  }
  if (cb.checked) _serviceSelections.add(id);
  else _serviceSelections.delete(id);
};

async function auditFirm(action, detail) {
  const now = new Date().toISOString();
  await saveAuditEntry({
    firmId:     S.firmId,
    userId:     S.individualId,
    userName:   S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
    action,
    targetType: 'firm',
    targetId:   S.firmId,
    targetName: S.firm?.firmName || 'Firm',
    detail,
    timestamp:  now,
  });
}

window.saveFirmDetails = async function() {
  const name  = document.getElementById('firm-name')?.value?.trim();
  const abn   = document.getElementById('firm-abn')?.value?.trim();
  const errEl = document.getElementById('details-error');
  errEl.style.display = 'none';

  if (!name) { errEl.textContent='Firm name is required.'; errEl.style.display='block'; return; }
  if (!abn)  { errEl.textContent='ABN is required.'; errEl.style.display='block'; return; }

  const fields = {
    firmName: name,
    abn,
    acn:     document.getElementById('firm-acn')?.value?.trim()     || '',
    address: document.getElementById('firm-address')?.value?.trim() || '',
    phone:   document.getElementById('firm-phone')?.value?.trim()   || '',
    email:   document.getElementById('firm-email')?.value?.trim()   || '',
  };

  try {
    await updateFirmProfile(S.firmId, fields);
    Object.assign(S.firm, fields);
    await auditFirm('firm_details_updated', `Firm details updated — ${name}`);
    toast('Firm details saved');
    go('firm-profile');
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveFirmEnrolment = async function() {
  const errEl = document.getElementById('enr-error');
  errEl.style.display = 'none';

  const fields = {
    austracEnrolment: {
      enrolmentId:          document.getElementById('enr-id')?.value?.trim()   || '',
      enrolmentDate:        document.getElementById('enr-date')?.value         || '',
      status:               document.getElementById('enr-status')?.value       || 'active',
      nextConfirmationDate: document.getElementById('enr-next')?.value         || '',
    }
  };

  try {
    await updateFirmProfile(S.firmId, fields);
    S.firm.austracEnrolment = fields.austracEnrolment;
    await auditFirm('austrac_enrolment_updated', `AUSTRAC enrolment details updated`);
    toast('Enrolment details saved');
    go('firm-profile');
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveFirmServices = async function() {
  const errEl = document.getElementById('svc-error');
  errEl.style.display = 'none';

  const selected = _serviceSelections
    ? Array.from(_serviceSelections)
    : (S.firm?.designatedServices || []);

  const fields = { designatedServices: selected };

  try {
    await updateFirmProfile(S.firmId, fields);
    S.firm.designatedServices = selected;
    _serviceSelections = null;
    await auditFirm('services_updated', `Designated services updated — ${selected.length} services selected`);
    toast('Designated services saved');
    go('firm-profile');
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveFirmRisk = async function() {
  const rating = document.getElementById('risk-overall')?.value;
  const by     = document.getElementById('risk-by')?.value?.trim();
  const date   = document.getElementById('risk-date')?.value;
  const errEl  = document.getElementById('risk-error');
  errEl.style.display = 'none';

  if (!rating) { errEl.textContent='Overall risk rating is required.'; errEl.style.display='block'; return; }
  if (!by)     { errEl.textContent='Assessed by is required.'; errEl.style.display='block'; return; }
  if (!date)   { errEl.textContent='Assessed date is required.'; errEl.style.display='block'; return; }

  const fields = {
    riskAssessment: {
      rating,
      serviceRisk:      document.getElementById('risk-service')?.value     || '',
      clientRisk:       document.getElementById('risk-client')?.value      || '',
      geographicRisk:   document.getElementById('risk-geo')?.value         || '',
      pfRisk:           document.getElementById('risk-pf')?.value          || '',
      assessedBy:       by,
      assessedDate:     date,
      nextReviewDate:   document.getElementById('risk-next')?.value        || '',
      methodology:      document.getElementById('risk-methodology')?.value?.trim() || '',
    }
  };

  try {
    await updateFirmProfile(S.firmId, fields);
    S.firm.riskAssessment = fields.riskAssessment;
    await auditFirm('risk_assessment_updated', `Firm risk assessment updated — ${rating} risk — assessed by ${by}`);
    toast('Risk assessment saved');
    go('firm-profile');
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveFirmProgram = async function() {
  const version     = document.getElementById('prog-version')?.value?.trim();
  const approvedBy  = document.getElementById('prog-approved-by')?.value?.trim();
  const approvedDate = document.getElementById('prog-approved-date')?.value;
  const errEl       = document.getElementById('prog-error');
  errEl.style.display = 'none';

  if (!version)      { errEl.textContent='Program version is required.'; errEl.style.display='block'; return; }
  if (!approvedBy)   { errEl.textContent='Approved by is required.'; errEl.style.display='block'; return; }
  if (!approvedDate) { errEl.textContent='Approved date is required.'; errEl.style.display='block'; return; }

  const fields = {
    amlProgram: {
      version,
      approvedBy,
      approvedDate,
      nextReviewDate: document.getElementById('prog-next-review')?.value || '',
      documentLink:   document.getElementById('prog-doc-link')?.value?.trim() || '',
    }
  };

  try {
    await updateFirmProfile(S.firmId, fields);
    S.firm.amlProgram = fields.amlProgram;
    await auditFirm('program_approved', `AML/CTF Program approved — v${version} — approved by ${approvedBy}`);
    toast('AML/CTF Program saved');
    go('firm-profile');
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.progAutoNextReview = function(date) {
  if (!date) return;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById('prog-next-review');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};
