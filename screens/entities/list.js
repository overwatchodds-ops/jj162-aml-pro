import { S }        from '../../state/index.js';
import { fmtDate }  from '../../firebase/firestore.js';

// ─── ENTITY COMPLIANCE STATUS ─────────────────────────────────────────────────
// An Entity is also known as a Client. It is compliant when all its active members satisfy their requirements.
// Derived from the links + compliance engine in state.

function entityStatus(entity) {
  const links = S.links.filter(l =>
    l.linkedObjectId   === entity.entityId &&
    l.linkedObjectType === 'entity' &&
    l.status           === 'active'
  );

  if (!links.length) return 'no_members';

  // Check each member's individual compliance status
  const { getRequirements, getComplianceStatus } = window._rulesMatrix || {};
  if (!getRequirements) return 'unknown';

  let hasAction = false;

  for (const link of links) {
    const ind = S.individuals.find(i => i.individualId === link.individualId);
    if (!ind) { hasAction = true; continue; }

    const indLinks  = S.links.filter(l => l.individualId === ind.individualId && l.status === 'active');
    const required  = getRequirements(indLinks, S.entities);

    const verifications = (S.verifications || []).filter(v => v.individualId === ind.individualId);
    const screenings    = (S.screenings    || []).filter(s => s.individualId === ind.individualId);
    const training      = (S.training      || []).filter(t => t.individualId === ind.individualId);
    const vetting       = (S.vetting       || []).filter(v => v.individualId === ind.individualId);

    const latestVer = verifications.sort((a,b) => b.createdAt?.localeCompare(a.createdAt))[0];
    const latestScr = screenings.sort((a,b) => b.date?.localeCompare(a.date))[0];
    const latestTrn = training.sort((a,b) => b.completedDate?.localeCompare(a.completedDate))[0];
    const latestVet = vetting.sort((a,b) => b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];

    const evidence = {
      verification: latestVer || null,
      screening:    { result: latestScr?.result, date: latestScr?.date },
      training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
      vetting:      latestVet || null,
    };

    const { status } = getComplianceStatus(required, evidence);
    if (status !== 'compliant') hasAction = true;
  }

  return hasAction ? 'action_required' : 'compliant';
}

function statusBadge(status) {
  switch (status) {
    case 'compliant':      return `<span class="badge badge-success">Compliant</span>`;
    case 'action_required':return `<span class="badge badge-danger">Action required</span>`;
    case 'no_members':     return `<span class="badge badge-neutral">No members</span>`;
    default:               return `<span class="badge badge-warning">Unknown</span>`;
  }
}

function riskBadge(rating) {
  switch (rating?.toLowerCase()) {
    case 'high':   return `<span class="badge badge-danger">High risk</span>`;
    case 'medium': return `<span class="badge badge-warning">Medium risk</span>`;
    case 'low':    return `<span class="badge badge-success">Low risk</span>`;
    default:       return `<span class="badge badge-neutral">Unrated</span>`;
  }
}

function memberCount(entityId) {
  return S.links.filter(l =>
    l.linkedObjectId   === entityId &&
    l.linkedObjectType === 'entity' &&
    l.status           === 'active'
  ).length;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  // Lazy-load rules matrix into window for status checks
  if (!window._rulesMatrix) {
    import('../../state/rules_matrix.js').then(m => {
      window._rulesMatrix = m;
      render();
    });
  }

  const filter = S.currentParams?.filter || 'all';
  const search = S.currentParams?.search || '';

  let entities = [...(S.entities || [])];

  // Search
  if (search) {
    const q = search.toLowerCase();
    entities = entities.filter(e =>
      e.entityName?.toLowerCase().includes(q) ||
      e.abn?.includes(q)
    );
  }

  // Compute status
  const withStatus = entities.map(e => ({
    ...e,
    _status: entityStatus(e),
  }));

  // Filter
  const filtered = filter === 'all' ? withStatus : withStatus.filter(e => {
    if (filter === 'compliant')  return e._status === 'compliant';
    if (filter === 'action')     return e._status === 'action_required';
    if (filter === 'no_members') return e._status === 'no_members';
    return true;
  });

  const counts = {
    all:        withStatus.length,
    compliant:  withStatus.filter(e => e._status === 'compliant').length,
    action:     withStatus.filter(e => e._status === 'action_required').length,
    no_members: withStatus.filter(e => e._status === 'no_members').length,
  };

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Clients</h1>
          <p class="screen-subtitle">Legal structures — companies, trusts, partnerships, and sole traders.</p>
        </div>
        <button onclick="go('entity-new')" class="btn btn-sm">+ New Client</button>
      </div>

      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            class="search-inp"
            placeholder="Search entities..."
            value="${search}"
            oninput="entitiesSearch(this.value)"
          >
        </div>
        <div class="filter-tabs">
          ${[
            { key: 'all',        label: `All (${counts.all})`              },
            { key: 'compliant',  label: `Compliant (${counts.compliant})`  },
            { key: 'action',     label: `Action (${counts.action})`        },
            { key: 'no_members', label: `No members (${counts.no_members})` },
          ].map(f => `
            <button
              onclick="entitiesFilter('${f.key}')"
              class="filter-tab ${filter === f.key ? 'active' : ''}"
            >${f.label}</button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-title">${search ? 'No clients match your search.' : 'No Clients yet.'}</div>
          <div class="empty-state-sub">${search ? 'Try a different search term.' : 'Click "New Client" to add your first client entity.'}</div>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entity</th>
                <th>Type</th>
                <th>Risk</th>
                <th>Members</th>
                <th>Status</th>
                <th>Last updated</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(e => `
                <tr onclick="go('entity-detail',{entityId:'${e.entityId}'})">
                  <td>
                    <div style="font-weight:var(--font-weight-medium);">${e.entityName || '—'}</div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${e.abn ? 'ABN ' + e.abn : ''}</div>
                  </td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${e.entityType || '—'}</td>
                  <td>${riskBadge(e.entityRiskRating)}</td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${memberCount(e.entityId)} member${memberCount(e.entityId) !== 1 ? 's' : ''}</td>
                  <td>${statusBadge(e._status)}</td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${fmtDate(e.updatedAt)}</td>
                  <td style="text-align:right;">
                    <button
                      onclick="event.stopPropagation();go('entity-edit',{entityId:'${e.entityId}'})"
                      class="btn-ghost"
                      style="color:var(--color-text-muted);"
                    >Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.entitiesSearch = function(val) {
  S.currentParams = { ...S.currentParams, search: val };
  render();
};

window.entitiesFilter = function(filter) {
  S.currentParams = { ...S.currentParams, filter };
  render();
};
