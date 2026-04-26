// ─── SETTINGS — USERS ────────────────────────────────────────────────────────
// Shows two sections:
//   1. Current users — staff who already have a firm_users record (login access)
//   2. Staff without access — existing staff individuals who don't have a login yet
//
// Owner invites staff from section 2 — generates a link they copy and share.
// The invitee clicks the link, creates a password, and joins the firm.
// Max 3 users per firm for beta.

import { S } from '../../state/index.js';

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

function getStaffWithoutAccess() {
  const userIndividualIds = new Set((S.firmUsers || []).map(u => u.individualId));
  return (S.individuals || []).filter(i =>
    i.isStaff &&
    !userIndividualIds.has(i.individualId)
  );
}

export function screen() {
  const users         = S.firmUsers || [];
  const isOwner       = currentUserIsOwner();
  const uninvited     = getStaffWithoutAccess();
  const canInviteMore = isOwner && users.length < MAX_USERS;

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Users</h1>
          <p class="screen-subtitle">Manage who has login access to your SimpleAML Pro account. Up to ${MAX_USERS} users per firm during beta.</p>
        </div>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        Each user has their own login and sees the same compliance register. The firm owner cannot be removed. Staff users can view and edit records but cannot manage billing or users.
      </div>

      <!-- Current users with login access -->
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="section-heading">Users with login access (${users.length} / ${MAX_USERS})</div>

        ${users.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No users yet.</p>
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

      <!-- Staff without login access -->
      ${isOwner ? `
        <div class="card" style="margin-bottom:var(--space-4);">
          <div class="section-heading">Staff without login access</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
            Invite existing staff members to give them their own login.
          </p>

          ${uninvited.length === 0 ? `
            <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
              All staff members already have login access, or no staff have been added yet.
            </p>
          ` : uninvited.map(ind => {
            const initials  = (ind.fullName || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
            return `
              <div style="display:flex;align-items:center;gap:var(--space-3);
                          padding:var(--space-3) 0;border-bottom:0.5px solid var(--color-border-light);">
                <div class="avatar" style="flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">
                    ${ind.fullName || '—'}
                  </div>
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                    ${ind.email || '<span style="color:var(--color-warning);">No email on record — add in Staff first</span>'}
                  </div>
                </div>
                ${canInviteMore && ind.email ? `
                  <button onclick="inviteStaffMember('${ind.individualId}')" class="btn btn-sm">
                    Invite
                  </button>
                ` : !ind.email ? '' : `
                  <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Seats full</span>
                `}
              </div>`;
          }).join('')}
        </div>
      ` : ''}

      <!-- Generated invite link -->
      <div id="invite-link-card" style="display:none;">
        <div class="card" style="margin-bottom:var(--space-4);">
          <div class="section-heading">Invite link ready</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
            Copy this link and send it to <span id="invite-link-name" style="font-weight:var(--font-weight-medium);"></span>.
            It expires in 7 days and can only be used once.
          </p>
          <div style="display:flex;gap:var(--space-2);align-items:center;">
            <input id="invite-link-display" type="text" class="inp"
                   style="flex:1;font-size:var(--font-size-xs);color:var(--color-text-muted);"
                   readonly>
            <button onclick="copyInviteLink()" class="btn btn-sm" style="flex-shrink:0;">Copy</button>
          </div>
          <div id="invite-copy-confirm"
               style="display:none;font-size:var(--font-size-xs);color:var(--color-success);margin-top:var(--space-2);">
            ✓ Copied to clipboard
          </div>
          <button onclick="dismissInviteLink()" class="btn-sec btn-sm" style="margin-top:var(--space-3);">
            Done
          </button>
        </div>
      </div>

    </div>`;
}

window.inviteStaffMember = async function(individualId) {
  const ind = (S.individuals || []).find(i => i.individualId === individualId);
  if (!ind) { toast('Staff member not found.', 'err'); return; }

  if (!ind.email) {
    toast('This staff member has no email on record. Add their email in Staff first.', 'err');
    return;
  }

  const alreadyUser = (S.firmUsers || []).some(u => u.individualId === individualId);
  if (alreadyUser) {
    toast('This person already has login access.', 'err');
    return;
  }

  try {
    const { saveInvite, saveAuditEntry, genId } = await import('../../firebase/firestore.js');

    const inviteId  = genId('inv');
    const now       = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const me        = (S.firmUsers || []).find(u => u.uid === S.user?.uid);

    await saveInvite(inviteId, {
      inviteId,
      firmId:        S.firmId,
      firmName:      S.firm?.firmName || '',
      invitedBy:     S.individualId,
      invitedByName: me?.displayName || '',
      individualId,
      displayName:   ind.fullName,
      email:         ind.email,
      role:          'staff',
      status:        'pending',
      createdAt:     now,
      expiresAt,
    });

    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   me?.displayName || '',
      action:     'user_invited',
      targetType: 'individual',
      targetId:   individualId,
      targetName: ind.fullName,
      detail:     `Login invite sent to ${ind.fullName} (${ind.email})`,
      timestamp:  now,
    });

    const baseUrl   = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}?invite=${inviteId}`;

    document.getElementById('invite-link-card').style.display = 'block';
    document.getElementById('invite-link-display').value      = inviteUrl;
    document.getElementById('invite-link-name').textContent   = ind.fullName;
    document.getElementById('invite-link-card').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    toast('Failed to generate invite. Please try again.', 'err');
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

window.dismissInviteLink = function() {
  document.getElementById('invite-link-card').style.display = 'none';
};

window.removeUser = async function(uid) {
  const user = (S.firmUsers || []).find(u => u.uid === uid);
  if (!user) return;
  if (!confirm(`Remove ${user.displayName}? They will immediately lose access to your firm.`)) return;

  try {
    const { saveFirmUser, saveAuditEntry } = await import('../../firebase/firestore.js');
    const me  = (S.firmUsers || []).find(u => u.uid === S.user?.uid);
    const now = new Date().toISOString();

    await saveFirmUser(uid, { ...user, status: 'removed', updatedAt: now });

    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   me?.displayName || '',
      action:     'user_removed',
      targetType: 'firm',
      targetId:   S.firmId,
      targetName: user.displayName,
      detail:     `User removed — ${user.displayName} (${user.email})`,
      timestamp:  now,
    });

    S.firmUsers = S.firmUsers.filter(u => u.uid !== uid);
    toast(`${user.displayName} removed`);
    render();

  } catch (err) {
    toast('Failed to remove user. Please try again.', 'err');
    console.error(err);
  }
};
