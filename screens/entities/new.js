// ─── NEW / EDIT CLIENT ────────────────────────────────────────────────────────
// Step 1 (new only): Type picker — choose Individual/Sole Trader or Entity
// Path A — Individual / Sole Trader: simple identity + risk form
// Path B — Entity (Company/Trust/etc): entity details + risk + key people

import { S, addEntityToState, addLinkToState } from '../../state/index.js';
import { ROLE_LABELS, ENTITY_ROLES }            from '../../state/rules_matrix.js';
import {
  saveEntity, saveLink, saveAuditEntry,
  genId, fmtDate,
} from '../../firebase/firestore.js';

const PERSON_TYPES = ['Individual', 'Sole Trader'];

function entitySubtype(entityType) {
  const map = {
    'Individual':               'individual',
    'Sole Trader':              'soletrader',
    'Private Company':          'company',
    'Partnership':              'partnership',
    'Trust':                    'trust',
    'SMSF':                     'smsf',
    'Incorporated Association': 'association',
    'Charity / NFP':            'charity',
  };
  return map[entityType] || 'other';
}

function staffOptions(selected = '') {
  const staff = (S.individuals || []).filter(i => i.isStaff);
  if (!staff.length) return `<option value="">No staff found — add staff first</option>`;
  return `<option value="">Select staff member...</option>` +
    staff.map(s => `<option value="${s.fullName}" ${selected === s.fullName ? 'selected' : ''}>${s.fullName}${s.role ? ' · ' + s.role : ''}</option>`).join('');
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { entityId } = S.currentParams || {};
  const isEdit = !!entityId;
  const entity = isEdit ? S.entities.find(e => e.entityId === entityId) : null;
  const d      = S._draft || (isEdit ? { ...entity } : {});
  const etype  = d.entityType || '';

  if (isEdit) {
    return PERSON_TYPES.includes(etype)
      ? renderPersonForm(d, true, entityId)
      : renderEntityForm(d, true, entityId);
  }

  if (!etype) return renderTypePicker();

  return PERSON_TYPES.includes(etype)
    ? renderPersonForm(d, false, null)
    : renderEntityForm(d, false, null);
}

// ─── STEP 1: TYPE PICKER ──────────────────────────────────────────────────────
function renderTypePicker() {
  return `
    <div>
      <div style="margin-bottom:var(--space-5);">
        <button onclick="go('entities')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Clients</button>
        <h1 class="screen-title" style="margin-top:var(--space-2);">New client</h1>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-top:var(--space-1);">What type of client are you adding?</p>
      </div>

      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Individual / Sole trader</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">The client is a person. CDD is recorded directly — no separate key people needed. Includes sole traders.</p>
        <button
          onclick="pickClientType('Individual')"
          style="text-align:left;padding:var(--space-4);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);background:var(--color-surface);cursor:pointer;width:100%;"
          onmouseover="this.style.borderColor='var(--color-primary)';this.style.background='var(--color-primary-light)'"
          onmouseout="this.style.borderColor='var(--color-border)';this.style.background='var(--color-surface)'"
        >
          <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);margin-bottom:4px;">Individual / Sole trader</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Personal clients, direct individuals, SMSF members and sole traders operating a business.</div>
        </button>
      </div>

      <div class="card">
        <div class="section-heading">Business or legal structure</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">The client is a legal entity. You will need to identify the key people behind it.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          ${[
            { type: 'Private Company',          desc: 'Pty Ltd — directors + shareholders >25%' },
            { type: 'Trust',                    desc: 'Trustees + beneficiaries' },
            { type: 'SMSF',                     desc: 'Self-managed super — trustees + members' },
            { type: 'Partnership',              desc: 'All partners identified' },
            { type: 'Incorporated Association', desc: 'Committee + responsible persons' },
            { type: 'Charity / NFP',            desc: 'Board + responsible persons' },
          ].map(t => `
            <button
              onclick="pickClientType('${t.type}')"
              style="text-align:left;padding:var(--space-4);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);background:var(--color-surface);cursor:pointer;"
              onmouseover="this.style.borderColor='var(--color-primary)';this.style.background='var(--color-primary-light)'"
              onmouseout="this.style.borderColor='var(--color-border)';this.style.background='var(--color-surface)'"
            >
              <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);margin-bottom:4px;">${t.type}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${t.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
}

