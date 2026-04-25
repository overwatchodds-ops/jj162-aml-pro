import { S }       from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

const PERSON_TYPES = ['Individual', 'Sole Trader'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function normalizeIdNumber(value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getSelfLinkForEntity(entityId) {
  return (S.links || []).find(l =>
    l.linkedObjectId === entityId &&
    l.linkedObjectType === 'entity' &&
    l.roleType === 'self' &&
    l.status === 'active'
  ) || null;
}

function getIndividualForEntity(entity) {
  if (!PERSON_TYPES.includes(entity.entityType)) return null;
  const selfLink = getSelfLinkForEntity(entity.entityId);
  if (!selfLink) return null;
  return (S.individuals || []).find(i => i.individualId === selfLink.individualId) || null;
}

function buildDuplicateIndex() {
  const nameDobMap = new Map();
  const idMap      = new Map();

  const personEntities = (S.entities || []).filter(e => PERSON_TYPES.includes(e.entityType));

  personEntities.forEach(entity => {
    const selfLink = getSelfLinkForEntity(entity.entityId);
    if (!selfLink) return;

    const individualId = selfLink.individualId;
    const ind = (S.individuals || []).find(i => i.individualId === individualId);
    if (!ind) return;

    const name = String(ind.fullName || '').trim().toLowerCase();
    const dob  = String(ind.dateOfBirth || '').trim();

    if (name && dob) {
      const key = `${name}|${dob}`;
      if (!nameDobMap.has(key)) nameDobMap.set(key, new Set());
      nameDobMap.get(key).add(individualId);
    }

    (S.verifications || [])
      .filter(v => v.individualId === individualId)
      .forEach(v => {
        const normId = normalizeIdNumber(v.idNumber);
        if (!normId) return;
        if (!idMap.has(normId)) idMap.set(normId, new Set());
        idMap.get(normId).add(individualId);
      });
  });

  return { nameDobMap, idMap };
}

function duplicateInfo(entity, duplicateIndex) {
  if (!PERSON_TYPES.includes(entity.entityType)) return { isDuplicate: false, reasons: [] };

  const ind = getIndividualForEntity(entity);
  if (!ind) return { isDuplicate: false, reasons: [] };

  const reasons = [];

  const name = String(ind.fullName || '').trim().toLowerCase();
  const dob  = String(ind.dateOfBirth || '').trim();
  if (name && dob) {
    const key = `${name}|${dob}`;
    const matches = duplicateIndex.nameDobMap.get(key);
    if (matches && matches.size > 1) {
      reasons.push('same name + DOB');
    }
  }

  const idMatches = new Set();
  (S.verifications || [])
    .filter(v => v.individualId === ind.individualId)
    .forEach(v => {
      const normId = normalizeIdNumber(v.idNumber);
      if (!normId) return;
      const matches = duplicateIndex.idMap.get(normId);
      if (matches && matches.size > 1) {
        idMatches.add(normId);
      }
    });

  if (idMatches.size) {
    reasons.push('same ID number');
  }

  return {
    isDuplicate: reasons.length > 0,
    reasons,
  };
}

// ─── STATUS DERIVATION ────────────────────────────────────────────────────────
function clientStatus(entity) {
  const entityId = entity.entityId;

  if (PERSON_TYPES.includes(entity.entityType)) {
    const link = (S.links || []).find(l =>
      l.linkedObjectId   === entityId &&
      l.linkedObjectType === 'entity' &&
      l.status           === 'active'
    );
    if (!link) return 'incomplete';
    const iid    = link.individualId;
    const hasVer = (S.verifications || []).some(v => v.individualId === iid);
    const hasScr = (S.screenings    || []).some(s => s.individualId === iid && s.result);
    return hasVer && hasScr ? 'compliant' : 'incomplete';
  } else {
    const links = (S.links || []).filter(l =>
      l.linkedObjectId   === entityId &&
      l.linkedObjectType === 'entity' &&
      l.status           === 'active'
    );
    if (!links.length) return 'no_people';
    const allDone = links.every(l => {
      const iid    = l.individualId;
      const hasVer = (S.verifications || []).some(v => v.individualId === iid);
      const hasScr = (S.screenings    || []).some(s => s.individualId === iid && s.result);
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
  const duplicateIndex = buildDuplicateIndex();

  if (search) {
    const q = search.toLowerCase();
    entities = entities.filter(e => {
      const ind = getIndividualForEntity(e);
      return (
        e.entityName?.toLowerCase().includes(q) ||
        e.abn?.toLowerCase?.().includes?.(q) ||
        ind?.email?.toLowerCase().includes(q) ||
        ind?.dateOfBirth?.toLowerCase?.().includes?.(q)
      );
    });
  }

  const withStatus = entities.map(e => ({
    ...e,
    _status: clientStatus(e),
    _dup: duplicateInfo(e, duplicateIndex),
  }));

  const filtered = filter === 'all' ? withStatus : withStatus.filter(e => {
    if (filter === 'compliant')  return e._status === 'compliant';
    if (filter === 'incomplete') return e._status === 'incomplete' || e._status === 'no_people';
    if (filter === 'duplicates') return e._dup?.isDuplicate;
    return true;
  });

  const counts = {
    all:        withStatus.length,
    compliant:  withStatus.filter(e => e._status === 'compliant').length,
    incomplete: withStatus.filter(e => e._status === 'incomplete' || e._status === 'no_people').length,
    duplicates: withStatus.filter(e => e._dup?.isDuplicate).length,
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
            { key: 'all',        label: `All (${counts.all})` },
            { key: 'compliant',  label: `CDD complete (${counts.compliant})` },
            { key: 'incomplete', label: `Incomplete (${counts.incomplete})` },
            { key: 'duplicates', label: `Duplicates (${counts.duplicates})` },
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
          <div class="empty-state-sub">${search ? 'Try a different name, email, DOB or ABN.' : 'Click "+ New client" to add your first client.'}</div>
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
                    <div style="font-weight:var(--font-weight-medium);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span>${e.entityName || '—'}</span>
                      ${e._dup?.isDuplicate ? `<span class="badge badge-danger">Possible duplicate</span>` : ''}
                    </div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                      ${e.abn ? 'ABN ' + e.abn : ''}
                    </div>
                    ${e._dup?.isDuplicate ? `
                      <div style="font-size:var(--font-size-xs);color:var(--color-danger);margin-top:4px;">
                        ${e._dup.reasons.join(' · ')}
                      </div>
                    ` : ''}
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
  S.currentParams = { ...S.currentParams, search: val };
  _filterTable(val);
};

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
