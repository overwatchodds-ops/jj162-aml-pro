import { S }       from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

export function screen() {
  const smrs   = S.smrs || [];
  const filter = S.currentParams?.filter || 'all';

  const filtered = filter === 'all' ? smrs : smrs.filter(s => s.status === filter);

  const counts = {
    all:       smrs.length,
    draft:     smrs.filter(s => s.status === 'draft').length,
    submitted: smrs.filter(s => s.status === 'submitted').length,
    closed:    smrs.filter(s => s.status === 'closed').length,
  };

  function statusBadge(status) {
    switch (status) {
      case 'submitted': return `<span class="badge badge-success">Submitted</span>`;
      case 'draft':     return `<span class="badge badge-warning">Draft</span>`;
      case 'closed':    return `<span class="badge badge-neutral">Closed</span>`;
      default:          return `<span class="badge badge-neutral">${status}</span>`;
    }
  }

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">SMR</h1>
          <p class="screen-subtitle">Suspicious matter reports. Strictly firm-scoped — never shared with other firms.</p>
        </div>
        <button onclick="go('smr-new')" class="btn btn-sm">+ New SMR</button>
      </div>

      <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
        <strong>Tipping-off reminder.</strong> You must not disclose to any person that an SMR has been or may be submitted to AUSTRAC. This register is visible to your firm only.
      </div>

      <div class="toolbar">
        <div class="filter-tabs">
          ${[
            { key: 'all',       label: `All (${counts.all})`            },
            { key: 'draft',     label: `Draft (${counts.draft})`        },
            { key: 'submitted', label: `Submitted (${counts.submitted})` },
            { key: 'closed',    label: `Closed (${counts.closed})`      },
          ].map(f => `
            <button onclick="smrFilter('${f.key}')" class="filter-tab ${filter===f.key?'active':''}">${f.label}</button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-title">${filter === 'all' ? 'No SMRs recorded yet.' : `No ${filter} SMRs.`}</div>
          <div class="empty-state-sub">SMRs are submitted to AUSTRAC when you identify suspicious activity.</div>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Submitted by</th>
                <th>Date</th>
                <th>Status</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => `
                <tr onclick="go('smr-detail',{smrId:'${s.smrId}'})">
                  <td>
                    <div style="font-weight:var(--font-weight-medium);">${s.austracRef || 'Draft'}</div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">SMRID: ${s.smrId}</div>
                  </td>
                  <td style="font-size:var(--font-size-xs);">${s.submittedByName || '—'}</td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${fmtDate(s.submittedDate || s.createdAt)}</td>
                  <td>${statusBadge(s.status)}</td>
                  <td style="text-align:right;">
                    <button onclick="event.stopPropagation();go('smr-detail',{smrId:'${s.smrId}'})" class="btn-ghost" style="color:var(--color-text-muted);">View</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>`;
}

window.smrFilter = function(filter) {
  S.currentParams = { ...S.currentParams, filter };
  render();
};
