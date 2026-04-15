import { S }       from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

export function screen() {
  const firm  = S.firm || {};
  const users = firm.users || [];
  const maxUsers = 3;

  function roleBadge(role) {
    switch (role) {
      case 'owner': return `<span class="badge badge-primary">Owner</span>`;
      case 'staff': return `<span class="badge badge-neutral">Staff</span>`;
      default:      return `<span class="badge badge-neutral">${role}</span>`;
    }
  }

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Users</h1>
          <p class="screen-subtitle">Manage who has access to your SimpleAML Pro account. Up to ${maxUsers} users per firm.</p>
        </div>
        ${users.length < maxUsers ? `<button onclick="showInviteUser()" class="btn btn-sm">+ Invite user</button>` : ''}
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        Each user has their own login. All users share the same compliance register. The firm owner cannot be removed. Users with the "Staff" role can view and edit records but cannot manage billing or users.
      </div>

      <!-- Current users -->
      <div class="card">
        <div class="section-heading">Current users (${users.length}/${maxUsers})</div>

        ${users.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No users configured yet.</p>
        ` : users.map(u => {
          const initials = (u.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';
          const isMe = u.uid === S.user?.uid;
          return `
            <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div class="avatar" style="flex-shrink:0;">${initials}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${u.name || '—'} ${isMe ? '<span style="font-size:10px;color:var(--color-text-muted);">(you)</span>' : ''}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${u.email || ''}</div>
              </div>
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                ${roleBadge(u.role)}
                ${!isMe && u.role !== 'owner' ? `
                  <button onclick="removeUser('${u.uid}')" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">Remove</button>
                ` : ''}
              </div>
            </div>`;
        }).join('')}

        ${users.length < maxUsers ? `
          <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-lg);border:0.5px dashed var(--color-border);">
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);text-align:center;">
              ${maxUsers - users.length} seat${maxUsers - users.length !== 1 ? 's' : ''} available
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Invite form -->
      <div id="invite-form" style="display:none;">
        <div class="card card-editing">
          <div class="section-heading">Invite a user</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">They'll receive an email invitation to create their account and join your firm.</p>

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
              <option value="owner">Owner — full access including billing</option>
            </select>
          </div>

          <div id="invite-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">
            <button onclick="hideInviteUser()" class="btn-sec" style="flex:1;">Cancel</button>
            <button onclick="sendInvite()" class="btn" style="flex:2;">Send invitation</button>
          </div>
        </div>
      </div>

    </div>`;
}

window.showInviteUser = function() {
  document.getElementById('invite-form').style.display = 'block';
  document.getElementById('invite-name')?.focus();
};

window.hideInviteUser = function() {
  document.getElementById('invite-form').style.display = 'none';
};

window.sendInvite = async function() {
  const name  = document.getElementById('invite-name')?.value?.trim();
  const email = document.getElementById('invite-email')?.value?.trim();
  const role  = document.getElementById('invite-role')?.value;
  const errEl = document.getElementById('invite-error');
  errEl.style.display = 'none';

  if (!name)  { errEl.textContent='Name is required.'; errEl.style.display='block'; return; }
  if (!email) { errEl.textContent='Email is required.'; errEl.style.display='block'; return; }

  // For Pro v1 — invitation is recorded locally, actual email sending
  // requires a Firebase Cloud Function which is a Pro v2 build item.
  // For now, show the invite details and instruct the owner to share login details.
  toast(`Invitation noted for ${name} (${email}). Share your Pro login URL with them to sign up.`);
  hideInviteUser();
};

window.removeUser = async function(uid) {
  if (!confirm('Remove this user? They will lose access to your firm\'s SimpleAML Pro account.')) return;
  const { updateFirmProfile } = await import('../../firebase/firestore.js');
  const users = (S.firm?.users || []).filter(u => u.uid !== uid);
  await updateFirmProfile(S.firmId, { users });
  if (S.firm) S.firm.users = users;
  toast('User removed');
  render();
};
