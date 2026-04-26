import { S } from '../../state/index.js';
import { getFirmAuditLog } from '../../firebase/firestore.js';

export function screen() {
  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Backup & export</h1>
          <p class="screen-subtitle">Export your compliance records for offline storage or review.</p>
        </div>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        SimpleAML Pro stores records in Firestore for cloud sync. Export is an additional safeguard.
        We recommend downloading a backup regularly and storing it in your firm's own document system.
      </div>

      <!-- Export all data -->
      <div class="card">
        <div class="section-heading">Export all data</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);margin-bottom:var(--space-4);">
          Download a complete JSON export of your firm's SimpleAML Pro records, including firm profile,
          individuals, entities, links, verification records, screening records, vetting records, SMRs and audit log.
        </p>
        <button onclick="exportAllData()" class="btn-sec btn-sm">Download JSON export</button>
      </div>

      <!-- Export CSV -->
      <div class="card">
        <div class="section-heading">Export individuals register (CSV)</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);margin-bottom:var(--space-4);">
          Download your individuals register as a CSV file for Excel or Google Sheets.
        </p>
        <button onclick="exportIndividualsCSV()" class="btn-sec btn-sm">Download CSV</button>
      </div>

      <!-- Free app migration -->
      <div class="card">
        <div class="section-heading">Free app data import</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);margin-bottom:var(--space-4);">
          Import from the SimpleAML free app is planned, but not yet enabled in this private beta.
          For now, please keep your free app JSON backup safely stored and do not import it into Pro manually.
        </p>

        <div class="banner banner-warning" style="margin-bottom:var(--space-3);">
          Coming soon: free app import will need controlled migration logic to avoid duplicate clients, people and CDD records.
        </div>

        <button
          class="btn-sec btn-sm"
          disabled
          style="opacity:0.55;cursor:not-allowed;"
          title="Free app import is not yet enabled"
        >
          Import coming soon
        </button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.exportAllData = async function() {
  try {
    const auditLog = await getFirmAuditLog(S.firmId, 10000);

    const exportData = {
      exportDate:    new Date().toISOString(),
      firmId:        S.firmId,
      firm:          S.firm,
      individuals:   S.individuals || [],
      entities:      S.entities || [],
      links:         S.links || [],
      verifications: S.verifications || [],
      screenings:    S.screenings || [],
      training:      S.training || [],
      vetting:       S.vetting || [],
      smrs:          S.smrs || [],
      auditLog:      auditLog || [],
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `simpleaml-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    toast('Export downloaded');
  } catch (err) {
    toast('Export failed. Please try again.', 'err');
    console.error(err);
  }
};

window.exportIndividualsCSV = function() {
  const individuals = S.individuals || [];

  const headers = [
    'Individual ID',
    'Full name',
    'Date of birth',
    'Address',
    'Email',
    'Phone',
    'Created',
    'Updated'
  ];

  const rows = individuals.map(i => [
    i.individualId || '',
    i.fullName || '',
    i.dateOfBirth || '',
    i.address || '',
    i.email || '',
    i.phone || '',
    i.createdAt || '',
    i.updatedAt || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));

  const csv = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `simpleaml-individuals-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();

  URL.revokeObjectURL(url);
  toast('CSV downloaded');
};
