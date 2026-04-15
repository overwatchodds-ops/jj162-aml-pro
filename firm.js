import { S, save } from '../../state/index.js';

export function screen() {
  const f = S._onboardingFirm || {};

  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">Tell us about your firm</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-5);">This becomes your firm profile — the reporting entity for AUSTRAC purposes.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Firm / practice name</label>
          <input id="ob-firm-name" type="text" class="inp" value="${f.name||''}" placeholder="e.g. Wong & Associates">
        </div>

        <div class="form-row">
          <label class="label label-required">ABN</label>
          <input id="ob-firm-abn" type="text" class="inp" value="${f.abn||''}" placeholder="12 345 678 901">
        </div>

        <div class="form-row">
          <label class="label">ACN <span style="font-size:10px;color:var(--color-text-muted);">(if incorporated)</span></label>
          <input id="ob-firm-acn" type="text" class="inp" value="${f.acn||''}" placeholder="123 456 789">
        </div>

        <div class="form-row">
          <label class="label label-required">Registered address</label>
          <input id="ob-firm-address" type="text" class="inp" value="${f.address||''}" placeholder="123 Main St, Sydney NSW 2000">
        </div>

        <div class="form-row">
          <label class="label">Phone</label>
          <input id="ob-firm-phone" type="tel" class="inp" value="${f.phone||''}" placeholder="02 9999 0000">
        </div>

        <div class="form-row">
          <label class="label">Firm email</label>
          <input id="ob-firm-email" type="email" class="inp" value="${f.email || (S.user?.email||'')}" placeholder="admin@firm.com.au">
        </div>

      </div>

      <div id="ob-firm-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <button onclick="obFirmNext()" class="btn btn-full" style="margin-top:var(--space-5);">Continue →</button>
    </div>`;
}

window.obFirmNext = function() {
  const name    = document.getElementById('ob-firm-name')?.value?.trim();
  const abn     = document.getElementById('ob-firm-abn')?.value?.trim();
  const address = document.getElementById('ob-firm-address')?.value?.trim();
  const errEl   = document.getElementById('ob-firm-error');

  errEl.style.display = 'none';

  if (!name)    { showErr(errEl, 'Firm name is required.'); return; }
  if (!abn)     { showErr(errEl, 'ABN is required.'); return; }
  if (!address) { showErr(errEl, 'Registered address is required.'); return; }

  S._onboardingFirm = {
    name,
    abn,
    acn:     document.getElementById('ob-firm-acn')?.value?.trim()    || '',
    address,
    phone:   document.getElementById('ob-firm-phone')?.value?.trim()  || '',
    email:   document.getElementById('ob-firm-email')?.value?.trim()  || '',
  };

  save();
  go('onboarding-individual');
};

function showErr(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}
