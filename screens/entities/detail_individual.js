// ─── INDIVIDUAL / SOLE TRADER CLIENT DETAIL ───────────────────────────────────
// Handles: Individual, Sole Trader
// One screen, two modes:
//   new mode      (isNew=true)  — all forms open, single Save button
//   existing mode (entityId)    — display rows, inline edit per section
//
// ID convention: fid = entityId || 'new'
//   Template  → id="ver-num-${fid}"
//   Onclick   → saveVerRecord('${fid}', '${individualId}')
//   Actions   → receive fid as first param, use it for DOM lookups
//   Firestore → use S.currentParams.entityId for real DB operations

import { S, addEntityToState, addLinkToState } from '../../state/index.js';
import { fmtDate,
         saveEntity, saveLink,
         saveVerification, saveScreening,
         saveAuditEntry, genId }               from '../../firebase/firestore.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function row(label, value) {
  if (!value) return '';
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;
                padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                   min-width:140px;flex-shrink:0;">${label}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);
                   text-align:right;">${value}</span>
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

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export function screen() {
  const { entityId, isNew, entityType: newType } = S.currentParams || {};

  // fid is the stable element-ID prefix — 'new' or the real entityId
  const fid          = entityId || 'new';
  const entity       = entityId ? (S.entities || []).find(e => e.entityId === entityId) : null;
  const etype        = entity?.entityType || newType || S._draft?.entityType || 'Individual';
  const isSoleTrader = etype === 'Sole Trader';
  const today        = new Date().toISOString().split('T')[0];

  // Guard: existing mode but entity not found
  if (!isNew && !entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm"
              style="margin-top:var(--space-3);">← Clients</button>
    </div>`;

  // Linked individual + evidence (existing mode only)
  const link = entity
    ? (S.links || []).find(l =>
        l.linkedObjectId   === entityId &&
        l.linkedObjectType === 'entity' &&
        l.status           === 'active')
    : null;
  const individualId  = link?.individualId || null;
  const ind           = individualId
    ? (S.individuals || []).find(i => i.individualId === individualId)
    : null;

  const verifications = individualId
    ? (S.verifications || [])
        .filter(v => v.individualId === individualId)
        .sort((a, b) => b.createdAt?.localeCompare(a.createdAt))
    : [];
  const screenings = individualId
    ? (S.screenings || [])
        .filter(s => s.individualId === individualId)
        .sort((a, b) => b.date?.localeCompare(a.date))
    : [];

  const latestVer   = verifications[0] || null;
  const latestScr   = screenings[0]    || null;
  const hasVer      = !!latestVer;
  const hasScr      = !!latestScr?.result;
  const cddComplete = hasVer && hasScr;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return `
    <div>

      <!-- ── HEADER ──────────────────────────────────────────────────── -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;
                  margin-bottom:var(--space-5);">
        <div>
          <button
            onclick="${isNew ? 'clearClientType()' : "go('entities')"}"
            class="btn-ghost"
            style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isNew ? 'Change type' : 'Clients'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">
            ${isNew ? 'New ' + etype : entity.entityName}
          </h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${etype}</span>
            ${!isNew ? `
              <span class="badge ${cddComplete ? 'badge-success' : 'badge-danger'}">
                ${cddComplete ? 'CDD complete' : 'Action required'}
              </span>
              ${riskBadge(entity.entityRiskRating)}
            ` : ''}
          </div>
        </div>
      </div>

      <!-- ── CARD 1: PERSONAL DETAILS ────────────────────────────────── -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">
            ${isSoleTrader ? 'Sole trader details' : 'Individual details'}
          </div>
          ${!isNew ? `
            <button
              onclick="togglePanel('details-form-${fid}')"
              class="btn-ghost"
              style="font-size:var(--font-size-xs);color:var(--color-primary);">
              Edit details
            </button>
          ` : ''}
        </div>

        ${isNew ? `
          <!-- NEW: fields always open -->
          <div class="form-grid" style="grid-template-columns:1fr;">
            ${isSoleTrader ? `
              <div class="form-row">
                <label class="label">Trading name
                  <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span>
                </label>
                <input id="f-trading" type="text" class="inp"
                       placeholder="e.g. Smith's Plumbing">
              </div>
            ` : ''}
            <div class="form-row">
              <label class="label label-required">Full legal name</label>
              <input id="f-name" type="text" class="inp"
                     placeholder="e.g. Jane Elizabeth Smith">
            </div>
            <div class="form-row">
              <label class="label label-required">Date of birth</label>
              <input id="f-dob" type="date" class="inp">
            </div>
            <div class="form-row">
              <label class="label label-required">Residential address</label>
              <input id="f-address" type="text" class="inp"
                     placeholder="12 Main St, Sydney NSW 2000">
            </div>
            <div class="form-row">
              <label class="label">Email</label>
              <input id="f-email" type="email" class="inp"
                     placeholder="jane@example.com">
            </div>
            ${isSoleTrader ? `
              <div class="form-row">
                <label class="label">ABN
                  <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span>
                </label>
                <input id="f-abn" type="text" class="inp" placeholder="12 345 678 901">
              </div>
            ` : ''}
          </div>
          <div id="f-details-error" class="banner banner-danger"
               style="display:none;margin-top:var(--space-3);"></div>

        ` : `
          <!-- EXISTING: display rows -->
          ${row('Full name',           ind?.fullName)}
          ${row('Date of birth',       fmtDate(ind?.dateOfBirth))}
          ${row('Residential address', ind?.address)}
          ${row('Email',               ind?.email || entity.email)}
          ${isSoleTrader ? row('ABN', entity.abn) : ''}
          ${isSoleTrader && entity.tradingName ? row('Trading name', entity.tradingName) : ''}

          <!-- Collapsed edit form -->
          <div id="details-form-${fid}"
               style="display:none;margin-top:var(--space-4);padding-top:var(--space-4);
                      border-top:0.5px solid var(--color-border-light);">
            <div class="form-grid" style="grid-template-columns:1fr;">
              ${isSoleTrader ? `
                <div class="form-row">
                  <label class="label">Trading name</label>
                  <input id="e-trading-${fid}" type="text" class="inp"
                         value="${entity.tradingName || ''}">
                </div>
              ` : ''}
              <div class="form-row">
                <label class="label label-required">Full legal name</label>
                <input id="e-name-${fid}" type="text" class="inp"
                       value="${ind?.fullName || entity.entityName || ''}">
              </div>
              <div class="form-row">
                <label class="label label-required">Date of birth</label>
                <input id="e-dob-${fid}" type="date" class="inp"
                       value="${ind?.dateOfBirth || entity.dateOfBirth || ''}">
              </div>
              <div class="form-row">
                <label class="label label-required">Residential address</label>
                <input id="e-address-${fid}" type="text" class="inp"
                       value="${ind?.address || entity.registeredAddress || ''}">
              </div>
              <div class="form-row">
                <label class="label">Email</label>
                <input id="e-email-${fid}" type="email" class="inp"
                       value="${ind?.email || entity.email || ''}">
              </div>
              ${isSoleTrader ? `
                <div class="form-row">
                  <label class="label">ABN</label>
                  <input id="e-abn-${fid}" type="text" class="inp"
                         value="${entity.abn || ''}">
                </div>
              ` : ''}
            </div>
            <div id="e-details-error-${fid}" class="banner banner-danger"
                 style="display:none;margin-top:var(--space-3);"></div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
              <button onclick="togglePanel('details-form-${fid}')"
                      class="btn-sec btn-sm">Cancel</button>
              <button onclick="saveDetailsInline('${fid}','${individualId}')"
                      class="btn btn-sm">Save details</button>
            </div>
          </div>
        `}
      </div>

      <!-- ── CARD 2: CDD REQUIREMENTS ────────────────────────────────── -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:var(--space-4);">
          <div>
            <div class="section-heading" style="margin:0;">CDD requirements</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                        margin-top:2px;">
              ID verification and PEP / sanctions screening required by AUSTRAC.
            </div>
          </div>
          ${!isNew ? `
            <span class="badge ${cddComplete ? 'badge-success' : 'badge-danger'}">
              ${cddComplete ? 'CDD complete' : 'Action required'}
            </span>
          ` : ''}
        </div>

        <!-- ID Verification -->
        <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);
                    margin-bottom:var(--space-3);overflow:hidden;">

          ${!isNew ? `
            <!-- Status row (existing) -->
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:var(--space-3);">
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <span style="color:${hasVer ? 'var(--color-success)' : 'var(--color-danger)'};
                             font-weight:bold;font-size:var(--font-size-sm);flex-shrink:0;">
                  ${hasVer ? '✓' : '✗'}
                </span>
                <div>
                  <div style="font-size:var(--font-size-sm);
                              font-weight:var(--font-weight-medium);">ID verification</div>
                  <div style="font-size:10px;color:${hasVer ? 'var(--color-text-muted)' : 'var(--color-danger)'};">
                    ${hasVer
                      ? `${latestVer.idType} · verified ${fmtDate(latestVer.verifiedDate)} by ${latestVer.verifiedBy}`
                      : 'Not recorded — passport or driver licence required'}
                  </div>
                </div>
              </div>
              <button onclick="togglePanel('ver-form-${fid}')"
                      class="btn-ghost"
                      style="font-size:var(--font-size-xs);color:var(--color-primary);
                             flex-shrink:0;">
                ${hasVer ? 'Update' : '+ Record'}
              </button>
            </div>
          ` : `
            <div style="padding:var(--space-3) var(--space-3) 0;
                        font-size:var(--font-size-sm);
                        font-weight:var(--font-weight-medium);">
              ID verification
            </div>
          `}

          <!-- Form: open in new mode, collapsed in existing -->
          <div id="ver-form-${fid}"
               style="display:${isNew ? 'block' : 'none'};
                      padding:var(--space-3);
                      ${!isNew ? 'border-top:0.5px solid var(--color-border-light);' : ''}
                      background:var(--color-surface-alt);">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label label-required">ID type</label>
                <select id="ver-type-${fid}" class="inp">
                  ${['Passport','Driver licence','Medicare card','Other government ID']
                    .map(t => `<option>${t}</option>`).join('')}
                </select>
              </div>
              <div class="form-row">
                <label class="label label-required">ID number</label>
                <input id="ver-num-${fid}" type="text" class="inp"
                       placeholder="e.g. PA1234567">
              </div>
              <div class="form-row">
                <label class="label">Issuing state / country</label>
                <input id="ver-state-${fid}" type="text" class="inp"
                       placeholder="e.g. NSW">
              </div>
              <div class="form-row">
                <label class="label">Expiry date</label>
                <input id="ver-expiry-${fid}" type="date" class="inp">
              </div>
              <div class="form-row">
                <label class="label label-required">Verified by</label>
                <select id="ver-by-${fid}" class="inp">
                  ${staffOptions(latestVer?.verifiedBy)}
                </select>
              </div>
              <div class="form-row">
                <label class="label label-required">Verified date</label>
                <input id="ver-date-${fid}" type="date" class="inp" value="${today}">
              </div>
              <div class="form-row span-2">
                <label class="label">Method</label>
                <select id="ver-method-${fid}" class="inp">
                  ${['In person','Certified copy','Electronic verification']
                    .map(m => `<option>${m}</option>`).join('')}
                </select>
              </div>
            </div>
            <div id="ver-error-${fid}" class="banner banner-danger"
                 style="display:none;margin-top:var(--space-3);"></div>
            ${!isNew ? `
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
                <button onclick="togglePanel('ver-form-${fid}')"
                        class="btn-sec btn-sm">Cancel</button>
                <button onclick="saveVerRecord('${fid}','${individualId}')"
                        class="btn btn-sm">Save verification</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- PEP / Sanctions Screening -->
        <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);
                    overflow:hidden;">

          ${!isNew ? `
            <!-- Status row (existing) -->
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:var(--space-3);">
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <span style="color:${hasScr ? 'var(--color-success)' : 'var(--color-danger)'};
                             font-weight:bold;font-size:var(--font-size-sm);flex-shrink:0;">
                  ${hasScr ? '✓' : '✗'}
                </span>
                <div>
                  <div style="font-size:var(--font-size-sm);
                              font-weight:var(--font-weight-medium);">
                    PEP / sanctions screening
                  </div>
                  <div style="font-size:10px;color:${hasScr ? 'var(--color-text-muted)' : 'var(--color-danger)'};">
                    ${hasScr
                      ? `Result: ${latestScr.result} · ${latestScr.provider} · ${fmtDate(latestScr.date)}`
                      : 'Not recorded — NameScan or equivalent required'}
                  </div>
                </div>
              </div>
              <button onclick="togglePanel('scr-form-${fid}')"
                      class="btn-ghost"
                      style="font-size:var(--font-size-xs);color:var(--color-primary);
                             flex-shrink:0;">
                ${hasScr ? 'Add new' : '+ Record'}
              </button>
            </div>
          ` : `
            <div style="padding:var(--space-3) var(--space-3) 0;
                        font-size:var(--font-size-sm);
                        font-weight:var(--font-weight-medium);">
              PEP / sanctions screening
            </div>
          `}

          <!-- Form: open in new mode, collapsed in existing -->
          <div id="scr-form-${fid}"
               style="display:${isNew ? 'block' : 'none'};
                      padding:var(--space-3);
                      ${!isNew ? 'border-top:0.5px solid var(--color-border-light);' : ''}
                      background:var(--color-surface-alt);">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label label-required">Provider</label>
                <input id="scr-provider-${fid}" type="text" class="inp"
                       placeholder="e.g. NameScan">
              </div>
              <div class="form-row">
                <label class="label label-required">Screening date</label>
                <input id="scr-date-${fid}" type="date" class="inp"
                       value="${today}"
                       onchange="scrAutoNext('${fid}', this.value)">
              </div>
              <div class="form-row">
                <label class="label label-required">Result</label>
                <select id="scr-result-${fid}" class="inp">
                  ${['Clear','PEP match','Sanctions match','Adverse media','Refer for review']
                    .map(r => `<option>${r}</option>`).join('')}
                </select>
              </div>
              <div class="form-row">
                <label class="label">Reference ID</label>
                <input id="scr-ref-${fid}" type="text" class="inp"
                       placeholder="e.g. NS-98765">
              </div>
              <div class="form-row">
                <label class="label">Completed by</label>
                <select id="scr-by-${fid}" class="inp">
                  ${staffOptions()}
                </select>
              </div>
              <div class="form-row">
                <label class="label">Next screening due</label>
                <input id="scr-next-${fid}" type="date" class="inp">
              </div>
            </div>
            <div style="margin-top:var(--space-2);">
              <a href="https://namescan.io/?ref=SIMPLEAML" target="_blank"
                 class="btn-ghost"
                 style="font-size:var(--font-size-xs);color:var(--color-primary);">
                Open NameScan →
              </a>
            </div>
            <div id="scr-error-${fid}" class="banner banner-danger"
                 style="display:none;margin-top:var(--space-3);"></div>
            ${!isNew ? `
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
                <button onclick="togglePanel('scr-form-${fid}')"
                        class="btn-sec btn-sm">Cancel</button>
                <button onclick="saveScrRecord('${fid}','${individualId}')"
                        class="btn btn-sm">Save screening</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- ── CARD 3: RISK ASSESSMENT ──────────────────────────────────── -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Client risk assessment</div>
          ${!isNew ? `
            <button onclick="togglePanel('risk-form-${fid}')"
                    class="btn-ghost"
                    style="font-size:var(--font-size-xs);color:var(--color-primary);">
              ${entity.entityRiskRating ? 'Update' : '+ Add'}
            </button>
          ` : ''}
        </div>

        ${!isNew && entity.entityRiskRating ? `
          <!-- Display rows (existing, rated) -->
          ${row('Risk rating',   entity.entityRiskRating)}
          ${row('Assessed by',   entity.riskAssessedBy)}
          ${row('Assessed date', fmtDate(entity.riskAssessedDate))}
          ${row('Next review',   fmtDate(entity.riskNextReviewDate))}
          ${row('Methodology',   entity.riskMethodology)}
        ` : !isNew ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
            No risk assessment recorded yet.
          </p>
        ` : ''}

        <!-- Risk form: open in new mode, collapsed in existing -->
        <div id="risk-form-${fid}"
             style="display:${isNew ? 'block' : 'none'};
                    ${!isNew ? 'margin-top:var(--space-4);padding-top:var(--space-4);border-top:0.5px solid var(--color-border-light);' : ''}">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-row">
              <label class="label ${!isNew ? 'label-required' : ''}">Risk rating</label>
              <select id="risk-rating-${fid}" class="inp"
                      onchange="riskAutoNext('${fid}')">
                <option value="">Select...</option>
                ${['Low','Medium','High'].map(r =>
                  `<option value="${r}" ${entity?.entityRiskRating === r ? 'selected' : ''}>
                    ${r}
                  </option>`
                ).join('')}
              </select>
            </div>
            <div class="form-row">
              <label class="label ${!isNew ? 'label-required' : ''}">Assessed by</label>
              <select id="risk-by-${fid}" class="inp">
                ${staffOptions(entity?.riskAssessedBy)}
              </select>
            </div>
            <div class="form-row">
              <label class="label ${!isNew ? 'label-required' : ''}">Assessed date</label>
              <input id="risk-date-${fid}" type="date" class="inp"
                     value="${entity?.riskAssessedDate || today}"
                     onchange="riskAutoNext('${fid}')">
            </div>
            <div class="form-row">
              <label class="label">Next review date</label>
              <input id="risk-next-${fid}" type="date" class="inp"
                     value="${entity?.riskNextReviewDate || ''}">
            </div>
            <div class="form-row span-2">
              <label class="label">Risk factors / methodology notes</label>
              <textarea id="risk-notes-${fid}" class="inp" rows="2"
                        placeholder="Describe the risk factors considered...">
                ${entity?.riskMethodology || ''}
              </textarea>
            </div>
          </div>
          <div class="banner banner-info" style="margin-top:var(--space-3);">
            High risk: review every 12 months · Medium: 24 months · Low: 36 months
          </div>
          <div id="risk-error-${fid}" class="banner banner-danger"
               style="display:none;margin-top:var(--space-3);"></div>
          ${!isNew ? `
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
              <button onclick="togglePanel('risk-form-${fid}')"
                      class="btn-sec btn-sm">Cancel</button>
              <button onclick="saveRiskInline('${fid}')"
                      class="btn btn-sm">Save risk assessment</button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- ── CARD 4: SMR (existing only) ─────────────────────────────── -->
      ${!isNew ? `
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">SMR</div>
          <button onclick="go('smr',{filterEntity:'${fid}'})"
                  class="btn-sec btn-sm">
            View SMRs involving this client
          </button>
          <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">
            Only your firm's SMRs are shown.
          </p>
        </div>
      ` : ''}

      <!-- ── NEW MODE: single save button ────────────────────────────── -->
      ${isNew ? `
        <div id="f-save-error" class="banner banner-danger"
             style="display:none;margin-bottom:var(--space-3);"></div>
        <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
          <button onclick="clearClientType()" class="btn-sec" style="flex:1;">
            Cancel
          </button>
          <button onclick="saveNewPersonClient('${etype}')" class="btn" style="flex:2;">
            Save client
          </button>
        </div>
      ` : ''}

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
// Convention: all actions receive fid as first parameter.
// fid = 'new' in new mode, entityId in existing mode.
// DOM lookups use fid. Firestore uses S.currentParams.entityId.

// Show / hide any inline panel by element id
window.togglePanel = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// Auto-set next screening due = screening date + 1 year
window.scrAutoNext = function(fid, date) {
  if (!date) return;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById(`scr-next-${fid}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

// Auto-set next review date based on risk rating
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

// Go back to type picker (new mode cancel)
window.clearClientType = function() {
  delete S._draft;
  S.currentParams = {};
  go('entity-new');
};

// ── NEW CLIENT: save everything in one operation ───────────────────────────────
window.saveNewPersonClient = async function(etype) {
  const fid = 'new';

  // Read form values
  const name      = document.getElementById('f-name')?.value?.trim();
  const dob       = document.getElementById('f-dob')?.value;
  const address   = document.getElementById('f-address')?.value?.trim();
  const email     = document.getElementById('f-email')?.value?.trim()    || '';
  const abn       = document.getElementById('f-abn')?.value?.trim()      || '';
  const trading   = document.getElementById('f-trading')?.value?.trim()  || '';
  const idNum     = document.getElementById(`ver-num-${fid}`)?.value?.trim();
  const verBy     = document.getElementById(`ver-by-${fid}`)?.value;
  const verDate   = document.getElementById(`ver-date-${fid}`)?.value;
  const scrProv   = document.getElementById(`scr-provider-${fid}`)?.value?.trim();
  const scrDate   = document.getElementById(`scr-date-${fid}`)?.value;

  // Error helper
  const errEl = document.getElementById('f-save-error');
  const fail  = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    else toast(msg, 'err');
  };
  if (errEl) errEl.style.display = 'none';

  // Validate required fields
  if (!name)    return fail('Full legal name is required.');
  if (!dob)     return fail('Date of birth is required.');
  if (!address) return fail('Residential address is required.');
  if (!idNum)   return fail('ID number is required.');
  if (!verBy)   return fail('Verified by is required.');
  if (!verDate) return fail('Verified date is required.');
  if (!scrProv) return fail('Screening provider is required.');
  if (!scrDate) return fail('Screening date is required.');

  const now = new Date().toISOString();
  const eid = genId('ent');
  const iid = genId('ind');
  const lid = genId('link');

  try {
    const { saveIndividual } = await import('../../firebase/firestore.js');
    const { addIndividualToState } = await import('../../state/index.js');

    // 1. Entity record (the client relationship)
    const entityData = {
      entityId:          eid,
      firmId:            S.firmId,
      entityName:        name,
      entityType:        etype,
      dateOfBirth:       dob,
      registeredAddress: address,
      email, abn, tradingName: trading,
      entityRiskRating:  document.getElementById(`risk-rating-${fid}`)?.value || null,
      riskAssessedBy:    document.getElementById(`risk-by-${fid}`)?.value     || '',
      riskAssessedDate:  document.getElementById(`risk-date-${fid}`)?.value   || '',
      riskNextReviewDate:document.getElementById(`risk-next-${fid}`)?.value   || '',
      riskMethodology:   document.getElementById(`risk-notes-${fid}`)?.value?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    await saveEntity(eid, entityData);
    addEntityToState(entityData);

    // 2. Individual record (the person)
    const indData = {
      individualId: iid,
      firmId:        S.firmId,
      fullName:      name,
      dateOfBirth:   dob,
      address,
      email,
      isStaff:       false,
      createdAt:     now,
      updatedAt:     now,
    };
    await saveIndividual(iid, indData);
    addIndividualToState(indData);

    // 3. Link: individual → entity (role: self)
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

    // 4. ID verification
    const idType = document.getElementById(`ver-type-${fid}`)?.value || '';
    const verRec = {
      verificationId: genId('ver'),
      firmId:         S.firmId,
      individualId:   iid,
      idType,
      idNumber:       idNum,
      issuingState:   document.getElementById(`ver-state-${fid}`)?.value?.trim() || '',
      expiryDate:     document.getElementById(`ver-expiry-${fid}`)?.value         || '',
      verifiedBy:     verBy,
      verifiedDate:   verDate,
      verifiedMethod: document.getElementById(`ver-method-${fid}`)?.value         || '',
      createdAt:      now,
    };
    await saveVerification(verRec);
    if (!S.verifications) S.verifications = [];
    S.verifications.unshift(verRec);

    // 5. Screening
    const result = document.getElementById(`scr-result-${fid}`)?.value || '';
    const scrRec = {
      screeningId:  genId('scr'),
      firmId:       S.firmId,
      individualId: iid,
      provider:     scrProv,
      date:         scrDate,
      result,
      referenceId:  document.getElementById(`scr-ref-${fid}`)?.value?.trim() || '',
      completedBy:  document.getElementById(`scr-by-${fid}`)?.value           || '',
      nextDueDate:  document.getElementById(`scr-next-${fid}`)?.value         || '',
      createdAt:    now,
    };
    await saveScreening(scrRec);
    if (!S.screenings) S.screenings = [];
    S.screenings.unshift(scrRec);

    // 6. Audit
    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'entity_created',
      targetType: 'entity',
      targetId:   eid,
      targetName: name,
      detail:     `Client created — ${name} (${etype}) — ID verified by ${verBy} — screening: ${result}`,
      timestamp:  now,
    });

    delete S._draft;
    toast('Client saved');
    go('entity-detail', { entityId: eid });

  } catch (err) {
    fail('Failed to save. Please try again.');
    console.error(err);
  }
};

// ── EXISTING: save ID verification ────────────────────────────────────────────
window.saveVerRecord = async function(fid, individualId) {
  const idNum   = document.getElementById(`ver-num-${fid}`)?.value?.trim();
  const verBy   = document.getElementById(`ver-by-${fid}`)?.value;
  const verDate = document.getElementById(`ver-date-${fid}`)?.value;
  const errEl   = document.getElementById(`ver-error-${fid}`);
  const fail    = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } else toast(msg, 'err'); };
  if (errEl) errEl.style.display = 'none';

  if (!idNum)   return fail('ID number is required.');
  if (!verBy)   return fail('Verified by is required.');
  if (!verDate) return fail('Verified date is required.');

  try {
    const now    = new Date().toISOString();
    const idType = document.getElementById(`ver-type-${fid}`)?.value || '';
    const record = {
      verificationId: genId('ver'),
      firmId:         S.firmId,
      individualId,
      idType,
      idNumber:       idNum,
      issuingState:   document.getElementById(`ver-state-${fid}`)?.value?.trim() || '',
      expiryDate:     document.getElementById(`ver-expiry-${fid}`)?.value         || '',
      verifiedBy:     verBy,
      verifiedDate:   verDate,
      verifiedMethod: document.getElementById(`ver-method-${fid}`)?.value         || '',
      createdAt:      now,
    };
    await saveVerification(record);
    if (!S.verifications) S.verifications = [];
    S.verifications.unshift(record);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'id_verified',
      targetType: 'individual',
      targetId:   individualId,
      targetName: S.individuals?.find(i => i.individualId === individualId)?.fullName || '',
      detail:     `ID verification recorded — ${idType} verified by ${verBy}`,
      timestamp:  now,
    });
    toast('Verification saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent = 'Failed to save. Please try again.'; errEl.style.display = 'block'; }
    console.error(err);
  }
};

// ── EXISTING: save screening ───────────────────────────────────────────────────
window.saveScrRecord = async function(fid, individualId) {
  const provider = document.getElementById(`scr-provider-${fid}`)?.value?.trim();
  const date     = document.getElementById(`scr-date-${fid}`)?.value;
  const errEl    = document.getElementById(`scr-error-${fid}`);
  const fail     = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } else toast(msg, 'err'); };
  if (errEl) errEl.style.display = 'none';

  if (!provider) return fail('Provider is required.');
  if (!date)     return fail('Screening date is required.');

  try {
    const now    = new Date().toISOString();
    const result = document.getElementById(`scr-result-${fid}`)?.value || '';
    const record = {
      screeningId:  genId('scr'),
      firmId:       S.firmId,
      individualId,
      provider,
      date,
      result,
      referenceId:  document.getElementById(`scr-ref-${fid}`)?.value?.trim() || '',
      completedBy:  document.getElementById(`scr-by-${fid}`)?.value           || '',
      nextDueDate:  document.getElementById(`scr-next-${fid}`)?.value         || '',
      createdAt:    now,
    };
    await saveScreening(record);
    if (!S.screenings) S.screenings = [];
    S.screenings.unshift(record);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'screening_completed',
      targetType: 'individual',
      targetId:   individualId,
      targetName: S.individuals?.find(i => i.individualId === individualId)?.fullName || '',
      detail:     `Screening completed via ${provider} — result: ${result}`,
      timestamp:  now,
    });
    toast('Screening saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent = 'Failed to save. Please try again.'; errEl.style.display = 'block'; }
    console.error(err);
  }
};

// ── EXISTING: save personal details ───────────────────────────────────────────
window.saveDetailsInline = async function(fid, individualId) {
  const name    = document.getElementById(`e-name-${fid}`)?.value?.trim();
  const dob     = document.getElementById(`e-dob-${fid}`)?.value;
  const address = document.getElementById(`e-address-${fid}`)?.value?.trim();
  const errEl   = document.getElementById(`e-details-error-${fid}`);
  const fail    = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } else toast(msg, 'err'); };
  if (errEl) errEl.style.display = 'none';

  if (!name)    return fail('Full legal name is required.');
  if (!dob)     return fail('Date of birth is required.');
  if (!address) return fail('Residential address is required.');

  const entityId = S.currentParams?.entityId;

  try {
    const { updateEntity, saveIndividual } = await import('../../firebase/firestore.js');
    const now = new Date().toISOString();

    // Update entity record
    const entityFields = {
      entityName:        name,
      registeredAddress: address,
      email:       document.getElementById(`e-email-${fid}`)?.value?.trim()   || '',
      abn:         document.getElementById(`e-abn-${fid}`)?.value?.trim()     || '',
      tradingName: document.getElementById(`e-trading-${fid}`)?.value?.trim() || '',
      updatedAt:   now,
    };
    await updateEntity(entityId, entityFields);
    const entity = S.entities.find(e => e.entityId === entityId);
    if (entity) Object.assign(entity, entityFields);

    // Update individual record
    if (individualId) {
      const existing  = S.individuals?.find(i => i.individualId === individualId) || {};
      const indFields = {
        ...existing,
        fullName:    name,
        dateOfBirth: dob,
        address,
        email:       entityFields.email,
        updatedAt:   now,
      };
      await saveIndividual(individualId, indFields);
      Object.assign(existing, indFields);
    }

    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'entity_updated',
      targetType: 'entity',
      targetId:   entityId,
      targetName: name,
      detail:     `Client details updated — ${name}`,
      timestamp:  now,
    });
    toast('Details saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent = 'Failed to save. Please try again.'; errEl.style.display = 'block'; }
    console.error(err);
  }
};

// ── EXISTING: save risk assessment ────────────────────────────────────────────
window.saveRiskInline = async function(fid) {
  const rating = document.getElementById(`risk-rating-${fid}`)?.value;
  const by     = document.getElementById(`risk-by-${fid}`)?.value;
  const date   = document.getElementById(`risk-date-${fid}`)?.value;
  const errEl  = document.getElementById(`risk-error-${fid}`);
  const fail   = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } else toast(msg, 'err'); };
  if (errEl) errEl.style.display = 'none';

  if (!rating) return fail('Risk rating is required.');
  if (!by)     return fail('Assessed by is required.');
  if (!date)   return fail('Assessed date is required.');

  const entityId = S.currentParams?.entityId;

  try {
    const { updateEntity } = await import('../../firebase/firestore.js');
    const now    = new Date().toISOString();
    const fields = {
      entityRiskRating:   rating,
      riskAssessedBy:     by,
      riskAssessedDate:   date,
      riskNextReviewDate: document.getElementById(`risk-next-${fid}`)?.value          || '',
      riskMethodology:    document.getElementById(`risk-notes-${fid}`)?.value?.trim() || '',
      updatedAt:          now,
    };
    await updateEntity(entityId, fields);
    const entity = S.entities.find(e => e.entityId === entityId);
    if (entity) Object.assign(entity, fields);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'risk_assessed',
      targetType: 'entity',
      targetId:   entityId,
      targetName: entity?.entityName || '',
      detail:     `Risk assessment recorded — ${rating} risk — assessed by ${by}`,
      timestamp:  now,
    });
    toast('Risk assessment saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent = 'Failed to save. Please try again.'; errEl.style.display = 'block'; }
    console.error(err);
  }
};
