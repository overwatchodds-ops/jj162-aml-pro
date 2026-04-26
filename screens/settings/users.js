// ─── SETTINGS — USERS ────────────────────────────────────────────────────────
// Displays all firm_users records for this firm.
// Owner can invite new users (generates a link to copy + share).
// Owner can remove staff users (cannot remove themselves).
// Max 3 users per firm for beta.

import { S }       from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

const MAX_USERS = 3;

function roleBadge(role) {
  switch (role) {
    case 'owner': return `<span class="badge badge-primary">Owner</span>`;
    case 'staff': return `<span class="badge badge-neutral">Staff</span>`;
    default:      return `<span class="badge badge-neutral">${role}</span>`;
  }
}

function currentUserIsOwner() {
  const me = (S.firmUsers || []).find(u => u.uid === S.user?.uid);
  return me?.role === 'owner';
}

export function screen() {
  const users    = S.firmUsers || [];
  const isOwner  = currentUserIsOwner();
  const canInvite = isOwner && users.length < MAX_USERS;

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Users</h1>
          <p class="screen-subtitle">Manage who has access to your SimpleAML Pro account. Up to ${MAX_USERS} users per firm during beta.</p>
        </div>
        ${canInvite ? `<button onclick="showInviteForm()" class="btn btn-sm">+ Invite user</button>` : ''}
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        Each user has their own login and sees the same compliance register. The firm owner cannot be removed. Staff users can view and edit records but cannot manage billing or users.
      </div>

      <!-- Current users -->
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="section-heading">Current users (${users.length} / ${MAX_USERS})</div>

        ${users.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No users loaded.</p>
        ` : users.map(u => {
          const initials = (u.displayName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
          const isMe     = u.uid === S.user?.uid;
          return `
            <div style="display:flex;align-items:center;gap:var(--space-3);
                        padding:var(--space-3) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div class="avatar" style="flex-shrink:0;">${initials}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">
                  ${u.displayName || '—'}
                  ${isMe ? `<span style="font-size:10px;color:var(--color-text-muted);">(you)</span>` : ''}
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${u.email || ''}</div>
              </div>
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                ${roleBadge(u.role)}
                ${isOwner && !isMe && u.role !== 'owner' ? `
                  <button onclick="removeUser('${u.uid}')"
                          class="btn-ghost"
                          style="color:var(--color-danger);font-size:var(--font-size-xs);">
                    Remove
                  </button>
                ` : ''}
              </div>
            </div>`;
        }).join('')}

        ${users.length < MAX_USERS ? `
          <div style="margin-top:var(--space-3);padding:var(--space-3);
                      background:var(--color-surface-alt);border-radius:var(--radius-lg);
                      border:0.5px dashed var(--color-border);text-align:center;">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
              ${MAX_USERS - users.length} seat${MAX_USERS - users.length !== 1 ? 's' : ''} available
            </span>
          </div>
        ` : ''}
      </div>

      <!-- Invite form -->
      <div id="invite-form" style="display:none;">
        <div class="card card-editing" style="margin-bottom:var(--space-4);">
          <div class="section-heading">Invite a user</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">
            Enter their details and generate an invite link. Copy and send the link to them — they'll create their own password and join your firm automatically.
          </p>

          <div class="form-row">
            <label class="label label-required">Full name</label>
            <input id="invite-name" type="text" class="inp" placeholder="Jane Smith">
          </div>
          <div class="form-row">
            <label class="label label-required">Email address</label>
            <input id="invite-email" type="email" class="inp" placeholder="jane@firm.com.au">
          </div>
          <div class="form-row">
            <label class="label">Role</label>
            <select id="invite-role" class="inp">
              <option value="staff">Staff — can view and edit records</option>
              <option value="owner">Owner — full access including billing and users</option>
            </select>
          </div>

          <div id="invite-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">
            <button onclick="hideInviteForm()" class="btn-sec" style="flex:1;">Cancel</button>
            <button onclick="generateInviteLink()" class="btn" style="flex:2;">Generate invite link</button>
          </div>
        </div>
      </div>

      <!-- Generated link -->
      <div id="invite-link-card" style="display:none;">
        <div class="card" style="margin-bottom:var(--space-4);">
          <div class="section-heading">Invite link ready</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
            Copy this link and send it to the person you're inviting. It expires in 7 days and can only be used once.
          </p>
          <div style="display:flex;gap:var(--space-2);align-items:center;">
            <input id="invite-link-display" type="text" class="inp"
                   style="flex:1;font-size:var(--font-size-xs);color:var(--color-text-muted);"
                   readonly>
            <button onclick="copyInviteLink()" class="btn btn-sm" style="flex-shrink:0;">Copy</button>
          </div>
          <div id="invite-copy-confirm"
               style="display:none;font-size:var(--font-size-xs);
                      color:var(--color-success);margin-top:var(--space-2);">
            ✓ Copied to clipboard
          </div>
          <button onclick="resetInviteForm()" class="btn-sec btn-sm" style="margin-top:var(--space-3);">
            Invite another person
          </button>
        </div>
      </div>

    </div>`;
}

// ─── INVITE FORM HANDLERS ─────────────────────────────────────────────────────

window.showInviteForm = function() {
  document.getElementById('invite-form').style.display = 'block';
  document.getElementById('invite-link-card').style.display = 'none';
  document.getElementById('invite-name')?.focus();
};

window.hideInviteForm = function() {
  document.getElementById('invite-form').style.display = 'none';
};

window.resetInviteForm = function() {
  document.getElementById('invite-link-card').style.display = 'none';
  document.getElementById('invite-form').style.display = 'block';
  document.getElementById('invite-name').value  = '';
  document.getElementById('invite-email').value = '';
  document.getElementById('invite-role').value  = 'staff';
  document.getElementById('invite-name')?.focus();
};

window.generateInviteLink = async function() {
  const name  = document.getElementById('invite-name')?.value?.trim();
  const email = document.getElementById('invite-email')?.value?.trim();
  const role  = document.getElementById('invite-role')?.value || 'staff';
  const errEl = document.getElementById('invite-error');
  errEl.style.display = 'none';

  if (!name)  { errEl.textContent = 'Name is required.';  errEl.style.display = 'block'; return; }
  if (!email) { errEl.textContent = 'Email is required.'; errEl.style.display = 'block'; return; }

  // Check not already a user
  const alreadyUser = (S.firmUsers || []).some(u => u.email?.toLowerCase() === email.toLowerCase());
  if (alreadyUser) {
    errEl.textContent = 'This email already has access to your firm.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const { saveInvite, saveAuditEntry, genId } = await import('../../firebase/firestore.js');

    const inviteId  = genId('inv');
    const now       = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await saveInvite(inviteId, {
      inviteId,
      firmId:      S.firmId,
      firmName:    S.firm?.firmName || '',
      invitedBy:   S.individualId,
      invitedByName: S.firmUsers?.find(u => u.uid === S.user?.uid)?.displayName || '',
      displayName: name,
      email,
      role,
      status:      'pending',
      createdAt:   now,
      expiresAt,
    });

    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.firmUsers?.find(u => u.uid === S.user?.uid)?.displayName || '',
      action:     'user_invited',
      targetType: 'firm',
      targetId:   S.firmId,
      targetName: name,
      detail:     `Invite created for ${name} (${email}) as ${role}`,
      timestamp:  now,
    });

    // Generate the invite URL
    const baseUrl   = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}?invite=${inviteId}`;

    document.getElementById('invite-form').style.display      = 'none';
    document.getElementById('invite-link-card').style.display = 'block';
    document.getElementById('invite-link-display').value      = inviteUrl;

  } catch (err) {
    errEl.textContent = 'Failed to generate invite. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};

window.copyInviteLink = function() {
  const input = document.getElementById('invite-link-display');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    const confirm = document.getElementById('invite-copy-confirm');
    if (confirm) {
      confirm.style.display = 'block';
      setTimeout(() => { confirm.style.display = 'none'; }, 3000);
    }
  });
};

// ─── REMOVE USER ─────────────────────────────────────────────────────────────

window.removeUser = async function(uid) {
  const user = (S.firmUsers || []).find(u => u.uid === uid);
  if (!user) return;
  if (!confirm(`Remove ${user.displayName}? They will immediately lose access to your firm.`)) return;

  try {
    const { saveFirmUser, saveAuditEntry } = await import('../../firebase/firestore.js');

    // Deactivate by setting status — never hard delete firm_users records
    await saveFirmUser(uid, { ...user, status: 'removed', updatedAt: new Date().toISOString() });

    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.firmUsers?.find(u => u.uid === S.user?.uid)?.displayName || '',
      action:     'user_removed',
      targetType: 'firm',
      targetId:   S.firmId,
      targetName: user.displayName,
      detail:     `User removed — ${user.displayName} (${user.email})`,
      timestamp:  new Date().toISOString(),
    });

    // Remove from local state
    S.firmUsers = S.firmUsers.filter(u => u.uid !== uid);
    toast(`${user.displayName} removed`);
    render();

  } catch (err) {
    toast('Failed to remove user. Please try again.', 'err');
    console.error(err);
  }
};
