import { S }                  from '../state/index.js';
import { updateFirmProfile }  from '../firebase/firestore.js';

const today = new Date().toISOString().split('T')[0];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : '—';
}

// Get the principal's name from individuals linked to the firm
function principalName() {
  const principal = (S.individuals || []).find(i =>
    i.role === 'Principal' || i.role === 'Principal / Managing Partner' || i.role === 'owner'
  );
  return principal?.fullName || principal?.name || '';
}

export function screen() {
  const appt    = S.firm?.appointments || {};
  const defName = principalName();

  const ROLES = [
    {
      key:      'amlco',
      title:    'AML/CTF Compliance Officer (AMLCO)',
      desc:     'Primary regulatory liaison. Responsible for your firm\'s AML/CTF compliance program.',
      required: true,
    },
    {
      key:      'reporting',
      title:    'Reporting Officer',
      desc:     'Responsible for filing Suspicious Matter Reports (SMRs) with AUSTRAC.',
      required: true,
    },
    {
      key:      'senior',
      title:    'Senior Manager',
      desc:     'Must formally approve the AML/CTF Program.',
      required: true,
    },
    {
      key:      'principal',
      title:    'Principal / Managing Partner',
      desc:     'Overall firm-level accountability for AML/CTF obligations.',
      required: true,
    },
    {
      key:      'delegate',
      title:    'Delegate',
      desc:     'Optional. For larger firms where compliance tasks are formally delegated.',
      required: false,
    },
  ];

  const requiredKeys = ROLES.filter(r => r.required).map(r => r.key);
  const isComplete   = requiredKeys.every(k => appt[k]?.name && appt[k]?.date);

  return `<div style="max-width:680px;">

    <!-- HEADER -->
    <div style="margin-bottom:24px;">
      <h1 style="font-size:20px;font-weight:500;color:#0f172a;margin-bottom:3px;">Appointments</h1>
      <p style="font-size:13px;color:#64748b;">Record who holds each AML/CTF governance role at your firm. For sole practitioners, all roles default to you — adjust only if responsibilities are shared.</p>
    </div>

    <!-- INFO BANNER -->
    <div class="banner banner-info" style="margin-bottom:var(--space-4);">
      <div class="banner-title">Why this matters</div>
      AUSTRAC requires every reporting entity to formally designate who holds each compliance role.
      Even if one person holds every role, each must be recorded separately.
      These names appear in your AML/CTF Program approval and compliance reports.
    </div>

    <!-- ROLE CARDS -->
    ${ROLES.map(({ key, title, desc, required }) => {
      const val    = appt[key] || {};
      const name   = val.name || defName;
      const date   = val.date || today;
      const filled = !!(val.name && val.date);

      return `
      <div style="background:var(--color-surface);border:0.5px solid ${filled ? 'var(--color-border)' : required ? '#fecaca' : 'var(--color-border)'};border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);">${title}</div>
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
            <label class="label${required ? ' label-required' : ''}">Full name</label>
            <input id="appt-${key}-name" type="text" class="inp" value="${name}" placeholder="Full legal name">
          </div>
          <div class="form-row" style="margin:0;">
            <label class="label${required ? ' label-required' : ''}">Date appointed</label>
            <input id="appt-${key}-date" type="date" class="inp" value="${date}">
          </div>
        </div>
      </div>`;
    }).join('')}

    <!-- NEXT REVIEW -->
    <div style="background:var(--color-surface);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-5);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
        <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);">Next review date</span>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">AUSTRAC expects annual review</span>
      </div>
      <input id="appt-next-review" type="date" class="inp" value="${appt.nextReview || ''}">
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-2);">Leave blank to auto-set to 12 months from today.</p>
    </div>

    <div id="appt-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

    <button onclick="saveAppointments()" class="btn btn-full">Save &amp; continue to Designated Services →</button>

  </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.saveAppointments = async function() {
  const errEl = document.getElementById('appt-error');
  if (errEl) errEl.style.display = 'none';

  const requiredRoles = [
    ['amlco',     'AML/CTF Compliance Officer'],
    ['reporting', 'Reporting Officer'],
    ['senior',    'Senior Manager'],
    ['principal', 'Principal / Managing Partner'],
  ];

  for (const [key, label] of requiredRoles) {
    const name = document.getElementById(`appt-${key}-name`)?.value?.trim();
    const date = document.getElementById(`appt-${key}-date`)?.value;
    if (!name) { showErr(errEl, `${label}: name is required.`); return; }
    if (!date) { showErr(errEl, `${label}: date appointed is required.`); return; }
  }

  const appointments = {};
  ['amlco','reporting','senior','principal','delegate'].forEach(k => {
    appointments[k] = {
      name: document.getElementById(`appt-${k}-name`)?.value?.trim() || '',
      date: document.getElementById(`appt-${k}-date`)?.value || '',
    };
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
    go('firm-profile-edit', { tab: 'services' });
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
