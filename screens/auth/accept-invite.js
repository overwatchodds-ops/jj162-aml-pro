// ─── ACCEPT INVITE ────────────────────────────────────────────────────────────
// Handles invite link flow: ?invite=inviteId
// Works for both unauthenticated users (create account) and
// already-authenticated users (join firm directly).
//
// Flow:
//   1. Load invite record from Firestore by inviteId
//   2. Validate: exists, pending, not expired
//   3. If user already authenticated → claim invite directly
//   4. If not authenticated → show signup form → create account → claim invite
//
// On claim:
//   - Write firm_users/{uid} record FIRST
//   - Link firm_users/{uid}.individualId to the EXISTING invited staff individual
//   - Update the existing individual record as staff
//   - Mark invite as claimed
//   - Write audit entry
//   - Route to dashboard

import {
  getInvite,
  claimInvite,
  saveFirmUser,
  getIndividual,
  saveIndividual,
  updateIndividual,
  saveAuditEntry,
} from '../../firebase/firestore.js';

import { S, load } from '../../state/index.js';

import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { app as firebaseApp } from '../../firebase/config.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export function screen() {
  const inviteId = S.currentParams?.inviteId;

  if (!inviteId) {
    return `
      <div class="card" style="text-align:center;">
        <h1 class="screen-title">Invalid invite</h1>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">
          This invite link is not valid. Please ask your firm owner to send a new invite.
        </p>
        <button onclick="go('login')" class="btn">Go to sign in</button>
      </div>`;
  }

  return `
    <div class="card" id="invite-container">
      <div id="invite-loading" style="text-align:center;padding:var(--space-6) 0;">
        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">Loading invite...</p>
      </div>
      <div id="invite-content" style="display:none;"></div>
      <div id="invite-error-state" style="display:none;text-align:center;">
        <h1 class="screen-title">Invite unavailable</h1>
        <p id="invite-error-msg" style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);"></p>
        <button onclick="go('login')" class="btn">Go to sign in</button>
      </div>
    </div>`;
}

// ─── INIT — called by app.html after screen renders ──────────────────────────

export async function init() {
  const inviteId = S.currentParams?.inviteId;
  if (!inviteId) return;

  try {
    const invite = await getInvite(inviteId);

    const loading  = document.getElementById('invite-loading');
    const content  = document.getElementById('invite-content');
    const errState = document.getElementById('invite-error-state');
    const errMsg   = document.getElementById('invite-error-msg');

    if (loading) loading.style.display = 'none';

    if (!invite) {
      errMsg.textContent = 'This invite link does not exist.';
      errState.style.display = 'block';
      return;
    }

    if (invite.status === 'claimed') {
      errMsg.textContent = 'This invite has already been used. Please sign in or ask your firm owner for a new invite.';
      errState.style.display = 'block';
      return;
    }

    if (invite.status === 'cancelled') {
      errMsg.textContent = 'This invite has been cancelled. Please ask your firm owner for a new invite.';
      errState.style.display = 'block';
      return;
    }

    if (invite.status !== 'pending') {
      errMsg.textContent = 'This invite is no longer available. Please ask your firm owner for a new invite.';
      errState.style.display = 'block';
      return;
    }

    if (!invite.firmId || !invite.individualId) {
      errMsg.textContent = 'This invite is missing required firm or staff details. Please ask your firm owner for a new invite.';
      errState.style.display = 'block';
      return;
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      errMsg.textContent = 'This invite has expired (invites are valid for 7 days). Please ask your firm owner to send a new invite.';
      errState.style.display = 'block';
      return;
    }

    S._pendingInvite = invite;

    if (S.user?.uid) {
      content.innerHTML = renderClaimDirect(invite);
      content.style.display = 'block';
      return;
    }

    content.innerHTML = renderSignupForm(invite);
    content.style.display = 'block';

  } catch (err) {
    console.error('Error loading invite:', err);
    const loading  = document.getElementById('invite-loading');
    const errState = document.getElementById('invite-error-state');
    const errMsg   = document.getElementById('invite-error-msg');

    if (loading) loading.style.display = 'none';
    if (errMsg) errMsg.textContent = 'Something went wrong loading this invite. Please try again.';
    if (errState) errState.style.display = 'block';
  }
}

// ─── RENDER HELPERS ───────────────────────────────────────────────────────────

