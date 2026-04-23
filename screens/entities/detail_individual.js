// ─── INDIVIDUAL / SOLE TRADER CLIENT DETAIL ───────────────────────────────────
// One screen, one save button, always-editable fields.
// New mode:      inputs empty, saves entity + individual + link + CDD
// Existing mode: inputs pre-filled, saves updates to all records
//
// fid = entityId || 'new'  — stable element ID prefix throughout

import { S, addEntityToState, addLinkToState } from '../../state/index.js';
import { fmtDate,
         saveEntity, saveLink,
         saveVerification, saveScreening,
         saveAuditEntry, genId }               from '../../firebase/firestore.js';

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
  return `<input id="${id}" type="${type}" class="inp"
                 value="${value}" placeholder="${placeholder}">`;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export function screen() {
  const { entityId, isNew, entityType: newType } = S.currentParams || {};

  const fid          = entityId || 'new';
  const entity       = entityId ? (S.entities || []).find(e => e.entityId === entityId) : null;
  const etype        = entity?.entityType || newType || S._draft?.entityType || 'Individual';
  const today        = new Date().toISOString().split('T')[0];

  if (!isNew && !entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm"
              style="margin-top:var(--space-3);">← Clients</button>
    </div>`;

  // Linked individual + latest evidence
  const link = entity
    ? (S.links || []).find(l =>
        l.linkedObjectId === entityId &&
        l.linkedObjectType === 'entity' &&
        l.status === 'active')
    : null;
  const individualId = link?.individualId || null;
  const ind = individualId
    ? (S.individuals || []).find(i => i.individualId === individualId)
    : null;

  const latestVer = individualId
    ? (S.verifications || [])
        .filter(v => v.individualId === individualId)
        .sort((a, b) => b.createdAt?.localeCompare(a.createdAt))[0] || null
    : null;
  const latestScr = individualId
    ? (S.screenings || [])
        .filter(s => s.individualId === individualId)
        .sort((a, b) => b.date?.localeCompare(a.date))[0] || null
    : null;

  const cddComplete = !!latestVer && !!latestScr?.result;

  return `
    <div>

      <!-- HEADER -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;
                  margin-bottom:var(--space-5);">
        <div>
          <button onclick="${isNew ? 'clearClientType()' : "go('entities')"}"
                  class="btn-ghost"
                  style="padding:0;color:var(--color-text-muted);
                         font-size:var(--font-size-sm);">
            ← ${isNew ? 'Change type' : 'Clients'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">
            ${isNew ? 'New ' + etype : entity.entityName}
          </h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);
                      margin-top:var(--space-1);">
            <span style="font-size:var(--font-size-xs);
                         color:var(--color-text-muted);">${etype}</span>
            ${!isNew ? `
              <span class="badge ${cddComplete ? 'badge-success' : 'badge-danger'}">
                ${cddComplete ? 'CDD complete' : 'Action required'}
              </span>
              ${riskBadge(entity.entityRiskRating)}
            ` : ''}
          </div>
        </div>
      </div>

      <!-- CARD 1: PERSONAL DETAILS -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">
          Individual details
        </div>

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

          <!-- Sole trader fields — leave blank if not applicable -->
          <div style="padding-top:var(--space-3);border-top:0.5px solid var(--color-border-light);margin-top:var(--space-2);">
            <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);
                        color:var(--color-text-muted);margin-bottom:var(--space-3);">
              IF SOLE TRADER — leave blank if not applicable
            </div>
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label">Trading / business name</label>
                ${inp(`f-trading-${fid}`, 'text', entity?.tradingName || '', "e.g. Smith's Plumbing")}
              </div>
              <div class="form-row">
                <label class="label">ABN</label>
                ${inp(`f-abn-${fid}`, 'text', entity?.abn || '', '12 345 678 901')}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- CARD 2: ID VERIFICATION -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">ID verification</div>
        ${!isNew && latestVer ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                    margin-bottom:var(--space-3);">
            Last recorded: ${latestVer.idType} · ${fmtDate(latestVer.verifiedDate)}
            · by ${latestVer.verifiedBy}
          </p>
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                    margin-bottom:var(--space-3);">
            Record the identity document sighted. You do not need to upload a copy.
          </p>
        `}

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row span-2">
            <label class="label label-required">Staff member conducting CDD</label>
            <select id="staff-by-${fid}" class="inp">
              ${staffOptions(latestVer?.verifiedBy || entity?.riskAssessedBy)}
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
        ${!isNew && latestScr ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                    margin-bottom:var(--space-3);">
            Last recorded: ${latestScr.result} · ${latestScr.provider}
            · ${fmtDate(latestScr.date)}
          </p>
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                    margin-bottom:var(--space-3);">
            Screen against PEP, sanctions and adverse media lists before onboarding.
          </p>
        `}

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
             class="btn-ghost"
             style="font-size:var(--font-size-xs);color:var(--color-primary);">
            Open NameScan →
          </a>
        </div>
      </div>

      <!-- CARD 4: RISK ASSESSMENT -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Client risk assessment
          <span style="font-size:var(--font-size-xs);font-weight:400;
                       color:var(--color-text-muted);margin-left:var(--space-2);">
            (optional)
          </span>
        </div>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row">
            <label class="label">Risk rating</label>
            <select id="risk-rating-${fid}" class="inp"
                    onchange="riskAutoNext('${fid}')">
              <option value="">Select...</option>
              ${['Low','Medium','High'].map(r =>
                `<option value="${r}" ${entity?.entityRiskRating === r ? 'selected' : ''}>${r}</option>`
              ).join('')}
            </select>
          </div>


          <div class="form-row">
            <label class="label">Assessed date</label>
            <input id="risk-date-${fid}" type="date" class="inp"
                   value="${entity?.riskAssessedDate || today}"
                   onchange="riskAutoNext('${fid}')">
          </div>

          <div class="form-row">
            <label class="label">Next review date</label>
            ${inp(`risk-next-${fid}`, 'date', entity?.riskNextReviewDate || '')}
          </div>

          <div class="form-row span-2">
            <label class="label">Methodology notes</label>
            <textarea id="risk-notes-${fid}" class="inp" rows="2"
                      placeholder="Describe the risk factors considered..."
            >${entity?.riskMethodology || ''}</textarea>
          </div>

        </div>

        <div class="banner banner-info" style="margin-top:var(--space-3);">
          High risk: review every 12 months · Medium: 24 months · Low: 36 months
        </div>
      </div>

      <!-- SMR LINK (existing only) -->
      ${!isNew ? `
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">SMR</div>
          <button onclick="go('smr',{filterEntity:'${fid}'})" class="btn-sec btn-sm">
            View SMRs involving this client
          </button>
        </div>
      ` : ''}

      <!-- ERROR + SINGLE SAVE BUTTON -->
      <div id="save-error-${fid}" class="banner banner-danger"
           style="display:none;margin-bottom:var(--space-3);"></div>

      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
        <button onclick="${isNew ? 'clearClientType()' : "go('entities')"}"
                class="btn-sec" style="flex:1;">
          ${isNew ? 'Cancel' : '← Clients'}
        </button>
        <button onclick="saveClient('${fid}','${etype}','${individualId}')"
                class="btn" style="flex:2;">
          Save client
        </button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

// Back to type picker
window.clearClientType = function() {
  delete S._draft;
  S.currentParams = {};
  go('entity-new');
};

// Auto-set next screening due = date + 1 year
window.scrAutoNext = function(fid, date) {
  if (!date) return;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById(`scr-next-${fid}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

// Auto-set next review date from risk rating
window.riskAutoNext = function(fid) {
  const rating = document.getElementById(`risk-rating-${fid}`)?.value;
  const date   = document.getElementById(`risk-date-${fid}`)?.value;
  if (!rating || !date) return;
  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  const el = document.getElementById(`risk-next-${fid}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

// ── SINGLE SAVE — handles both new and existing ────────────────────────────────
window.saveClient = async function(fid, etype, individualId) {

  // Read all form values
  const name       = document.getElementById(`f-name-${fid}`)?.value?.trim();
  const dob        = document.getElementById(`f-dob-${fid}`)?.value;
  const address    = document.getElementById(`f-address-${fid}`)?.value?.trim();
  const email      = document.getElementById(`f-email-${fid}`)?.value?.trim()    || '';
  const abn        = document.getElementById(`f-abn-${fid}`)?.value?.trim()      || '';
  const trading    = document.getElementById(`f-trading-${fid}`)?.value?.trim()  || '';
  const idNum      = document.getElementById(`ver-num-${fid}`)?.value?.trim();
  const idType     = document.getElementById(`ver-type-${fid}`)?.value           || '';
  const verState   = document.getElementById(`ver-state-${fid}`)?.value?.trim()  || '';
  const verExpiry  = document.getElementById(`ver-expiry-${fid}`)?.value          || '';
  const verBy      = document.getElementById(`staff-by-${fid}`)?.value;
  const verDate    = document.getElementById(`ver-date-${fid}`)?.value;
  const verMethod  = document.getElementById(`ver-method-${fid}`)?.value          || '';
  const scrProv    = document.getElementById(`scr-provider-${fid}`)?.value?.trim();
  const scrDate    = document.getElementById(`scr-date-${fid}`)?.value;
  const scrResult  = document.getElementById(`scr-result-${fid}`)?.value          || '';
  const scrRef     = document.getElementById(`scr-ref-${fid}`)?.value?.trim()     || '';
  const scrBy      = document.getElementById(`staff-by-${fid}`)?.value              || '';
  const scrNext    = document.getElementById(`scr-next-${fid}`)?.value            || '';
  const riskRating = document.getElementById(`risk-rating-${fid}`)?.value         || '';
  const riskBy     = document.getElementById(`staff-by-${fid}`)?.value             || '';
  const riskDate   = document.getElementById(`risk-date-${fid}`)?.value           || '';
  const riskNext   = document.getElementById(`risk-next-${fid}`)?.value           || '';
  const riskNotes  = document.getElementById(`risk-notes-${fid}`)?.value?.trim()  || '';

  // Error helper
  const errEl = document.getElementById(`save-error-${fid}`);
  const fail  = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    else toast(msg, 'err');
    window.scrollTo(0, document.body.scrollHeight);
  };
  if (errEl) errEl.style.display = 'none';

  // Validate
  if (!name)    return fail('Full legal name is required.');
  if (!dob)     return fail('Date of birth is required.');
  if (!address) return fail('Residential address is required.');
  if (!idNum)   return fail('ID number is required.');
  if (!verBy)   return fail('Verified by is required.');
  if (!verDate) return fail('Verified date is required.');
  if (!scrProv) return fail('Screening provider is required.');
  if (!scrDate) return fail('Screening date is required.');

  const isNew    = fid === 'new';
  const entityId = isNew ? null : S.currentParams?.entityId;
  const now      = new Date().toISOString();

  try {
    const { saveIndividual, updateEntity } = await import('../../firebase/firestore.js');
    const { addIndividualToState }         = await import('../../state/index.js');

    // ── NEW CLIENT ────────────────────────────────────────────────────────────
    if (isNew) {
      const eid = genId('ent');
      const iid = genId('ind');
      const lid = genId('link');

      // Entity
      const entityData = {
        entityId: eid, firmId: S.firmId,
        entityName: name, entityType: etype,
        dateOfBirth: dob, registeredAddress: address,
        email, abn, tradingName: trading,
        entityRiskRating: riskRating || null,
        riskAssessedBy: riskBy, riskAssessedDate: riskDate,
        riskNextReviewDate: riskNext, riskMethodology: riskNotes,
        createdAt: now, updatedAt: now,
      };
      await saveEntity(eid, entityData);
      addEntityToState(entityData);

      // Individual
      const indData = {
        individualId: iid, firmId: S.firmId,
        fullName: name, dateOfBirth: dob,
        address, email, isStaff: false,
        createdAt: now, updatedAt: now,
      };
      await saveIndividual(iid, indData);
      addIndividualToState(indData);

      // Link
      const linkData = {
        linkId: lid, individualId: iid,
        linkedObjectType: 'entity', linkedObjectId: eid,
        roleType: 'self', status: 'active',
        startDate: now, createdAt: now, updatedAt: now,
      };
      await saveLink(lid, linkData);
      addLinkToState(linkData);

      // Verification
      const verRec = {
        verificationId: genId('ver'), firmId: S.firmId, individualId: iid,
        idType, idNumber: idNum, issuingState: verState,
        expiryDate: verExpiry, verifiedBy: verBy,
        verifiedDate: verDate, verifiedMethod: verMethod,
        createdAt: now,
      };
      await saveVerification(verRec);
      if (!S.verifications) S.verifications = [];
      S.verifications.unshift(verRec);

      // Screening
      const scrRec = {
        screeningId: genId('scr'), firmId: S.firmId, individualId: iid,
        provider: scrProv, date: scrDate, result: scrResult,
        referenceId: scrRef, completedBy: scrBy, nextDueDate: scrNext,
        createdAt: now,
      };
      await saveScreening(scrRec);
      if (!S.screenings) S.screenings = [];
      S.screenings.unshift(scrRec);

      await saveAuditEntry({
        firmId: S.firmId, userId: S.individualId,
        userName: S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
        action: 'entity_created', targetType: 'entity',
        targetId: eid, targetName: name,
        detail: `Client created — ${name} (${etype}) — ID verified by ${verBy} — screening: ${scrResult}`,
        timestamp: now,
      });

      delete S._draft;
      toast('Client saved');
      go('entity-detail', { entityId: eid });

    // ── EXISTING CLIENT ───────────────────────────────────────────────────────
    } else {
      const iid = individualId !== 'null' ? individualId : null;

      // Update entity
      const entityFields = {
        entityName: name, registeredAddress: address,
        email, abn, tradingName: trading,
        entityRiskRating: riskRating || null,
        riskAssessedBy: riskBy, riskAssessedDate: riskDate,
        riskNextReviewDate: riskNext, riskMethodology: riskNotes,
        updatedAt: now,
      };
      await updateEntity(entityId, entityFields);
      const entity = S.entities.find(e => e.entityId === entityId);
      if (entity) Object.assign(entity, entityFields);

      // Update individual
      if (iid) {
        const existing = S.individuals?.find(i => i.individualId === iid) || {};
        const indFields = { ...existing, fullName: name, dateOfBirth: dob, address, email, updatedAt: now };
        await saveIndividual(iid, indFields);
        Object.assign(existing, indFields);
      }

      // Always save a new verification record (append, don't overwrite)
      const verRec = {
        verificationId: genId('ver'), firmId: S.firmId,
        individualId: iid || entityId,
        idType, idNumber: idNum, issuingState: verState,
        expiryDate: verExpiry, verifiedBy: verBy,
        verifiedDate: verDate, verifiedMethod: verMethod,
        createdAt: now,
      };
      await saveVerification(verRec);
      if (!S.verifications) S.verifications = [];
      S.verifications.unshift(verRec);

      // Always save a new screening record (append, don't overwrite)
      const scrRec = {
        screeningId: genId('scr'), firmId: S.firmId,
        individualId: iid || entityId,
        provider: scrProv, date: scrDate, result: scrResult,
        referenceId: scrRef, completedBy: scrBy, nextDueDate: scrNext,
        createdAt: now,
      };
      await saveScreening(scrRec);
      if (!S.screenings) S.screenings = [];
      S.screenings.unshift(scrRec);

      await saveAuditEntry({
        firmId: S.firmId, userId: S.individualId,
        userName: S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
        action: 'entity_updated', targetType: 'entity',
        targetId: entityId, targetName: name,
        detail: `Client updated — ${name} — new verification and screening recorded`,
        timestamp: now,
      });

      toast('Client saved');
      go('entity-detail', { entityId });
    }

  } catch (err) {
    fail('Failed to save. Please try again.');
    console.error(err);
  }
};
