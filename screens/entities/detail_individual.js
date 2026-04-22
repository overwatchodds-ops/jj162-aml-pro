// ─── INDIVIDUAL / SOLE TRADER CLIENT DETAIL ───────────────────────────────────
// Single screen handles both new and existing clients.
// isNew=true  → empty fields, all forms open, single "Save client" button
// isNew=false → populated rows, forms collapsed, per-section save buttons

import { S, addEntityToState, addLinkToState } from '../../state/index.js';
import { fmtDate, fmtDateTime,
         saveEntity, saveLink,
         saveVerification, saveScreening,
         saveAuditEntry, genId }               from '../../firebase/firestore.js';

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

function staffOptions(selected = '') {
  const staff = (S.individuals || []).filter(i => i.isStaff);
  if (!staff.length) return `<option value="">No staff found — add staff first</option>`;
  return `<option value="">Select staff member...</option>` +
    staff.map(s =>
      `<option value="${s.fullName}" ${selected === s.fullName ? 'selected' : ''}>${s.fullName}${s.role ? ' · ' + s.role : ''}</option>`
    ).join('');
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { entityId, isNew, entityType: newType } = S.currentParams || {};

  // Resolve data — new mode has no entity yet
  const entity       = entityId ? (S.entities || []).find(e => e.entityId === entityId) : null;
  const etype        = entity?.entityType || newType || S._draft?.entityType || 'Individual';
  const isSoleTrader = etype === 'Sole Trader';
  const today        = new Date().toISOString().split('T')[0];

  if (!isNew && !entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Clients</button>
    </div>`;

  // Linked individual (existing mode only)
  const link = entity
    ? (S.links || []).find(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active')
    : null;
  const individualId = link?.individualId || null;
  const ind          = individualId ? (S.individuals || []).find(i => i.individualId === individualId) : null;

  // Evidence (existing mode only)
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
  const cddComplete = hasVer && hasScr;

  // Audit (existing mode only)
  const auditEntries = (S._auditCache?.[entityId] || []).slice(0, 5);

  // ── LAYOUT ────────────────────────────────────────────────────────────────
  return `
    <div>

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="${isNew ? 'clearClientType()' : "go('entities')"}" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isNew ? 'Change type' : 'Clients'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">
            ${isNew ? 'New ' + etype : entity.entityName}
          </h1>
          ${!isNew ? `
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);">
              <span class="badge ${cddComplete ? 'badge-success' : 'badge-danger'}">${cddComplete ? 'CDD complete' : 'Action required'}</span>
              ${riskBadge(entity.entityRiskRating)}
              <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${etype}</span>
            </div>
          ` : `
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-1);display:block;">${etype}</span>
          `}
        </div>
      </div>

      <!-- ── PERSONAL DETAILS ─────────────────────────────────────────── -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">${isSoleTrader ? 'Sole trader details' : 'Individual details'}</div>
          ${!isNew && individualId ? `
            <button onclick="togglePanel('details-form-${entityId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Edit details</button>
          ` : ''}
        </div>

        ${isNew ? `
          <!-- NEW: editable fields always visible -->
          <div class="form-grid" style="grid-template-columns:1fr;">
            ${isSoleTrader ? `
              <div class="form-row">
                <label class="label">Business / trading name <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span></label>
                <input id="f-trading" type="text" class="inp" placeholder="e.g. John's Plumbing">
              </div>
            ` : ''}
            <div class="form-row">
              <label class="label label-required">Full legal name</label>
              <input id="f-name" type="text" class="inp" placeholder="e.g. Jane Elizabeth Smith">
            </div>
            <div class="form-row">
              <label class="label label-required">Date of birth</label>
              <input id="f-dob" type="date" class="inp">
            </div>
            <div class="form-row">
              <label class="label label-required">Residential address</label>
              <input id="f-address" type="text" class="inp" placeholder="12 Main St, Sydney NSW 2000">
            </div>
            <div class="form-row">
              <label class="label">Email</label>
              <input id="f-email" type="email" class="inp" placeholder="jane@example.com">
            </div>
            ${isSoleTrader ? `
              <div class="form-row">
                <label class="label">ABN <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span></label>
                <input id="f-abn" type="text" class="inp" placeholder="12 345 678 901">
              </div>
            ` : ''}
          </div>
          <div id="f-details-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

        ` : `
          <!-- EXISTING: display rows + collapsed edit form -->
          ${!individualId ? `
            <div style="padding:var(--space-4);background:var(--color-warning-light);border:0.5px solid var(--color-warning-border);border-radius:var(--radius-lg);">
              <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-warning-text);margin-bottom:var(--space-2);">No individual linked yet</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-warning-text);margin-bottom:var(--space-3);">
                ${isSoleTrader ? 'Link the person who operates this sole trader business.' : 'Link the individual this client record represents.'}
              </div>
              <div style="display:flex;gap:var(--space-2);">
                <button onclick="showLinkPanel('${entityId}')" class="btn btn-sm">Link existing individual</button>
                <button onclick="go('individual-new',{entryPoint:'entity',entityId:'${entityId}'})" class="btn-sec btn-sm">Create new individual</button>
              </div>
              <div id="link-panel-${entityId}" style="display:none;margin-top:var(--space-3);padding-top:var(--space-3);border-top:0.5px solid var(--color-warning-border);">
                <input type="text" class="inp" placeholder="Search by name..." oninput="linkSearch('${entityId}',this.value)" autocomplete="off">
                <div id="link-results-${entityId}" style="margin-top:var(--space-2);"></div>
              </div>
            </div>
          ` : `
            ${row('Full name',           ind?.fullName)}
            ${row('Date of birth',       fmtDate(ind?.dateOfBirth))}
            ${row('Residential address', ind?.address)}
            ${row('Email',               ind?.email || entity.email)}
            ${isSoleTrader ? row('ABN', entity.abn) : ''}
            ${isSoleTrader && entity.tradingName ? row('Trading name', entity.tradingName) : ''}

            <!-- Collapsed edit form -->
            <div id="details-form-${entityId}" style="display:none;margin-top:var(--space-4);padding-top:var(--space-4);border-top:0.5px solid var(--color-border-light);">
              <div class="form-grid" style="grid-template-columns:1fr;">
                ${isSoleTrader ? `
                  <div class="form-row">
                    <label class="label">Business / trading name</label>
                    <input id="e-trading-${entityId}" type="text" class="inp" value="${entity.tradingName||''}">
                  </div>
                ` : ''}
                <div class="form-row">
                  <label class="label label-required">Full legal name</label>
                  <input id="e-name-${entityId}" type="text" class="inp" value="${ind?.fullName || entity.entityName || ''}">
                </div>
                <div class="form-row">
                  <label class="label label-required">Date of birth</label>
                  <input id="e-dob-${entityId}" type="date" class="inp" value="${ind?.dateOfBirth || entity.dateOfBirth || ''}">
                </div>
                <div class="form-row">
                  <label class="label label-required">Residential address</label>
                  <input id="e-address-${entityId}" type="text" class="inp" value="${ind?.address || entity.registeredAddress || ''}">
                </div>
                <div class="form-row">
                  <label class="label">Email</label>
                  <input id="e-email-${entityId}" type="email" class="inp" value="${ind?.email || entity.email || ''}">
                </div>
                ${isSoleTrader ? `
                  <div class="form-row">
                    <label class="label">ABN</label>
                    <input id="e-abn-${entityId}" type="text" class="inp" value="${entity.abn||''}">
                  </div>
                ` : ''}
              </div>
              <div id="e-details-error-${entityId}" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
                <button onclick="togglePanel('details-form-${entityId}')" class="btn-sec btn-sm">Cancel</button>
                <button onclick="saveDetailsInline('${entityId}','${individualId}')" class="btn btn-sm">Save details</button>
              </div>
            </div>
          `}
        `}
      </div>

      <!-- ── CDD REQUIREMENTS ─────────────────────────────────────────── -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
          <div>
            <div class="section-heading" style="margin:0;">CDD requirements</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">
              ID verification and PEP / sanctions screening required.
            </div>
          </div>
          ${!isNew ? `<span class="badge ${cddComplete ? 'badge-success' : 'badge-danger'}">${cddComplete ? 'CDD complete' : 'Action required'}</span>` : ''}
        </div>

        ${isNew ? `
          <!-- AUSTRAC note -->
          <div class="banner banner-info" style="margin-bottom:var(--space-4);">
            <div class="banner-title">Why this is required</div>
            AUSTRAC requires identity verification and PEP / sanctions screening before providing designated services.
          </div>
        ` : ''}

        <!-- ID Verification -->
        <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-3);overflow:hidden;">
          ${!isNew ? `
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
          ` : `
            <div style="padding:var(--space-3);background:var(--color-surface-alt);">
              <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);margin-bottom:var(--space-3);">ID verification</div>
            </div>
          `}

          <!-- Verification form — open by default for new, collapsed for existing -->
          <div id="ver-form-${entityId}" style="display:${isNew ? 'block' : 'none'};padding:var(--space-3);${!isNew ? 'border-top:0.5px solid var(--color-border-light);' : ''}background:var(--color-surface-alt);">
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
                <select id="ver-by-${entityId}" class="inp">${staffOptions(latestVer?.verifiedBy)}</select>
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
            ${!isNew ? `
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
                <button onclick="togglePanel('ver-form-${entityId}')" class="btn-sec btn-sm">Cancel</button>
                <button onclick="saveVerRecord('${entityId}','${individualId}')" class="btn btn-sm">Save verification</button>
              </div>
            ` : ''}
          </div>

          ${!isNew && hasVer && verifications.length > 1 ? `
            <div style="padding:4px var(--space-3);font-size:10px;color:var(--color-text-muted);border-top:0.5px solid var(--color-border-light);">
              ${verifications.length - 1} previous verification${verifications.length > 2 ? 's' : ''} on record
            </div>
          ` : ''}
        </div>

        <!-- PEP / Sanctions Screening -->
        <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;">
          ${!isNew ? `
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
          ` : `
            <div style="padding:var(--space-3);background:var(--color-surface-alt);">
              <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);margin-bottom:var(--space-3);">PEP / sanctions screening</div>
            </div>
          `}

          <!-- Screening form — open by default for new, collapsed for existing -->
          <div id="scr-form-${entityId}" style="display:${isNew ? 'block' : 'none'};padding:var(--space-3);${!isNew ? 'border-top:0.5px solid var(--color-border-light);' : ''}background:var(--color-surface-alt);">
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
                <select id="scr-by-${entityId}" class="inp">${staffOptions()}</select>
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
            ${!isNew ? `
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
                <button onclick="togglePanel('scr-form-${entityId}')" class="btn-sec btn-sm">Cancel</button>
                <button onclick="saveScrRecord('${entityId}','${individualId}')" class="btn btn-sm">Save screening</button>
              </div>
            ` : ''}
          </div>

          ${!isNew && hasScr && screenings.length > 1 ? `
            <div style="padding:4px var(--space-3);font-size:10px;color:var(--color-text-muted);border-top:0.5px solid var(--color-border-light);">
              ${screenings.length - 1} previous screening${screenings.length > 2 ? 's' : ''} on record
            </div>
          ` : ''}
        </div>
      </div>

      <!-- ── RISK ASSESSMENT ──────────────────────────────────────────── -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Client risk assessment</div>
          ${!isNew ? `<button onclick="togglePanel('risk-form-${entityId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">${entity?.entityRiskRating ? 'Update' : '+ Add'}</button>` : ''}
        </div>

        ${isNew ? `
          <!-- NEW: risk form always visible -->
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-row">
              <label class="label">Risk rating</label>
              <select id="risk-rating-${entityId}" class="inp" onchange="riskAutoNext('${entityId}')">
                <option value="">Select...</option>
                ${['Low','Medium','High'].map(r=>`<option>${r}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <label class="label">Assessed by</label>
              <select id="risk-by-${entityId}" class="inp">${staffOptions()}</select>
            </div>
            <div class="form-row">
              <label class="label">Assessed date</label>
              <input id="risk-date-${entityId}" type="date" class="inp" value="${today}" onchange="riskAutoNext('${entityId}')">
            </div>
            <div class="form-row">
              <label class="label">Next review date</label>
              <input id="risk-next-${entityId}" type="date" class="inp">
            </div>
            <div class="form-row span-2">
              <label class="label">Risk factors / methodology notes</label>
              <textarea id="risk-methodology-${entityId}" class="inp" rows="2" placeholder="Describe the risk factors considered..."></textarea>
            </div>
          </div>
          <div class="banner banner-info" style="margin-top:var(--space-3);">
            High risk: every 12 months · Medium: 24 months · Low: 36 months
          </div>
        ` : `
          <!-- EXISTING: display rows + collapsed edit form -->
          ${entity?.entityRiskRating ? `
            ${row('Risk rating',   entity.entityRiskRating)}
            ${row('Assessed by',   entity.riskAssessedBy)}
            ${row('Assessed date', fmtDate(entity.riskAssessedDate))}
            ${row('Next review',   fmtDate(entity.riskNextReviewDate))}
            ${row('Methodology',   entity.riskMethodology)}
          ` : `
            <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No risk assessment recorded yet.</p>
          `}
          <div id="risk-form-${entityId}" style="display:none;margin-top:var(--space-4);padding-top:var(--space-4);border-top:0.5px solid var(--color-border-light);">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div class="form-row">
                <label class="label label-required">Risk rating</label>
                <select id="risk-rating-${entityId}" class="inp" onchange="riskAutoNext('${entityId}')">
                  <option value="">Select...</option>
                  ${['Low','Medium','High'].map(r=>`<option value="${r}" ${entity?.entityRiskRating===r?'selected':''}>${r}</option>`).join('')}
                </select>
              </div>
              <div class="form-row">
                <label class="label label-required">Assessed by</label>
                <select id="risk-by-${entityId}" class="inp">${staffOptions(entity?.riskAssessedBy)}</select>
              </div>
              <div class="form-row">
                <label class="label label-required">Assessed date</label>
                <input id="risk-date-${entityId}" type="date" class="inp" value="${entity?.riskAssessedDate||today}" onchange="riskAutoNext('${entityId}')">
              </div>
              <div class="form-row">
                <label class="label">Next review date</label>
                <input id="risk-next-${entityId}" type="date" class="inp" value="${entity?.riskNextReviewDate||''}">
              </div>
              <div class="form-row span-2">
                <label class="label">Risk factors / methodology notes</label>
                <textarea id="risk-methodology-${entityId}" class="inp" rows="2">${entity?.riskMethodology||''}</textarea>
              </div>
            </div>
            <div class="banner banner-info" style="margin-top:var(--space-3);">
              High risk: every 12 months · Medium: 24 months · Low: 36 months
            </div>
            <div id="risk-error-${entityId}" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);">
              <button onclick="togglePanel('risk-form-${entityId}')" class="btn-sec btn-sm">Cancel</button>
              <button onclick="saveRiskInline('${entityId}')" class="btn btn-sm">Save risk assessment</button>
            </div>
          </div>
        `}
      </div>

      <!-- ── NEW MODE: single save button ────────────────────────────── -->
      ${isNew ? `
        <div id="f-save-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>
        <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
          <button onclick="clearClientType()" class="btn-sec" style="flex:1;">Cancel</button>
          <button onclick="saveNewPersonClient('${etype}')" class="btn" style="flex:2;">Save client</button>
        </div>
      ` : `
        <!-- EXISTING: SMR + Audit -->
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">SMR</div>
          <button onclick="go('smr',{filterEntity:'${entityId}'})" class="btn-sec btn-sm">View SMRs involving this client</button>
          <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Only your firm's SMRs are shown.</p>
        </div>
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
      `}

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.clearClientType = function() {
  delete S._draft;
  S.currentParams = {};
  go('entity-new');
};

window.togglePanel = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.scrAutoNext = function(entityId, date) {
  if (!date) return;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById(`scr-next-${entityId}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.riskAutoNext = function(entityId) {
  const rating = document.getElementById(`risk-rating-${entityId}`)?.value;
  const date   = document.getElementById(`risk-date-${entityId}`)?.value;
  if (!rating || !date) return;
  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  const el = document.getElementById(`risk-next-${entityId}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

// ── SAVE NEW CLIENT (creates entity + individual + link + CDD in one go) ──────
window.saveNewPersonClient = async function(etype) {
  const isSoleTrader = etype === 'Sole Trader';
  const entityId     = 'new'; // placeholder — real id generated below

  const name    = document.getElementById('f-name')?.value?.trim();
  const dob     = document.getElementById('f-dob')?.value;
  const address = document.getElementById('f-address')?.value?.trim();
  const idNum   = document.getElementById(`ver-num-${entityId}`)?.value?.trim();
  const verBy   = document.getElementById(`ver-by-${entityId}`)?.value;
  const verDate = document.getElementById(`ver-date-${entityId}`)?.value;
  const scrProv = document.getElementById(`scr-provider-${entityId}`)?.value?.trim();
  const scrDate = document.getElementById(`scr-date-${entityId}`)?.value;

  const errEl = document.getElementById('f-save-error');
  if (errEl) errEl.style.display = 'none';

  const fail = (msg) => { if (errEl) { errEl.textContent=msg; errEl.style.display='block'; } else { toast(msg,'err'); } };

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

    // 1. Entity
    const entityData = {
      entityId: eid, firmId: S.firmId,
      entityName:        name, entityType: etype,
      dateOfBirth:       dob,
      registeredAddress: address,
      email:             document.getElementById('f-email')?.value?.trim()   || '',
      abn:               document.getElementById('f-abn')?.value?.trim()     || '',
      tradingName:       document.getElementById('f-trading')?.value?.trim() || '',
      entityRiskRating:  document.getElementById(`risk-rating-${entityId}`)?.value || null,
      riskAssessedBy:    document.getElementById(`risk-by-${entityId}`)?.value || '',
      riskAssessedDate:  document.getElementById(`risk-date-${entityId}`)?.value || '',
      riskNextReviewDate:document.getElementById(`risk-next-${entityId}`)?.value || '',
      riskMethodology:   document.getElementById(`risk-methodology-${entityId}`)?.value?.trim() || '',
      createdAt: now, updatedAt: now,
    };
    await saveEntity(eid, entityData);
    addEntityToState(entityData);

    // 2. Individual
    const indData = {
      individualId: iid, firmId: S.firmId,
      fullName: name, dateOfBirth: dob, address,
      email: entityData.email, isStaff: false,
      createdAt: now, updatedAt: now,
    };
    await saveIndividual(iid, indData);
    addIndividualToState(indData);

    // 3. Link
    const linkData = {
      linkId: lid, individualId: iid,
      linkedObjectType: 'entity', linkedObjectId: eid,
      roleType: 'self', status: 'active',
      startDate: now, createdAt: now, updatedAt: now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);

    // 4. Verification
    const idType = document.getElementById(`ver-type-${entityId}`)?.value || '';
    const verRec = {
      verificationId: genId('ver'), firmId: S.firmId, individualId: iid,
      idType, idNumber: idNum,
      issuingState:   document.getElementById(`ver-state-${entityId}`)?.value?.trim() || '',
      expiryDate:     document.getElementById(`ver-expiry-${entityId}`)?.value || '',
      verifiedBy: verBy, verifiedDate: verDate,
      verifiedMethod: document.getElementById(`ver-method-${entityId}`)?.value || '',
      createdAt: now,
    };
    await saveVerification(verRec);
    if (!S.verifications) S.verifications = [];
    S.verifications.unshift(verRec);

    // 5. Screening
    const result = document.getElementById(`scr-result-${entityId}`)?.value || '';
    const scrRec = {
      screeningId: genId('scr'), firmId: S.firmId, individualId: iid,
      provider: scrProv, date: scrDate, result,
      referenceId: document.getElementById(`scr-ref-${entityId}`)?.value?.trim() || '',
      completedBy: document.getElementById(`scr-by-${entityId}`)?.value || '',
      nextDueDate: document.getElementById(`scr-next-${entityId}`)?.value || '',
      createdAt: now,
    };
    await saveScreening(scrRec);
    if (!S.screenings) S.screenings = [];
    S.screenings.unshift(scrRec);

    // 6. Audit
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'entity_created', targetType: 'entity', targetId: eid, targetName: name,
      detail: `Client created — ${name} (${etype}) — ID verified by ${verBy} — screening: ${result}`,
      timestamp: now,
    });

    delete S._draft;
    toast('Client saved');
    go('entity-detail', { entityId: eid });
  } catch (err) {
    fail('Failed to save. Please try again.');
    console.error(err);
  }
};

// ── SAVE VERIFICATION (existing client) ───────────────────────────────────────
window.saveVerRecord = async function(entityId, individualId) {
  const idNum   = document.getElementById(`ver-num-${entityId}`)?.value?.trim();
  const verBy   = document.getElementById(`ver-by-${entityId}`)?.value;
  const verDate = document.getElementById(`ver-date-${entityId}`)?.value;
  const errEl   = document.getElementById(`ver-error-${entityId}`);
  if (errEl) errEl.style.display = 'none';

  if (!idNum)   { errEl.textContent='ID number is required.';   errEl.style.display='block'; return; }
  if (!verBy)   { errEl.textContent='Verified by is required.'; errEl.style.display='block'; return; }
  if (!verDate) { errEl.textContent='Verified date is required.'; errEl.style.display='block'; return; }

  try {
    const now    = new Date().toISOString();
    const idType = document.getElementById(`ver-type-${entityId}`)?.value || '';
    const record = {
      verificationId: genId('ver'), firmId: S.firmId, individualId,
      idType, idNumber: idNum,
      issuingState:   document.getElementById(`ver-state-${entityId}`)?.value?.trim() || '',
      expiryDate:     document.getElementById(`ver-expiry-${entityId}`)?.value || '',
      verifiedBy:     verBy, verifiedDate: verDate,
      verifiedMethod: document.getElementById(`ver-method-${entityId}`)?.value || '',
      createdAt: now,
    };
    await saveVerification(record);
    if (!S.verifications) S.verifications = [];
    S.verifications.unshift(record);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'id_verified', targetType: 'individual', targetId: individualId,
      targetName: S.individuals?.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `ID verification recorded — ${idType} verified by ${verBy}`,
      timestamp: now,
    });
    toast('Verification saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent='Failed to save. Please try again.'; errEl.style.display='block'; }
    console.error(err);
  }
};

// ── SAVE SCREENING (existing client) ──────────────────────────────────────────
window.saveScrRecord = async function(entityId, individualId) {
  const provider = document.getElementById(`scr-provider-${entityId}`)?.value?.trim();
  const date     = document.getElementById(`scr-date-${entityId}`)?.value;
  const errEl    = document.getElementById(`scr-error-${entityId}`);
  if (errEl) errEl.style.display = 'none';

  if (!provider) { errEl.textContent='Provider is required.'; errEl.style.display='block'; return; }
  if (!date)     { errEl.textContent='Screening date is required.'; errEl.style.display='block'; return; }

  try {
    const now    = new Date().toISOString();
    const result = document.getElementById(`scr-result-${entityId}`)?.value || '';
    const record = {
      screeningId: genId('scr'), firmId: S.firmId, individualId,
      provider, date, result,
      referenceId: document.getElementById(`scr-ref-${entityId}`)?.value?.trim() || '',
      completedBy: document.getElementById(`scr-by-${entityId}`)?.value || '',
      nextDueDate: document.getElementById(`scr-next-${entityId}`)?.value || '',
      createdAt: now,
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
    if (errEl) { errEl.textContent='Failed to save. Please try again.'; errEl.style.display='block'; }
    console.error(err);
  }
};

// ── SAVE DETAILS INLINE (existing client) ─────────────────────────────────────
window.saveDetailsInline = async function(entityId, individualId) {
  const name    = document.getElementById(`e-name-${entityId}`)?.value?.trim();
  const dob     = document.getElementById(`e-dob-${entityId}`)?.value;
  const address = document.getElementById(`e-address-${entityId}`)?.value?.trim();
  const errEl   = document.getElementById(`e-details-error-${entityId}`);
  if (errEl) errEl.style.display = 'none';

  if (!name)    { errEl.textContent='Full legal name is required.'; errEl.style.display='block'; return; }
  if (!dob)     { errEl.textContent='Date of birth is required.'; errEl.style.display='block'; return; }
  if (!address) { errEl.textContent='Residential address is required.'; errEl.style.display='block'; return; }

  try {
    const { updateEntity, saveIndividual } = await import('../../firebase/firestore.js');
    const now = new Date().toISOString();

    const entityFields = {
      entityName:        name,
      registeredAddress: address,
      email:             document.getElementById(`e-email-${entityId}`)?.value?.trim() || '',
      abn:               document.getElementById(`e-abn-${entityId}`)?.value?.trim() || '',
      tradingName:       document.getElementById(`e-trading-${entityId}`)?.value?.trim() || '',
      updatedAt: now,
    };
    await updateEntity(entityId, entityFields);
    const entity = S.entities.find(e => e.entityId === entityId);
    if (entity) Object.assign(entity, entityFields);

    if (individualId) {
      const existing = S.individuals?.find(i => i.individualId === individualId) || {};
      const indFields = { ...existing, fullName: name, dateOfBirth: dob, address, email: entityFields.email, updatedAt: now };
      await saveIndividual(individualId, indFields);
      if (existing) Object.assign(existing, indFields);
    }

    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'entity_updated', targetType: 'entity', targetId: entityId, targetName: name,
      detail: `Client details updated — ${name}`,
      timestamp: now,
    });
    toast('Details saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent='Failed to save. Please try again.'; errEl.style.display='block'; }
    console.error(err);
  }
};

// ── SAVE RISK INLINE (existing client) ────────────────────────────────────────
window.saveRiskInline = async function(entityId) {
  const rating = document.getElementById(`risk-rating-${entityId}`)?.value;
  const by     = document.getElementById(`risk-by-${entityId}`)?.value;
  const date   = document.getElementById(`risk-date-${entityId}`)?.value;
  const errEl  = document.getElementById(`risk-error-${entityId}`);
  if (errEl) errEl.style.display = 'none';

  if (!rating) { errEl.textContent='Risk rating is required.'; errEl.style.display='block'; return; }
  if (!by)     { errEl.textContent='Assessed by is required.'; errEl.style.display='block'; return; }
  if (!date)   { errEl.textContent='Assessed date is required.'; errEl.style.display='block'; return; }

  try {
    const { updateEntity } = await import('../../firebase/firestore.js');
    const now = new Date().toISOString();
    const fields = {
      entityRiskRating:   rating,
      riskAssessedBy:     by,
      riskAssessedDate:   date,
      riskNextReviewDate: document.getElementById(`risk-next-${entityId}`)?.value || '',
      riskMethodology:    document.getElementById(`risk-methodology-${entityId}`)?.value?.trim() || '',
      updatedAt: now,
    };
    await updateEntity(entityId, fields);
    const entity = S.entities.find(e => e.entityId === entityId);
    if (entity) Object.assign(entity, fields);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'risk_assessed', targetType: 'entity', targetId: entityId,
      targetName: entity?.entityName || '',
      detail: `Risk assessment recorded — ${rating} risk — assessed by ${by}`,
      timestamp: now,
    });
    toast('Risk assessment saved');
    render();
  } catch (err) {
    if (errEl) { errEl.textContent='Failed to save. Please try again.'; errEl.style.display='block'; }
    console.error(err);
  }
};

// ── LINK EXISTING INDIVIDUAL ──────────────────────────────────────────────────
window.showLinkPanel = function(entityId) {
  const el = document.getElementById(`link-panel-${entityId}`);
  if (el) el.style.display = 'block';
};

window.linkSearch = function(entityId, query) {
  const el = document.getElementById(`link-results-${entityId}`);
  if (!el) return;
  if (!query || query.length < 2) { el.innerHTML = ''; return; }
  const q = query.toLowerCase();
  const matches = (S.individuals || [])
    .filter(i => !i.isStaff && i.fullName?.toLowerCase().includes(q))
    .slice(0, 6);
  if (!matches.length) {
    el.innerHTML = `<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No results found.</p>`;
    return;
  }
  el.innerHTML = matches.map(i => `
    <div onclick="linkIndividual('${entityId}','${i.individualId}','${i.fullName.replace(/'/g,"\\'")}')"
      style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;margin-bottom:4px;background:var(--color-surface);"
      onmouseover="this.style.background='var(--color-surface-alt)'"
      onmouseout="this.style.background='var(--color-surface)'">
      <span style="font-size:var(--font-size-sm);">${i.fullName}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-primary);">Link →</span>
    </div>`).join('');
};

window.linkIndividual = async function(entityId, individualId, name) {
  try {
    const now = new Date().toISOString();
    const lid = genId('link');
    const linkData = {
      linkId: lid, individualId,
      linkedObjectType: 'entity', linkedObjectId: entityId,
      roleType: 'self', status: 'active',
      startDate: now, createdAt: now, updatedAt: now,
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
    toast('Failed to link. Please try again.', 'err');
    console.error(err);
  }
};

// ── AUDIT ─────────────────────────────────────────────────────────────────────
window.loadEntityAudit = async function(entityId) {
  const { getEntityAuditLog } = await import('../../firebase/firestore.js');
  const entries = await getEntityAuditLog(S.firmId, entityId);
  if (!S._auditCache) S._auditCache = {};
  S._auditCache[entityId] = entries;
  render();
};
