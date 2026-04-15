import { S, save } from '../../state/index.js';

export function screen() {
  const d = S._onboardingIndividual || {};

  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">Your details</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-5);">As the firm's principal, you'll be the first person in your compliance register. You can complete your full vetting record later under Staff Vetting.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Full legal name</label>
          <input id="ob-ind-name" type="text" class="inp" value="${d.name || ''}" placeholder="Jane Elizabeth Smith">
        </div>

        <div class="form-row">
          <label class="label">Your role at the firm</label>
          <div class="inp" style="background:var(--color-surface-alt);color:var(--color-text-muted);cursor:default;">Principal / Managing Partner</div>
        </div>

        <div class="form-row">
          <label class="label label-required">Email</label>
          <input id="ob-ind-email" type="email" class="inp" value="${d.email || S.user?.email || ''}" placeholder="jane@firm.com.au">
        </div>

        <div class="form-row">
          <label class="label">Mobile</label>
          <input id="ob-ind-phone" type="tel" class="inp" value="${d.phone||''}" placeholder="0412 345 678">
        </div>

      </div>

      <div id="ob-ind-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('onboarding-firm')" class="btn-sec" style="flex:1;">← Back</button>
        <button onclick="obIndNext()" class="btn" style="flex:2;">Continue →</button>
      </div>
    </div>`;
}

window.obIndNext = function() {
  const name  = document.getElementById('ob-ind-name')?.value?.trim();
  const email = document.getElementById('ob-ind-email')?.value?.trim();
  const errEl = document.getElementById('ob-ind-error');

  errEl.style.display = 'none';

  if (!name)  { showErr(errEl, 'Full legal name is required.'); return; }
  if (!email) { showErr(errEl, 'Email is required.'); return; }

  S._onboardingIndividual = {
    name,
    role:  'Principal',
    email,
    phone: document.getElementById('ob-ind-phone')?.value?.trim() || '',
  };

  save();
  go('onboarding-complete');
};

function showErr(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}
