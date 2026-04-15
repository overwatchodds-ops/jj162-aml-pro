import { S }               from '../state/index.js';
import { fmtDate }         from '../firebase/firestore.js';
import { MATRIX }          from '../state/matrix.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function row(label, value, highlight) {
  if (!value) return '';
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);min-width:160px;flex-shrink:0;">${label}</span>
      <span style="font-size:var(--font-size-xs);color:${highlight||'var(--color-text-primary)'};text-align:right;">${value}</span>
    </div>`;
}

function sectionCard(title, editTab, content, hasData) {
  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
        <div class="section-heading" style="margin:0;">${title}</div>
        <button onclick="go('firm-profile-edit',{tab:'${editTab}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">
          ${hasData ? 'Edit' : '+ Complete'}
        </button>
      </div>
      ${content}
    </div>`;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const firm = S.firm || {};
  const enrolment     = firm.austracEnrolment    || {};
  const program       = firm.amlProgram          || {};
  const risk          = firm.riskAssessment      || {};
  const subscription  = firm.subscription        || {};

  // Designated services — from MATRIX
  const firmServices  = firm.designatedServices  || [];
  const inServices    = MATRIX.filter(m => firmServices.includes(m.id) && m.status === 'IN');

  // Overall firm compliance health
  const gaps = [];
  if (!enrolment.enrolmentId)   gaps.push('AUSTRAC enrolment ID not recorded');
  if (!program.version)          gaps.push('AML/CTF Program not approved');
  if (!risk.rating)              gaps.push('Firm risk assessment not completed');
  if (!firmServices.length)      gaps.push('Designated services not recorded');

  const firmStatus = gaps.length === 0
    ? `<span class="badge badge-success">All firm obligations recorded</span>`
    : `<span class="badge badge-danger">${gaps.length} gap${gaps.length > 1 ? 's' : ''} outstanding</span>`;

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Firm Profile</h1>
          <p class="screen-subtitle">Your firm's AUSTRAC obligations — enrolment, AML/CTF program, and risk assessment.</p>
        </div>
        ${firmStatus}
      </div>

      ${gaps.length > 0 ? `
        <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
          <div class="banner-title">Outstanding items</div>
          ${gaps.map(g => `<div style="margin-top:4px;">· ${g}</div>`).join('')}
        </div>
      ` : ''}

      <!-- Firm details -->
      ${sectionCard('Firm details', 'details', `
        ${row('Firm name',   firm.firmName)}
        ${row('ABN',         firm.abn)}
        ${row('ACN',         firm.acn)}
        ${row('Address',     firm.address)}
        ${row('Phone',       firm.phone)}
        ${row('Email',       firm.email)}
      `, !!firm.firmName)}

      <!-- AUSTRAC enrolment -->
      ${sectionCard('AUSTRAC enrolment', 'enrolment', enrolment.enrolmentId ? `
        ${row('Enrolment ID',    enrolment.enrolmentId)}
        ${row('Enrolment date',  fmtDate(enrolment.enrolmentDate))}
        ${row('Status',          enrolment.status)}
        ${row('Next confirmation', fmtDate(enrolment.nextConfirmationDate))}
      ` : `
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">AUSTRAC enrolment details not yet recorded.</p>
        <div class="banner banner-warning" style="margin-top:var(--space-3);">
          You must enrol with AUSTRAC before providing designated services.
          <a href="https://www.austrac.gov.au/business/how-comply-guidance-and-resources/enrolment" target="_blank" style="color:var(--color-warning-text);font-weight:var(--font-weight-medium);display:block;margin-top:4px;">Visit AUSTRAC Online →</a>
        </div>
      `, !!enrolment.enrolmentId)}

      <!-- Designated services -->
      ${sectionCard('Designated services', 'services', firmServices.length > 0 ? `
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">${inServices.length} designated service${inServices.length !== 1 ? 's' : ''} in scope for AML/CTF obligations.</p>
        ${inServices.slice(0, 5).map(s => `
          <div style="display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
            <span style="color:var(--color-primary);font-size:var(--font-size-xs);flex-shrink:0;">→</span>
            <div>
              <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">${s.task}</div>
              <div style="font-size:10px;color:var(--color-text-muted);">${s.category} · ${s.table6}</div>
            </div>
          </div>`).join('')}
        ${inServices.length > 5 ? `<div style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">+${inServices.length - 5} more services</div>` : ''}
      ` : `
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No designated services recorded yet. Select the services your firm provides to determine your AML/CTF scope.</p>
      `, firmServices.length > 0)}

      <!-- Risk assessment -->
      ${sectionCard('Firm risk assessment', 'risk', risk.rating ? `
        ${row('Overall rating',   risk.rating, risk.rating === 'High' ? 'var(--color-danger)' : risk.rating === 'Medium' ? 'var(--color-warning)' : 'var(--color-success)')}
        ${row('Assessed by',      risk.assessedBy)}
        ${row('Assessed date',    fmtDate(risk.assessedDate))}
        ${row('Next review',      fmtDate(risk.nextReviewDate))}
        ${row('Service risk',     risk.serviceRisk)}
        ${row('Client risk',      risk.clientRisk)}
        ${row('Geographic risk',  risk.geographicRisk)}
        ${row('PF risk',          risk.pfRisk)}
        ${risk.methodology ? `<div style="margin-top:var(--space-3);font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);">${risk.methodology}</div>` : ''}
      ` : `
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Firm risk assessment not yet completed.</p>
      `, !!risk.rating)}

      <!-- AML/CTF Program -->
      ${sectionCard('AML/CTF Program', 'program', program.version ? `
        ${row('Version',          program.version)}
        ${row('Approved by',      program.approvedBy)}
        ${row('Approved date',    fmtDate(program.approvedDate))}
        ${row('Next review',      fmtDate(program.nextReviewDate))}
        ${program.documentLink ? row('Document', `<a href="${program.documentLink}" target="_blank" style="color:var(--color-primary);">View →</a>`) : ''}
      ` : `
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">AML/CTF Program not yet approved. Document your program and record the approval details here.</p>
      `, !!program.version)}

      <!-- Subscription -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Subscription</div>
          <button onclick="go('settings-billing')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Manage</button>
        </div>
        ${row('Plan',    'SimpleAML Pro')}
        ${row('Status',  subscription.status || 'Active')}
        ${row('Billing', fmtDate(subscription.billingDate))}
      </div>

    </div>`;
}
