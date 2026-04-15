import { S }       from '../state/index.js';
import { fmtDate } from '../firebase/firestore.js';
import { getRequirements, getComplianceStatus } from '../state/rules_matrix.js';

export function screen() {
  const firm      = S.firm || {};
  const history   = S._reportHistory || [];
  const individuals = S.individuals || [];
  const entities    = S.entities    || [];

  // Compliance summary
  function indStatus(ind) {
    const links   = S.links.filter(l => l.individualId === ind.individualId && l.status === 'active');
    if (!links.length) return 'no_links';
    const required = getRequirements(links, entities);
    const latestVer = (S.verifications||[]).filter(v=>v.individualId===ind.individualId).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt))[0];
    const latestScr = (S.screenings   ||[]).filter(s=>s.individualId===ind.individualId).sort((a,b)=>b.date?.localeCompare(a.date))[0];
    const latestTrn = (S.training     ||[]).filter(t=>t.individualId===ind.individualId).sort((a,b)=>b.completedDate?.localeCompare(a.completedDate))[0];
    const latestVet = (S.vetting      ||[]).filter(v=>v.individualId===ind.individualId).sort((a,b)=>b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];
    const { status } = getComplianceStatus(required, {
      verification: latestVer || null,
      screening:    { result: latestScr?.result, date: latestScr?.date },
      training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
      vetting:      latestVet || null,
    });
    return status;
  }

  const compliant = individuals.filter(i => indStatus(i) === 'compliant').length;
  const action    = individuals.filter(i => indStatus(i) === 'action_required').length;

  return `
    <div class="screen-narrow">
      <div style="margin-bottom:var(--space-5);">
        <h1 class="screen-title">AML/CTF Compliance Report</h1>
        <p class="screen-subtitle">A summary of your firm's AML/CTF compliance records for AUSTRAC's annual compliance questionnaire.</p>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        <div class="banner-title">What is this report?</div>
        This report summarises your compliance activity. AUSTRAC's annual compliance questionnaire is completed online — this document is your evidence record to refer to when answering it. It is not submitted to AUSTRAC.
      </div>

      <!-- Compliance snapshot -->
      <div class="card">
        <div class="section-heading">Compliance snapshot</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3);">
          <div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);">
            <div style="font-size:22px;font-weight:700;color:var(--color-success);">${compliant}</div>
            <div style="font-size:10px;color:var(--color-text-muted);">Compliant</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);">
            <div style="font-size:22px;font-weight:700;color:${action>0?'var(--color-danger)':'var(--color-success)'};">${action}</div>
            <div style="font-size:10px;color:var(--color-text-muted);">Action needed</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);">
            <div style="font-size:22px;font-weight:700;color:var(--color-primary);">${entities.length}</div>
            <div style="font-size:10px;color:var(--color-text-muted);">Entities</div>
          </div>
        </div>
        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">
          Firm: ${firm.firmName || '—'} · ABN: ${firm.abn || '—'} · AUSTRAC enrolment: ${firm.austracEnrolment?.enrolmentId || 'Not recorded'}
        </div>
      </div>

      <!-- Report contents -->
      <div class="card">
        <div class="section-heading">What this report contains</div>
        ${[
          '1. Firm profile — practice details and compliance appointments',
          '2. AML/CTF risk assessment — designated services, risk ratings',
          '3. AML/CTF Program — version, approval, next review',
          '4. AUSTRAC enrolment — enrolment confirmation',
          '5. Staff vetting register — classification and vetting status',
          '6. Training register — training records for all staff',
          '7. Client/entity register — CDD status and risk ratings',
          '8. SMR register — suspicious matter report history',
        ].map(item => `
          <div style="display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-1) 0;">
            <span style="color:var(--color-primary);flex-shrink:0;font-size:var(--font-size-xs);">→</span>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${item}</span>
          </div>`).join('')}
      </div>

      <div class="card">
        <div class="section-heading">Storage location</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">Record where you will save the downloaded PDF.</p>
        <input id="report-storage" type="text" class="inp" placeholder="e.g. SharePoint > Compliance > AML Reports > 2026" value="${S._reportStorage||''}">
      </div>

      <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
        By generating this report you confirm that you have sighted all underlying evidence and stored copies in your firm's records. This report must be retained for 7 years from the date of generation.
      </div>

      <button onclick="generateComplianceReport()" class="btn btn-full" style="margin-bottom:var(--space-3);">
        Generate AML/CTF Compliance Report (PDF)
      </button>

      ${history.length > 0 ? `
        <div class="card">
          <div class="section-heading">Generation history</div>
          ${history.map((h, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div>
                <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">${h.date}</div>
                ${h.location ? `<div style="font-size:10px;color:var(--color-text-muted);">Stored: ${h.location}</div>` : `<div style="font-size:10px;color:var(--color-text-muted);font-style:italic;">Storage location not recorded</div>`}
              </div>
              <button onclick="removeReportHistory(${i})" class="btn-ghost" style="color:var(--color-text-light);">Remove</button>
            </div>`).join('')}
        </div>
      ` : ''}
    </div>`;
}

window.generateComplianceReport = function() {
  const storage = document.getElementById('report-storage')?.value?.trim() || '';
  S._reportStorage = storage;

  if (!S._reportHistory) S._reportHistory = [];
  S._reportHistory.unshift({
    date:     new Date().toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }),
    location: storage,
  });

  // Open the report in a new tab
  // Pro report uses the same report.html pattern as free app
  // but pulls from Firestore state rather than localStorage
  window.open('./report.html?pro=1', '_blank');

  render();
  toast('Report generated');
};

window.removeReportHistory = function(i) {
  if (S._reportHistory) S._reportHistory.splice(i, 1);
  render();
};
