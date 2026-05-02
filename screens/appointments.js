// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
// First time: auto-assigns all roles to the owner and saves silently.
// Subsequent edits: shows dropdown screen to reassign roles to any staff member.

import { S }                 from '../state/index.js';
import { updateFirmProfile } from '../firebase/firestore.js';

const today = new Date().toISOString().split('T')[0];

function getOwner() {
  // Find the owner — the individual matching the current user
  return (S.individuals || []).find(i =>
    i.individualId === S.individualId
  ) || (S.individuals || []).find(i =>
    i.isStaff === true && i.firmId === S.firmId
  ) || null;
}

function getStaff() {
  return (S.individuals || []).filter(i => i.isStaff === true && i.firmId === S.firmId);
}

const ROLES = [
  { key: 'amlco',     title: 'AML/CTF Compliance Officer (AMLCO)',  desc: 'Primary regulatory liaison. Responsible for your firm\'s AML/CTF compliance program.', required: true  },
  { key: 'reporting', title: 'Reporting Officer',                    desc: 'Responsible for filing Suspicious Matter Reports (SMRs) with AUSTRAC.',               required: true  },
  { key: 'senior',    title: 'Senior Manager',                       desc: 'Must formally approve the AML/CTF Program.',                                          required: true  },
  { key: 'principal', title: 'Principal / Managing Partner',         desc: 'Overall firm-level accountability for AML/CTF obligations.',                          required: true  },
  { key: 'delegate',  title: 'Delegate',                             desc: 'Optional. For larger firms where compliance tasks are formally delegated.',            required: false },
];

// ─── AUTO SAVE (first time) ───────────────────────────────────────────────────
export async function autoSaveAppointments() {
  const owner = getOwner();
  if (!owner) return; // safety — should never happen

  const appointments = {};
  ROLES.forEach(({ key }) => {
    appointments[key] = {
      individualId: owner.individualId,
      name:         owner.fullName,
      date:         today,
    };
  });

  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  appointments.nextReview = d.toISOString().split('T')[0];
  appointments.savedDate  = today;

  await updateFirmProfile(S.firmId, { appointments });
  S.firm.appointments = appointments;
}

// ─── SCREEN (edit mode only) ──────────────────────────────────────────────────
export function screen() {
  const appt = S.firm?.appointments || {};
  const staff = getStaff();

  // If no appointments saved yet — auto save and move on
  if (!appt.savedDate) {
    autoSaveAppointments().then(() => {
      go('firm-profile-edit', { tab: 'services' });
    });
    return `<div class="empty-state"><div class="empty-state-title">Setting up appointments...</div></div>`;
  }

  // Edit mode — show dropdown screen
  return `<div style="max-width:680px;">

    <div style="margin-bottom:24px;">
      <h1 style="font-size:20px;font-weight:500;color:#0f172a;margin-bottom:3px;">Appointments</h1>
      <p style="font-size:13px;color:#64748b;">Reassign AML/CTF governance roles to staff members. To add a new person, add them in Staff first.</p>
    </div>

    <div class="banner banner-info" style="margin-bottom:var(--space-4);">
      <div class="banner-title">Why this matters</div>
      AUSTRAC requires every reporting entity to formally designate who holds each compliance role.
      Even if one person holds every role, each must be recorded separately.
    </div>

    ${ROLES.map(({ key, title, desc, required }) => {
      const val    = appt[key] || {};
      const indId  = val.individualId || '';
      const date   = val.date || today;
      const filled = !!(val.name && val.date);

      const staffOptions = staff.map(i =>
        `<option value="${i.individualId}|${i.fullName}" ${indId === i.individualId ? 'selected' : ''}>${i.fullName}</option>`
      ).join('');

      return `
      <div style="background:var(--color-surface);border:0.5px solid ${filled ? 'var(--color-border)' : required ? '#fecaca' : 'var(--color-border)'};border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">${title}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">${desc}</div>
          </div>
          ${required
            ? filled
              ? `<span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:99px;background:#f0fdf4;color:#166534;white-space:nowrap;flex-shrink:0;margin-left:var(--space-3);">✓ Done</span>`
              : `<span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:99px;background:#fef2f2;color:#991b1b;white-space:nowrap;flex-shrink:0;margin-left:var(--space-3);">Required</span>`
            : `<span style="font-size:10px;color:var(--color-text-muted);white-space:nowrap;flex-shrink:0;margin-left:var(--space-3);">Optional</span>`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          <div class="form-row" style="margin:0;">
            <label class="label${required ? ' label-required' : ''}">Staff member</label>
            <select id="appt-${key}-individual" class="inp">
              <option value="">Select...</option>
              ${staffOptions}
            </select>
          </div>
          <div class="form-row" style="margin:0;">
            <label class="label${required ? ' label-required' : ''}">Date appointed</label>
            <input id="appt-${key}-date" type="date" class="inp" value="${date}">
          </div>
        </div>
      </div>`;
    }).join('')}

    <div style="background:var(--color-surface);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-5);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
        <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">Next review date</span>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">AUSTRAC expects annual review</span>
      </div>
      <input id="appt-next-review" type="date" class="inp" value="${appt.nextReview || ''}">
    </div>

    <div id="appt-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

    <button onclick="saveAppointments()" class="btn btn-full">Save appointments →</button>

  </div>`;
}

// ─── SAVE (edit mode) ─────────────────────────────────────────────────────────
window.saveAppointments = async function() {
  const errEl = document.getElementById('appt-error');
  if (errEl) errEl.style.display = 'none';

  // Principal is the only truly required role
  const principalVal  = document.getElementById('appt-principal-individual')?.value;
  const principalDate = document.getElementById('appt-principal-date')?.value;
  if (!principalVal)  { showErr(errEl, 'Principal / Managing Partner: please select a staff member.'); return; }
  if (!principalDate) { showErr(errEl, 'Principal / Managing Partner: date appointed is required.'); return; }

  const today = new Date().toISOString().split('T')[0];

  const appointments = {};
  ['amlco','reporting','senior','principal','delegate'].forEach(k => {
    const val  = document.getElementById(`appt-${k}-individual`)?.value || '';
    const date = document.getElementById(`appt-${k}-date`)?.value || '';
    // Required roles fall back to Principal if left blank
    const isRequired = ['amlco','reporting','senior','principal'].includes(k);
    const resolvedVal  = val  || (isRequired ? principalVal  : '');
    const resolvedDate = date || (isRequired ? principalDate : '');
    if (!resolvedVal) return; // delegate is optional — skip if empty
    const [individualId, ...nameParts] = resolvedVal.split('|');
    appointments[k] = { individualId, name: nameParts.join('|'), date: resolvedDate };
  });

  const reviewEl = document.getElementById('appt-next-review');
  if (reviewEl?.value) {
    appointments.nextReview = reviewEl.value;
  } else {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    appointments.nextReview = d.toISOString().split('T')[0];
  }
  appointments.savedDate = today;

  try {
    await updateFirmProfile(S.firmId, { appointments });
    S.firm.appointments = appointments;
    window.toast('Appointments saved');
    go('firm-profile');
  } catch (e) {
    showErr(errEl, 'Failed to save. Please try again.');
    console.error(e);
  }
};

function showErr(el, msg) {
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}