function renderSignupForm(invite) {
  return `
    <div style="text-align:center;margin-bottom:var(--space-5);">
      <div style="width:48px;height:48px;background:var(--color-primary-light);border-radius:50%;
                  display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-3);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="9" cy="7" r="4" stroke="var(--color-primary)" stroke-width="2"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h1 class="screen-title" style="margin-bottom:var(--space-1);">You're invited</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);">
        <strong>${invite.invitedByName || 'Your firm owner'}</strong> has invited you to join
        <strong>${invite.firmName || 'their firm'}</strong> on SimpleAML Pro.
      </p>
    </div>

    <div class="form-row">
      <label class="label">Full name</label>
      <input id="ai-name" type="text" class="inp" value="${invite.displayName || ''}" placeholder="Jane Smith">
    </div>
    <div class="form-row">
      <label class="label">Email</label>
      <input id="ai-email" type="email" class="inp" value="${invite.email || ''}" placeholder="jane@firm.com.au"
             ${invite.email ? 'readonly style="background:var(--color-surface-alt);color:var(--color-text-muted);"' : ''}>
    </div>
    <div class="form-row">
      <label class="label">Create a password</label>
      <input id="ai-password" type="password" class="inp" placeholder="At least 8 characters" autocomplete="new-password">
    </div>
    <div class="form-row" style="margin-bottom:var(--space-5);">
      <label class="label">Confirm password</label>
      <input id="ai-confirm" type="password" class="inp" placeholder="••••••••" autocomplete="new-password">
    </div>

    <div id="ai-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

    <button id="ai-btn" onclick="claimInviteWithSignup()" class="btn btn-full">
      Create account and join firm →
    </button>

    <p style="text-align:center;font-size:10px;color:var(--color-text-muted);margin-top:var(--space-4);line-height:var(--line-height-relaxed);">
      By creating an account you agree to our
      <a href="https://simpleaml.com.au/privacy-policy" target="_blank" style="color:var(--color-primary);">Privacy Policy</a>
      and
      <a href="https://simpleaml.com.au/disclaimer" target="_blank" style="color:var(--color-primary);">Terms of Use</a>.
    </p>`;
}

function renderClaimDirect(invite) {
  return `
    <div style="text-align:center;">
      <h1 class="screen-title" style="margin-bottom:var(--space-2);">Join ${invite.firmName || 'this firm'}?</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-5);">
        You're signed in as <strong>${S.user?.email}</strong>. Click below to join this firm's SimpleAML Pro account.
      </p>
      <div id="ai-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>
      <button id="ai-btn" onclick="claimInviteDirect()" class="btn btn-full">
        Join ${invite.firmName || 'firm'} →
      </button>
      <button onclick="go('login')" class="btn-sec btn-full" style="margin-top:var(--space-2);">
        Sign in with a different account
      </button>
    </div>`;
}

// ─── CLAIM — new account ──────────────────────────────────────────────────────

window.claimInviteWithSignup = async function() {
  const invite   = S._pendingInvite;
  const name     = document.getElementById('ai-name')?.value?.trim();
  const email    = document.getElementById('ai-email')?.value?.trim();
  const password = document.getElementById('ai-password')?.value;
  const confirm  = document.getElementById('ai-confirm')?.value;
  const errEl    = document.getElementById('ai-error');
  const btn      = document.getElementById('ai-btn');

  errEl.style.display = 'none';

  if (!invite)                { showErr(errEl, 'Invite details are missing. Please reload the invite link.'); return; }
  if (!name)                  { showErr(errEl, 'Full name is required.'); return; }
  if (!email)                 { showErr(errEl, 'Email is required.'); return; }
  if (invite.email && email.toLowerCase() !== invite.email.toLowerCase()) {
    showErr(errEl, 'This invite is for a different email address.');
    return;
  }
  if (!password)              { showErr(errEl, 'Password is required.'); return; }
  if (password.length < 8)    { showErr(errEl, 'Password must be at least 8 characters.'); return; }
  if (password !== confirm)   { showErr(errEl, 'Passwords do not match.'); return; }

  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  try {
    const auth       = getAuth(firebaseApp);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });

    await _writeInviteClaim(credential.user.uid, name, email, invite);

    S.firmId         = invite.firmId;
    S.individualId   = invite.individualId;
    S._inviteClaimed = true;

    await load(credential.user.uid);
    go('dashboard');

  } catch (err) {
    console.error('Invite claim error:', err);
    btn.disabled    = false;
    btn.textContent = 'Create account and join firm →';
    showErr(errEl, friendlyAuthError(err.code) || err.message || 'Something went wrong. Please try again.');
  }
};

// ─── CLAIM — already authenticated ───────────────────────────────────────────

