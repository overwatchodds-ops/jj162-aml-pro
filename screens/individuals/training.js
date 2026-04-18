import { S } from '../../state/index.js';

// Legacy compatibility wrapper.
// The live Staff add/edit flow is now handled in screens/individuals/new.js.
// This file is kept only so nobody accidentally edits outdated training logic.

function esc(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function screeningRequired(classification) {
  return classification === 'key' || classification === 'standard';
}

function trainingRequired(classification) {
  return classification === 'key' || classification === 'standard';
}

export function renderTrainingTab() {
  const d = S._draft || {};
  const classification = d.staffClassification || 'none';

  if (!trainingRequired(classification)) {
    return `
      <div class="card empty-state">
        <div class="empty-state-title">No Training Required</div>
        <p>This staff member has no AML/CTF functions requiring training evidence.</p>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-heading">Training</div>
      <p class="screen-subtitle mb-4">
        This tab is now driven by <strong>screens/individuals/new.js</strong>.
        Keep future staff training changes there to avoid duplicate logic.
      </p>

      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label">Training provider</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.trainingProvider || '')}"
            placeholder="e.g. CPA Australia, internal"
            oninput="updateDraft('trainingProvider', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Completed date</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.trainingCompletedDate || '')}"
            oninput="updateDraft('trainingCompletedDate', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Expiry date</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.trainingExpiryDate || '')}"
            oninput="updateDraft('trainingExpiryDate', this.value)"
          >
        </div>

        <div class="form-row span-2">
          <label class="label">Training type</label>
          <select class="inp" onchange="updateDraft('trainingType', this.value)">
            <option value="standard" ${d.trainingType === 'standard' ? 'selected' : ''}>Standard AML/CTF Awareness</option>
            <option value="enhanced" ${d.trainingType === 'enhanced' ? 'selected' : ''}>Enhanced (Key Personnel / AMLCO)</option>
          </select>
        </div>

        <div class="form-row span-2">
          <label class="label">Certificate link</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.trainingCertificateLink || '')}"
            placeholder="Optional URL"
            oninput="updateDraft('trainingCertificateLink', this.value)"
          >
        </div>
      </div>
    </div>`;
}

export async function handleFinalSave() {
  // Do not save staff records from this legacy file.
  // The source of truth save flow is now in screens/individuals/new.js.
  return true;
}
