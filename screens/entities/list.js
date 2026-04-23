import { S }       from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

const PERSON_TYPES = ['Individual', 'Sole Trader'];

// ─── STATUS DERIVATION ────────────────────────────────────────────────────────
function clientStatus(entity) {
  const entityId = entity.entityId;

  if (PERSON_TYPES.includes(entity.entityType)) {
    const link = S.links.find(l =>
      l.linkedObjectId   === entityId &&
      l.linkedObjectType === 'entity' &&
      l.status           === 'active'
    );
    if (!link) return 'incomplete';
    const iid    = link.individualId;
    const hasVer = (S.verifications||[]).some(v => v.individualId === iid);
    const hasScr = (S.screenings   ||[]).some(s => s.individualId === iid && s.result);
    return hasVer && hasScr ? 'compliant' : 'incomplete';
  } else {
    const links = S.links.filter(l =>
      l.linkedObjectId   === entityId &&
      l.linkedObjectType === 'entity' &&
      l.status           === 'active'
    );
    if (!links.length) return 'no_people';
    const allDone = links.every(l => {
      const iid    = l.individualId;
      const hasVer = (S.verifications||[]).some(v => v.individualId === iid);
      const hasScr = (S.screenings   ||[]).some(s => s.individualId === iid && s.result);
      return hasVer && hasScr;
    });
    return allDone ? 'compliant' : 'incomplete';
  }
}

function statusBadge(status) {
  switch (status) {
    case 'compliant':  return `<span class="badge badge-success">CDD complete</span>`;
    case 'incomplete': return `<span class="badge badge-danger">Incomplete</span>`;
    case 'no_people':  return `<span class="badge badge-warning">No key people</span>`;
    default:           return `<span class="badge badge-neutral">—</span>`;
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

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const filter = S.currentParams?.filter || 'all';
  const search = S.currentParams?.search || '';

  let entities = [...(S.entities || [])];

  if (search) {
    const q = search.toLowerCase();
    entities = entities.filter(e =>
      e.entityName?.toLowerCase().includes(q) ||
      e.abn?.includes(q)
    );
  }

  const withStatus = entities.map(e => ({
    ...e,
    _status: clientStatus(e),
  }));

  const filtered = filter === 'all' ? withStatus : withStatus.filter(e => {
    if (filter === 'compliant')  return e._status === 'compliant';
    if (filter === 'incomplete') return e._status === 'incomplete' || e._status === 'no_people';
    return true;
  });

  const counts = {
    all:        withStatus.length,
    compliant:  withStatus.filter(e => e._status === 'compliant').length,
    incomplete: withStatus.filter(e => e._status === 'incomplete' || e._status === 'no_people').length,
  };

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Clients</h1>
          <p class="screen-subtitle">All client relationships — individuals, sole traders, companies, trusts and more.</p>
        </div>
        <button onclick="go('entity-new')" class="btn btn-sm">+ New client</button>
      </div>

      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            class="search-inp"
            placeholder="Search clients..."
            value="${search}"
            oninput="entitiesSearch(this.value)"
          >
        </div>
        <div class="filter-tabs">
          ${[
            { key: 'all',        label: `All (${counts.all})`               },
            { key: 'compliant',  label: `CDD complete (${counts.compliant})` },
            { key: 'incomplete', label: `Incomplete (${counts.incomplete})`   },
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
          <div class="empty-state-title">${search ? 'No clients match your search.' : 'No clients yet.'}</div>
          <div class="empty-state-sub">${search ? 'Try a different name or ABN.' : 'Click "+ New client" to add your first client.'}</div>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Risk</th>
                <th>CDD status</th>
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
                  <td>${statusBadge(e._status)}</td>
                  <td style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${fmtDate(e.updatedAt)}</td>
                  <td style="text-align:right;">
                    <button
                      onclick="event.stopPropagation();go('entity-detail',{entityId:'${e.entityId}'})"
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

window.entitiesSearch = function(val) {
  // Store search value in state but don't re-render —
  // re-rendering destroys the input and loses focus.
  // Instead update the table rows directly via DOM filtering.
  S.currentParams = { ...S.currentParams, search: val };
  _filterTable(val);
};

// Filter table rows without re-rendering the whole screen
function _filterTable(query) {
  const rows = document.querySelectorAll('tbody tr');
  const q    = (query || '').toLowerCase();
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = !q || text.includes(q) ? '' : 'none';
  });
}

window.entitiesFilter = function(filter) {
  S.currentParams = { ...S.currentParams, filter };
  render();
};
