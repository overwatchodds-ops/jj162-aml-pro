import { S } from '../../state/index.js';

// Legacy compatibility wrapper.
// The live Staff add/edit flow is now handled in screens/individuals/new.js.
// This file is kept only so nobody accidentally edits outdated vetting logic.

function esc(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function vettingRequired(classification) {
  return classification === 'key';
}

export function renderVettingTab() {
  const d = S._draft || {};
  const classification = d.staffClassification || 'none';

  if (!vettingRequired(classification)) {
    return `
      <div class="card empty-state">
        <div class="empty-state-title">No Additional Vetting Required</div>
        <p>Police and bankruptcy checks are only required for Key Personnel.</p>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-heading">Vetting</div>
      <p class="screen-subtitle mb-4">
        This tab is now driven by <strong>screens/individuals/new.js</strong>.
        Keep future staff vetting changes there to avoid duplicate logic.
      </p>

      <div class="form-grid mb-4">
        <div class="form-row">
          <label class="label">Police check date</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.policeCheckDate || '')}"
            oninput="updateDraft('policeCheckDate', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Police check result</label>
          <select class="inp" onchange="updateDraft('policeCheckResult', this.value)">
            <option value="">Select...</option>
            <option value="Pass" ${d.policeCheckResult === 'Pass' ? 'selected' : ''}>Pass</option>
            <option value="Review required" ${d.policeCheckResult === 'Review required' ? 'selected' : ''}>Review required</option>
          </select>
        </div>

        <div class="form-row span-2">
          <label class="label">Police check reference</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.policeCheckRef || '')}"
            oninput="updateDraft('policeCheckRef', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Bankruptcy check date</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.bankruptcyCheckDate || '')}"
            oninput="updateDraft('bankruptcyCheckDate', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Bankruptcy check result</label>
          <select class="inp" onchange="updateDraft('bankruptcyCheckResult', this.value)">
            <option value="">Select...</option>
            <option value="Clear" ${d.bankruptcyCheckResult === 'Clear' ? 'selected' : ''}>Clear</option>
            <option value="Record found" ${d.bankruptcyCheckResult === 'Record found' ? 'selected' : ''}>Record found</option>
          </select>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section-heading">Annual declaration</div>
      <div class="form-grid">
        <div class="form-row">
          <label class="label">Declaration signed date</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.declDate || '')}"
            oninput="updateDraft('declDate', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Next declaration due</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.declNext || '')}"
            oninput="updateDraft('declNext', this.value)"
          >
        </div>

        <div class="form-row span-2">
          <label style="display:flex;align-items:center;gap:10px;font-size:var(--font-size-sm);color:var(--color-text-primary);">
            <input
              type="checkbox"
              ${d.declSigned ? 'checked' : ''}
              onchange="updateDraft('declSigned', this.checked)"
            >
            Declaration signed
          </label>
        </div>
      </div>
    </div>`;
}
