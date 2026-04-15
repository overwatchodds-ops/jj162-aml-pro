import { getAuth, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app as firebaseApp } from '../../firebase/config.js';

export function screen() {
  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">Reset your password</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-5);">Enter your email and we'll send you a reset link.</p>

      <div class="form-row">
        <label class="label">Email</label>
        <input id="reset-email" type="email" class="inp" placeholder="you@firm.com.au" autocomplete="email">
      </div>

      <div id="reset-error"   class="banner banner-danger"  style="display:none;margin-bottom:var(--space-3);"></div>
      <div id="reset-success" class="banner banner-success" style="display:none;margin-bottom:var(--space-3);"></div>

      <button onclick="doReset()" class="btn btn-full" style="margin-bottom:var(--space-4);">Send reset link</button>

      <p style="text-align:center;font-size:var(--font-size-xs);color:var(--color-text-muted);">
        <button onclick="go('login')" class="btn-ghost" style="padding:0;color:var(--color-primary);font-size:var(--font-size-xs);">← Back to sign in</button>
      </p>
    </div>`;
}

window.doReset = async function() {
  const email   = document.getElementById('reset-email')?.value?.trim();
  const errEl   = document.getElementById('reset-error');
  const succEl  = document.getElementById('reset-success');

  errEl.style.display  = 'none';
  succEl.style.display = 'none';

  if (!email) {
    errEl.textContent = 'Please enter your email address.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const auth = getAuth(firebaseApp);
    await sendPasswordResetEmail(auth, email);
    succEl.textContent = 'Reset link sent. Check your email inbox.';
    succEl.style.display = 'block';
  } catch (err) {
    errEl.textContent = err.code === 'auth/user-not-found'
      ? 'No account found with that email address.'
      : 'Failed to send reset link. Please try again.';
    errEl.style.display = 'block';
  }
};
