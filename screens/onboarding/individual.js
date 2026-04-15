import { S, save } from '../../state/index.js';

export function screen() {
  const d = S._onboardingIndividual || {};
  const userName = S.user?.displayName || window._signupName || '';

  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">Your details</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-3);">As the firm owner, you are the first individual in your compliance register. Your record needs to be complete before you can use SimpleAML Pro fully.</p>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        <div class="banner-title">Why do we need this?</div>
        As a firm owner (Key Personnel), AUSTRAC requires you to be vetted — ID verified, screened, police checked, and trained. You can complete the outstanding items after setup.
      </div>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Full legal name</label>
          <input id="ob-ind-name" type="text" class="inp" value="${d.name || userName}" placeholder="Jane Elizabeth Smith">
        </div>

        <div class="form-row">
          <label class="label label-required">Date of birth</label>
          <input id="ob-ind-dob" type="date" class="inp" value="${d.dob||''}">
        </div>

        <div class="form-row">
          <label class="label label-required">Residential address</label>
          <input id="ob-ind-address" type="text" class="inp" value="${d.address||''}" placeholder="12 Main St, Sydney NSW 2000">
        </div>

        <div class="form-row">
          <label class="label">Mobile</label>
          <input id="ob-ind-phone" type="tel" class="inp" value="${d.phone||''}" placeholder="0412 345 678">
        </div>

        <div class="form-row">
          <label class="label label-required">Your role at the firm</label>
          <select id="ob-ind-role" class="inp">
            <option value="owner"          ${(d.role||'owner')==='owner'         ?'selected':''}>Owner / Principal</option>
            <option value="amlco"          ${d.role==='amlco'          ?'selected':''}>AMLCO</option>
            <option value="senior_manager" ${d.role==='senior_manager' ?'selected':''}>Senior Manager</option>
          </select>
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
  const name    = document.getElementById('ob-ind-name')?.value?.trim();
  const dob     = document.getElementById('ob-ind-dob')?.value;
  const address = document.getElementById('ob-ind-address')?.value?.trim();
  const errEl   = document.getElementById('ob-ind-error');

  errEl.style.display = 'none';

  if (!name)    { showErr(errEl, 'Full legal name is required.'); return; }
  if (!dob)     { showErr(errEl, 'Date of birth is required.'); return; }
  if (!address) { showErr(errEl, 'Residential address is required.'); return; }

  S._onboardingIndividual = {
    name,
    dob,
    address,
    phone: document.getElementById('ob-ind-phone')?.value?.trim() || '',
    role:  document.getElementById('ob-ind-role')?.value || 'owner',
  };

  save();
  go('onboarding-austrac');
};

function showErr(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}
