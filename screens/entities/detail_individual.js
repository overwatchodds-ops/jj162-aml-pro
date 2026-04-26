// ─── INDIVIDUAL / SOLE TRADER CLIENT DETAIL ───────────────────────────────────
// One screen, one save button, always-editable fields.
//
// New mode (isNew: true):
//   - Brand new individual + entity + link created atomically
//   - OR reuse existingIndividualId — link to parent entity, update individual data
//
// Existing mode (entityId in params):
//   - Fields pre-filled from entity + linked individual + latest CDD records
//   - CDD records only written if values have actually changed
//
// fid = entityId || 'new'  — stable element ID prefix throughout

import {
  S,
  addEntityToState,
  addLinkToState,
  addIndividualToState,
} from '../../state/index.js';

import {
  fmtDate,
  saveEntity, updateEntity,
  saveIndividual,
  saveLink,
  saveVerification, saveScreening,
  saveAuditEntry,
  genId,
} from '../../firebase/firestore.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function riskBadge(rating) {
  switch (rating?.toLowerCase()) {
    case 'high':   return `<span class="badge badge-danger">High risk</span>`;
    case 'medium': return `<span class="badge badge-warning">Medium risk</span>`;
    case 'low':    return `<span class="badge badge-success">Low risk</span>`;
    default:       return `<span class="badge badge-neutral">Unrated</span>`;
  }
}

function staffOptions(selected = '') {
  const staff = (S.individuals || []).filter(i => i.isStaff);
  if (!staff.length) return `<option value="">No staff found — add staff first</option>`;
  return `<option value="">Select staff member...</option>` +
    staff.map(s =>
      `<option value="${s.fullName}" ${selected === s.fullName ? 'selected' : ''}>
        ${s.fullName}${s.role ? ' · ' + s.role : ''}
      </option>`
    ).join('');
}

function inp(id, type, value = '', placeholder = '') {
  return `<input id="${id}" type="${type}" class="inp" value="${value}" placeholder="${placeholder}">`;
}

function addMonthsISO(dateValue = '', monthsToAdd = 0) {
  if (!dateValue) return '';
  const [yyyy, mm, dd] = String(dateValue).split('-').map(Number);
  if (!yyyy || !mm || !dd) return '';
  const result = new Date(yyyy, (mm - 1) + monthsToAdd, dd);
  if (result.getDate() !== dd) result.setDate(0);
  return result.toISOString().split('T')[0];
}

function getSelfEntityLink(individualId) {
  return (S.links || []).find(l =>
    l.individualId     === individualId &&
    l.linkedObjectType === 'entity' &&
    l.roleType         === 'self' &&
    l.status           === 'active'
  ) || null;
}