// ─── PATH A: INDIVIDUAL / SOLE TRADER FORM ──────────────────────────────────
function renderPersonForm(d, isEdit, entityId) {
  const etype        = d.entityType || '';
  const isSoleTrader = etype === 'Sole Trader';
  const step         = S.currentParams?.step || 'details'; // 'details' | 'cdd'
  const today        = new Date().toISOString().split('T')[0];
  const staffOpts    = staffOptions(d._verifiedBy || '');

  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="${isEdit ? "cancelEntity()" : step==="cdd" ? "personBackToDetails()" : "clearClientType()"}" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isEdit ? "Client" : step==="cdd" ? "Back" : "Change type"}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${isEdit ? "Edit — " + (d.entityName||"") : "New " + etype}</h1>
        </div>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);background:var(--color-surface-alt);padding:2px 10px;border-radius:var(--radius-pill);border:0.5px solid var(--color-border);">${etype}</span>
      </div>

      ${!isEdit ? `
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-5);">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:22px;height:22px;border-radius:50%;background:${step==="details"?"var(--color-primary)":"var(--color-success)"};color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;">${step==="details"?"1":"✓"}</div>
            <span style="font-size:var(--font-size-xs);font-weight:${step==="details"?"600":"400"};color:${step==="details"?"var(--color-primary)":"var(--color-text-muted)"};">Details</span>
          </div>
          <div style="flex:1;height:1px;background:var(--color-border);margin:0 4px;"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:22px;height:22px;border-radius:50%;background:${step==="cdd"?"var(--color-primary)":"var(--color-border)"};color:${step==="cdd"?"#fff":"var(--color-text-muted)"};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;">2</div>
            <span style="font-size:var(--font-size-xs);font-weight:${step==="cdd"?"600":"400"};color:${step==="cdd"?"var(--color-primary)":"var(--color-text-muted)"};">CDD</span>
          </div>
        </div>
      ` : ""}

      ${step === "details" ? `
        <div class="card">
          <div class="section-heading">${isSoleTrader ? "Sole trader details" : "Individual details"}</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">
            ${isSoleTrader
              ? "Enter the business trading name (if any) and the personal details of the person who operates it."
              : "Enter the individual's personal details as they appear on their identity documents."}
          </p>
          <div class="form-grid" style="grid-template-columns:1fr;">
            ${isSoleTrader ? `
              <div class="form-row">
                <label class="label">Business / trading name <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span></label>
                <input id="ent-trading-name" type="text" class="inp" value="${d.tradingName||""}" placeholder="e.g. John's Plumbing">
              </div>
            ` : ""}
            <div class="form-row">
              <label class="label label-required">Full legal name</label>
              <input id="ent-name" type="text" class="inp" value="${d.entityName||""}" placeholder="e.g. Jane Elizabeth Smith">
            </div>
            <div class="form-row">
              <label class="label label-required">Date of birth</label>
              <input id="ent-dob" type="date" class="inp" value="${d.dateOfBirth||""}">
            </div>
            <div class="form-row">
              <label class="label label-required">Residential address</label>
              <input id="ent-address" type="text" class="inp" value="${d.registeredAddress||""}" placeholder="12 Main St, Sydney NSW 2000">
            </div>
            <div class="form-row">
              <label class="label">Email</label>
              <input id="ent-email" type="email" class="inp" value="${d.email||""}" placeholder="jane@example.com">
            </div>
            ${isSoleTrader ? `
              <div class="form-row">
                <label class="label">ABN <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span></label>
                <input id="ent-abn" type="text" class="inp" value="${d.abn||""}" placeholder="12 345 678 901">
              </div>
            ` : ""}
            <div class="form-row">
              <label class="label">Notes</label>
              <textarea id="ent-notes" class="inp" rows="2" placeholder="Any additional notes...">${d.notes||""}</textarea>
            </div>
          </div>
          <div id="ent-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
        </div>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
          <button onclick="${isEdit ? "cancelEntity()" : "clearClientType()"}" class="btn-sec" style="flex:1;">Cancel</button>
          ${isEdit
            ? `<button onclick="savePersonRecord()" class="btn" style="flex:2;">Save changes</button>`
            : `<button onclick="personNextToCDD()" class="btn" style="flex:2;">Next — record CDD →</button>`}
        </div>
      ` : ""}

      ${step === "cdd" ? `
        <div class="banner banner-info" style="margin-bottom:var(--space-4);">
          <div class="banner-title">Why this step?</div>
          AUSTRAC requires you to verify identity and screen against PEP and sanctions lists before providing designated services.
        </div>

        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">ID verification</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Record the identity document you sighted. You do not need to upload a copy.</p>
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-row">
              <label class="label label-required">ID type</label>
              <select id="ver-type" class="inp">
                ${["Passport","Driver licence","Medicare card","Other government ID"].map(t=>`<option ${d._verIdType===t?"selected":""}>${t}</option>`).join("")}
              </select>
            </div>
            <div class="form-row">
              <label class="label label-required">ID number</label>
              <input id="ver-num" type="text" class="inp" value="${d._verIdNum||""}" placeholder="e.g. PA1234567">
            </div>
            <div class="form-row">
              <label class="label">Issuing state / country</label>
              <input id="ver-state" type="text" class="inp" value="${d._verState||""}" placeholder="e.g. NSW">
            </div>
            <div class="form-row">
              <label class="label">Expiry date</label>
              <input id="ver-expiry" type="date" class="inp" value="${d._verExpiry||""}">
            </div>
            <div class="form-row">
              <label class="label label-required">Verified by</label>
              <select id="ver-by" class="inp">${staffOpts}</select>
            </div>
            <div class="form-row">
              <label class="label label-required">Verified date</label>
              <input id="ver-date" type="date" class="inp" value="${d._verDate||today}">
            </div>
            <div class="form-row span-2">
              <label class="label">Method</label>
              <select id="ver-method" class="inp">
                ${["In person","Certified copy","Electronic verification"].map(m=>`<option ${d._verMethod===m?"selected":""}>${m}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">PEP / sanctions screening</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Screen against PEP, sanctions and adverse media lists.</p>
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-row">
              <label class="label label-required">Provider</label>
              <input id="scr-provider" type="text" class="inp" value="${d._scrProvider||""}" placeholder="e.g. NameScan">
            </div>
            <div class="form-row">
              <label class="label label-required">Screening date</label>
              <input id="scr-date" type="date" class="inp" value="${d._scrDate||today}" onchange="scrAutoNextNew(this.value)">
            </div>
            <div class="form-row">
              <label class="label label-required">Result</label>
              <select id="scr-result" class="inp">
                ${["Clear","PEP match","Sanctions match","Adverse media","Refer for review"].map(r=>`<option ${d._scrResult===r?"selected":""}>${r}</option>`).join("")}
              </select>
            </div>
            <div class="form-row">
              <label class="label">Reference ID</label>
              <input id="scr-ref" type="text" class="inp" value="${d._scrRef||""}" placeholder="e.g. NS-98765">
            </div>
            <div class="form-row">
              <label class="label">Completed by</label>
              <select id="scr-by" class="inp">${staffOpts}</select>
            </div>
            <div class="form-row">
              <label class="label">Next screening due</label>
              <input id="scr-next" type="date" class="inp" value="${d._scrNext||""}">
            </div>
          </div>
          <div style="margin-top:var(--space-2);">
            <a href="https://namescan.io/?ref=SIMPLEAML" target="_blank" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Open NameScan →</a>
          </div>
        </div>

        <div id="cdd-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>
        <div style="display:flex;gap:var(--space-3);">
          <button onclick="personBackToDetails()" class="btn-sec" style="flex:1;">← Back</button>
          <button onclick="savePersonWithCDD()" class="btn" style="flex:2;">Save client</button>
        </div>
      ` : ""}
    </div>`;
}

