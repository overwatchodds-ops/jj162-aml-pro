// ─── ENTITY CLIENT DETAIL ─────────────────────────────────────────────────────
// Handles: Private Company, Trust, SMSF, Partnership,
//          Incorporated Association, Charity / NFP
// These client types have key people who must each be identified.
// CDD: ID verification + screening per key person.

import { S }                        from '../../state/index.js';
import { getRequirements, ROLE_LABELS } from '../../state/rules_matrix.js';
import { fmtDate, fmtDateTime }     from '../../firebase/firestore.js';

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

// Check if one member is CDD compliant
function memberCDDStatus(individualId) {
  const indLinks = S.links.filter(l => l.individualId === individualId && l.status === 'active');
  const required = getRequirements(indLinks, S.entities);
  const hasVer   = (S.verifications||[]).some(v => v.individualId === individualId);
  const hasScr   = (S.screenings   ||[]).some(s => s.individualId === individualId && s.result);
  const needsVer = required.includes('id_verification');
  const needsScr = required.includes('screening');
  return {
    compliant:    (!needsVer || hasVer) && (!needsScr || hasScr),
    hasVer, hasScr, needsVer, needsScr,
    latestVer:    (S.verifications||[]).filter(v=>v.individualId===individualId).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt))[0],
    latestScr:    (S.screenings   ||[]).filter(s=>s.individualId===individualId).sort((a,b)=>b.date?.localeCompare(a.date))[0],
  };
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

  const isCompany = entity.entityType === 'Private Company';

  // Active and former key people
  const activeLinks = S.links.filter(l =>
    l.linkedObjectId   === entityId &&
    l.linkedObjectType === 'entity' &&
    l.status           === 'active'
  );
  const formerLinks = S.links.filter(l =>
    l.linkedObjectId   === entityId &&
    l.linkedObjectType === 'entity' &&
    l.status           === 'former'
  );

  // Overall compliance — all active members must be CDD compliant
  const allCompliant = activeLinks.length > 0 &&
    activeLinks.every(l => memberCDDStatus(l.individualId).compliant);

  const statusBadge = activeLinks.length === 0
    ? `<span class="badge badge-warning">No key people added</span>`
    : allCompliant
      ? `<span class="badge badge-success">Compliant</span>`
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
            ${statusBadge}
            ${riskBadge(entity.entityRiskRating)}
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${entity.entityType}</span>
          </div>
        </div>
        <button onclick="go('entity-edit',{entityId:'${entityId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <!-- Client details -->
      <div class="card">
        <div class="section-heading">Client details</div>
        ${row('Client type',   entity.entityType)}
        ${row('ABN',           entity.abn)}
        ${isCompany ? row('ACN', entity.acn) : ''}
        ${row('Address',       entity.registeredAddress)}
        ${isCompany ? row('Incorporated', fmtDate(entity.incorporationDate)) : ''}
        ${row('Country',       entity.countryOfOrigin)}
        ${row('Status',        entity.status)}
        ${row('Created',       fmtDate(entity.createdAt))}
        ${row('Last updated',  fmtDate(entity.updatedAt))}
      </div>

      <!-- Key people -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div class="section-heading" style="margin:0;">Key people (${activeLinks.length})</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">
              ${keyPeopleLabel(entity.entityType)}
            </div>
          </div>
          <button onclick="go('entity-edit',{entityId:'${entityId}',tab:'members'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">+ Add person</button>
        </div>

        ${activeLinks.length === 0 ? `
          <div style="padding:var(--space-4);background:var(--color-warning-light);border:0.5px solid var(--color-warning-border);border-radius:var(--radius-lg);">
            <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-warning-text);margin-bottom:4px;">No key people added yet</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-warning-text);">${keyPeoplePrompt(entity.entityType)}</div>
            <button onclick="go('entity-edit',{entityId:'${entityId}',tab:'members'})" class="btn btn-sm" style="margin-top:var(--space-3);">+ Add key people</button>
          </div>
        ` : activeLinks.map(l => {
          const ind      = S.individuals.find(i => i.individualId === l.individualId);
          const label    = ROLE_LABELS[l.roleType] || l.roleType;
          const name     = ind?.fullName || 'Unknown';
          const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
          const cdd      = memberCDDStatus(l.individualId);

          return `
            <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-3);overflow:hidden;">

              <!-- Person row -->
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);">
                <div class="avatar" style="flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${name}</div>
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label}${l.ownershipPercent ? ' · ' + l.ownershipPercent + '%' : ''}</div>
                </div>
                <span class="badge ${cdd.compliant ? 'badge-success' : 'badge-danger'}">${cdd.compliant ? 'CDD complete' : 'Action required'}</span>
              </div>

              <!-- CDD checklist -->
              <div style="padding:0 var(--space-3) var(--space-3);display:flex;flex-direction:column;gap:6px;">

                <!-- ID Verification row -->
                ${cdd.needsVer ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-md);">
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <span style="color:${cdd.hasVer?'var(--color-success)':'var(--color-danger)'};font-weight:bold;">${cdd.hasVer?'✓':'✗'}</span>
                      <div>
                        <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">ID verification</div>
                        ${cdd.hasVer
                          ? `<div style="font-size:10px;color:var(--color-text-muted);">${cdd.latestVer.idType} · ${fmtDate(cdd.latestVer.verifiedDate)} · by ${cdd.latestVer.verifiedBy}</div>`
                          : `<div style="font-size:10px;color:var(--color-danger);">Not recorded — passport or driver licence required</div>`}
                      </div>
                    </div>
                    ${!cdd.hasVer ? `
                      <button onclick="go('individual-detail',{individualId:'${l.individualId}',tab:'verification'})" class="btn-ghost" style="font-size:10px;color:var(--color-primary);white-space:nowrap;">+ Record →</button>
                    ` : ''}
                  </div>
                ` : ''}

                <!-- Screening row -->
                ${cdd.needsScr ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-md);">
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <span style="color:${cdd.hasScr?'var(--color-success)':'var(--color-danger)'};font-weight:bold;">${cdd.hasScr?'✓':'✗'}</span>
                      <div>
                        <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">PEP / sanctions screening</div>
                        ${cdd.hasScr
                          ? `<div style="font-size:10px;color:var(--color-text-muted);">Result: ${cdd.latestScr.result} · ${cdd.latestScr.provider} · ${fmtDate(cdd.latestScr.date)}</div>`
                          : `<div style="font-size:10px;color:var(--color-danger);">Not recorded — NameScan or equivalent required</div>`}
                      </div>
                    </div>
                    ${!cdd.hasScr ? `
                      <button onclick="go('individual-detail',{individualId:'${l.individualId}',tab:'screening'})" class="btn-ghost" style="font-size:10px;color:var(--color-primary);white-space:nowrap;">+ Record →</button>
                    ` : ''}
                  </div>
                ` : ''}

              </div>

              <!-- Footer -->
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);border-top:0.5px solid var(--color-border-light);background:var(--color-surface-alt);">
                <button onclick="endEntityMember('${l.linkId}')" class="btn-ghost" style="color:var(--color-danger);font-size:10px;">End role</button>
                <button onclick="go('individual-detail',{individualId:'${l.individualId}'})" class="btn-ghost" style="font-size:10px;color:var(--color-text-muted);">View full record →</button>
              </div>
            </div>`;
        }).join('')}

        ${formerLinks.length > 0 ? `
          <div style="margin-top:var(--space-3);">
            <div class="section-heading">Former key people</div>
            ${formerLinks.map(l => {
              const ind   = S.individuals.find(i => i.individualId === l.individualId);
              const label = ROLE_LABELS[l.roleType] || l.roleType;
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
                  <div>
                    <div style="font-size:var(--font-size-base);color:var(--color-text-muted);">${ind?.fullName || 'Unknown'}</div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label} · ended ${fmtDate(l.endDate)}</div>
                  </div>
                  <span class="badge badge-neutral" style="font-size:9px;">Former</span>
                </div>`;
            }).join('')}
          </div>
        ` : ''}
      </div>

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

// ─── LABEL HELPERS ────────────────────────────────────────────────────────────
function keyPeopleLabel(entityType) {
  switch (entityType) {
    case 'Private Company':          return 'Directors and shareholders with more than 25% ownership.';
    case 'Trust':                    return 'Trustees and beneficiaries or classes of beneficiaries.';
    case 'SMSF':                     return 'Trustees and members of the fund.';
    case 'Partnership':              return 'All partners.';
    case 'Incorporated Association': return 'Committee members and responsible persons.';
    case 'Charity / NFP':            return 'Responsible persons and board members.';
    default:                         return 'Key individuals who control or benefit from this entity.';
  }
}

function keyPeoplePrompt(entityType) {
  switch (entityType) {
    case 'Private Company':          return 'Add all directors and any shareholders holding more than 25%.';
    case 'Trust':                    return 'Add all trustees. Add beneficiaries or describe the class.';
    case 'SMSF':                     return 'Add all trustees and members of the fund.';
    case 'Partnership':              return 'Add all partners.';
    case 'Incorporated Association': return 'Add committee members and any responsible persons.';
    case 'Charity / NFP':            return 'Add responsible persons and board members.';
    default:                         return 'Add key individuals associated with this client.';
  }
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
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

window.loadEntityAudit = async function(entityId) {
  const { getEntityAuditLog } = await import('../../firebase/firestore.js');
  const entries = await getEntityAuditLog(S.firmId, entityId);
  if (!S._auditCache) S._auditCache = {};
  S._auditCache[entityId] = entries;
  render();
};
