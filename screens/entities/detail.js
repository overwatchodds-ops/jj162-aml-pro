import { S }                                                  from '../../state/index.js';
import { getRequirements, getComplianceStatus, ROLE_LABELS }  from '../../state/rules_matrix.js';
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

function memberStatusIcon(individualId) {
  const ind     = S.individuals.find(i => i.individualId === individualId);
  if (!ind) return '✗';

  const links   = S.links.filter(l => l.individualId === individualId && l.status === 'active');
  const required = getRequirements(links, S.entities);

  const verifications = (S.verifications || []).filter(v => v.individualId === individualId);
  const screenings    = (S.screenings    || []).filter(s => s.individualId === individualId);
  const training      = (S.training      || []).filter(t => t.individualId === individualId);
  const vetting       = (S.vetting       || []).filter(v => v.individualId === individualId);

  const latestVer = verifications.sort((a,b) => b.createdAt?.localeCompare(a.createdAt))[0];
  const latestScr = screenings.sort((a,b) => b.date?.localeCompare(a.date))[0];
  const latestTrn = training.sort((a,b) => b.completedDate?.localeCompare(a.completedDate))[0];
  const latestVet = vetting.sort((a,b) => b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];

  const { status } = getComplianceStatus(required, {
    verification: latestVer || null,
    screening:    { result: latestScr?.result, date: latestScr?.date },
    training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
    vetting:      latestVet || null,
  });

  return status === 'compliant' ? '✓' : '✗';
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { entityId } = S.currentParams || {};
  const entity = S.entities.find(e => e.entityId === entityId);

  if (!entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Entity not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Back to entities</button>
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

  // Overall entity compliance
  const allCompliant = activeLinks.length > 0 && activeLinks.every(l => memberStatusIcon(l.individualId) === '✓');
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
          <button onclick="go('entities')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Entities</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${entity.entityName}</h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);">
            ${statusBadge}
            ${riskBadge(entity.entityRiskRating)}
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${entity.entityType || ''}</span>
          </div>
        </div>
        <button onclick="go('entity-edit',{entityId:'${entityId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <!-- Entity details -->
      <div class="card">
        <div class="section-heading">Entity details</div>
        ${row('Entity type',   entity.entityType)}
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

      <!-- Members -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Members (${activeLinks.length})</div>
          <button onclick="go('entity-edit',{entityId:'${entityId}',tab:'members'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">+ Add member</button>
        </div>

        ${activeLinks.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No members yet. Add individuals to this entity.</p>
        ` : activeLinks.map(l => {
          const ind    = S.individuals.find(i => i.individualId === l.individualId);
          const icon   = memberStatusIcon(l.individualId);
          const color  = icon === '✓' ? 'var(--color-success)' : 'var(--color-danger)';
          const label  = ROLE_LABELS[l.roleType] || l.roleType;
          const name   = ind?.fullName || 'Unknown individual';
          const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

          return `
            <div
              onclick="go('individual-detail',{individualId:'${l.individualId}'})"
              style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:0.5px solid var(--color-border-light);cursor:pointer;"
              onmouseover="this.style.background='var(--color-surface-alt)'"
              onmouseout="this.style.background=''"
            >
              <div class="avatar" style="flex-shrink:0;">${initials}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${name}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label}${l.ownershipPercent ? ' · ' + l.ownershipPercent + '%' : ''}</div>
              </div>
              <span style="color:${color};font-weight:var(--font-weight-bold);font-size:var(--font-size-sm);flex-shrink:0;">${icon}</span>
              <button
                onclick="event.stopPropagation();go('individual-detail',{individualId:'${l.individualId}'})"
                class="btn-ghost"
                style="font-size:var(--font-size-xs);color:var(--color-text-muted);flex-shrink:0;"
              >View →</button>
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
        <button onclick="go('smr',{filterEntity:'${entityId}'})" class="btn-sec btn-sm">View SMRs involving this entity</button>
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