function getLatestVer(individualId) {
  return (S.verifications || [])
    .filter(v => v.individualId === individualId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;
}

function getLatestScr(individualId) {
  return (S.screenings || [])
    .filter(s => s.individualId === individualId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
}

function getCDDState(latestVer, latestScr) {
  const missing = [];
  if (!latestVer)         missing.push('ID verification');
  if (!latestScr?.result) missing.push('Screening');
  return {
    complete: missing.length === 0,
    label:    missing.length === 0 ? 'CDD complete' : 'CDD incomplete',
    detail:   missing.length === 0
      ? 'ID verification and screening recorded'
      : `Missing: ${missing.join(' + ')}`,
  };
}

function findPotentialDuplicate({ fullName, dateOfBirth, email, idNumber }, excludeIndividualId = '') {
  const name = String(fullName    || '').trim().toLowerCase();
  const dob  = String(dateOfBirth || '').trim();
  const eml  = String(email       || '').trim().toLowerCase();
  const idNo = String(idNumber    || '').trim().toLowerCase();

  if (idNo) {
    const verDup = (S.verifications || []).find(v => {
      if (String(v.idNumber || '').trim().toLowerCase() !== idNo) return false;
      return !excludeIndividualId || v.individualId !== excludeIndividualId;
    });
    if (verDup) {
      const matchedInd = (S.individuals || []).find(i => i.individualId === verDup.individualId);
      return { type: 'idNumber', individual: matchedInd || { fullName: 'Existing record' } };
    }
  }

  if (!name) return null;

  const indDup = (S.individuals || []).find(i => {
    if (i.isStaff) return false;
    if (excludeIndividualId && i.individualId === excludeIndividualId) return false;
    const sameName  = String(i.fullName    || '').trim().toLowerCase() === name;
    const sameDOB   = dob && String(i.dateOfBirth || '').trim() === dob;
    const sameEmail = eml && String(i.email || '').trim().toLowerCase() === eml;
    return sameName && (sameDOB || sameEmail);
  });

  return indDup ? { type: 'nameDobOrEmail', individual: indDup } : null;
}

// Write a link between an individual and a parent entity — skips if already exists
async function linkToParent(iid, parentEntityId, parentRoleType, now) {
  if (!parentEntityId || !parentRoleType) return;
  const alreadyLinked = (S.links || []).some(l =>
    l.individualId     === iid            &&
    l.linkedObjectType === 'entity'       &&
    l.linkedObjectId   === parentEntityId &&
    l.roleType         === parentRoleType &&
    l.status           === 'active'
  );
  if (alreadyLinked) return;
  const lid = genId('link');
  const linkData = {
    linkId: lid, individualId: iid,
    linkedObjectType: 'entity', linkedObjectId: parentEntityId,
    roleType: parentRoleType, status: 'active',
    startDate: now, createdAt: now, updatedAt: now,
  };
  await saveLink(lid, linkData);
  addLinkToState(linkData);
}

// Write verification + screening records.
// forceWrite = true (new client) always writes. false (edit) only writes if values changed.
// Returns array of audit note strings for what was written.
async function writeCDDRecords(iid, fields, existing = {}, forceWrite = false) {
  const {
    idType, idNum, verState, verExpiry, verBy, verDate, verMethod,
    scrProv, scrDate, scrResult, scrRef, scrBy, scrNext,
    now, firmId,
  } = fields;

  const auditNotes = [];

  const verChanged = forceWrite || !existing.ver ||
    existing.ver.idNumber       !== idNum     ||
    existing.ver.idType         !== idType    ||
    existing.ver.verifiedDate   !== verDate   ||
    existing.ver.verifiedBy     !== verBy     ||
    existing.ver.verifiedMethod !== verMethod ||
    existing.ver.issuingState   !== verState  ||
    existing.ver.expiryDate     !== verExpiry;

  if (verChanged) {
    const verRec = {
      verificationId: genId('ver'), firmId, individualId: iid,
      idType, idNumber: idNum, issuingState: verState, expiryDate: verExpiry,
      verifiedBy: verBy, verifiedDate: verDate, verifiedMethod: verMethod,
      createdAt: now,
    };
    await saveVerification(verRec);
    S.verifications.unshift(verRec);
    auditNotes.push('ID verification recorded');
  }

  const scrChanged = forceWrite || !existing.scr ||
    existing.scr.provider    !== scrProv   ||
    existing.scr.date        !== scrDate   ||
    existing.scr.result      !== scrResult ||
    existing.scr.referenceId !== scrRef;

  if (scrChanged) {
    const scrRec = {
      screeningId: genId('scr'), firmId, individualId: iid,
      provider: scrProv, date: scrDate, result: scrResult,
      referenceId: scrRef, completedBy: scrBy, nextDueDate: scrNext,
      createdAt: now,
    };
    await saveScreening(scrRec);
    S.screenings.unshift(scrRec);
    auditNotes.push('screening recorded');
  }

  return auditNotes;
}

function currentUserName() {
  return S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User';
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export function screen() {
  const {
    entityId,
    isNew,
    entityType:          newType,
    returnToEntity:      parentEntityId,
    existingIndividualId,
  } = S.currentParams || {};

  const fid         = entityId || 'new';
  const entity      = entityId ? (S.entities || []).find(e => e.entityId === entityId) : null;
  const etype       = entity?.entityType || newType || S._draft?.entityType || 'Individual';
  const existingInd = existingIndividualId
    ? (S.individuals || []).find(i => i.individualId === existingIndividualId)
    : null;
  const selfLink    = existingInd ? getSelfEntityLink(existingInd.individualId) : null;
  const selfEntity  = selfLink ? (S.entities || []).find(e => e.entityId === selfLink.linkedObjectId) : null;
  const today       = new Date().toISOString().split('T')[0];

  if (!isNew && !entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm"
              style="margin-top:var(--space-3);">← Clients</button>
    </div>`;

  const selfLink2    = entity
    ? (S.links || []).find(l =>
        l.linkedObjectId   === entityId &&
        l.linkedObjectType === 'entity' &&
        l.roleType         === 'self'   &&
        l.status           === 'active')
    : null;

  const individualId = selfLink2?.individualId || existingIndividualId || null;
  const ind          = individualId ? (S.individuals || []).find(i => i.individualId === individualId) : existingInd || null;
  const latestVer    = individualId ? getLatestVer(individualId) : null;
  const latestScr    = individualId ? getLatestScr(individualId) : null;
  const cddState     = getCDDState(latestVer, latestScr);

  const cancelAction = isNew
    ? (parentEntityId ? `go('entity-detail',{entityId:'${parentEntityId}'})` : 'clearClientType()')
    : "go('entities')";
  const cancelLabel  = isNew
    ? (parentEntityId ? '← Back to parent client' : 'Cancel')
    : '← Clients';

  return `
    <div>

      <!-- HEADER -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="${cancelAction}" class="btn-ghost"
                  style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ${cancelLabel}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">
            ${isNew
              ? (existingInd ? `Link existing individual — ${existingInd.fullName}` : 'New ' + etype)
              : entity.entityName}
          </h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);flex-wrap:wrap;">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${etype}</span>
            ${!isNew ? `
              <span class="badge ${cddState.complete ? 'badge-success' : 'badge-danger'}">${cddState.label}</span>
              ${riskBadge(entity.entityRiskRating)}
            ` : ''}
          </div>
          ${!isNew && !cddState.complete ? `
            <div style="font-size:var(--font-size-xs);color:var(--color-danger);margin-top:var(--space-1);">
              ${cddState.detail}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- CARD 1: PERSONAL DETAILS -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Individual details</div>
        <div class="form-grid" style="grid-template-columns:1fr;">

          <div class="form-row">
            <label class="label label-required">Full legal name</label>
            ${inp(`f-name-${fid}`, 'text', ind?.fullName || entity?.entityName || '', 'e.g. Jane Elizabeth Smith')}
          </div>

          <div class="form-row">
            <label class="label label-required">Date of birth</label>
            ${inp(`f-dob-${fid}`, 'date', ind?.dateOfBirth || entity?.dateOfBirth || '')}
          </div>

          <div class="form-row">
            <label class="label label-required">Residential address</label>
            ${inp(`f-address-${fid}`, 'text', ind?.address || entity?.registeredAddress || '', '12 Main St, Sydney NSW 2000')}
          </div>

          <div class="form-row">
            <label class="label">Email</label>
            ${inp(`f-email-${fid}`, 'email', ind?.email || entity?.email || '', 'jane@example.com')}
          </div>

          <div style="padding-top:var(--space-3);border-top:0.5px solid var(--color-border-light);margin-top:var(--space-2);">
            <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);
                        color:var(--color-text-muted);margin-bottom:var(--space-3);">
              IF SOLE TRADER — leave blank if not applicable
            </div>
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label">Trading / business name</label>
                ${inp(`f-trading-${fid}`, 'text', entity?.tradingName || selfEntity?.tradingName || '', "e.g. Smith's Plumbing")}
              </div>
              <div class="form-row">
                <label class="label">ABN</label>
                ${inp(`f-abn-${fid}`, 'text', entity?.abn || selfEntity?.abn || '', '12 345 678 901')}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- CARD 2: ID VERIFICATION -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">ID verification</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          ${latestVer
            ? `Last recorded: ${latestVer.idType} · ${fmtDate(latestVer.verifiedDate)} · by ${latestVer.verifiedBy}`
            : 'Record the identity document sighted. You do not need to upload a copy.'}
        </p>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row span-2">
            <label class="label label-required">Staff member conducting CDD</label>
            <select id="staff-by-${fid}" class="inp">
              ${staffOptions(latestVer?.verifiedBy || entity?.riskAssessedBy || selfEntity?.riskAssessedBy)}
            </select>
            <p style="font-size:10px;color:var(--color-text-muted);margin-top:4px;">
              Applies to ID verification, screening and risk assessment below.
            </p>
          </div>

          <div class="form-row">
            <label class="label label-required">ID type</label>
            <select id="ver-type-${fid}" class="inp">
              ${['Passport','Driver licence','Medicare card','Other government ID']
                .map(t => `<option ${latestVer?.idType === t ? 'selected' : ''}>${t}</option>`)
                .join('')}
            </select>
          </div>

          <div class="form-row">
            <label class="label label-required">ID number</label>
            ${inp(`ver-num-${fid}`, 'text', latestVer?.idNumber || '', 'e.g. PA1234567')}
          </div>

          <div class="form-row">
            <label class="label">Issuing state / country</label>
            ${inp(`ver-state-${fid}`, 'text', latestVer?.issuingState || '', 'e.g. NSW')}
          </div>

          <div class="form-row">
            <label class="label">Expiry date</label>
            ${inp(`ver-expiry-${fid}`, 'date', latestVer?.expiryDate || '')}
          </div>

          <div class="form-row">
            <label class="label label-required">Verified date</label>
            ${inp(`ver-date-${fid}`, 'date', latestVer?.verifiedDate || today)}
          </div>

          <div class="form-row span-2">
            <label class="label">Method</label>
            <select id="ver-method-${fid}" class="inp">
              ${['In person','Certified copy','Electronic verification']
                .map(m => `<option ${latestVer?.verifiedMethod === m ? 'selected' : ''}>${m}</option>`)
                .join('')}
            </select>
          </div>

        </div>
      </div>

      <!-- CARD 3: PEP / SANCTIONS SCREENING -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">PEP / sanctions screening</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          ${latestScr
            ? `Last recorded: ${latestScr.result} · ${latestScr.provider} · ${fmtDate(latestScr.date)}`
            : 'Screen against PEP, sanctions and adverse media lists before onboarding.'}
        </p>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row">
            <label class="label label-required">Provider</label>
            ${inp(`scr-provider-${fid}`, 'text', latestScr?.provider || '', 'e.g. NameScan')}
          </div>

          <div class="form-row">
            <label class="label label-required">Screening date</label>
            <input id="scr-date-${fid}" type="date" class="inp"
                   value="${latestScr?.date || today}"
                   onchange="scrAutoNext('${fid}', this.value)">
          </div>

          <div class="form-row">
            <label class="label label-required">Result</label>
            <select id="scr-result-${fid}" class="inp">
              ${['Clear','PEP match','Sanctions match','Adverse media','Refer for review']
                .map(r => `<option ${latestScr?.result === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>

          <div class="form-row">
            <label class="label">Reference ID</label>
            ${inp(`scr-ref-${fid}`, 'text', latestScr?.referenceId || '', 'e.g. NS-98765')}
          </div>

          <div class="form-row">
            <label class="label">Next screening due</label>
            ${inp(`scr-next-${fid}`, 'date', latestScr?.nextDueDate || '')}
          </div>

        </div>

        <div style="margin-top:var(--space-2);">
          <a href="https://namescan.io/?ref=SIMPLEAML" target="_blank"
             class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
            Open NameScan →
          </a>
        </div>
      </div>

      <!-- CARD 4: RISK ASSESSMENT -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Client risk assessment
          <span style="font-size:var(--font-size-xs);font-weight:400;
                       color:var(--color-text-muted);margin-left:var(--space-2);">(optional)</span>
        </div>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row">
            <label class="label">Risk rating</label>
            <select id="risk-rating-${fid}" class="inp" onchange="riskAutoNext('${fid}')">
              <option value="">Select...</option>
              ${['Low','Medium','High'].map(r =>
                `<option value="${r}" ${(entity?.entityRiskRating || selfEntity?.entityRiskRating) === r ? 'selected' : ''}>${r}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-row">
            <label class="label">Assessed date</label>
            <input id="risk-date-${fid}" type="date" class="inp"
                   value="${entity?.riskAssessedDate || selfEntity?.riskAssessedDate || today}"
                   onchange="riskAutoNext('${fid}')">
          </div>

          <div class="form-row">
            <label class="label">Next review date</label>
            ${inp(`risk-next-${fid}`, 'date', entity?.riskNextReviewDate || selfEntity?.riskNextReviewDate || '')}
          </div>

          <div class="form-row span-2">
            <label class="label">Methodology notes</label>
            <textarea id="risk-notes-${fid}" class="inp" rows="2"
                      placeholder="Describe the risk factors considered..."
            >${entity?.riskMethodology || selfEntity?.riskMethodology || ''}</textarea>
          </div>

        </div>

        <div class="banner banner-info" style="margin-top:var(--space-3);">
          High risk: review every 12 months · Medium: 24 months · Low: 36 months
        </div>
      </div>

      ${!isNew ? `
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">SMR</div>
          <button onclick="go('smr',{filterEntity:'${fid}'})" class="btn-sec btn-sm">
            View SMRs involving this client
          </button>
        </div>
      ` : ''}

      <div id="save-error-${fid}" class="banner banner-danger"
           style="display:none;margin-bottom:var(--space-3);"></div>

      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
        <button onclick="${cancelAction}" class="btn-sec" style="flex:1;">${cancelLabel}</button>
        <button onclick="saveClient('${fid}','${etype}','${individualId || ''}')"
                class="btn" style="flex:2;">Save client</button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.clearClientType = function() {
  delete S._draft;
  S.currentParams = {};
  go('entity-new');
};

window.scrAutoNext = function(fid, date) {
  if (!date) return;
  const el = document.getElementById(`scr-next-${fid}`);
  if (el && !el.value) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 1);
    el.value = d.toISOString().split('T')[0];
  }
};

window.riskAutoNext = function(fid) {
  const rating = document.getElementById(`risk-rating-${fid}`)?.value;
  const date   = document.getElementById(`risk-date-${fid}`)?.value;
  const el     = document.getElementById(`risk-next-${fid}`);
  if (!el || !rating || !date) return;
  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  el.value = addMonthsISO(date, months);
};

window.saveClient = async function(fid, etype, linkedIndividualId) {
  // ── Read all form values ───────────────────────────────────────────────────
  const g        = id => document.getElementById(id);
  const name     = g(`f-name-${fid}`)?.value?.trim();
  const dob      = g(`f-dob-${fid}`)?.value;
  const address  = g(`f-address-${fid}`)?.value?.trim();
  const email    = g(`f-email-${fid}`)?.value?.trim()    || '';
  const abn      = g(`f-abn-${fid}`)?.value?.trim()      || '';
  const trading  = g(`f-trading-${fid}`)?.value?.trim()  || '';
  const staffBy  = g(`staff-by-${fid}`)?.value           || '';
  const idNum    = g(`ver-num-${fid}`)?.value?.trim();
  const idType   = g(`ver-type-${fid}`)?.value           || '';
  const verState = g(`ver-state-${fid}`)?.value?.trim()  || '';
  const verExpiry= g(`ver-expiry-${fid}`)?.value         || '';
  const verDate  = g(`ver-date-${fid}`)?.value;
  const verMethod= g(`ver-method-${fid}`)?.value         || '';
  const scrProv  = g(`scr-provider-${fid}`)?.value?.trim();
  const scrDate  = g(`scr-date-${fid}`)?.value;
  const scrResult= g(`scr-result-${fid}`)?.value         || '';
  const scrRef   = g(`scr-ref-${fid}`)?.value?.trim()    || '';
  const scrNext  = g(`scr-next-${fid}`)?.value           || '';
  const riskRating=g(`risk-rating-${fid}`)?.value        || '';
  const riskDate = g(`risk-date-${fid}`)?.value          || '';
  const riskNext = g(`risk-next-${fid}`)?.value          || '';
  const riskNotes= g(`risk-notes-${fid}`)?.value?.trim() || '';

  const parentEntityId       = S.currentParams?.returnToEntity       || null;
  const parentRoleType       = S.currentParams?.roleType             || '';
  const existingIndividualId = S.currentParams?.existingIndividualId || null;

  // ── Error display ──────────────────────────────────────────────────────────
  const errEl = document.getElementById(`save-error-${fid}`);
  const fail  = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    else toast(msg, 'err');
    window.scrollTo(0, document.body.scrollHeight);
  };
  if (errEl) errEl.style.display = 'none';

  // ── Validation ────────────────────────────────────────────────────────────
  if (!name)    return fail('Full legal name is required.');
  if (!dob)     return fail('Date of birth is required.');
  if (!address) return fail('Residential address is required.');
  if (!idNum)   return fail('ID number is required.');
  if (!staffBy) return fail('Staff member is required.');
  if (!verDate) return fail('Verified date is required.');
  if (!scrProv) return fail('Screening provider is required.');
  if (!scrDate) return fail('Screening date is required.');

  const isNew    = fid === 'new';
  const entityId = isNew ? null : S.currentParams?.entityId;
  const now      = new Date().toISOString();
  const firmId   = S.firmId;

  // ── Shared field bundles ───────────────────────────────────────────────────
  const cddFields = {
    idType, idNum, verState, verExpiry,
    verBy: staffBy, verDate, verMethod,
    scrProv, scrDate, scrResult, scrRef,
    scrBy: staffBy, scrNext,
    now, firmId,
  };

  const entityFields = {
    entityName: name, entityType: etype,
    dateOfBirth: dob, registeredAddress: address,
    email, abn, tradingName: trading,
    entityRiskRating:   riskRating || null,
    riskAssessedBy:     staffBy,
    riskAssessedDate:   riskDate,
    riskNextReviewDate: riskNext,
    riskMethodology:    riskNotes,
  };

  try {

    // ── NEW CLIENT ───────────────────────────────────────────────────────────
    if (isNew) {

      // Sub-case A: reuse an existing individual record
      if (existingIndividualId) {
        const iid      = existingIndividualId;
        const indInState = S.individuals.find(i => i.individualId === iid) || {};
        const indData  = { ...indInState, fullName: name, dateOfBirth: dob, address, email, isStaff: false, updatedAt: now };
        await saveIndividual(iid, indData);
        if (S.individuals.some(i => i.individualId === iid)) {
          Object.assign(indInState, indData);
        } else {
          addIndividualToState({ individualId: iid, firmId, createdAt: now, ...indData });
        }

        // Ensure a self-entity exists
        let selfLink     = getSelfEntityLink(iid);
        let selfEntityId = selfLink?.linkedObjectId || null;

        if (selfEntityId) {
          await updateEntity(selfEntityId, { ...entityFields, updatedAt: now });
          const entityInState = S.entities.find(e => e.entityId === selfEntityId);
          if (entityInState) Object.assign(entityInState, entityFields);
        } else {
          selfEntityId = genId('ent');
          const entityData = { entityId: selfEntityId, firmId, createdAt: now, updatedAt: now, ...entityFields };
          await saveEntity(selfEntityId, entityData);
          addEntityToState(entityData);
          const lid = genId('link');
          const selfLinkData = {
            linkId: lid, individualId: iid,
            linkedObjectType: 'entity', linkedObjectId: selfEntityId,
            roleType: 'self', status: 'active',
            startDate: now, createdAt: now, updatedAt: now,
          };
          await saveLink(lid, selfLinkData);
          addLinkToState(selfLinkData);
        }

        await linkToParent(iid, parentEntityId, parentRoleType, now);
        await writeCDDRecords(iid, cddFields, {}, true);
        await saveAuditEntry({
          firmId, userId: S.individualId, userName: currentUserName(),
          action: 'individual_linked', targetType: 'entity',
          targetId: parentEntityId || selfEntityId, targetName: name,
          detail: `Existing individual reused — ${name}${parentEntityId ? ' — linked to parent client' : ''}`,
          timestamp: now,
        });

        delete S._draft;
        toast(parentEntityId ? 'Existing individual linked' : 'Client saved');
        go('entity-detail', { entityId: parentEntityId || selfEntityId });
        return;
      }

      // Sub-case B: brand new individual
      const duplicate = findPotentialDuplicate({ fullName: name, dateOfBirth: dob, email, idNumber: idNum });
      if (duplicate) {
        const matchedName = duplicate.individual?.fullName || 'existing record';
        const reason = duplicate.type === 'idNumber'
          ? 'same ID number already exists'
          : 'same name with matching DOB or email already exists';
        return fail(`Possible duplicate: ${matchedName} — ${reason}. Search from the parent client page instead.`);
      }

      const eid = genId('ent');
      const iid = genId('ind');

      await saveEntity(eid, { entityId: eid, firmId, createdAt: now, updatedAt: now, ...entityFields });
      addEntityToState({ entityId: eid, firmId, createdAt: now, updatedAt: now, ...entityFields });

      await saveIndividual(iid, { individualId: iid, firmId, fullName: name, dateOfBirth: dob, address, email, isStaff: false, createdAt: now, updatedAt: now });
      addIndividualToState({ individualId: iid, firmId, fullName: name, dateOfBirth: dob, address, email, isStaff: false, createdAt: now, updatedAt: now });

      const selfLinkData = {
        linkId: genId('link'), individualId: iid,
        linkedObjectType: 'entity', linkedObjectId: eid,
        roleType: 'self', status: 'active',
        startDate: now, createdAt: now, updatedAt: now,
      };
      await saveLink(selfLinkData.linkId, selfLinkData);
      addLinkToState(selfLinkData);

      await linkToParent(iid, parentEntityId, parentRoleType, now);
      await writeCDDRecords(iid, cddFields, {}, true);
      await saveAuditEntry({
        firmId, userId: S.individualId, userName: currentUserName(),
        action: 'entity_created', targetType: 'entity', targetId: eid, targetName: name,
        detail: `Client created — ${name} (${etype}) — verified by ${staffBy} — screening: ${scrResult}`,
        timestamp: now,
      });

      delete S._draft;
      toast(parentEntityId ? 'Individual created and linked' : 'Client saved');
      go('entity-detail', { entityId: parentEntityId || eid });
      return;
    }

    // ── EXISTING CLIENT ──────────────────────────────────────────────────────
    const iid = linkedIndividualId || '';
    if (!iid) return fail('Cannot save — individual record not found. Please contact support.');

    await updateEntity(entityId, { ...entityFields, updatedAt: now });
    const entityInState = S.entities.find(e => e.entityId === entityId);
    if (entityInState) Object.assign(entityInState, entityFields);

    const indInState = S.individuals.find(i => i.individualId === iid) || {};
    const updatedInd = { ...indInState, fullName: name, dateOfBirth: dob, address, email, updatedAt: now };
    await saveIndividual(iid, updatedInd);
    Object.assign(indInState, updatedInd);

    const auditNotes = await writeCDDRecords(iid, cddFields, {
      ver: getLatestVer(iid),
      scr: getLatestScr(iid),
    });

    await saveAuditEntry({
      firmId, userId: S.individualId, userName: currentUserName(),
      action: 'entity_updated', targetType: 'entity', targetId: entityId, targetName: name,
      detail: [`Client updated — ${name}`, ...auditNotes].join(' — '),
      timestamp: now,
    });

    toast('Client saved');
    go('entity-detail', { entityId });

  } catch (err) {
    fail('Failed to save. Please try again.');
    console.error(err);
  }
};
