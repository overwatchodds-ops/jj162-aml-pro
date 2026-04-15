import { S }                            from '../../state/index.js';
import { getFirmAuditLog, fmtDate, fmtDateTime } from '../../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const firm      = S.firm || {};
  const history   = S._auditReportHistory || [];

  return `
    <div class="screen-narrow">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="go('audit-trail')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Audit trail</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">Audit trail report</h1>
        </div>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        <div class="banner-title">What is this report?</div>
        This is a timestamped export of your firm's complete compliance audit trail. It is an evidentiary document — if AUSTRAC reviews your compliance, this report demonstrates that you have been operating your AML/CTF program consistently over time. It is not submitted to AUSTRAC but should be retained for 7 years.
      </div>

      <div class="card">
        <div class="section-heading">Report options</div>

        <div class="form-row">
          <label class="label">Date range — from</label>
          <input id="audit-from" type="date" class="inp">
        </div>

        <div class="form-row">
          <label class="label">Date range — to</label>
          <input id="audit-to" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}">
        </div>

        <div class="form-row">
          <label class="label">Filter by type</label>
          <select id="audit-type-filter" class="inp">
            <option value="all">All actions</option>
            <option value="individual">Individuals only</option>
            <option value="entity">Entities only</option>
            <option value="firm">Firm actions only</option>
            <option value="smr">SMR only</option>
          </select>
        </div>

        <div class="form-row">
          <label class="label">Storage location</label>
          <input id="audit-storage" type="text" class="inp" placeholder="e.g. SharePoint > Compliance > AML Reports > 2026">
        </div>
      </div>

      <div class="card">
        <div class="section-heading">What this report contains</div>
        ${[
          'Every compliance action taken by your firm',
          'Timestamped and attributed to the staff member responsible',
          'ID verifications, screenings, training records',
          'Entity and individual record changes',
          'Program approvals and risk assessments',
          'SMR submissions (reference numbers only — no details)',
          'Append-only — cannot be edited or deleted',
        ].map(item => `
          <div style="display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-1) 0;">
            <span style="color:var(--color-primary);flex-shrink:0;font-size:var(--font-size-xs);">→</span>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${item}</span>
          </div>`).join('')}
      </div>

      <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
        By generating this report you confirm that it represents a true and complete record of your firm's compliance activity for the selected period. Retain this report for 7 years as required under the AML/CTF Act 2006.
      </div>

      <button onclick="generateAuditReport()" class="btn btn-full" style="margin-bottom:var(--space-3);">
        Generate audit trail report (PDF)
      </button>

      ${history.length > 0 ? `
        <div class="card">
          <div class="section-heading">Generation history</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">A log of when this report was generated and where it was saved.</p>
          ${history.map((h, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div>
                <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">${h.date}</div>
                ${h.location
                  ? `<div style="font-size:10px;color:var(--color-text-muted);">Stored: ${h.location}</div>`
                  : `<div style="font-size:10px;color:var(--color-text-muted);font-style:italic;">Storage location not recorded</div>`}
                <div style="font-size:10px;color:var(--color-text-muted);">${h.entryCount} entries · ${h.dateRange || 'All dates'}</div>
              </div>
              <button onclick="removeAuditHistory(${i})" class="btn-ghost" style="color:var(--color-text-light);">Remove</button>
            </div>`).join('')}
        </div>
      ` : ''}
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.generateAuditReport = async function() {
  const fromDate  = document.getElementById('audit-from')?.value || '';
  const toDate    = document.getElementById('audit-to')?.value   || '';
  const typeFilter = document.getElementById('audit-type-filter')?.value || 'all';
  const storage   = document.getElementById('audit-storage')?.value?.trim() || '';

  toast('Loading audit data...');

  try {
    // Load full audit log
    let entries = await getFirmAuditLog(S.firmId, 1000);

    // Apply date filter
    if (fromDate) entries = entries.filter(e => e.timestamp >= fromDate);
    if (toDate)   entries = entries.filter(e => e.timestamp <= toDate + 'T23:59:59');

    // Apply type filter
    if (typeFilter !== 'all') entries = entries.filter(e => e.targetType === typeFilter);

    // Build PDF content
    const firm    = S.firm || {};
    const dateRange = fromDate && toDate
      ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}`
      : fromDate ? `From ${fmtDate(fromDate)}`
      : toDate   ? `To ${fmtDate(toDate)}`
      : 'All dates';

    // Open PDF in new window
    const win = window.open('', '_blank');
    win.document.write(buildAuditReportHTML(firm, entries, dateRange, typeFilter));
    win.document.close();
    win.print();

    // Log generation
    if (!S._auditReportHistory) S._auditReportHistory = [];
    S._auditReportHistory.unshift({
      date:       new Date().toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }),
      location:   storage,
      entryCount: entries.length,
      dateRange,
    });

    render();
    toast('Audit report generated');
  } catch (err) {
    toast('Failed to generate report', 'err');
    console.error(err);
  }
};

window.removeAuditHistory = function(i) {
  if (S._auditReportHistory) S._auditReportHistory.splice(i, 1);
  render();
};

// ─── PDF HTML BUILDER ─────────────────────────────────────────────────────────
function buildAuditReportHTML(firm, entries, dateRange, typeFilter) {
  const now = new Date().toLocaleDateString('en-AU', {
    day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  });

  const ACTION_LABELS = {
    firm_created:              'Firm created',
    firm_details_updated:      'Firm details updated',
    austrac_enrolment_updated: 'AUSTRAC enrolment updated',
    services_updated:          'Designated services updated',
    risk_assessment_updated:   'Risk assessment updated',
    program_approved:          'AML/CTF Program approved',
    individual_created:        'Individual created',
    individual_updated:        'Individual updated',
    id_verified:               'ID verified',
    screening_completed:       'Screening completed',
    training_completed:        'Training completed',
    vetting_updated:           'Vetting updated',
    member_added:              'Member added',
    entity_created:            'Entity created',
    entity_updated:            'Entity updated',
    risk_assessed:             'Risk assessed',
    link_ended:                'Role ended',
    smr_submitted:             'SMR submitted',
    smr_closed:                'SMR closed',
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SimpleAML Pro — Audit Trail Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; }
    h1   { font-size: 18px; font-weight: 500; margin: 0 0 4px; }
    h2   { font-size: 13px; font-weight: 500; margin: 20px 0 8px; border-bottom: 0.5px solid #e2e8f0; padding-bottom: 4px; }
    .meta { font-size: 10px; color: #64748b; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #0f172a; padding-bottom: 12px; }
    .badge { display: inline-block; font-size: 9px; padding: 1px 8px; border-radius: 99px; background: #f1f5f9; color: #475569; }
    table  { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th     { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; padding: 6px 8px; border-bottom: 0.5px solid #e2e8f0; }
    td     { padding: 6px 8px; font-size: 10px; border-bottom: 0.5px solid #f1f5f9; vertical-align: top; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; border-top: 0.5px solid #e2e8f0; padding-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>AML/CTF Compliance Audit Trail</h1>
      <div class="meta">
        ${firm.firmName || 'Firm'} · ABN ${firm.abn || '—'}<br>
        Period: ${dateRange} · Filter: ${typeFilter === 'all' ? 'All actions' : typeFilter}<br>
        Generated: ${now} · ${entries.length} entries
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;color:#4f46e5;">SimpleAML Pro</div>
      <div style="font-size:9px;color:#64748b;">simpleaml.com.au</div>
    </div>
  </div>

  <div class="meta" style="background:#fffbeb;border:0.5px solid #fde68a;padding:8px 12px;border-radius:6px;margin-bottom:16px;">
    This audit trail is an append-only compliance record. It cannot be edited or deleted. Retain for 7 years as required under the AML/CTF Act 2006. This document is not submitted to AUSTRAC but should be available for inspection on request.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:130px;">Timestamp</th>
        <th style="width:160px;">Action</th>
        <th>Detail</th>
        <th style="width:100px;">By</th>
        <th style="width:70px;">Type</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td style="color:#64748b;white-space:nowrap;">${fmtDateTime(e.timestamp)}</td>
          <td style="font-weight:500;">${ACTION_LABELS[e.action] || e.action}</td>
          <td>${e.detail || '—'}</td>
          <td style="color:#64748b;">${e.userName || '—'}</td>
          <td><span class="badge">${e.targetType}</span></td>
        </tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">
    SimpleAML Pro · ${firm.firmName || ''} · ABN ${firm.abn || ''} · Generated ${now} · ${entries.length} entries · AUSTRAC enrolment: ${firm.austracEnrolment?.enrolmentId || 'Not recorded'}
  </div>
</body>
</html>`;
}
