import { S }       from '../../state/index.js';
import { getFirmAuditLog } from '../../firebase/firestore.js';

export function screen() {
  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Backup & export</h1>
          <p class="screen-subtitle">Export your complete compliance records for offline storage or migration.</p>
        </div>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        Your data is stored securely in Firestore and synced in real time. This export is an additional safeguard — we recommend generating a backup annually and storing it in your firm's document system.
      </div>

      <!-- Export all data -->
      <div class="card">
        <div class="section-heading">Export all data</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4);">Download a complete JSON export of your firm's compliance data — individuals, entities, links, and evidence records. This file can be used to restore your data or migrate to another system.</p>
        <button onclick="exportAllData()" class="btn-sec btn-sm">Download JSON export</button>
      </div>

      <!-- Export CSV -->
      <div class="card">
        <div class="section-heading">Export individuals (CSV)</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4);">Download your individuals register as a CSV file — compatible with Excel and Google Sheets.</p>
        <button onclick="exportIndividualsCSV()" class="btn-sec btn-sm">Download CSV</button>
      </div>

      <!-- Free app migration -->
      <div class="card">
        <div class="section-heading">Free app data import</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4);">If you used the SimpleAML free app before upgrading, you can import your existing data here. This will add your free app records to your Pro account — existing Pro data will not be overwritten.</p>
        <div class="banner banner-warning" style="margin-bottom:var(--space-3);">
          Important: Import your free app backup file (.json) downloaded from the free app's backup screen. Only import once — duplicate records will be created if imported multiple times.
        </div>
        <label class="btn-sec btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:var(--space-2);">
          <input type="file" accept=".json" onchange="importFreeAppData(this)" style="display:none;">
          Import free app backup (.json)
        </label>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.exportAllData = async function() {
  try {
    const auditLog = await getFirmAuditLog(S.firmId, 10000);
    const exportData = {
      exportDate:   new Date().toISOString(),
      firmId:       S.firmId,
      firm:         S.firm,
      individuals:  S.individuals,
      entities:     S.entities,
      links:        S.links,
      verifications:S.verifications || [],
      screenings:   S.screenings    || [],
      training:     S.training      || [],
      vetting:      S.vetting       || [],
      smrs:         S.smrs          || [],
      auditLog,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
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
  const headers = ['Individual ID','Full name','Date of birth','Address','Email','Phone','Created','Updated'];
  const rows = individuals.map(i => [
    i.individualId,
    i.fullName      || '',
    i.dateOfBirth   || '',
    i.address       || '',
    i.email         || '',
    i.phone         || '',
    i.createdAt     || '',
    i.updatedAt     || '',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`));

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `simpleaml-individuals-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV downloaded');
};

window.importFreeAppData = function(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // Free app stores data under 'saml_v2' key
      const freeAppData = data.saml_v2 ? JSON.parse(data.saml_v2) : data;

      // Basic validation
      if (!freeAppData.firm && !freeAppData.clients) {
        toast('Invalid backup file — does not appear to be a SimpleAML free app backup.', 'err');
        return;
      }

      toast('Import feature coming soon. Your Pro data is safe.');
      // Full migration logic is a Pro v2 feature
      // It requires mapping the flat free app structure to the new entity/individual model
    } catch (err) {
      toast('Import failed — file may be corrupted.', 'err');
    }
  };
  reader.readAsText(file);
};