// ─── PATH B: ENTITY FORM ──────────────────────────────────────────────────────
function renderEntityForm(d, isEdit, entityId) {
  const etype     = d.entityType || '';
  const isCompany = etype === 'Private Company';
  const activeTab = S.currentParams?.tab || 'details';
  const subtype   = entitySubtype(etype);
  const roles     = ENTITY_ROLES[subtype] || ENTITY_ROLES.other;

  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="${isEdit ? 'cancelEntity()' : 'clearClientType()'}" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isEdit ? 'Client' : 'Change type'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${isEdit ? 'Edit — ' + (d.entityName||'') : 'New client'}</h1>
        </div>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);background:var(--color-surface-alt);padding:2px 10px;border-radius:var(--radius-pill);border:0.5px solid var(--color-border);">${etype}</span>
      </div>

      <div style="display:flex;gap:2px;border-bottom:0.5px solid var(--color-border);margin-bottom:var(--space-5);">
        ${['details','risk','members'].map(t => `
          <button onclick="entityTab('${t}')" style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);padding:var(--space-2) var(--space-3);border:none;background:none;cursor:pointer;font-family:var(--font-family);color:${activeTab===t?'var(--color-primary)':'var(--color-text-muted)'};border-bottom:${activeTab===t?'2px solid var(--color-primary)':'2px solid transparent'};margin-bottom:-0.5px;">${t==='members'?'Key people':t.charAt(0).toUpperCase()+t.slice(1)}</button>
        `).join('')}
      </div>

      ${activeTab === 'details' ? `
        <div class="card">
          <div class="section-heading">Client details</div>
          <div class="form-grid" style="grid-template-columns:1fr;">

            <div class="form-row">
              <label class="label label-required">Client name</label>
              <input id="ent-name" type="text" class="inp" value="${d.entityName||''}" placeholder="${etype==='Trust'?'e.g. Smith Family Trust':etype==='SMSF'?'e.g. Smith Super Fund':'e.g. Acme Pty Ltd'}">
            </div>

            <div class="form-row">
              <label class="label">ABN</label>
              <input id="ent-abn" type="text" class="inp" value="${d.abn||''}" placeholder="12 345 678 901">
            </div>

            ${isCompany ? `
              <div class="form-row">
                <label class="label">ACN</label>
                <input id="ent-acn" type="text" class="inp" value="${d.acn||''}" placeholder="123 456 789">
              </div>
              <div class="form-row">
                <label class="label">Incorporation date</label>
                <input id="ent-inc-date" type="date" class="inp" value="${d.incorporationDate||''}">
              </div>
            ` : ''}

            <div class="form-row">
              <label class="label">Registered address</label>
              <input id="ent-address" type="text" class="inp" value="${d.registeredAddress||''}" placeholder="123 Collins St, Melbourne VIC 3000">
            </div>

            <div class="form-row">
              <label class="label">Notes</label>
              <textarea id="ent-notes" class="inp" rows="2" placeholder="Any additional notes...">${d.notes||''}</textarea>
            </div>

          </div>
          <div id="ent-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
        </div>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
          <button onclick="${isEdit ? 'cancelEntity()' : 'clearClientType()'}" class="btn-sec" style="flex:1;">Cancel</button>
          <button onclick="saveEntityRecord()" class="btn" style="flex:2;">${isEdit ? 'Save changes' : 'Save client'}</button>
        </div>
      ` : ''}

      ${activeTab === 'risk'    ? tabRisk(d, isEdit, entityId)          : ''}
      ${activeTab === 'members' ? tabMembers(d, isEdit, entityId, roles) : ''}
    </div>`;
}

// ─── RISK TAB (shared) ────────────────────────────────────────────────────────
function tabRisk(d, isEdit, entityId) {
  return `
    <div class="card">
      <div class="section-heading">Client risk assessment</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Assess the risk of this client relationship. This determines review cadence and informs your AML/CTF obligations.</p>
      <div class="form-grid" style="grid-template-columns:1fr;">
        <div class="form-row">
          <label class="label label-required">Risk rating</label>
          <select id="risk-rating" class="inp" onchange="entityRiskChange()">
            <option value="">Select...</option>
            <option value="Low"    ${d.entityRiskRating==='Low'   ?'selected':''}>Low</option>
            <option value="Medium" ${d.entityRiskRating==='Medium'?'selected':''}>Medium</option>
            <option value="High"   ${d.entityRiskRating==='High'  ?'selected':''}>High</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label label-required">Assessed by</label>
          <select id="risk-by" class="inp">${staffOptions(d.riskAssessedBy)}</select>
        </div>
        <div class="form-row">
          <label class="label label-required">Assessed date</label>
          <input id="risk-date" type="date" class="inp" value="${d.riskAssessedDate||new Date().toISOString().split('T')[0]}" onchange="entityRiskChange()">
        </div>
        <div class="form-row">
          <label class="label">Next review date</label>
          <input id="risk-next-review" type="date" class="inp" value="${d.riskNextReviewDate||''}">
        </div>
        <div class="form-row">
          <label class="label">Risk factors / methodology notes</label>
          <textarea id="risk-methodology" class="inp" rows="3" placeholder="Describe the risk factors and methodology...">${d.riskMethodology||''}</textarea>
        </div>
      </div>
      <div class="banner banner-info" style="margin-top:var(--space-4);">
        <div class="banner-title">Review cadence</div>
        High: every 12 months · Medium: 24 months · Low: 36 months
      </div>
      <div id="risk-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
      <button onclick="saveEntityRisk('${entityId}')" class="btn btn-sm" style="margin-top:var(--space-4);">Save risk assessment</button>
    </div>`;
}

// ─── KEY PEOPLE TAB ───────────────────────────────────────────────────────────
function tabMembers(d, isEdit, entityId, roles) {
  const existingLinks  = isEdit
    ? S.links.filter(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active')
    : [];
  const pendingMembers = S._draft?._pendingMembers || [];

  return `
    <div class="card">
      <div class="section-heading">Key people</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Add all directors, trustees, partners or beneficial owners (>25%). Search existing individuals first, create new ones if not found.</p>

      ${existingLinks.length > 0 ? `
        <div style="margin-bottom:var(--space-4);">
          <div class="section-heading">Current key people</div>
          ${existingLinks.map(l => {
            const ind   = S.individuals.find(i => i.individualId === l.individualId);
            const label = ROLE_LABELS[l.roleType] || l.roleType;
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);">
                <div>
                  <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${ind?.fullName||'Unknown'}</div>
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label}</div>
                </div>
                <button onclick="endEntityMember('${l.linkId}')" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">End role</button>
              </div>`;
          }).join('')}
        </div>
      ` : ''}

      ${pendingMembers.length > 0 ? `
        <div style="margin-bottom:var(--space-4);">
          <div class="section-heading">Added — not yet saved</div>
          ${pendingMembers.map((m, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-primary-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);background:var(--color-primary-light);">
              <div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${m.name}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-primary-text);">${ROLE_LABELS[m.roleType]||m.roleType}</div>
              </div>
              <button onclick="removePendingMember(${i})" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">Remove</button>
            </div>`).join('')}
          <button onclick="savePendingMembers('${entityId}')" class="btn btn-sm">Save key people</button>
        </div>
      ` : ''}

      <div style="border-top:0.5px solid var(--color-border);padding-top:var(--space-4);">
        <div class="section-heading">Add a person</div>
        <div class="form-row">
          <label class="label label-required">Role</label>
          <select id="member-role" class="inp">
            ${roles.map(r => `<option value="${r}">${ROLE_LABELS[r]||r}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="label">Ownership %</label>
          <input id="member-ownership" type="number" class="inp" placeholder="e.g. 50 — for shareholders only" min="0" max="100">
        </div>
        <div class="form-row">
          <label class="label">Search by name</label>
          <input id="member-search" type="text" class="inp" placeholder="Start typing a name..." oninput="memberSearchFilter(this.value)" autocomplete="off">
        </div>
        <div id="member-search-results" style="margin-bottom:var(--space-3);"></div>
        <button onclick="addNewMember()" class="btn-sec btn-sm">+ Create new individual</button>
      </div>
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.pickClientType = function(etype) {
  if (!S._draft) S._draft = {};
  S._draft.entityType = etype;

  if (['Individual', 'Sole Trader'].includes(etype)) {
    // Pass params directly to go() — never set S.currentParams separately
    // because go() overwrites it with its own params argument
    go('entity-detail', { isNew: true, entityType: etype });
  } else {
    // Entity types stay in new.js for details + key people flow
    S.currentParams = { ...(S.currentParams || {}), tab: 'details' };
    render();
  }
};

window.clearClientType = function() {
  delete S._draft;
  S.currentParams = {};
  render();
};

window.entityTab = function(tab) {
  S.currentParams = { ...S.currentParams, tab };
  render();
};

window.cancelEntity = function() {
  delete S._draft;
  const { entityId } = S.currentParams || {};
  go(entityId ? 'entity-detail' : 'entities', entityId ? { entityId } : {});
};

window.entityRiskChange = function() {
  const rating = document.getElementById('risk-rating')?.value;
  const date   = document.getElementById('risk-date')?.value;
  if (!rating || !date) return;
  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  const el = document.getElementById('risk-next-review');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.personNextToCDD = function() {
  // Validate details first, stash values in draft, then go to CDD step
  const name    = document.getElementById('ent-name')?.value?.trim();
  const dob     = document.getElementById('ent-dob')?.value;
  const address = document.getElementById('ent-address')?.value?.trim();
  const errEl   = document.getElementById('ent-error');
  if (errEl) errEl.style.display = 'none';

  if (!name)    { if (errEl) { errEl.textContent='Full legal name is required.'; errEl.style.display='block'; } return; }
  if (!dob)     { if (errEl) { errEl.textContent='Date of birth is required.'; errEl.style.display='block'; } return; }
  if (!address) { if (errEl) { errEl.textContent='Residential address is required.'; errEl.style.display='block'; } return; }

  // Stash form values in draft so they survive the re-render
  if (!S._draft) S._draft = {};
  S._draft.entityName        = name;
  S._draft.dateOfBirth       = dob;
  S._draft.registeredAddress = address;
  S._draft.email             = document.getElementById('ent-email')?.value?.trim() || '';
  S._draft.abn               = document.getElementById('ent-abn')?.value?.trim() || '';
  S._draft.tradingName       = document.getElementById('ent-trading-name')?.value?.trim() || '';
  S._draft.notes             = document.getElementById('ent-notes')?.value?.trim() || '';

  S.currentParams = { ...S.currentParams, step: 'cdd' };
  render();
};

window.personBackToDetails = function() {
  S.currentParams = { ...S.currentParams, step: 'details' };
  render();
};

window.scrAutoNextNew = function(date) {
  if (!date) return;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById('scr-next');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.savePersonWithCDD = async function() {
  // Validate CDD fields
  const idNum   = document.getElementById('ver-num')?.value?.trim();
  const verBy   = document.getElementById('ver-by')?.value;
  const verDate = document.getElementById('ver-date')?.value;
  const scrProv = document.getElementById('scr-provider')?.value?.trim();
  const scrDate = document.getElementById('scr-date')?.value;
  const errEl   = document.getElementById('cdd-error');
  errEl.style.display = 'none';

  if (!idNum)   { errEl.textContent='ID number is required.'; errEl.style.display='block'; return; }
  if (!verBy)   { errEl.textContent='Verified by is required.'; errEl.style.display='block'; return; }
  if (!verDate) { errEl.textContent='Verified date is required.'; errEl.style.display='block'; return; }
  if (!scrProv) { errEl.textContent='Screening provider is required.'; errEl.style.display='block'; return; }
  if (!scrDate) { errEl.textContent='Screening date is required.'; errEl.style.display='block'; return; }

  const d        = S._draft || {};
  const etype    = d.entityType;
  const now      = new Date().toISOString();
  const eid      = genId('ent');

  const entityData = {
    entityId: eid, firmId: S.firmId,
    entityName:        d.entityName,
    entityType:        etype,
    dateOfBirth:       d.dateOfBirth,
    registeredAddress: d.registeredAddress,
    email:             d.email || '',
    abn:               d.abn || '',
    tradingName:       d.tradingName || '',
    notes:             d.notes || '',
    entityRiskRating:  null,
    createdAt: now, updatedAt: now,
  };

  try {
    const { saveVerification, saveScreening, saveIndividual } = await import('../../firebase/firestore.js');
    const { addIndividualToState } = await import('../../state/index.js');

    // 1. Save entity (client relationship record)
    await saveEntity(eid, entityData);
    addEntityToState(entityData);

    // 2. Create individual record (the actual person)
    const iid = genId('ind');
    const indData = {
      individualId:  iid,
      firmId:        S.firmId,
      fullName:      d.entityName,
      dateOfBirth:   d.dateOfBirth,
      address:       d.registeredAddress,
      email:         d.email || '',
      isStaff:       false,
      createdAt:     now,
      updatedAt:     now,
    };
    await saveIndividual(iid, indData);
    addIndividualToState(indData);

    // 3. Link individual to entity (role: self)
    const lid = genId('link');
    const linkData = {
      linkId:           lid,
      individualId:     iid,
      linkedObjectType: 'entity',
      linkedObjectId:   eid,
      roleType:         'self',
      status:           'active',
      startDate:        now,
      createdAt:        now,
      updatedAt:        now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);

    // 4. Save ID verification against the individual
    const idType = document.getElementById('ver-type')?.value || '';
    const verRec = {
      verificationId: genId('ver'),
      firmId:         S.firmId,
      individualId:   iid,
      idType,
      idNumber:       idNum,
      issuingState:   document.getElementById('ver-state')?.value?.trim() || '',
      expiryDate:     document.getElementById('ver-expiry')?.value || '',
      verifiedBy:     verBy,
      verifiedDate:   verDate,
      verifiedMethod: document.getElementById('ver-method')?.value || '',
      createdAt:      now,
    };
    await saveVerification(verRec);
    if (!S.verifications) S.verifications = [];
    S.verifications.unshift(verRec);

    // 5. Save screening against the individual
    const result = document.getElementById('scr-result')?.value || '';
    const scrRec = {
      screeningId:  genId('scr'),
      firmId:       S.firmId,
      individualId: iid,
      provider:     scrProv,
      date:         scrDate,
      result,
      referenceId:  document.getElementById('scr-ref')?.value?.trim() || '',
      completedBy:  document.getElementById('scr-by')?.value || '',
      nextDueDate:  document.getElementById('scr-next')?.value || '',
      createdAt:    now,
    };
    await saveScreening(scrRec);
    if (!S.screenings) S.screenings = [];
    S.screenings.unshift(scrRec);

    // 6. Audit
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'entity_created', targetType: 'entity', targetId: eid, targetName: d.entityName,
      detail: `Client created with CDD — ${d.entityName} (${etype}) — ID verified by ${verBy} — screening: ${result}`,
      timestamp: now,
    });

    delete S._draft;
    toast('Client saved with CDD recorded');
    go('entity-detail', { entityId: eid });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};

window.savePersonRecord = async function() {
  const name    = document.getElementById('ent-name')?.value?.trim();
  const dob     = document.getElementById('ent-dob')?.value;
  const address = document.getElementById('ent-address')?.value?.trim();
  const errEl   = document.getElementById('ent-error');
  if (errEl) errEl.style.display = 'none';

  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display='block'; } else { toast(msg, 'err'); } };

  if (!name)    { showErr('Full legal name is required.'); return; }
  if (!dob)     { showErr('Date of birth is required.'); return; }
  if (!address) { showErr('Residential address is required.'); return; }

  const { entityId } = S.currentParams || {};
  const isEdit   = !!entityId;
  const entity   = isEdit ? S.entities.find(e => e.entityId === entityId) : null;
  const d        = S._draft || (entity ? { ...entity } : {});
  const etype    = d.entityType || entity?.entityType;
  const now      = new Date().toISOString();
  const eid      = isEdit ? entityId : genId('ent');
  const existing = isEdit ? S.entities.find(e => e.entityId === eid) : null;

  const entityData = {
    entityId: eid, firmId: S.firmId,
    entityName:        name,
    entityType:        etype,
    dateOfBirth:       dob,
    registeredAddress: address,
    email:             document.getElementById('ent-email')?.value?.trim()        || '',
    abn:               document.getElementById('ent-abn')?.value?.trim()          || '',
    tradingName:       document.getElementById('ent-trading-name')?.value?.trim() || '',
    notes:             document.getElementById('ent-notes')?.value?.trim()         || '',
    entityRiskRating:  existing?.entityRiskRating  || null,
    riskAssessedBy:    existing?.riskAssessedBy    || '',
    riskAssessedDate:  existing?.riskAssessedDate  || '',
    riskNextReviewDate:existing?.riskNextReviewDate|| '',
    riskMethodology:   existing?.riskMethodology   || '',
    createdAt: isEdit ? (existing?.createdAt || now) : now,
    updatedAt: now,
  };

  try {
    await saveEntity(eid, entityData);
    addEntityToState(entityData);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: isEdit ? 'entity_updated' : 'entity_created',
      targetType: 'entity', targetId: eid, targetName: name,
      detail: isEdit ? `Client updated — ${name}` : `Client created — ${name} (${etype})`,
      timestamp: now,
    });
    delete S._draft;
    toast(isEdit ? 'Client updated' : 'Client saved');
    go('entity-detail', { entityId: eid });
  } catch (err) {
    const el = document.getElementById('ent-error');
    if (el) { el.textContent = 'Failed to save. Please try again.'; el.style.display='block'; }
    console.error(err);
  }
};

window.saveEntityRecord = async function() {
  const name  = document.getElementById('ent-name')?.value?.trim();
  const errEl = document.getElementById('ent-error');
  if (errEl) errEl.style.display = 'none';
  const showErr = (msg) => { if (errEl) { errEl.textContent=msg; errEl.style.display='block'; } else { toast(msg,'err'); } };
  if (!name) { showErr('Client name is required.'); return; }

  const { entityId } = S.currentParams || {};
  const isEdit   = !!entityId;
  const entity   = isEdit ? S.entities.find(e => e.entityId === entityId) : null;
  const d        = S._draft || (entity ? { ...entity } : {});
  const etype    = d.entityType || entity?.entityType;
  const now      = new Date().toISOString();
  const eid      = isEdit ? entityId : genId('ent');
  const existing = isEdit ? S.entities.find(e => e.entityId === eid) : null;

  const entityData = {
    entityId: eid, firmId: S.firmId,
    entityName:         name,
    entityType:         etype,
    abn:                document.getElementById('ent-abn')?.value?.trim()      || '',
    acn:                document.getElementById('ent-acn')?.value?.trim()      || '',
    incorporationDate:  document.getElementById('ent-inc-date')?.value         || '',
    registeredAddress:  document.getElementById('ent-address')?.value?.trim()  || '',
    notes:              document.getElementById('ent-notes')?.value?.trim()     || '',
    entityRiskRating:   existing?.entityRiskRating  || null,
    riskAssessedBy:     existing?.riskAssessedBy    || '',
    riskAssessedDate:   existing?.riskAssessedDate  || '',
    riskNextReviewDate: existing?.riskNextReviewDate|| '',
    riskMethodology:    existing?.riskMethodology   || '',
    createdAt: isEdit ? (existing?.createdAt || now) : now,
    updatedAt: now,
  };

  try {
    await saveEntity(eid, entityData);
    addEntityToState(entityData);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: isEdit ? 'entity_updated' : 'entity_created',
      targetType: 'entity', targetId: eid, targetName: name,
      detail: isEdit ? `Client updated — ${name}` : `Client created — ${name} (${etype})`,
      timestamp: now,
    });
    delete S._draft;
    toast(isEdit ? 'Client updated' : 'Client saved');
    go('entity-detail', { entityId: eid });
  } catch (err) {
    const el = document.getElementById('ent-error');
    if (el) { el.textContent = 'Failed to save. Please try again.'; el.style.display='block'; }
    console.error(err);
  }
};

window.saveEntityRisk = async function(entityId) {
  const rating = document.getElementById('risk-rating')?.value;
  const by     = document.getElementById('risk-by')?.value;
  const date   = document.getElementById('risk-date')?.value;
  const errEl  = document.getElementById('risk-error');
  errEl.style.display = 'none';
  if (!rating) { errEl.textContent='Risk rating is required.'; errEl.style.display='block'; return; }
  if (!by)     { errEl.textContent='Assessed by is required.'; errEl.style.display='block'; return; }
  if (!date)   { errEl.textContent='Assessed date is required.'; errEl.style.display='block'; return; }

  const { updateEntity } = await import('../../firebase/firestore.js');
  const now    = new Date().toISOString();
  const fields = {
    entityRiskRating:   rating,
    riskAssessedBy:     by,
    riskAssessedDate:   date,
    riskNextReviewDate: document.getElementById('risk-next-review')?.value || '',
    riskMethodology:    document.getElementById('risk-methodology')?.value?.trim() || '',
  };
  try {
    await updateEntity(entityId, fields);
    const entity = S.entities.find(e => e.entityId === entityId);
    if (entity) Object.assign(entity, fields);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'risk_assessed', targetType: 'entity', targetId: entityId,
      targetName: S.entities?.find(e=>e.entityId===entityId)?.entityName || '',
      detail: `Risk assessment recorded — ${rating} risk — assessed by ${by}`,
      timestamp: now,
    });
    toast('Risk assessment saved');
    go('entity-detail', { entityId });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.memberSearchFilter = function(query) {
  const resultsEl = document.getElementById('member-search-results');
  if (!resultsEl) return;
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }
  const q          = query.toLowerCase();
  const pendingIds = (S._draft?._pendingMembers || []).map(m => m.individualId);
  const matches    = (S.individuals || [])
    .filter(i => !i.isStaff && i.fullName?.toLowerCase().includes(q) && !pendingIds.includes(i.individualId))
    .slice(0, 6);
  if (!matches.length) {
    resultsEl.innerHTML = `<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);padding:var(--space-2) 0;">No results for "${query}". Use "Create new individual" below.</p>`;
    return;
  }
  resultsEl.innerHTML = matches.map(i => `
    <div
      onclick="addMemberFromSearch('${i.individualId}','${i.fullName.replace(/'/g,"\\'")}')"
      style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;margin-bottom:4px;background:var(--color-surface);"
      onmouseover="this.style.background='var(--color-surface-alt)'"
      onmouseout="this.style.background='var(--color-surface)'"
    >
      <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">${i.fullName}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-primary);font-weight:var(--font-weight-medium);">+ Add</span>
    </div>`).join('');
};

