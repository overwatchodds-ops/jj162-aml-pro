import { S } from '../../state/index.js';

// Legacy compatibility wrapper.
// The live Staff add/edit flow is now handled in screens/individuals/new.js.
// This file is kept only so nobody accidentally uses outdated identity logic.

function esc(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderIdentityTab() {
  const d = S._draft || {};

  return `
    <div class="card">
      <div class="section-heading">Identity</div>
      <p class="screen-subtitle mb-4">
        This tab is now driven by <strong>screens/individuals/new.js</strong>.
        Keep any future staff identity changes there to avoid duplicate logic.
      </p>

      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name *</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.fullName || '')}"
            oninput="updateDraft('fullName', this.value)"
          >
        </div>

        <div class="form-row span-2">
          <label class="label label-required">Job title / role *</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.role || '')}"
            oninput="updateDraft('role', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Date of birth</label>
          <input
            type="date"
            class="inp"
            value="${esc(d.dateOfBirth || '')}"
            oninput="updateDraft('dateOfBirth', this.value)"
          >
        </div>

        <div class="form-row span-2">
          <label class="label">Residential address</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.address || '')}"
            oninput="updateDraft('address', this.value)"
            placeholder="12 Main St, Sydney NSW 2000"
          >
        </div>

        <div class="form-row">
          <label class="label">Email</label>
          <input
            type="email"
            class="inp"
            value="${esc(d.email || '')}"
            oninput="updateDraft('email', this.value)"
          >
        </div>

        <div class="form-row">
          <label class="label">Phone</label>
          <input
            type="text"
            class="inp"
            value="${esc(d.phone || '')}"
            oninput="updateDraft('phone', this.value)"
          >
        </div>

        <div class="form-row span-2">
          <label class="label">Notes</label>
          <textarea
            class="inp"
            rows="4"
            oninput="updateDraft('notes', this.value)"
            placeholder="Any additional notes..."
          >${esc(d.notes || '')}</textarea>
        </div>
      </div>
    </div>`;
}

export async function handleIdentitySave() {
  const d = S._draft || {};

  if (!d.fullName || !d.role) {
    if (window.toast) window.toast('Full legal name and job title / role are required.', 'err');
    return false;
  }

  // Do not save partial staff records from this legacy file.
  // The source of truth save flow is now in screens/individuals/new.js.
  return true;
}
