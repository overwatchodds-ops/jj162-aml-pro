// ─── ENTITY CLIENT DETAIL ─────────────────────────────────────────────────────
// Handles: Private Company, Trust, SMSF, Partnership,
//          Incorporated Association, Charity / NFP
//
// One screen, always-editable, one Save button.
// Key people are linked individuals — CDD lives on their individual record.
// fid = entityId || 'new'

import { S, addEntityToState, addLinkToState } from '../../state/index.js';
import { ROLE_LABELS, ENTITY_ROLES }            from '../../state/rules_matrix.js';
import { fmtDate, saveEntity, saveLink,
         saveAuditEntry, genId }                from '../../firebase/firestore.js';

// ─── CONFIG: per entity type ───────────────────────────────────────────────────
const ENTITY_CONFIG = {
  'Private Company': {
    verSources:  ['ASIC Connect search', 'ABN Lookup', 'Company constitution sighted', 'Other'],
    roles:       ENTITY_ROLES.company,
    whoToAdd:    'Add all directors and shareholders holding more than 25%.',
    showACN:     true,
  },
  'Trust': {
    verSources:  ['Trust deed sighted', 'ABN Lookup', 'Other'],
    roles:       ENTITY_ROLES.trust,
    whoToAdd:    'Add all trustees, settlor, appointor and beneficiaries holding more than 25%.',
    showACN:     false,
  },
  'SMSF': {
    verSources:  ['ATO ABN Lookup', 'Trust deed sighted', 'Other'],
    roles:       ENTITY_ROLES.smsf,
    whoToAdd:    'Add all trustees and members of the fund.',
    showACN:     false,
  },
  'Partnership': {
    verSources:  ['Partnership agreement sighted', 'ABN Lookup', 'Other'],
    roles:       ENTITY_ROLES.partnership,
    whoToAdd:    'Add all partners.',
    showACN:     false,
  },
  'Incorporated Association': {
    verSources:  ['State register search', 'ABN Lookup', 'Constitution sighted', 'Other'],
    roles:       ENTITY_ROLES.association,
    whoToAdd:    'Add all responsible persons and committee members.',
    showACN:     false,
  },
  'Charity / NFP': {
    verSources:  ['ACNC register search', 'ABN Lookup', 'Other'],
    roles:       ENTITY_ROLES.charity,
    whoToAdd:    'Add all responsible persons and board members.',
    showACN:     false,
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function riskBadge(rating) {
  switch (rating?.toLowerCase()) {
    case 'high':   return `<span class="badge badge-danger">High risk</span>`;
    case 'medium': return `<span class="badge badge-warning">Medium risk</span>`;
    case 'low':    return `<span class="badge badge-success">Low risk</span>`;
    default:       return `<span class="badge badge-neutral">Unrated</span>`;
  }
}

function staffOptions(selected = '') {
  const staff = (S.individuals || []).filter(i => i.isStaff);
  if (!staff.length) return `<option value="">No staff found — add staff first</option>`;
  return `<option value="">Select staff member...</option>` +
    staff.map(s =>
      `<option value="${s.fullName}" ${selected === s.fullName ? 'selected' : ''}>
        ${s.fullName}${s.role ? ' · ' + s.role : ''}
      </option>`
    ).join('');
}

function inp(id, type, value = '', placeholder = '') {
  return `<input id="${id}" type="${type}" class="inp"
                 value="${value}" placeholder="${placeholder}">`;
}

function cddBadge(individualId) {
  const hasVer = (S.verifications||[]).some(v => v.individualId === individualId);
  const hasScr = (S.screenings||[]).some(s => s.individualId === individualId && s.result);
  if (hasVer && hasScr) return `<span class="badge badge-success">CDD complete</span>`;
  if (hasVer || hasScr) return `<span class="badge badge-warning">CDD partial</span>`;
  return `<span class="badge badge-danger">CDD needed</span>`;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export function screen() {
  const { entityId, isNew, entityType: newType } = S.currentParams || {};

  const fid    = entityId || 'new';
  const entity = entityId ? (S.entities || []).find(e => e.entityId === entityId) : null;
  const etype  = entity?.entityType || newType || S._draft?.entityType || 'Private Company';
  const config = ENTITY_CONFIG[etype] || ENTITY_CONFIG['Private Company'];
  const today  = new Date().toISOString().split('T')[0];

  if (!isNew && !entity) return `
    <div class="empty-state">
      <div class="empty-state-title">Client not found.</div>
      <button onclick="go('entities')" class="btn-sec btn-sm"
              style="margin-top:var(--space-3);">← Clients</button>
    </div>`;

  // Active key people
  const keyPeople = entity
    ? (S.links || []).filter(l =>
        l.linkedObjectId === entityId &&
        l.linkedObjectType === 'entity' &&
        l.status === 'active')
    : [];

  // Overall CDD status
  const allCDD = keyPeople.length > 0 && keyPeople.every(l => {
    const hasVer = (S.verifications||[]).some(v => v.individualId === l.individualId);
    const hasScr = (S.screenings||[]).some(s => s.individualId === l.individualId && s.result);
    return hasVer && hasScr;
  });

  return `
    <div>

      <!-- HEADER -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;
                  margin-bottom:var(--space-5);">
        <div>
          <button onclick="${isNew ? 'clearEntityType()' : "go('entities')"}"
                  class="btn-ghost"
                  style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isNew ? 'Change type' : 'Clients'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">
            ${isNew ? 'New ' + etype : entity.entityName}
          </h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${etype}</span>
            ${!isNew ? `
              ${riskBadge(entity.entityRiskRating)}
              ${keyPeople.length === 0
                ? `<span class="badge badge-warning">No key people</span>`
                : allCDD
                  ? `<span class="badge badge-success">CDD complete</span>`
                  : `<span class="badge badge-danger">CDD incomplete</span>`}
            ` : ''}
          </div>
        </div>
      </div>

      <!-- CARD 1: ENTITY DETAILS -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Entity details</div>

        <div class="form-grid" style="grid-template-columns:1fr;">

          <div class="form-row">
            <label class="label label-required">Entity name</label>
            ${inp(`f-name-${fid}`, 'text', entity?.entityName || '', etype === 'Trust' ? 'e.g. Smith Family Trust' : etype === 'SMSF' ? 'e.g. Smith Super Fund' : 'e.g. Acme Pty Ltd')}
          </div>

          <div class="form-row">
            <label class="label">ABN</label>
            ${inp(`f-abn-${fid}`, 'text', entity?.abn || '', '12 345 678 901')}
          </div>

          ${config.showACN ? `
            <div class="form-row">
              <label class="label">ACN</label>
              ${inp(`f-acn-${fid}`, 'text', entity?.acn || '', '123 456 789')}
            </div>
          ` : ''}

          <div class="form-row">
            <label class="label">Registered address</label>
            ${inp(`f-address-${fid}`, 'text', entity?.registeredAddress || '', '123 Collins St, Melbourne VIC 3000')}
          </div>

          <div class="form-row">
            <label class="label label-required">Nature of business / purpose of relationship</label>
            <textarea id="f-purpose-${fid}" class="inp" rows="2"
                      placeholder="e.g. Family trust for investment property — providing tax and accounting services"
            >${entity?.purposeOfRelationship || ''}</textarea>
          </div>

        </div>
      </div>

      <!-- CARD 2: ENTITY VERIFICATION -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Entity verification</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                  margin-bottom:var(--space-3);">
          Record how you confirmed this entity exists. No document upload required —
          just record what you checked.
        </p>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row">
            <label class="label label-required">Verified via</label>
            <select id="f-ver-source-${fid}" class="inp">
              ${config.verSources.map(s =>
                `<option ${entity?.entityVerSource === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-row">
            <label class="label label-required">Date verified</label>
            ${inp(`f-ver-date-${fid}`, 'date', entity?.entityVerDate || today)}
          </div>

          <div class="form-row span-2">
            <label class="label label-required">Verified by</label>
            <select id="f-ver-by-${fid}" class="inp">
              ${staffOptions(entity?.entityVerBy)}
            </select>
          </div>

        </div>
      </div>

      <!-- CARD 3: KEY PEOPLE -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Key people</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);
                  margin-bottom:var(--space-3);">
          ${config.whoToAdd}
          CDD (ID verification + screening) is recorded on each person's individual record.
        </p>

        ${keyPeople.length > 0 ? `
          <div style="margin-bottom:var(--space-4);">
            ${keyPeople.map(l => {
              const ind   = (S.individuals||[]).find(i => i.individualId === l.individualId);
              const label = ROLE_LABELS[l.roleType] || l.roleType;
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;
                            padding:var(--space-3);border:0.5px solid var(--color-border);
                            border-radius:var(--radius-lg);margin-bottom:var(--space-2);">
                  <div>
                    <div style="font-size:var(--font-size-sm);
                                font-weight:var(--font-weight-medium);">
                      ${ind?.fullName || 'Unknown'}
                    </div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                      ${label}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:var(--space-2);">
                    ${cddBadge(l.individualId)}
                    <button onclick="go('individual-detail',{individualId:'${l.individualId}'})"
                            class="btn-ghost"
                            style="font-size:var(--font-size-xs);color:var(--color-primary);">
                      View CDD →
                    </button>
                    <button onclick="removeKeyPerson('${l.linkId}')"
                            class="btn-ghost"
                            style="font-size:var(--font-size-xs);color:var(--color-danger);">
                      Remove
                    </button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        ` : ''}

        <!-- Add person -->
        <div style="border-top:${keyPeople.length > 0 ? '0.5px solid var(--color-border-light);padding-top:var(--space-3);' : ''}">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-row">
              <label class="label">Role</label>
              <select id="kp-role-${fid}" class="inp">
                ${config.roles.map(r =>
                  `<option value="${r}">${ROLE_LABELS[r] || r}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-row">
              <label class="label">Search by name</label>
              <input id="kp-search-${fid}" type="text" class="inp"
                     placeholder="Type to search existing individuals..."
                     oninput="kpSearch('${fid}', this.value)"
                     autocomplete="off">
            </div>
          </div>
          <div id="kp-results-${fid}" style="margin-bottom:var(--space-2);"></div>
          <button onclick="go('individual-new', {entryPoint:'entity', entityId:'${fid}'})"
                  class="btn-sec btn-sm">
            + Create new individual
          </button>
        </div>
      </div>

      <!-- CARD 4: RISK ASSESSMENT (optional) -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Client risk assessment
          <span style="font-size:var(--font-size-xs);font-weight:400;
                       color:var(--color-text-muted);margin-left:var(--space-2);">(optional)</span>
        </div>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:var(--space-3);">

          <div class="form-row">
            <label class="label">Risk rating</label>
            <select id="f-risk-rating-${fid}" class="inp"
                    onchange="entityRiskAutoNext('${fid}')">
              <option value="">Select...</option>
              ${['Low','Medium','High'].map(r =>
                `<option value="${r}" ${entity?.entityRiskRating === r ? 'selected' : ''}>${r}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-row">
            <label class="label">Assessed date</label>
            <input id="f-risk-date-${fid}" type="date" class="inp"
                   value="${entity?.riskAssessedDate || today}"
                   onchange="entityRiskAutoNext('${fid}')">
          </div>

          <div class="form-row">
            <label class="label">Next review date</label>
            ${inp(`f-risk-next-${fid}`, 'date', entity?.riskNextReviewDate || '')}
          </div>

          <div class="form-row">
            <label class="label">Methodology notes</label>
            <textarea id="f-risk-notes-${fid}" class="inp" rows="2"
                      placeholder="Risk factors considered..."
            >${entity?.riskMethodology || ''}</textarea>
          </div>

        </div>

        <div class="banner banner-info" style="margin-top:var(--space-3);">
          High risk: review every 12 months · Medium: 24 months · Low: 36 months
        </div>
      </div>

      <!-- SMR (existing only) -->
      ${!isNew ? `
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">SMR</div>
          <button onclick="go('smr',{filterEntity:'${fid}'})" class="btn-sec btn-sm">
            View SMRs involving this client
          </button>
        </div>
      ` : ''}

      <!-- ERROR + SAVE -->
      <div id="save-error-${fid}" class="banner banner-danger"
           style="display:none;margin-bottom:var(--space-3);"></div>

      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
        <button onclick="${isNew ? 'clearEntityType()' : "go('entities')"}"
                class="btn-sec" style="flex:1;">
          ${isNew ? 'Cancel' : '← Clients'}
        </button>
        <button onclick="saveEntityClient('${fid}','${etype}')"
                class="btn" style="flex:2;">
          Save client
        </button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.clearEntityType = function() {
  delete S._draft;
  S.currentParams = {};
  go('entity-new');
};

window.entityRiskAutoNext = function(fid) {
  const rating = document.getElementById(`f-risk-rating-${fid}`)?.value;
  const date   = document.getElementById(`f-risk-date-${fid}`)?.value;
  if (!rating || !date) return;
  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  const el = document.getElementById(`f-risk-next-${fid}`);
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

// Key person search
window.kpSearch = function(fid, query) {
  const el = document.getElementById(`kp-results-${fid}`);
  if (!el) return;
  if (!query || query.length < 2) { el.innerHTML = ''; return; }

  const entityId = S.currentParams?.entityId;
  const linked   = new Set(
    (S.links || [])
      .filter(l => l.linkedObjectId === entityId && l.status === 'active')
      .map(l => l.individualId)
  );

  const q       = query.toLowerCase();
  const matches = (S.individuals || [])
    .filter(i => !i.isStaff && !linked.has(i.individualId) && i.fullName?.toLowerCase().includes(q))
    .slice(0, 6);

  if (!matches.length) {
    el.innerHTML = `
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);padding:var(--space-2) 0;">
        No results — use "Create new individual" below.
      </p>`;
    return;
  }

  el.innerHTML = matches.map(i => `
    <div onclick="kpAdd('${fid}','${i.individualId}','${i.fullName.replace(/'/g,"\\'")}')"
         style="display:flex;align-items:center;justify-content:space-between;
                padding:var(--space-3);border:0.5px solid var(--color-border);
                border-radius:var(--radius-md);cursor:pointer;margin-bottom:4px;
                background:var(--color-surface);"
         onmouseover="this.style.background='var(--color-surface-alt)'"
         onmouseout="this.style.background='var(--color-surface)'">
      <span style="font-size:var(--font-size-sm);">${i.fullName}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-primary);
                   font-weight:var(--font-weight-medium);">+ Add</span>
    </div>`).join('');
};

// Add key person from search result (existing client only)
window.kpAdd = async function(fid, individualId, name) {
  const entityId = S.currentParams?.entityId;
  if (!entityId) { toast('Save the entity first before adding people', 'err'); return; }

  const roleType = document.getElementById(`kp-role-${fid}`)?.value;
  if (!roleType) { toast('Select a role first', 'err'); return; }

  try {
    const now = new Date().toISOString();
    const lid = genId('link');
    const linkData = {
      linkId: lid, individualId,
      linkedObjectType: 'entity', linkedObjectId: entityId,
      roleType, status: 'active',
      startDate: now, createdAt: now, updatedAt: now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'key_person_added', targetType: 'entity', targetId: entityId,
      targetName: S.entities?.find(e=>e.entityId===entityId)?.entityName || '',
      detail: `${name} added as ${ROLE_LABELS[roleType] || roleType}`,
      timestamp: now,
    });
    toast(`${name} added`);
    // Clear search
    const s = document.getElementById(`kp-search-${fid}`);
    const r = document.getElementById(`kp-results-${fid}`);
    if (s) s.value = '';
    if (r) r.innerHTML = '';
    render();
  } catch (err) {
    toast('Failed to add person. Please try again.', 'err');
    console.error(err);
  }
};

// Remove key person
window.removeKeyPerson = async function(linkId) {
  if (!confirm('Remove this person from the entity? Their individual record is preserved.')) return;
  try {
    const { updateLink } = await import('../../firebase/firestore.js');
    const now = new Date().toISOString();
    await updateLink(linkId, { status: 'former', endDate: now });
    const link = (S.links||[]).find(l => l.linkId === linkId);
    if (link) { link.status = 'former'; link.endDate = now; }
    toast('Person removed — individual record preserved');
    render();
  } catch (err) {
    toast('Failed to remove. Please try again.', 'err');
    console.error(err);
  }
};

// ── SINGLE SAVE ────────────────────────────────────────────────────────────────
window.saveEntityClient = async function(fid, etype) {
  const name      = document.getElementById(`f-name-${fid}`)?.value?.trim();
  const purpose   = document.getElementById(`f-purpose-${fid}`)?.value?.trim();
  const verSource = document.getElementById(`f-ver-source-${fid}`)?.value;
  const verDate   = document.getElementById(`f-ver-date-${fid}`)?.value;
  const verBy     = document.getElementById(`f-ver-by-${fid}`)?.value;

  const errEl = document.getElementById(`save-error-${fid}`);
  const fail  = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    else toast(msg, 'err');
    window.scrollTo(0, 0);
  };
  if (errEl) errEl.style.display = 'none';

  if (!name)      return fail('Entity name is required.');
  if (!purpose)   return fail('Nature of business / purpose of relationship is required.');
  if (!verBy)     return fail('Verified by is required.');
  if (!verDate)   return fail('Date verified is required.');

  const isNew    = fid === 'new';
  const entityId = isNew ? null : S.currentParams?.entityId;
  const now      = new Date().toISOString();
  const config   = ENTITY_CONFIG[etype] || ENTITY_CONFIG['Private Company'];

  // Read all fields
  const abn       = document.getElementById(`f-abn-${fid}`)?.value?.trim()      || '';
  const acn       = document.getElementById(`f-acn-${fid}`)?.value?.trim()       || '';
  const address   = document.getElementById(`f-address-${fid}`)?.value?.trim()   || '';
  const riskRating= document.getElementById(`f-risk-rating-${fid}`)?.value       || '';
  const riskDate  = document.getElementById(`f-risk-date-${fid}`)?.value          || '';
  const riskNext  = document.getElementById(`f-risk-next-${fid}`)?.value          || '';
  const riskNotes = document.getElementById(`f-risk-notes-${fid}`)?.value?.trim() || '';

  try {
    if (isNew) {
      // ── CREATE ──────────────────────────────────────────────────────────────
      const eid = genId('ent');
      const entityData = {
        entityId: eid, firmId: S.firmId,
        entityName: name, entityType: etype,
        abn, acn, registeredAddress: address,
        purposeOfRelationship: purpose,
        entityVerSource: verSource,
        entityVerDate:   verDate,
        entityVerBy:     verBy,
        entityRiskRating:   riskRating || null,
        riskAssessedBy:     verBy,
        riskAssessedDate:   riskDate,
        riskNextReviewDate: riskNext,
        riskMethodology:    riskNotes,
        createdAt: now, updatedAt: now,
      };
      await saveEntity(eid, entityData);
      addEntityToState(entityData);
      await saveAuditEntry({
        firmId: S.firmId, userId: S.individualId,
        userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
        action: 'entity_created', targetType: 'entity',
        targetId: eid, targetName: name,
        detail: `Client created — ${name} (${etype}) — verified via ${verSource} by ${verBy}`,
        timestamp: now,
      });
      delete S._draft;
      toast('Client saved');
      go('entity-detail', { entityId: eid });

    } else {
      // ── UPDATE ──────────────────────────────────────────────────────────────
      const { updateEntity } = await import('../../firebase/firestore.js');
      const fields = {
        entityName: name, abn, acn,
        registeredAddress: address,
        purposeOfRelationship: purpose,
        entityVerSource: verSource,
        entityVerDate:   verDate,
        entityVerBy:     verBy,
        entityRiskRating:   riskRating || null,
        riskAssessedBy:     verBy,
        riskAssessedDate:   riskDate,
        riskNextReviewDate: riskNext,
        riskMethodology:    riskNotes,
        updatedAt: now,
      };
      await updateEntity(entityId, fields);
      const entity = S.entities.find(e => e.entityId === entityId);
      if (entity) Object.assign(entity, fields);
      await saveAuditEntry({
        firmId: S.firmId, userId: S.individualId,
        userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
        action: 'entity_updated', targetType: 'entity',
        targetId: entityId, targetName: name,
        detail: `Client updated — ${name}`,
        timestamp: now,
      });
      toast('Client saved');
      render();
    }
  } catch (err) {
    fail('Failed to save. Please try again.');
    console.error(err);
  }
};
