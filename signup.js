import { getAuth, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app as firebaseApp } from '../../firebase/config.js';

export function screen() {
  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">Create your account</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-5);">Start your SimpleAML Pro compliance register</p>

      <div class="form-row">
        <label class="label">Full name</label>
        <input id="signup-name" type="text" class="inp" placeholder="Jane Smith" autocomplete="name">
      </div>

      <div class="form-row">
        <label class="label">Email</label>
        <input id="signup-email" type="email" class="inp" placeholder="jane@firm.com.au" autocomplete="email">
      </div>

      <div class="form-row">
        <label class="label">Password</label>
        <input id="signup-password" type="password" class="inp" placeholder="At least 8 characters" autocomplete="new-password">
      </div>

      <div class="form-row" style="margin-bottom:var(--space-5);">
        <label class="label">Confirm password</label>
        <input id="signup-confirm" type="password" class="inp" placeholder="••••••••" autocomplete="new-password">
      </div>

      <div id="signup-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

      <button onclick="doSignup()" class="btn btn-full" style="margin-bottom:var(--space-3);">Create account</button>

      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
        <div style="flex:1;height:0.5px;background:var(--color-border);"></div>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">or</span>
        <div style="flex:1;height:0.5px;background:var(--color-border);"></div>
      </div>

      <button onclick="doGoogleSignup()" class="btn-sec btn-full" style="margin-bottom:var(--space-5);">
        <svg width="16" height="16" viewBox="0 0 24 24" style="flex-shrink:0;">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p style="text-align:center;font-size:var(--font-size-xs);color:var(--color-text-muted);">
        Already have an account?
        <button onclick="go('login')" class="btn-ghost" style="padding:0;color:var(--color-primary);font-size:var(--font-size-xs);">Sign in</button>
      </p>

      <p style="text-align:center;font-size:10px;color:var(--color-text-muted);margin-top:var(--space-4);line-height:var(--line-height-relaxed);">
        By creating an account you agree to our
        <a href="https://simpleaml.com.au/privacy-policy" target="_blank" style="color:var(--color-primary);">Privacy Policy</a>
        and
        <a href="https://simpleaml.com.au/disclaimer" target="_blank" style="color:var(--color-primary);">Terms of Use</a>.
      </p>
    </div>`;
}

window.doSignup = async function() {
  const name     = document.getElementById('signup-name')?.value?.trim();
  const email    = document.getElementById('signup-email')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;
  const confirm  = document.getElementById('signup-confirm')?.value;
  const errEl    = document.getElementById('signup-error');

  errEl.style.display = 'none';

  if (!name)                        { showErr(errEl, 'Full name is required.'); return; }
  if (!email)                       { showErr(errEl, 'Email is required.'); return; }
  if (!password)                    { showErr(errEl, 'Password is required.'); return; }
  if (password.length < 8)         { showErr(errEl, 'Password must be at least 8 characters.'); return; }
  if (password !== confirm)        { showErr(errEl, 'Passwords do not match.'); return; }

  try {
    const auth       = getAuth(firebaseApp);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    // Store name for onboarding pre-fill
    window._signupName = name;
    // onAuthStateChanged in app.html handles routing to onboarding
  } catch (err) {
    showErr(errEl, friendlyAuthError(err.code));
  }
};

window.doGoogleSignup = async function() {
  const errEl = document.getElementById('signup-error');
  try {
    errEl.style.display = 'none';
    const auth     = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    showErr(errEl, friendlyAuthError(err.code));
  }
};

function showErr(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':        return 'Please enter a valid email address.';
    case 'auth/weak-password':        return 'Password is too weak. Please use at least 8 characters.';
    case 'auth/network-request-failed': return 'Network error. Please check your connection.';
    default: return 'Account creation failed. Please try again.';
  }
}
