// ─── INDIVIDUAL / SOLE TRADER CLIENT DETAIL ───────────────────────────────────
// Handles: Individual, Sole Trader
// These client types have no key people — the person IS the client.
// CDD requirements: ID verification + PEP/sanctions screening only.

import { S }                        from '../../state/index.js';
import { fmtDate, fmtDateTime,
         saveVerification, saveScreening,
         saveAuditEntry, genId }    from '../../firebase/firestore.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function row(label, value) {
  if (!value) return '';
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);min-width:140px;flex-shrink:0;">${label}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);text-align:right;">${value}</span>
    </div>`;
}

function riskBadge(rating) {
  switch (rating?.toLowerCase()) {
    case 'high':   return `<span class="badge badge-danger">High risk</span>`;
    case 'medium': return `<span class="badge badge-warning">Medium risk</span>`;
    case 'low':    return `<span class="badge badge-success">Low risk</span>`;
    default:       return `<span class="badge badge-neutral">Unrated</span>`;
  }
}

function staffOptions(selectedName = '') {
  const staff = (S.individuals || []).filter(i => i.isStaff);
  if (!staff.length) return `<option value="">No staff found — add staff first</option>`;
  return `<option value="">Select staff member...</option>` +
    staff.map(s =>
      `<option value="${s.fullName}" ${selectedName === s.fullName ? 'selected' : ''}>${s.fullName}${s.role ? ' · ' + s.role : ''}</option>`
    ).join('');
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { entityId } = S.currentParams || {};
  const entity = S.entities.find(e => e.entityId === entityId);

  if (!entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Back to clients</button>
    </div>`;

  const isSoleTrader = entity.entityType === 'Sole Trader';
  const today        = new Date().toISOString().split('T')[0];

  // Linked individual — there is exactly one for Individual / Sole Trader
  const link = S.links.find(l =>
    l.linkedObjectId   === entityId &&
    l.linkedObjectType === 'entity' &&
    l.status           === 'active'
  );
  const individualId = link?.individualId || null;
  const ind          = individualId ? (S.individuals || []).find(i => i.individualId === individualId) : null;

  // Evidence
  const verifications = individualId
    ? (S.verifications || []).filter(v => v.individualId === individualId).sort((a,b) => b.createdAt?.localeCompare(a.createdAt))
    : [];
  const screenings = individualId
    ? (S.screenings || []).filter(s => s.individualId === individualId).sort((a,b) => b.date?.localeCompare(a.date))
    : [];

  const latestVer = verifications[0] || null;
  const latestScr = screenings[0]    || null;
  const hasVer    = !!latestVer;
  const hasScr    = !!latestScr?.result;

  // CDD status
  const cddComplete  = hasVer && hasScr;
  const cddBadge     = cddComplete
    ? `<span class="badge badge-success">CDD complete</span>`
    : `<span class="badge badge-danger">Action required</span>`;

  // Audit
  const auditEntries = (S._auditCache?.[entityId] || []).slice(0, 5);

  return `
    <div>

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="go('entities')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Clients</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${entity.entityName}</h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);">
            ${cddBadge}
            ${riskBadge(entity.entityRiskRating)}
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${entity.entityType}</span>
          </div>
        </div>
        <button onclick="go('entity-edit',{entityId:'${entityId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <!-- Client details -->
      <div class="card">
        <div class="section-heading">Client details</div>
        ${row('Client type', entity.entityType)}
        ${isSoleTrader ? row('ABN', entity.abn) : ''}
        ${row('Address',     entity.registeredAddress)}
        ${row('Status',      entity.status)}
        ${row('Created',     fmtDate(entity.createdAt))}
        ${row('Last updated',fmtDate(entity.updatedAt))}
      </div>

      <!-- Individual details (from linked record) -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">${isSoleTrader ? 'Sole trader — person details' : 'Individual details'}</div>
          ${individualId
            ? `<button onclick="go('individual-detail',{individualId:'${individualId}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">View full record →</button>`
            : ''}
        </div>

        ${!individualId ? `
          <!-- No individual linked yet -->
          <div style="padding:var(--space-4);background:var(--color-warning-light);border:0.5px solid var(--color-warning-border);border-radius:var(--radius-lg);">
            <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-warning-text);margin-bottom:var(--space-2);">
              No individual linked yet
            </div>
            <div style="font-size:var(--font-size-xs);color:var(--color-warning-text);margin-bottom:var(--space-3);">
              ${isSoleTrader
                ? 'Link the person who operates this sole trader business. Search existing individuals or create a new one.'
                : 'Link the individual this client record represents. Search existing individuals or create a new one.'}
            </div>
            <div style="display:flex;gap:var(--space-2);">
              <button onclick="showLinkIndividualPanel('${entityId}')" class="btn btn-sm">Link existing individual</button>
              <button onclick="go('individual-new',{entryPoint:'entity',entityId:'${entityId}'})" class="btn-sec btn-sm">Create new individual</button>
            </div>
            <!-- Link search panel -->
            <div id="link-panel-${entityId}" style="display:none;margin-top:var(--space-3);padding-top:var(--space-3);border-top:0.5px solid var(--color-warning-border);">
              <input
                type="text"
                class="inp"
                placeholder="Search by name..."
                oninput="linkIndSearchFilter('${entityId}',this.value)"
                autocomplete="off"
              >
              <div id="link-ind-results-${entityId}" style="margin-top:var(--space-2);"></div>
            </div>
          </div>
        ` : `
          ${row('Full name',        ind?.fullName)}
          ${row('Date of birth',    fmtDate(ind?.dateOfBirth))}
          ${row('Residential address', ind?.address)}
          ${row('Email',            ind?.email)}
        `}
      </div>

      <!-- CDD Requirements -->
      ${individualId ? `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
          <div>
            <div class="section-heading" style="margin:0;">CDD requirements</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">
              ID verification and PEP / sanctions screening required.
            </div>
          </div>
          ${cddBadge}
        </div>

        <!-- ID Verification -->
        <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-3);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);">
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span style="color:${hasVer?'var(--color-success)':'var(--color-danger)'};font-weight:bold;font-size:var(--font-size-sm);flex-shrink:0;">${hasVer?'✓':'✗'}</span>
              <div>
                <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">ID verification</div>
                ${hasVer
                  ? `<div style="font-size:10px;color:var(--color-text-muted);">${latestVer.idType} · verified ${fmtDate(latestVer.verifiedDate)} by ${latestVer.verifiedBy}</div>`
                  : `<div style="font-size:10px;color:var(--color-danger);">Not recorded — passport or driver licence required</div>`}
              </div>
            </div>
            <button onclick="togglePanel('ver-form-${entityId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);flex-shrink:0;">
              ${hasVer ? 'Update' : '+ Record'}
            </button>
          </div>

          <div id="ver-form-${entityId}" style="display:none;padding:var(--space-3);border-top:0.5px solid var(--color-border-light);background:var(--color-surface-alt);">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label label-required">ID type</label>
                <select id="ver-type-${entityId}" class="inp">
                  ${['Passport','Driver licence','Medicare card','Other government ID'].map(t=>`<option>${t}</option>`).join('')}
                </select>
              </div>
              <div class="form-row">
                <label class="label label-required">ID number</label>
                <input id="ver-num-${entityId}" type="text" class="inp" placeholder="e.g. PA1234567">
              </div>
              <div class="form-row">
                <label class="label">Issuing state / country</label>
                <input id="ver-state-${entityId}" type="text" class="inp" placeholder="e.g. NSW">
              </div>
              <div class="form-row">
                <label class="label">Expiry date</label>
                <input id="ver-expiry-${entityId}" type="date" class="inp">
              </div>
              <div class="form-row">
                <label class="label label-required">Verified by</label>
                <select id="ver-by-${entityId}" class="inp">
                  ${staffOptions(latestVer?.verifiedBy)}
                </select>
              </div>
              <div class="form-row">
                <label class="label label-required">Verified date</label>
                <input id="ver-date-${entityId}" type="date" class="inp" value="${today}">
              </div>
              <div class="form-row span-2">
                <label class="label">Method</label>
                <select id="ver-method-${entityId}" class="inp">
                  ${['In person','Certified copy','Electronic verification'].map(m=>`<option>${m}</option>`).join('')}
                </select>
              </div>
            </div>
            <div id="ver-error-${entityId}" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
              <button onclick="togglePanel('ver-form-${entityId}')" class="btn-sec btn-sm">Cancel</button>
              <button onclick="saveVerRecord('${entityId}','${individualId}')" class="btn btn-sm">Save verification</button>
            </div>
          </div>

          ${hasVer && verifications.length > 1 ? `
            <div style="padding:4px var(--space-3);font-size:10px;color:var(--color-text-muted);border-top:0.5px solid var(--color-border-light);">
              ${verifications.length - 1} previous verification${verifications.length > 2 ? 's' : ''} on record
            </div>` : ''}
        </div>

        <!-- PEP / Sanctions Screening -->
        <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);">
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span style="color:${hasScr?'var(--color-success)':'var(--color-danger)'};font-weight:bold;font-size:var(--font-size-sm);flex-shrink:0;">${hasScr?'✓':'✗'}</span>
              <div>
                <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">PEP / sanctions screening</div>
                ${hasScr
                  ? `<div style="font-size:10px;color:var(--color-text-muted);">Result: ${latestScr.result} · ${latestScr.provider} · ${fmtDate(latestScr.date)}</div>`
                  : `<div style="font-size:10px;color:var(--color-danger);">Not recorded — NameScan or equivalent required</div>`}
              </div>
            </div>
            <button onclick="togglePanel('scr-form-${entityId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);flex-shrink:0;">
              ${hasScr ? 'Add new' : '+ Record'}
            </button>
          </div>

          <div id="scr-form-${entityId}" style="display:none;padding:var(--space-3);border-top:0.5px solid var(--color-border-light);background:var(--color-surface-alt);">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label label-required">Provider</label>
                <input id="scr-provider-${entityId}" type="text" class="inp" placeholder="e.g. NameScan">
              </div>
              <div class="form-row">
                <label class="label label-required">Date</label>
                <input id="scr-date-${entityId}" type="date" class="inp" value="${today}" onchange="scrAutoNext('${entityId}',this.value)">
              </div>
              <div class="form-row">
                <label class="label label-required">Result</label>
                <select id="scr-result-${entityId}" class="inp">
                  ${['Clear','PEP match','Sanctions match','Adverse media','Refer for review'].map(r=>`<option>${r}</option>`).join('')}
                </select>
              </div>
              <div class="form-row">
                <label class="label">Reference ID</label>
                <input id="scr-ref-${entityId}" type="text" class="inp" placeholder="e.g. NS-98765">
              </div>
              <div class="form-row">
                <label class="label">Completed by</label>
                <select id="scr-by-${entityId}" class="inp">
                  ${staffOptions()}
                </select>
              </div>
              <div class="form-row">
                <label class="label">Next screening due</label>
                <input id="scr-next-${entityId}" type="date" class="inp">
              </div>
            </div>
            <div style="margin-top:var(--space-2);">
              <a href="https://namescan.io/?ref=SIMPLEAML" target="_blank" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Open NameScan →</a>
            </div>
            <div id="scr-error-${entityId}" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
              <button onclick="togglePanel('scr-form-${entityId}')" class="btn-sec btn-sm">Cancel</button>
              <button onclick="saveScrRecord('${entityId}','${individualId}')" class="btn btn-sm">Save screening</button>
            </div>
          </div>

          ${hasScr && screenings.length > 1 ? `
            <div style="padding:4px var(--space-3);font-size:10px;color:var(--color-text-muted);border-top:0.5px solid var(--color-border-light);">
              ${screenings.length - 1} previous screening${screenings.length > 2 ? 's' : ''} on record
            </div>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Risk assessment -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Client risk assessment</div>
          <button onclick="go('entity-edit',{entityId:'${entityId}',tab:'risk'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
            ${entity.entityRiskRating ? 'Update' : '+ Add'}
          </button>
        </div>
        ${entity.entityRiskRating ? `
          ${row('Risk rating',   entity.entityRiskRating)}
          ${row('Assessed by',   entity.riskAssessedBy)}
          ${row('Assessed date', fmtDate(entity.riskAssessedDate))}
          ${row('Next review',   fmtDate(entity.riskNextReviewDate))}
          ${row('Methodology',   entity.riskMethodology)}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No risk assessment recorded yet.</p>
        `}
      </div>

      <!-- SMR -->
      <div class="card">
        <div class="section-heading">SMR</div>
        <button onclick="go('smr',{filterEntity:'${entityId}'})" class="btn-sec btn-sm">View SMRs involving this client</button>
        <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Only your firm's SMRs are shown.</p>
      </div>

      <!-- Audit trail -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Recent activity</div>
          <button onclick="loadEntityAudit('${entityId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Load</button>
        </div>
        ${auditEntries.length > 0 ? auditEntries.map(e => `
          <div class="audit-row">
            <span class="audit-arrow">→</span>
            <span class="audit-date">${fmtDateTime(e.timestamp)}</span>
            <span>${e.detail}</span>
          </div>`).join('') : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Click Load to view activity.</p>
        `}
        <button onclick="go('audit-trail',{entityId:'${entityId}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);margin-top:var(--space-2);">View full audit trail →</button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.togglePanel = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.showLinkIndividualPanel = function(entityId) {
  const el = document.getElementById(`link-panel-${entityId}`);
  if (el) el.style.display = 'block';
};