window.addMemberFromSearch = function(individualId, name) {
  const roleType  = document.getElementById('member-role')?.value;
  const ownership = document.getElementById('member-ownership')?.value;
  if (!roleType) { toast('Select a role first', 'err'); return; }
  if (!S._draft) S._draft = {};
  if (!S._draft._pendingMembers) S._draft._pendingMembers = [];
  if (S._draft._pendingMembers.find(m => m.individualId === individualId)) { toast('Already added', 'err'); return; }
  S._draft._pendingMembers.push({
    individualId, name, roleType,
    ownershipPercent: ownership ? Number(ownership) : null,
    startDate: new Date().toISOString().split('T')[0],
  });
  const s = document.getElementById('member-search');
  const r = document.getElementById('member-search-results');
  if (s) s.value = '';
  if (r) r.innerHTML = '';
  render();
};

window.addNewMember = function() {
  const { entityId } = S.currentParams || {};
  go('individual-new', { entryPoint: 'entity', entityId });
};

window.removePendingMember = function(i) {
  if (S._draft?._pendingMembers) S._draft._pendingMembers.splice(i, 1);
  render();
};

window.savePendingMembers = async function(entityId) {
  const pending = S._draft?._pendingMembers || [];
  if (!pending.length) { toast('No people to save', 'err'); return; }
  const now = new Date().toISOString();
  for (const m of pending) {
    const lid = genId('link');
    const linkData = {
      linkId: lid, individualId: m.individualId,
      linkedObjectType: 'entity', linkedObjectId: entityId,
      roleType: m.roleType, ownershipPercent: m.ownershipPercent,
      status: 'active', startDate: m.startDate,
      createdAt: now, updatedAt: now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);
    const ind = S.individuals.find(i => i.individualId === m.individualId);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'member_added', targetType: 'entity', targetId: entityId,
      targetName: S.entities?.find(e=>e.entityId===entityId)?.entityName || '',
      detail: `${ind?.fullName||m.name} added as ${ROLE_LABELS[m.roleType]||m.roleType}`,
      timestamp: now,
    });
  }
  if (S._draft) delete S._draft._pendingMembers;
  toast('Key people saved');
  go('entity-detail', { entityId });
};

window.endEntityMember = async function(linkId) {
  if (!confirm('End this role? The record will be preserved with an end date.')) return;
  const { updateLink } = await import('../../firebase/firestore.js');
  const now = new Date().toISOString();
  await updateLink(linkId, { status: 'former', endDate: now });
  const link = S.links.find(l => l.linkId === linkId);
  if (link) { link.status = 'former'; link.endDate = now; }
  toast('Role ended — record preserved');
  render();
};

export { screen as editScreen };
