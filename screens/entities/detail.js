import { S }                                                  from '../../state/index.js';
import { getRequirements, ROLE_LABELS }  from '../../state/rules_matrix.js';
import { fmtDate, fmtDateTime }                               from '../../firebase/firestore.js';

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

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { entityId } = S.currentParams || {};
  const entity = S.entities.find(e => e.entityId === entityId);

  if (!entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Back to clients</button>
    </div>`;

  // Members
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

  // Overall client compliance — check each member has verification + screening
  const allCompliant = activeLinks.length > 0 && activeLinks.every(l => {
    const indLinks = S.links.filter(lk => lk.individualId === l.individualId && lk.status === 'active');
    const required = getRequirements(indLinks, S.entities);
    const hasVer   = (S.verifications||[]).some(v => v.individualId === l.individualId);
    const hasScr   = (S.screenings   ||[]).some(s => s.individualId === l.individualId && s.result);
    const needsVer = required.includes('id_verification');
    const needsScr = required.includes('screening');
    return (!needsVer || hasVer) && (!needsScr || hasScr);
  });
  const statusBadge  = activeLinks.length === 0
    ? `<span class="badge badge-neutral">No members</span>`
    : allCompliant
      ? `<span class="badge badge-success">Compliant</span>`
      : `<span class="badge badge-danger">Action required</span>`;

  // Audit trail cache
  const auditEntries = (S._auditCache?.[entityId] || []).slice(0, 5);

  return `
    <div>
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6);">
        <div>
          <button onclick="go('entities')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Clients</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${entity.entityName}</h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);">
            ${statusBadge}
            ${riskBadge(entity.entityRiskRating)}
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${entity.entityType || ''}</span>
          </div>
        </div>
        <button onclick="go('entity-edit',{entityId:'${entityId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <!-- Entity also known as Client details -->
      <div class="card">
        <div class="section-heading">Client details</div>
        ${row('Client type',   entity.entityType)}
        ${row('ABN',           entity.abn)}
        ${row('ACN',           entity.acn)}
        ${row('Address',       entity.registeredAddress)}
        ${row('Incorporated',  fmtDate(entity.incorporationDate))}
        ${row('Country',       entity.countryOfOrigin)}
        ${row('Status',        entity.status)}
        ${row('Created',       fmtDate(entity.createdAt))}
        ${row('Last updated',  fmtDate(entity.updatedAt))}
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
          ${row('Risk rating',      entity.entityRiskRating)}
          ${row('Assessed by',      entity.riskAssessedBy)}
          ${row('Assessed date',    fmtDate(entity.riskAssessedDate))}
          ${row('Next review',      fmtDate(entity.riskNextReviewDate))}
          ${row('Methodology',      entity.riskMethodology)}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No risk assessment recorded yet.</p>
        `}
      </div>

      <!-- Members / Key people -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div class="section-heading" style="margin:0;">Key people (${activeLinks.length})</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">Directors, trustees, partners and beneficial owners who need to be identified.</div>
          </div>
          <button onclick="go('entity-edit',{entityId:'${entityId}',tab:'members'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">+ Add person</button>
        </div>

        ${activeLinks.length === 0 ? `
          <div style="padding:var(--space-4);background:var(--color-warning-light);border:0.5px solid var(--color-warning-border);border-radius:var(--radius-lg);">
            <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-warning-text);margin-bottom:4px;">No key people added yet</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-warning-text);">You need to add and identify all directors, trustees, partners or beneficial owners (>25%) for this client before CDD is complete.</div>
          </div>
        ` : activeLinks.map(l => {
          const ind    = S.individuals.find(i => i.individualId === l.individualId);
          const label  = ROLE_LABELS[l.roleType] || l.roleType;
          const name   = ind?.fullName || 'Unknown';
          const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

          // Derive what's required and what's done for this person in this client context
          const indLinks    = S.links.filter(lk => lk.individualId === l.individualId && lk.status === 'active');
          const required    = getRequirements(indLinks, S.entities);
          const verifications = (S.verifications || []).filter(v => v.individualId === l.individualId);
          const screenings    = (S.screenings    || []).filter(s => s.individualId === l.individualId);
          const latestVer   = verifications.sort((a,b) => b.createdAt?.localeCompare(a.createdAt))[0];
          const latestScr   = screenings.sort((a,b) => b.date?.localeCompare(a.date))[0];

          const hasVerification = !!latestVer;
          const hasScreening    = !!latestScr?.result;
          const needsVer        = required.includes('id_verification');
          const needsScr        = required.includes('screening');

          const isCompliant = (!needsVer || hasVerification) && (!needsScr || hasScreening);
          const statusColor = isCompliant ? 'var(--color-success)' : 'var(--color-danger)';
          const statusLabel = isCompliant ? 'CDD complete' : 'Action required';

          return `
            <div style="border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-3);overflow:hidden;">
              <!-- Person header -->
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);">
                <div class="avatar" style="flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${name}</div>
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label}${l.ownershipPercent ? ' · ' + l.ownershipPercent + '%' : ''}</div>
                </div>
                <span class="badge ${isCompliant ? 'badge-success' : 'badge-danger'}">${statusLabel}</span>
              </div>

              <!-- CDD checklist -->
              <div style="padding:0 var(--space-3) var(--space-3);display:flex;flex-direction:column;gap:6px;">
                ${needsVer ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-md);">
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <span style="color:${hasVerification?'var(--color-success)':'var(--color-danger)'};font-weight:bold;font-size:var(--font-size-sm);">${hasVerification?'✓':'✗'}</span>
                      <div>
                        <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">ID verification</div>
                        ${hasVerification
                          ? `<div style="font-size:10px;color:var(--color-text-muted);">${latestVer.idType} · verified ${fmtDate(latestVer.verifiedDate)}</div>`
                          : `<div style="font-size:10px;color:var(--color-danger);">Passport or driver licence required</div>`}
                      </div>
                    </div>
                    ${!hasVerification ? `<button onclick="go('individual-edit',{individualId:'${l.individualId}',tab:'verification'})" class="btn-ghost" style="font-size:10px;color:var(--color-primary);white-space:nowrap;">+ Add →</button>` : ''}
                  </div>
                ` : ''}

                ${needsScr ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-md);">
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <span style="color:${hasScreening?'var(--color-success)':'var(--color-danger)'};font-weight:bold;font-size:var(--font-size-sm);">${hasScreening?'✓':'✗'}</span>
                      <div>
                        <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">PEP / sanctions screening</div>
                        ${hasScreening
                          ? `<div style="font-size:10px;color:var(--color-text-muted);">Result: ${latestScr.result} · ${fmtDate(latestScr.date)}</div>`
                          : `<div style="font-size:10px;color:var(--color-danger);">NameScan or equivalent required</div>`}
                      </div>
                    </div>
                    ${!hasScreening ? `<button onclick="go('individual-edit',{individualId:'${l.individualId}',tab:'screening'})" class="btn-ghost" style="font-size:10px;color:var(--color-primary);white-space:nowrap;">+ Add →</button>` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- Footer actions -->
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);border-top:0.5px solid var(--color-border-light);background:var(--color-surface-alt);">
                <button onclick="endEntityMember('${l.linkId}')" class="btn-ghost" style="color:var(--color-danger);font-size:10px;">End role</button>
                <button onclick="go('individual-detail',{individualId:'${l.individualId}'})" class="btn-ghost" style="font-size:10px;color:var(--color-text-muted);">View full record →</button>
              </div>
            </div>`;
        }).join('')}

        ${formerLinks.length > 0 ? `
          <div style="margin-top:var(--space-4);">
            <div class="section-heading">Former members</div>
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

      <!-- SMR -->
      <div class="card">
        <div class="section-heading">SMR</div>
        <button onclick="go('smr',{filterEntity:'${entityId}'})" class="btn-sec btn-sm">View SMRs involving this client</button>
        <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Only your firm's client SMRs are shown.</p>
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
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Click Load to view activity for this entity.</p>
        `}
        <button onclick="go('audit-trail',{entityId:'${entityId}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);margin-top:var(--space-2);">View full audit trail →</button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.loadEntityAudit = async function(entityId) {
  const { getEntityAuditLog } = await import('../../firebase/firestore.js');
  const entries = await getEntityAuditLog(S.firmId, entityId);
  if (!S._auditCache) S._auditCache = {};
  S._auditCache[entityId] = entries;
  render();
};
