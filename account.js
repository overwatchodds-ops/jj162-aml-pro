import { S }       from '../../state/index.js';
import { getAuth, updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app as firebaseApp } from '../../firebase/config.js';

export function screen() {
  const user = S.user || {};
  const ind  = S.individuals?.find(i => i.individualId === S.individualId) || {};

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Account</h1>
          <p class="screen-subtitle">Your personal account settings.</p>
        </div>
      </div>

      <!-- Profile -->
      <div class="card">
        <div class="section-heading">Your profile</div>
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);">
          <div class="avatar" style="width:48px;height:48px;font-size:var(--font-size-lg);">
            ${(ind.fullName||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?'}
          </div>
          <div>
            <div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-medium);">${ind.fullName || '—'}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${user.email || '—'}</div>
          </div>
        </div>
        <button onclick="go('individual-edit',{individualId:'${S.individualId}'})" class="btn-sec btn-sm">Edit your individual record →</button>
      </div>

      <!-- Change email -->
      <div class="card">
        <div class="section-heading">Change email</div>
        <div class="form-row">
          <label class="label">Current password</label>
          <input id="email-password" type="password" class="inp" placeholder="Required to change email">
        </div>
        <div class="form-row">
          <label class="label">New email address</label>
          <input id="email-new" type="email" class="inp" placeholder="new@firm.com.au">
        </div>
        <div id="email-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
        <div id="email-success" class="banner banner-success" style="display:none;margin-top:var(--space-3);"></div>
        <button onclick="changeEmail()" class="btn-sec btn-sm" style="margin-top:var(--space-3);">Update email</button>
      </div>

      <!-- Change password -->
      <div class="card">
        <div class="section-heading">Change password</div>
        <div class="form-row">
          <label class="label">Current password</label>
          <input id="pw-current" type="password" class="inp" placeholder="Current password">
        </div>
        <div class="form-row">
          <label class="label">New password</label>
          <input id="pw-new" type="password" class="inp" placeholder="At least 8 characters">
        </div>
        <div class="form-row">
          <label class="label">Confirm new password</label>
          <input id="pw-confirm" type="password" class="inp" placeholder="Repeat new password">
        </div>
        <div id="pw-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
        <div id="pw-success" class="banner banner-success" style="display:none;margin-top:var(--space-3);"></div>
        <button onclick="changePassword()" class="btn-sec btn-sm" style="margin-top:var(--space-3);">Update password</button>
      </div>

      <!-- Sign out -->
      <div class="card">
        <div class="section-heading">Session</div>
        <button onclick="signOut()" class="btn-danger btn-sm">Sign out</button>
      </div>

    </div>`;
}

window.changeEmail = async function() {
  const password = document.getElementById('email-password')?.value;
  const newEmail = document.getElementById('email-new')?.value?.trim();
  const errEl    = document.getElementById('email-error');
  const succEl   = document.getElementById('email-success');
  errEl.style.display  = 'none';
  succEl.style.display = 'none';

  if (!password || !newEmail) { errEl.textContent='All fields required.'; errEl.style.display='block'; return; }

  try {
    const auth       = getAuth(firebaseApp);
    const user       = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await updateEmail(user, newEmail);
    S.user = { ...S.user, email: newEmail };
    succEl.textContent = 'Email updated successfully.';
    succEl.style.display = 'block';
  } catch (err) {
    errEl.textContent = err.code === 'auth/wrong-password' ? 'Incorrect current password.' : 'Failed to update email.';
    errEl.style.display = 'block';
  }
};

window.changePassword = async function() {
  const current = document.getElementById('pw-current')?.value;
  const newPw   = document.getElementById('pw-new')?.value;
  const confirm = document.getElementById('pw-confirm')?.value;
  const errEl   = document.getElementById('pw-error');
  const succEl  = document.getElementById('pw-success');
  errEl.style.display  = 'none';
  succEl.style.display = 'none';

  if (!current || !newPw)  { errEl.textContent='All fields required.'; errEl.style.display='block'; return; }
  if (newPw.length < 8)   { errEl.textContent='New password must be at least 8 characters.'; errEl.style.display='block'; return; }
  if (newPw !== confirm)  { errEl.textContent='Passwords do not match.'; errEl.style.display='block'; return; }

  try {
    const auth       = getAuth(firebaseApp);
    const user       = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, current);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPw);
    succEl.textContent = 'Password updated successfully.';
    succEl.style.display = 'block';
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value     = '';
    document.getElementById('pw-confirm').value = '';
  } catch (err) {
    errEl.textContent = err.code === 'auth/wrong-password' ? 'Incorrect current password.' : 'Failed to update password.';
    errEl.style.display = 'block';
  }
};
