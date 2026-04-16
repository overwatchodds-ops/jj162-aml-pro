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
    { key: 'services',  label: 'Services'        },
    { key: 'risk',      label: 'Risk Assessment' },
    { key: 'program',   label: 'AML/CTF Program' },
    { key: 'enrolment', label: 'AUSTRAC'         },
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
      ${activeTab === 'risk'      ? renderRiskTab()    : ''}
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
  const enrolled  = !!(enrolment.enrolled || enrolment.enrolmentId);

  return `
    <div class="card">
      <div class="section-heading">AUSTRAC Enrolment</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Your firm must be enrolled with AUSTRAC before providing designated services. Enrolment is a one-time requirement.</p>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        Not yet enrolled? Visit AUSTRAC Online to complete your enrolment — it takes about 10 minutes.
        <a href="https://www.austrac.gov.au/business/how-comply-guidance-and-resources/enrolment" target="_blank" style="color:var(--color-info-text);font-weight:var(--font-weight-medium);display:block;margin-top:4px;">Enrol via AUSTRAC Online →</a>
      </div>

      <label style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4);border:0.5px solid ${enrolled ? '#bbf7d0' : 'var(--color-border)'};border-radius:var(--radius-lg);background:${enrolled ? '#f0fdf4' : 'var(--color-surface)'};cursor:pointer;">
        <input type="checkbox" id="enr-confirmed" ${enrolled ? 'checked' : ''} style="margin-top:2px;flex-shrink:0;">
        <div>
          <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);">Yes, our firm is enrolled with AUSTRAC</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">Tick this box to confirm your firm has completed AUSTRAC enrolment.</div>
        </div>
      </label>

      <div class="form-row" style="margin-top:var(--space-4);">
        <label class="label">Enrolment ID <span style="font-size:10px;color:var(--color-text-muted);">(optional — record for your files)</span></label>
        <input id="enr-id" type="text" class="inp" value="${enrolment.enrolmentId||''}" placeholder="e.g. AUSTRAC-2026-XXXXX">
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
  const selectedItems = MATRIX.filter(m => selected.includes(m.id));

  // Initialise the selection state
  window._svcSelected = [...selected];
  window._svcMatrix   = MATRIX;

  return `
    <div class="card">
      <div class="section-heading">Designated services</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Search and select every service your firm provides. This determines your AML/CTF scope and drives your risk assessment.</p>

      <!-- Selected services -->
      <div id="selected-services" style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-3);">
        ${selectedItems.map(m => `
          <div style="display:flex;align-items:center;gap:6px;background:#eef2ff;border:0.5px solid var(--color-primary);border-radius:99px;padding:4px 10px 4px 12px;font-size:var(--font-size-xs);color:var(--color-primary);">
            <span>${m.task}</span>
            <button onclick="removeService(${m.id})" style="background:none;border:none;cursor:pointer;color:var(--color-primary);font-size:14px;line-height:1;padding:0;margin-left:2px;">×</button>
          </div>`).join('')}
        ${selectedItems.length === 0 ? `<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);font-style:italic;">No services selected yet.</p>` : ''}
      </div>

      <!-- Search input -->
      <div style="position:relative;margin-bottom:var(--space-2);">
        <input
          id="svc-search"
          type="text"
          class="inp"
          placeholder="Type to search services (e.g. tax, SMSF, bookkeeping...)"
          oninput="filterServices(this.value)"
          autocomplete="off"
          style="padding-right:32px;"
        >
        <button onclick="document.getElementById('svc-search').value='';filterServices('');" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--color-text-muted);font-size:16px;">×</button>
      </div>

      <!-- Results dropdown -->
      <div id="svc-results" style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;max-height:320px;overflow-y:auto;display:none;margin-bottom:var(--space-2);"></div>

      <div id="svc-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('firm-profile')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveFirmServices()" class="btn" style="flex:2;">Save services</button>
      </div>
    </div>`;
}

// ─── RISK ASSESSMENT TAB — drop this into firm-profile-edit.js ────────────────
// Replace your existing renderRiskTab() (or equivalent) with this function.
// It renders a summary of all four lenses and routes into the standalone screens.

function renderRiskTab() {
  const ra = S.firm.riskAssessment || {};

  const sr  = ra.serviceRating  || null;
  const cr  = ra.customerRating || null;
  const gr  = ra.geoRating      || null;
  const pf  = ra.pfRating       || null;
  const overall = ra.overallRating || ra.rating || null;

  function pill(r) {
    if (!r) return '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Not assessed</span>';
    const bg  = r === 'High' ? '#fef2f2' : r === 'Medium' ? '#fffbeb' : '#f0fdf4';
    const col = r === 'High' ? '#991b1b' : r === 'Medium' ? '#92400e' : '#166534';
    return `<span style="font-size:11px;font-weight:500;padding:3px 10px;border-radius:99px;background:${bg};color:${col};">${r}</span>`;
  }

  const lenses = [
    { label: 'Service Risk',              rating: sr,   route: 'servicerisk',  desc: 'Based on your designated services' },
    { label: 'Customer Risk',             rating: cr,   route: 'customerrisk', desc: 'Based on your client types' },
    { label: 'Geography / Delivery Risk', rating: gr,   route: 'georisk',      desc: 'Based on client location and delivery channels' },
    { label: 'Proliferation Financing',   rating: pf,   route: 'overallrisk',  desc: 'Assessed on Overall Risk screen' },
  ];

  const allDone = sr && cr && gr && pf && overall;
  const doneLenses = lenses.filter(l => l.rating).length;

  return `
    <div style="max-width:620px;">

      <!-- PROGRESS -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:500;color:#0f172a;">Risk assessment progress</span>
          <span style="font-size:11px;color:#94a3b8;">${doneLenses} of 4 lenses complete</span>
        </div>
        <div style="background:#f1f5f9;border-radius:99px;height:4px;overflow:hidden;">
          <div style="background:#4f46e5;height:4px;border-radius:99px;width:${Math.round(doneLenses/4*100)}%;transition:width .3s;"></div>
        </div>
      </div>

      <!-- LENS ROWS -->
      <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:14px;">
        ${lenses.map((l, i) => `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:14px 16px;${i < lenses.length - 1 ? 'border-bottom:0.5px solid #f1f5f9;' : ''}">
          <div>
            <div style="font-size:12px;font-weight:500;color:#0f172a;">${l.label}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${l.desc}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            ${pill(l.rating)}
            <button onclick="go('${l.route}')"
              style="font-size:11px;font-weight:500;background:none;border:none;cursor:pointer;color:${!l.rating ? '#4f46e5' : '#94a3b8'};">
              ${!l.rating ? 'Complete →' : 'Edit'}
            </button>
          </div>
        </div>`).join('')}
      </div>

      <!-- OVERALL RATING -->
      <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${overall ? '10px' : '0'};">
          <div>
            <div style="font-size:12px;font-weight:500;color:#0f172a;">Overall Inherent Risk Rating</div>
            ${ra.assessedDate ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Assessed ${ra.assessedDate}${ra.nextReviewDate ? ' · Review by ' + ra.nextReviewDate : ''}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            ${pill(overall)}
            <button onclick="go('overallrisk')"
              style="font-size:11px;font-weight:500;background:none;border:none;cursor:pointer;color:${!overall ? '#4f46e5' : '#94a3b8'};">
              ${!overall ? 'Complete →' : 'Edit'}
            </button>
          </div>
        </div>
        ${overall ? `
        <div style="font-size:11px;color:#64748b;line-height:1.5;border-top:0.5px solid #f1f5f9;padding-top:10px;">
          ${overall === 'High'
            ? 'Your AML/CTF program must include enhanced controls and documented risk mitigation strategies.'
            : overall === 'Medium'
            ? 'Standard controls apply with a documented risk assessment and at least annual review.'
            : 'Standard AML/CTF program controls apply. A documented program and regular review are still mandatory.'}
        </div>` : ''}
      </div>

      ${!allDone ? `
      <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;margin-bottom:14px;">
        Complete all four risk lenses and save the Overall Risk screen to record your risk assessment. This unlocks Step 3 of setup.
        <button onclick="go('servicerisk')" style="font-size:11px;color:#92400e;font-weight:500;background:none;border:none;cursor:pointer;text-decoration:underline;">Start →</button>
      </div>` : `
      <div style="background:#f0fdf4;border:0.5px solid #bbf7d0;border-radius:10px;padding:12px 14px;font-size:12px;color:#166534;">
        Risk assessment complete. To update, edit individual lenses above — your overall rating will recalculate automatically.
      </div>`}

    </div>`;
}


// ─── TAB: PROGRAM ─────────────────────────────────────────────────────────────
function tabProgram(firm) {
  const program = firm.amlProgram || {};
  const appt    = firm.appointments || {};

  // Build list of appointed persons for dropdown
  const appointedPersons = [
    appt.amlco?.name     ? { name: appt.amlco.name,     role: 'AMLCO' }              : null,
    appt.senior?.name    ? { name: appt.senior.name,    role: 'Senior Manager' }      : null,
    appt.principal?.name ? { name: appt.principal.name, role: 'Principal' }           : null,
    appt.reporting?.name ? { name: appt.reporting.name, role: 'Reporting Officer' }   : null,
    appt.delegate?.name  ? { name: appt.delegate.name,  role: 'Delegate' }            : null,
  ].filter(Boolean).filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);

  // Default to AMLCO if not yet set
  const defaultApprover = program.approvedBy || appt.amlco?.name || '';

  const approverField = appointedPersons.length
    ? `<select id="prog-approved-by" class="inp">
        <option value="">— Select approver —</option>
        ${appointedPersons.map(p =>
          `<option value="${p.name}" ${defaultApprover === p.name ? 'selected' : ''}>${p.name} (${p.role})</option>`
        ).join('')}
       </select>`
    : `<input id="prog-approved-by" type="text" class="inp" value="${defaultApprover}" placeholder="Name of approver (AMLCO or principal)">`;

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
          ${approverField}
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

// ─── SERVICES TYPEAHEAD ───────────────────────────────────────────────────────
window.filterServices = function(query) {
  const results = document.getElementById('svc-results');
  if (!results) return;
  const q = query.trim().toLowerCase();
  if (!q) { results.style.display = 'none'; return; }

  const matches = (window._svcMatrix || []).filter(m =>
    !(window._svcSelected || []).includes(m.id) &&
    (m.task.toLowerCase().includes(q) ||
     (m.category||'').toLowerCase().includes(q) ||
     (m.table6||'').toLowerCase().includes(q) ||
     (m.synonyms||[]).some(s => s.toLowerCase().includes(q)))
  ).slice(0, 10);

  if (!matches.length) {
    results.innerHTML = '<div style="padding:12px 16px;font-size:11px;color:var(--color-text-muted);">No matching services found.</div>';
  } else {
    results.innerHTML = matches.map(m => `
      <div onclick="addService(${m.id})" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:0.5px solid var(--color-border-light);cursor:pointer;background:var(--color-surface);"
        onmouseover="this.style.background='var(--color-surface-alt)'" onmouseout="this.style.background='var(--color-surface)'">
        <div>
          <div style="font-size:12px;font-weight:500;color:var(--color-text-primary);">${m.task}</div>
          <div style="font-size:10px;color:var(--color-text-muted);">${m.category} · ${m.table6 || 'Out of scope'}</div>
        </div>
        <span class="badge ${m.status==='IN'?'badge-danger':m.status==='OUT'?'badge-success':'badge-warning'}" style="flex-shrink:0;margin-left:12px;">${m.status}</span>
      </div>`).join('');
  }
  results.style.display = 'block';
};

window.addService = function(id) {
  if (!window._svcSelected) window._svcSelected = [];
  if (!window._svcSelected.includes(id)) {
    window._svcSelected.push(id);
    window.renderSelected();
  }
  const inp = document.getElementById('svc-search');
  if (inp) inp.value = '';
  const res = document.getElementById('svc-results');
  if (res) res.style.display = 'none';
};

window.removeService = function(id) {
  window._svcSelected = (window._svcSelected || []).filter(s => s !== id);
  window.renderSelected();
};

window.renderSelected = function() {
  const el = document.getElementById('selected-services');
  if (!el) return;
  const items = (window._svcMatrix || []).filter(m => (window._svcSelected || []).includes(m.id));
  el.innerHTML = items.length
    ? items.map(m => `
        <div style="display:flex;align-items:center;gap:6px;background:#eef2ff;border:0.5px solid var(--color-primary);border-radius:99px;padding:4px 10px 4px 12px;font-size:12px;color:var(--color-primary);">
          <span>${m.task}</span>
          <button onclick="removeService(${m.id})" style="background:none;border:none;cursor:pointer;color:var(--color-primary);font-size:14px;line-height:1;padding:0;margin-left:2px;">×</button>
        </div>`).join('')
    : '<p style="font-size:12px;color:var(--color-text-muted);font-style:italic;">No services selected yet.</p>';
};

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
    go('setup');
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
      enrolled:      document.getElementById('enr-confirmed')?.checked || false,
      enrolmentId:   document.getElementById('enr-id')?.value?.trim() || '',
    }
  };

  try {
    await updateFirmProfile(S.firmId, fields);
    S.firm.austracEnrolment = fields.austracEnrolment;
    await auditFirm('austrac_enrolment_updated', `AUSTRAC enrolment details updated`);
    toast('Enrolment details saved');
    go('setup');
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveFirmServices = async function() {
  const errEl = document.getElementById('svc-error');
  if (errEl) errEl.style.display = 'none';

  const selected = window._svcSelected || (S.firm?.designatedServices || []);

  if (!selected.length) {
    if (errEl) { errEl.textContent = 'Please select at least one designated service.'; errEl.style.display = 'block'; }
    return;
  }

  const fields = { designatedServices: selected };

  try {
    await updateFirmProfile(S.firmId, fields);
    S.firm.designatedServices = selected;
    window._svcSelected = null;
    await auditFirm('services_updated', `Designated services updated — ${selected.length} services selected`);
    toast('Designated services saved');
    go('setup');
  } catch (err) {
    if (errEl) { errEl.textContent = 'Failed to save. Please try again.'; errEl.style.display = 'block'; }
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
    go('setup');
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
    go('setup');
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