window.linkIndSearchFilter = function(entityId, query) {
  const resultsEl = document.getElementById(`link-ind-results-${entityId}`);
  if (!resultsEl) return;
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }

  const q = query.toLowerCase();
  const matches = (S.individuals || [])
    .filter(i => !i.isStaff && i.fullName?.toLowerCase().includes(q))
    .slice(0, 6);

  if (!matches.length) {
    resultsEl.innerHTML = `<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No results. Try a different name or create a new individual.</p>`;
    return;
  }

  resultsEl.innerHTML = matches.map(i => `
    <div
      onclick="linkIndividualToEntity('${entityId}','${i.individualId}','${i.fullName.replace(/'/g,"\\'")}',this)"
      style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;margin-bottom:4px;background:var(--color-surface);"
      onmouseover="this.style.background='var(--color-surface-alt)'"
      onmouseout="this.style.background='var(--color-surface)'"
    >
      <span style="font-size:var(--font-size-sm);">${i.fullName}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-primary);font-weight:var(--font-weight-medium);">Link →</span>
    </div>`).join('');
};

window.linkIndividualToEntity = async function(entityId, individualId, name) {
  try {
    const { saveLink } = await import('../../firebase/firestore.js');
    const { addLinkToState } = await import('../../state/index.js');
    const now = new Date().toISOString();
    const lid = genId('link');
    const linkData = {
      linkId:           lid,
      individualId,
      linkedObjectType: 'entity',
      linkedObjectId:   entityId,
      roleType:         'self',
      status:           'active',
      startDate:        now,
      createdAt:        now,
      updatedAt:        now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'individual_linked', targetType: 'entity', targetId: entityId,
      targetName: S.entities?.find(e=>e.entityId===entityId)?.entityName || '',
      detail: `${name} linked as client individual`,
      timestamp: now,
    });
    toast(`${name} linked`);
    render();
  } catch (err) {
    toast('Failed to link individual', 'err');
    console.error(err);
  }
};

