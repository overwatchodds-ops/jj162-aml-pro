import { S }                                                        from '../../state/index.js';
import { getRequirements, getComplianceStatus, ROLE_LABELS, ENTITY_ROLES } from '../../state/rules_matrix.js';
import { getFirmAuditLog, fmtDate, fmtDateTime }                   from '../../firebase/firestore.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
}

function row(label, value) {
  if (!value) return '';
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);min-width:140px;flex-shrink:0;">${label}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);text-align:right;">${value}</span>
    </div>`;
}

function reqRow(code, label, satisfied, missing) {
  const isSatisfied = satisfied.includes(code);
  const missingItem = missing.find(m => m.code === code);
  const icon  = isSatisfied ? '✓' : '✗';
  const color = isSatisfied ? 'var(--color-success)' : 'var(--color-danger)';
  const msg   = isSatisfied ? label : (missingItem?.label || label);

  return `
    <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="color:${color};font-size:var(--font-size-sm);font-weight:var(--font-weight-bold);flex-shrink:0;">${icon}</span>
      <span style="font-size:var(--font-size-xs);color:${isSatisfied ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'};">${msg}</span>
    </div>`;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { individualId } = S.currentParams || {};
  const ind = S.individuals.find(i => i.individualId === individualId);

  if (!ind) return `
    <div class="empty-state">
      <div class="empty-state-title">Individual not found.</div>
      <button onclick="go('individuals')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Back to individuals</button>
    </div>`;

  // Links
  const links    = S.links.filter(l => l.individualId === individualId && l.status === 'active');
  const fmrLinks = S.links.filter(l => l.individualId === individualId && l.status === 'former');

  // Compliance
  const required = getRequirements(links, S.entities);
  const verifications = (S.verifications || []).filter(v => v.individualId === individualId);
  const screenings    = (S.screenings    || []).filter(s => s.individualId === individualId);
  const training      = (S.training      || []).filter(t => t.individualId === individualId);
  const vetting       = (S.vetting       || []).filter(v => v.individualId === individualId);

  const latestVer = verifications.sort((a,b) => b.createdAt?.localeCompare(a.createdAt))[0];
  const latestScr = screenings.sort((a,b)    => b.date?.localeCompare(a.date))[0];
  const latestTrn = training.sort((a,b)      => b.completedDate?.localeCompare(a.completedDate))[0];
  const latestVet = vetting.sort((a,b)       => b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];

  const evidence = {
    verification: latestVer || null,
    screening:    { result: latestScr?.result, date: latestScr?.date },
    training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
    vetting:      latestVet || null,
  };

  const { status, missing, satisfied } = getComplianceStatus(required, evidence);

  const statusBadge = status === 'compliant'
    ? `<span class="badge badge-success">Compliant</span>`
    : `<span class="badge badge-danger">Action required</span>`;

  // Audit trail (last 5)
  const auditEntries = (S._auditCache?.[individualId] || []).slice(0, 5);

  return `
    <div>
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6);">
        <div style="display:flex;align-items:center;gap:var(--space-4);">
          <button onclick="go('individuals')" class="btn-ghost" style="color:var(--color-text-muted);padding:0;font-size:var(--font-size-sm);">← Individuals</button>
        </div>
        <button onclick="go('individual-edit',{individualId:'${individualId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <!-- Identity card -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);">
          <div class="avatar" style="width:48px;height:48px;font-size:var(--font-size-lg);">${initials(ind.fullName)}</div>
          <div>
            <div style="font-size:var(--font-size-xl);font-weight:var(--font-weight-medium);margin-bottom:var(--space-1);">${ind.fullName}</div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">${statusBadge}</div>
          </div>
        </div>

        <div class="section-heading">Core identity</div>
        ${row('Date of birth',    fmtDate(ind.dateOfBirth))}
        ${row('Address',          ind.address)}
        ${row('Email',            ind.email)}
        ${row('Phone',            ind.phone)}
        ${row('Created',          fmtDate(ind.createdAt))}
        ${row('Last updated',     fmtDate(ind.updatedAt))}
      </div>

      <!-- Compliance requirements -->
      ${required.length > 0 ? `
      <div class="card">
        <div class="section-heading">Compliance requirements</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">Derived from this individual's connections and roles.</p>
        ${required.map(code => {
          const labels = {
            id_verification:    'ID verification',
            screening:          'Screening (PEP/sanctions)',
            police_check:       'Police check',
            bankruptcy_check:   'Bankruptcy check',
            training_enhanced:  'Enhanced AML/CTF training',
            training_standard:  'Standard AML/CTF training',
            declaration_signed: 'Annual declaration signed',
            assessment_recorded:'AML/CTF function assessment',
          };
          return reqRow(code, labels[code] || code, satisfied, missing);
        }).join('')}
      </div>` : `
      <div class="card">
        <div class="section-heading">Compliance requirements</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No requirements yet — add a connection to this individual to derive their compliance obligations.</p>
      </div>`}

      <!-- Connections -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Active connections</div>
          <button onclick="go('individual-edit',{individualId:'${individualId}',tab:'connections'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">+ Add connection</button>
        </div>

        ${links.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No active connections. Add a firm or entity connection to generate compliance requirements.</p>
        ` : links.map(l => {
          const label = ROLE_LABELS[l.roleType] || l.roleType;
          let target = '';
          if (l.linkedObjectType === 'firm') {
            target = S.firm?.firmName || 'Firm';
          } else {
            const entity = S.entities.find(e => e.entityId === l.linkedObjectId);
            target = entity?.entityName || 'Entity';
          }
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${target}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label} · since ${fmtDate(l.startDate)}</div>
              </div>
              <span class="badge badge-success" style="font-size:9px;">Active</span>
            </div>`;
        }).join('')}

        ${fmrLinks.length > 0 ? `
          <div style="margin-top:var(--space-4);">
            <div class="section-heading">Former connections</div>
            ${fmrLinks.map(l => {
              const label = ROLE_LABELS[l.roleType] || l.roleType;
              let target = '';
              if (l.linkedObjectType === 'firm') {
                target = S.firm?.firmName || 'Firm';
              } else {
                const entity = S.entities.find(e => e.entityId === l.linkedObjectId);
                target = entity?.entityName || 'Entity';
              }
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
                  <div>
                    <div style="font-size:var(--font-size-base);color:var(--color-text-muted);">${target}</div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label} · ended ${fmtDate(l.endDate)}</div>
                  </div>
                  <span class="badge badge-neutral" style="font-size:9px;">Former</span>
                </div>`;
            }).join('')}
          </div>
        ` : ''}
      </div>

      <!-- ID Verification -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">ID verification</div>
          <button onclick="go('individual-edit',{individualId:'${individualId}',tab:'verification'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
            ${latestVer ? 'Update' : '+ Add'}
          </button>
        </div>
        ${latestVer ? `
          ${row('ID type',         latestVer.idType)}
          ${row('ID number',       latestVer.idNumber)}
          ${row('Issuing state',   latestVer.issuingState)}
          ${row('Expiry date',     fmtDate(latestVer.expiryDate))}
          ${row('Verified by',     latestVer.verifiedBy)}
          ${row('Verified date',   fmtDate(latestVer.verifiedDate))}
          ${row('Method',          latestVer.verifiedMethod)}
          ${verifications.length > 1 ? `<div style="margin-top:var(--space-2);font-size:10px;color:var(--color-text-muted);">${verifications.length - 1} previous verification${verifications.length > 2 ? 's' : ''} on record</div>` : ''}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No ID verification recorded yet.</p>
        `}
      </div>

      <!-- Screening -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Screening</div>
          <button onclick="go('individual-edit',{individualId:'${individualId}',tab:'screening'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
            ${latestScr ? 'Add new' : '+ Add'}
          </button>
        </div>
        ${latestScr ? `
          ${row('Provider',        latestScr.provider)}
          ${row('Date',            fmtDate(latestScr.date))}
          ${row('Result',          latestScr.result)}
          ${row('Reference ID',    latestScr.referenceId)}
          ${row('Next due',        fmtDate(latestScr.nextDueDate))}
          ${screenings.length > 1 ? `<div style="margin-top:var(--space-2);font-size:10px;color:var(--color-text-muted);">${screenings.length - 1} previous screening${screenings.length > 2 ? 's' : ''} on record</div>` : ''}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No screening recorded yet.</p>
        `}
      </div>

      <!-- Training -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Training</div>
          <button onclick="go('individual-edit',{individualId:'${individualId}',tab:'training'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
            ${latestTrn ? 'Add new' : '+ Add'}
          </button>
        </div>
        ${latestTrn ? `
          ${row('Type',            latestTrn.type)}
          ${row('Completed date',  fmtDate(latestTrn.completedDate))}
          ${row('Provider',        latestTrn.provider)}
          ${row('Expiry date',     fmtDate(latestTrn.expiryDate))}
          ${latestTrn.certificateLink ? `${row('Certificate', `<a href="${latestTrn.certificateLink}" target="_blank" style="color:var(--color-primary);">View →</a>`)}` : ''}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No training recorded yet.</p>
        `}
      </div>

      <!-- Staff vetting (only show if required) -->
      ${required.includes('police_check') || required.includes('bankruptcy_check') || required.includes('declaration_signed') ? `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Staff vetting</div>
          <button onclick="go('individual-edit',{individualId:'${individualId}',tab:'vetting'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
            ${latestVet ? 'Update' : '+ Add'}
          </button>
        </div>
        ${latestVet ? `
          ${row('Police check date',   fmtDate(latestVet.policeCheckDate))}
          ${row('Police check result', latestVet.policeCheckResult)}
          ${row('Police check ref',    latestVet.policeCheckRef)}
          ${row('Bankruptcy date',     fmtDate(latestVet.bankruptcyCheckDate))}
          ${row('Bankruptcy result',   latestVet.bankruptcyCheckResult)}
          ${row('Declaration date',    fmtDate(latestVet.declDate))}
          ${row('Declaration next',    fmtDate(latestVet.declNext))}
          ${row('Declaration signed',  latestVet.declSigned ? 'Yes' : 'No')}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No vetting records yet.</p>
        `}
      </div>` : ''}

      <!-- SMR -->
      <div class="card">
        <div class="section-heading">SMR</div>
        <button onclick="viewIndividualSMRs('${individualId}')" class="btn-sec btn-sm">View SMRs involving this individual</button>
        <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Only your firm's SMRs are shown. Tipping-off rules apply.</p>
      </div>

      <!-- Audit trail -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Recent activity</div>
          <button onclick="loadIndividualAudit('${individualId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Load</button>
        </div>
        ${auditEntries.length > 0 ? auditEntries.map(e => `
          <div class="audit-row">
            <span class="audit-arrow">→</span>
            <span class="audit-date">${fmtDateTime(e.timestamp)}</span>
            <span>${e.detail}</span>
          </div>`).join('') : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Click Load to view activity for this individual.</p>
        `}
        <button onclick="go('audit-trail',{individualId:'${individualId}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);margin-top:var(--space-2);">View full audit trail →</button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.viewIndividualSMRs = function(individualId) {
  go('smr', { filterIndividual: individualId });
};

window.loadIndividualAudit = async function(individualId) {
  const { getIndividualAuditLog } = await import('../../firebase/firestore.js');
  const entries = await getIndividualAuditLog(S.firmId, individualId);
  if (!S._auditCache) S._auditCache = {};
  S._auditCache[individualId] = entries;
  render();
};
