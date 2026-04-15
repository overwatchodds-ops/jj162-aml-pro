import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app as firebaseApp } from '../../firebase/config.js';

export function screen() {
  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">Sign in</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-5);">Welcome back to SimpleAML Pro</p>

      <div class="form-row">
        <label class="label">Email</label>
        <input id="login-email" type="email" class="inp" placeholder="you@firm.com.au" autocomplete="email">
      </div>

      <div class="form-row">
        <label class="label">Password</label>
        <input id="login-password" type="password" class="inp" placeholder="••••••••" autocomplete="current-password">
      </div>

      <div style="text-align:right;margin-bottom:var(--space-5);">
        <button onclick="go('forgot-password')" class="btn-ghost" style="padding:0;font-size:var(--font-size-xs);">Forgot password?</button>
      </div>

      <div id="login-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

      <button onclick="doLogin()" class="btn btn-full" style="margin-bottom:var(--space-3);">Sign in</button>

      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
        <div style="flex:1;height:0.5px;background:var(--color-border);"></div>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">or</span>
        <div style="flex:1;height:0.5px;background:var(--color-border);"></div>
      </div>

      <button onclick="doGoogleLogin()" class="btn-sec btn-full" style="margin-bottom:var(--space-5);">
        <svg width="16" height="16" viewBox="0 0 24 24" style="flex-shrink:0;">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p style="text-align:center;font-size:var(--font-size-xs);color:var(--color-text-muted);">
        Don't have an account?
        <button onclick="go('signup')" class="btn-ghost" style="padding:0;color:var(--color-primary);font-size:var(--font-size-xs);">Sign up</button>
      </p>
    </div>`;
}

window.doLogin = async function() {
  const email    = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  const errEl    = document.getElementById('login-error');

  if (!email || !password) {
    errEl.textContent = 'Email and password are required.';
    errEl.style.display = 'block';
    return;
  }

  try {
    errEl.style.display = 'none';
    const auth = getAuth(firebaseApp);
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged in app.html handles routing
  } catch (err) {
    errEl.textContent = friendlyAuthError(err.code);
    errEl.style.display = 'block';
  }
};

window.doGoogleLogin = async function() {
  const errEl = document.getElementById('login-error');
  try {
    errEl.style.display = 'none';
    const auth     = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    errEl.textContent = friendlyAuthError(err.code);
    errEl.style.display = 'block';
  }
};

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password. Please try again.';
    case 'auth/too-many-requests':  return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network error. Please check your connection.';
    default: return 'Sign in failed. Please try again.';
  }
}