window.claimInviteDirect = async function() {
  const invite = S._pendingInvite;
  const errEl  = document.getElementById('ai-error');
  const btn    = document.getElementById('ai-btn');

  errEl.style.display = 'none';

  if (!invite) {
    showErr(errEl, 'Invite details are missing. Please reload the invite link.');
    return;
  }

  if (invite.email && S.user?.email?.toLowerCase() !== invite.email.toLowerCase()) {
    showErr(errEl, `This invite is for ${invite.email}. Please sign in with that email address.`);
    return;
  }

  if (S.firmId && S.firm && S.firmId !== invite.firmId) {
    showErr(errEl, 'You are already signed in to a different firm workspace. Please sign out and open this invite with the invited account.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Joining firm…';

  try {
    const uid  = S.user.uid;
    const name = S.user.displayName || invite.displayName || S.user.email;

    await _writeInviteClaim(uid, name, S.user.email, invite);

    S.firmId       = invite.firmId;
    S.individualId = invite.individualId;

    await load(uid);
    go('dashboard');

  } catch (err) {
    console.error('Invite claim error:', err);
    btn.disabled    = false;
    btn.textContent = `Join ${invite.firmName || 'firm'} →`;
    showErr(errEl, err.message || 'Something went wrong. Please try again.');
  }
};

// ─── SHARED CLAIM WRITER ──────────────────────────────────────────────────────

async function _writeInviteClaim(uid, displayName, email, invite) {
  const now          = new Date().toISOString();
  const firmId       = invite.firmId;
  const individualId = invite.individualId;

  if (!firmId) throw new Error('Invite is missing firmId.');
  if (!individualId) throw new Error('Invite is missing linked staff individualId.');

  // 1. firm_users record — FIRST.
  // Under Firestore rules, this membership must exist before the invitee can
  // read or update the firm's individual/staff record.
  await saveFirmUser(uid, {
    uid,
    firmId,
    individualId,
    role:        invite.role || 'staff',
    status:      'active',
    displayName: displayName || invite.displayName || email || '',
    email:       email || invite.email || '',
    inviteId:    invite.inviteId,
    createdAt:   now,
    updatedAt:   now,
  });

  // 2. Now that membership exists, confirm the invited individual exists and
  // belongs to the same firm.
  const existingIndividual = await getIndividual(individualId);

  if (!existingIndividual) {
    throw new Error('The invited staff record could not be found. Please ask the firm owner to create a new invite.');
  }

  if (existingIndividual.firmId !== firmId) {
    throw new Error('The invited staff record does not belong to this firm. Please ask the firm owner to create a new invite.');
  }

  // 3. Update existing individual record as staff.
  // Do NOT create a duplicate ind_<uid> individual.
  try {
    await updateIndividual(individualId, {
      fullName:  displayName || existingIndividual.fullName || invite.displayName || '',
      email:     email || existingIndividual.email || invite.email || '',
      role:      existingIndividual.role || (invite.role === 'owner' ? 'Principal' : 'Staff'),
      isStaff:   true,
      updatedAt: now,
    });
  } catch (err) {
    await saveIndividual(individualId, {
      ...existingIndividual,
      individualId,
      firmId,
      fullName:  displayName || existingIndividual.fullName || invite.displayName || '',
      email:     email || existingIndividual.email || invite.email || '',
      role:      existingIndividual.role || (invite.role === 'owner' ? 'Principal' : 'Staff'),
      isStaff:   true,
      updatedAt: now,
    });
  }

  // 4. Mark invite as claimed.
  await claimInvite(invite.inviteId, {
    claimedByUid:   uid,
    claimedByEmail: email || invite.email || '',
    claimedAt:      now,
  });

  // 5. Audit entry.
  await saveAuditEntry({
    firmId,
    userId:     individualId,
    userName:   displayName || existingIndividual.fullName || invite.displayName || '',
    userEmail:  email || invite.email || '',
    action:     'user_joined',
    targetType: 'firm',
    targetId:   firmId,
    targetName: invite.firmName || '',
    detail:     `${displayName || existingIndividual.fullName || invite.displayName || 'User'} (${email || invite.email || ''}) joined as ${invite.role || 'staff'} via invite`,
    timestamp:  now,
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function showErr(el, msg) {
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
}

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':        return 'Please enter a valid email address.';
    case 'auth/weak-password':        return 'Password is too weak. Please use at least 8 characters.';
    case 'auth/network-request-failed': return 'Network error. Please check your connection.';
    default: return null;
  }
}