window.scrAutoNext = function(entityId, date) {
  if (!date) return;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById(`scr-next-${entityId}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.saveVerRecord = async function(entityId, individualId) {
  const idType  = document.getElementById(`ver-type-${entityId}`)?.value;
  const idNum   = document.getElementById(`ver-num-${entityId}`)?.value?.trim();
  const byName  = document.getElementById(`ver-by-${entityId}`)?.value;
  const verDate = document.getElementById(`ver-date-${entityId}`)?.value;
  const errEl   = document.getElementById(`ver-error-${entityId}`);
  errEl.style.display = 'none';

  if (!idNum)   { errEl.textContent = 'ID number is required.';   errEl.style.display = 'block'; return; }
  if (!byName)  { errEl.textContent = 'Verified by is required.'; errEl.style.display = 'block'; return; }
  if (!verDate) { errEl.textContent = 'Verified date is required.'; errEl.style.display = 'block'; return; }

  try {
    const now = new Date().toISOString();
    const record = {
      verificationId: genId('ver'),
      firmId:         S.firmId,
      individualId,
      idType:         idType || '',
      idNumber:       idNum,
      issuingState:   document.getElementById(`ver-state-${entityId}`)?.value?.trim() || '',
      expiryDate:     document.getElementById(`ver-expiry-${entityId}`)?.value || '',
      verifiedBy:     byName,
      verifiedDate:   verDate,
      verifiedMethod: document.getElementById(`ver-method-${entityId}`)?.value || '',
      createdAt:      now,
    };
    await saveVerification(record);
    if (!S.verifications) S.verifications = [];
    S.verifications.unshift(record);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'id_verified', targetType: 'individual', targetId: individualId,
      targetName: S.individuals?.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `ID verification recorded — ${idType} verified by ${byName}`,
      timestamp: now,
    });
    toast('Verification saved');
    render();
  } catch (err) {
    const el = document.getElementById(`ver-error-${entityId}`);
    if (el) { el.textContent = 'Failed to save. Please try again.'; el.style.display = 'block'; }
    console.error(err);
  }
};

window.saveScrRecord = async function(entityId, individualId) {
  const provider = document.getElementById(`scr-provider-${entityId}`)?.value?.trim();
  const date     = document.getElementById(`scr-date-${entityId}`)?.value;
  const result   = document.getElementById(`scr-result-${entityId}`)?.value;
  const errEl    = document.getElementById(`scr-error-${entityId}`);
  errEl.style.display = 'none';

  if (!provider) { errEl.textContent = 'Provider is required.';        errEl.style.display = 'block'; return; }
  if (!date)     { errEl.textContent = 'Screening date is required.';  errEl.style.display = 'block'; return; }

  try {
    const now = new Date().toISOString();
    const record = {
      screeningId:  genId('scr'),
      firmId:       S.firmId,
      individualId,
      provider,
      date,
      result:       result || '',
      referenceId:  document.getElementById(`scr-ref-${entityId}`)?.value?.trim() || '',
      completedBy:  document.getElementById(`scr-by-${entityId}`)?.value || '',
      nextDueDate:  document.getElementById(`scr-next-${entityId}`)?.value || '',
      createdAt:    now,
    };
    await saveScreening(record);
    if (!S.screenings) S.screenings = [];
    S.screenings.unshift(record);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'screening_completed', targetType: 'individual', targetId: individualId,
      targetName: S.individuals?.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `Screening completed via ${provider} — result: ${result}`,
      timestamp: now,
    });
    toast('Screening saved');
    render();
  } catch (err) {
    const el = document.getElementById(`scr-error-${entityId}`);
    if (el) { el.textContent = 'Failed to save. Please try again.'; el.style.display = 'block'; }
    console.error(err);
  }
};

window.loadEntityAudit = async function(entityId) {
  const { getEntityAuditLog } = await import('../../firebase/firestore.js');
  const entries = await getEntityAuditLog(S.firmId, entityId);
  if (!S._auditCache) S._auditCache = {};
  S._auditCache[entityId] = entries;
  render();
};
