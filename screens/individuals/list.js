import { S } from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

export function screen() {
  const isStaffView = S.currentScreen === 'staff';
  // Filter only for staff context
  const staffMembers = (S.individuals || []).filter(i => i.isStaff === true);

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Staff Register</h1>
          <p class="screen-subtitle">Vetting and training records for firm personnel.</p>
        </div>
        <button onclick="go('staff-new')" class="btn btn-sm">+ Add Staff Member</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th style="width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${staffMembers.map(i => `
              <tr>
                <td>
                  <div style="font-weight:var(--font-weight-medium);">${i.fullName || i.name}</div>
                  <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${i.email || ''}</div>
                </td>
                <td><span class="label">${i.role || '—'}</span></td>
                <td>${renderStatusBadge(i.vettingStatus)}</td>
                <td style="font-size:var(--font-size-xs);">${fmtDate(i.updatedAt)}</td>
                <td style="text-align:right;">
                  <button onclick="resumeOnboarding('${i.individualId}', '${i.vettingStatus}')" class="btn-ghost">
                    ${i.vettingStatus === 'Complete' ? 'Edit' : 'Resume'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderStatusBadge(status) {
  const cls = status === 'Complete' ? 'badge-success' : 'badge-warning';
  return `<span class="badge ${cls}">${status || 'Incomplete'}</span>`;
}

// ─── SMART ROUTING ACTION ─────────────────────────────────────────────────────

window.resumeOnboarding = (id, status) => {
  // Logic: If incomplete, skip Identity and go straight to where they left off
  const targetTab = status === 'Complete' ? 'identity' : 'vetting';
  
  // Set the global state so the new modules know which ID to load
  S.currentParams = { 
    individualId: id, 
    tab: targetTab, 
    entryPoint: 'staff' 
  };
  
  go('staff-edit');
};
