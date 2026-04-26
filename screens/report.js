import { S } from '../state/index.js';
import { getRequirements, getComplianceStatus } from '../state/rules_matrix.js';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDateOnly(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function latestByDate(records = [], dateFields = []) {
  if (!records.length) return null;

  return [...records].sort((a, b) => {
    const aDate = dateFields.map(f => a?.[f]).find(Boolean) || a.createdAt || '';
    const bDate = dateFields.map(f => b?.[f]).find(Boolean) || b.createdAt || '';
    return String(bDate).localeCompare(String(aDate));
  })[0];
}

function individualStatus(individual, entities) {
  const links = (S.links || []).filter(
    l => l.individualId === individual.individualId && l.status === 'active'
  );

  if (!links.length) {
    return {
      status: 'no_links',
      label: 'No active role',
      missing: [],
      required: [],
    };
  }

  const required = getRequirements(links, entities);

  if (!required.length) {
    return {
      status: 'no_requirements',
      label: 'No checks required',
      missing: [],
      required,
    };
  }

  const latestVer = latestByDate(
    (S.verifications || []).filter(v => v.individualId === individual.individualId),
    ['verifiedDate', 'date']
  );

  const latestScr = latestByDate(
    (S.screenings || []).filter(s => s.individualId === individual.individualId),
    ['date', 'screeningDate']
  );

  const latestTrn = latestByDate(
    (S.training || []).filter(t => t.individualId === individual.individualId),
    ['completedDate', 'date']
  );

  const latestVet = latestByDate(
    (S.vetting || []).filter(v => v.individualId === individual.individualId),
    ['policeCheckDate', 'bankruptcyCheckDate', 'declDate', 'date']
  );

  const result = getComplianceStatus(required, {
    verification: latestVer || null,
    screening: {
      result: latestScr?.result,
      date: latestScr?.date || latestScr?.screeningDate,
    },
    training: {
      type: latestTrn?.type,
      completedDate: latestTrn?.completedDate,
    },
    vetting: latestVet || null,
  });

  return {
    status: result.status,
    label: result.status === 'compliant' ? 'Records complete' : 'Action needed',
    missing: result.missing || [],
    required,
  };
}

function riskBadge(rating) {
  switch (String(rating || '').toLowerCase()) {
    case 'high':
      return `<span class="badge badge-danger">High</span>`;
    case 'medium':
      return `<span class="badge badge-warning">Medium</span>`;
    case 'low':
      return `<span class="badge badge-success">Low</span>`;
    default:
      return `<span class="badge badge-neutral">Unrated</span>`;
  }
}

export function screen() {
  const firm        = S.firm || {};
  const history     = S._reportHistory || [];
  const individuals = S.individuals || [];
  const entities    = S.entities || [];

  const statuses = individuals.map(ind => individualStatus(ind, entities));

  const recordsComplete = statuses.filter(s => s.status === 'compliant').length;
  const actionNeeded    = statuses.filter(s => s.status === 'action_required').length;
  const noActiveRole    = statuses.filter(s => s.status === 'no_links').length;

  return `
    <div class="screen-narrow">
      <div style="margin-bottom:var(--space-5);">
        <h1 class="screen-title">AML/CTF Records Report</h1>
        <p class="screen-subtitle">
          A printable summary of your firm's AML/CTF records, client CDD status, staff vetting records and audit-support information.
        </p>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        <div class="banner-title">What is this report?</div>
        This report summarises records entered in SimpleAML Pro. It is designed to help your firm review and evidence its AML/CTF workflow.
        It is not legal advice and does not by itself guarantee compliance.
      </div>

      <!-- Compliance snapshot -->
      <div class="card">
        <div class="section-heading">Records snapshot</div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3);">
          <div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);">
            <div style="font-size:22px;font-weight:700;color:var(--color-success);">${recordsComplete}</div>
            <div style="font-size:10px;color:var(--color-text-muted);">Records complete</div>
          </div>

          <div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);">
            <div style="font-size:22px;font-weight:700;color:${actionNeeded > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${actionNeeded}</div>
            <div style="font-size:10px;color:var(--color-text-muted);">Action needed</div>
          </div>

          <div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);">
            <div style="font-size:22px;font-weight:700;color:var(--color-primary);">${entities.length}</div>
            <div style="font-size:10px;color:var(--color-text-muted);">Entity clients</div>
          </div>
        </div>

        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);">
          Firm: ${firm.firmName || '—'} · ABN: ${firm.abn || '—'} · AUSTRAC enrolment:
          ${firm.austracEnrolment?.enrolmentId || 'Not recorded'}
        </div>

        ${noActiveRole > 0 ? `
          <div class="banner banner-warning" style="margin-top:var(--space-3);">
            ${noActiveRole} individual${noActiveRole === 1 ? '' : 's'} currently have no active role or client link. Review whether these records are still needed.
          </div>
        ` : ''}
      </div>

      <!-- Report contents -->
      <div class="card">
        <div class="section-heading">What this report contains</div>

        ${[
          'Firm profile and setup status',
          'Staff and individual records status',
          'Client/entity register summary',
          'Key people and CDD support status',
          'SMR register summary',
          'Record storage location noted by the firm',
        ].map(item => `
          <div style="display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-1) 0;">
            <span style="color:var(--color-primary);flex-shrink:0;font-size:var(--font-size-xs);">→</span>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${item}</span>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <div class="section-heading">Storage location</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          Record where your firm will save the downloaded or printed report.
        </p>
        <input
          id="report-storage"
          type="text"
          class="inp"
          placeholder="e.g. SharePoint > Compliance > AML Reports > 2026"
          value="${S._reportStorage || ''}"
        >
      </div>

      <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
        This report is a summary of records entered in SimpleAML Pro. Your firm should keep supporting records in accordance with its AML/CTF record-keeping obligations and professional judgement.
      </div>

      <button onclick="generateComplianceReport()" class="btn btn-full" style="margin-bottom:var(--space-3);">
        Generate printable report
      </button>

      ${history.length > 0 ? `
        <div class="card">
          <div class="section-heading">Generation history</div>
          ${history.map((h, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div>
                <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);">${h.date}</div>
                ${h.location
                  ? `<div style="font-size:10px;color:var(--color-text-muted);">Stored: ${h.location}</div>`
                  : `<div style="font-size:10px;color:var(--color-text-muted);font-style:italic;">Storage location not recorded</div>`}
              </div>
              <button onclick="removeReportHistory(${i})" class="btn-ghost" style="color:var(--color-text-light);">Remove</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>`;
}

function buildPrintableReportHTML(storageLocation) {
  const firm        = S.firm || {};
  const individuals = S.individuals || [];
  const entities    = S.entities || [];
  const links       = S.links || [];
  const smrs        = S.smrs || [];

  const generatedAt = new Date().toLocaleString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusRows = individuals.map(ind => {
    const s = individualStatus(ind, entities);
    const activeLinks = links.filter(l => l.individualId === ind.individualId && l.status === 'active');

    const roles = activeLinks.map(l => {
      const entity = entities.find(e => e.entityId === l.linkedObjectId);
      const targetName = l.linkedObjectType === 'firm'
        ? 'Firm'
        : entity?.entityName || l.linkedObjectId || 'Entity';

      return `${l.roleType || 'role'} — ${targetName}`;
    }).join('; ') || '—';

    const missing = s.missing.map(m => m.label).join('; ') || '—';

    return `
      <tr>
        <td>${escapeHtml(ind.fullName || 'Unnamed')}</td>
        <td>${escapeHtml(roles)}</td>
        <td>${escapeHtml(s.label)}</td>
        <td>${escapeHtml(missing)}</td>
      </tr>
    `;
  }).join('');

  const entityRows = entities.map(entity => {
    const keyPeople = links.filter(
      l => l.linkedObjectType === 'entity' &&
           l.linkedObjectId === entity.entityId &&
           l.status === 'active'
    );

    return `
      <tr>
        <td>${escapeHtml(entity.entityName || 'Unnamed')}</td>
        <td>${escapeHtml(entity.entityType || '—')}</td>
        <td>${escapeHtml(entity.abn || '—')}</td>
        <td>${escapeHtml(entity.entityRiskRating || 'Unrated')}</td>
        <td>${keyPeople.length}</td>
      </tr>
    `;
  }).join('');

  const smrRows = smrs.length
    ? smrs.map(smr => `
        <tr>
          <td>${escapeHtml(smr.smrId || '—')}</td>
          <td>${escapeHtml(smr.status || '—')}</td>
          <td>${escapeHtml(fmtDateOnly(smr.createdAt || smr.date))}</td>
          <td>${escapeHtml(smr.subject || smr.summary || '—')}</td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="4">No SMR records currently loaded.</td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>SimpleAML Pro — AML/CTF Records Report</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            margin: 32px;
            font-size: 12px;
            line-height: 1.45;
          }

          h1 {
            font-size: 22px;
            margin: 0 0 6px;
          }

          h2 {
            font-size: 15px;
            margin: 24px 0 8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
          }

          .muted {
            color: #6b7280;
          }

          .box {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            margin: 12px 0;
            background: #f9fafb;
          }

          .warning {
            border: 1px solid #f59e0b;
            background: #fffbeb;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          th, td {
            border: 1px solid #e5e7eb;
            padding: 7px;
            vertical-align: top;
            text-align: left;
          }

          th {
            background: #f3f4f6;
            font-weight: 700;
          }

          .footer {
            margin-top: 32px;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
          }

          @media print {
            body {
              margin: 18mm;
            }

            button {
              display: none;
            }

            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>

      <body>
        <h1>SimpleAML Pro — AML/CTF Records Report</h1>
        <div class="muted">Generated: ${escapeHtml(generatedAt)}</div>

        <div class="box warning">
          <strong>Important:</strong>
          This report summarises records entered in SimpleAML Pro. It is not legal advice and does not guarantee compliance.
          The firm remains responsible for reviewing its AML/CTF obligations, applying professional judgement and keeping supporting records.
        </div>

        <h2>Firm details</h2>
        <table>
          <tr>
            <th>Firm name</th>
            <td>${escapeHtml(firm.firmName || '—')}</td>
          </tr>
          <tr>
            <th>ABN</th>
            <td>${escapeHtml(firm.abn || '—')}</td>
          </tr>
          <tr>
            <th>AUSTRAC enrolment</th>
            <td>${escapeHtml(firm.austracEnrolment?.enrolmentId || 'Not recorded')}</td>
          </tr>
          <tr>
            <th>Report storage location</th>
            <td>${escapeHtml(storageLocation || 'Not recorded')}</td>
          </tr>
        </table>

        <h2>Summary</h2>
        <table>
          <tr>
            <th>Individuals</th>
            <td>${individuals.length}</td>
          </tr>
          <tr>
            <th>Entities</th>
            <td>${entities.length}</td>
          </tr>
          <tr>
            <th>Links / roles</th>
            <td>${links.length}</td>
          </tr>
          <tr>
            <th>Verification records</th>
            <td>${(S.verifications || []).length}</td>
          </tr>
          <tr>
            <th>Screening records</th>
            <td>${(S.screenings || []).length}</td>
          </tr>
          <tr>
            <th>Training records</th>
            <td>${(S.training || []).length}</td>
          </tr>
          <tr>
            <th>Vetting records</th>
            <td>${(S.vetting || []).length}</td>
          </tr>
          <tr>
            <th>SMR records</th>
            <td>${smrs.length}</td>
          </tr>
        </table>

        <h2>Individuals and staff / key person records</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Active roles</th>
              <th>Record status</th>
              <th>Missing / action needed</th>
            </tr>
          </thead>
          <tbody>
            ${statusRows || `<tr><td colspan="4">No individual records currently loaded.</td></tr>`}
          </tbody>
        </table>

        <h2 class="page-break">Client / entity register</h2>
        <table>
          <thead>
            <tr>
              <th>Entity name</th>
              <th>Type</th>
              <th>ABN</th>
              <th>Risk rating</th>
              <th>Key people</th>
            </tr>
          </thead>
          <tbody>
            ${entityRows || `<tr><td colspan="5">No entity records currently loaded.</td></tr>`}
          </tbody>
        </table>

        <h2>SMR register summary</h2>
        <table>
          <thead>
            <tr>
              <th>SMR ID</th>
              <th>Status</th>
              <th>Date</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            ${smrRows}
          </tbody>
        </table>

        <div class="footer">
          SimpleAML Pro records report. Generated from records currently loaded in the app.
          Keep supporting records securely and in accordance with the firm's AML/CTF record-keeping obligations.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;
}

window.generateComplianceReport = function() {
  const storage = document.getElementById('report-storage')?.value?.trim() || '';
  S._reportStorage = storage;

  if (!S._reportHistory) S._reportHistory = [];

  S._reportHistory.unshift({
    date: new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    location: storage,
  });

  const reportWindow = window.open('', '_blank');

  if (!reportWindow) {
    toast('Pop-up blocked. Please allow pop-ups to generate the report.', 'err');
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildPrintableReportHTML(storage));
  reportWindow.document.close();

  render();
  toast('Printable report generated');
};

window.removeReportHistory = function(i) {
  if (S._reportHistory) S._reportHistory.splice(i, 1);
  render();
};
