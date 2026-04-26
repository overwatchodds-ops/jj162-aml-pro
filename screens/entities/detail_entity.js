// ─── ENTITY CLIENT DETAIL ─────────────────────────────────────────────────────
// Handles: Private Company, Trust, SMSF, Partnership,
//          Incorporated Association, Charity / NFP
//
// One screen, always-editable, one Save button.
// Key people are linked individuals — CDD lives on their individual record.
// fid = entityId || 'new'

import {
  S,
  addEntityToState,
  addLinkToState,
} from '../../state/index.js';

import { ROLE_LABELS, ENTITY_ROLES } from '../../state/rules_matrix.js';

import {
  saveEntity, updateEntity,
  saveLink, updateLink,
  saveAuditEntry,
  genId,
} from '../../firebase/firestore.js';

// ─── CONFIG: per entity type ──────────────────────────────────────────────────
const ENTITY_CONFIG = {
  'Private Company': {
    verSources: ['ASIC Connect search', 'ABN Lookup', 'Company constitution sighted', 'Other'],
    roles:      ENTITY_ROLES.company,
    whoToAdd:   'Add all directors, beneficial owners/controllers (people who own 25% or more or otherwise control the company), the secretary if relevant, and anyone authorised to act for the company.',
    showACN:    true,
  },
  'Trust': {
    verSources: ['Trust deed sighted', 'ABN Lookup', 'Other'],
    roles:      ENTITY_ROLES.trust,
    whoToAdd:   'Add all trustees, any corporate trustee, the appointor, settlor, guardian/protector if named, and all named beneficiaries. If beneficiaries are described as a class rather than individually named, record the beneficiary class description instead. For corporate trustees, also record the relevant directors/beneficial owners.',
    showACN:    false,
  },
  'SMSF': {
    verSources: ['ATO ABN Lookup', 'Trust deed sighted', 'Other'],
    roles:      ENTITY_ROLES.smsf,
    whoToAdd:   'Add all individual trustees/members. If the SMSF has a corporate trustee, add the relevant corporate trustee directors/controllers.',
    showACN:    false,
  },
  'Partnership': {
    verSources: ['Partnership agreement sighted', 'ABN Lookup', 'Other'],
    roles:      ENTITY_ROLES.partnership,
    whoToAdd:   'Add all partners and anyone authorised to act for the partnership. For corporate partners, record the relevant directors/beneficial owners/controllers.',
    showACN:    false,
  },
  'Incorporated Association': {
    verSources: ['State register search', 'ABN Lookup', 'Constitution sighted', 'Other'],
    roles:      ENTITY_ROLES.association,
    whoToAdd:   'Add responsible persons, committee members or office holders, and anyone authorised to act for the association.',
    showACN:    false,
  },
  'Charity / NFP': {
    verSources: ['ACNC register search', 'ABN Lookup', 'Other'],
    roles:      ENTITY_ROLES.charity,
    whoToAdd:   'Add responsible persons, board members or office holders, and anyone authorised to act for the charity or NFP.',
    showACN:    false,
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
  return `<input id="${id}" type="${type}" class="inp" value="${value}" placeholder="${placeholder}">`;
}

function addMonthsISO(dateValue = '', monthsToAdd = 0) {
  if (!dateValue) return '';
  const [yyyy, mm, dd] = String(dateValue).split('-').map(Number);
  if (!yyyy || !mm || !dd) return '';
  const result = new Date(yyyy, (mm - 1) + monthsToAdd, dd);
  if (result.getDate() !== dd) result.setDate(0);
  return result.toISOString().split('T')[0];
}

function cddStateForIndividual(individualId) {
  const hasVer = (S.verifications || []).some(v => v.individualId === individualId);
  const hasScr = (S.screenings  || []).some(s => s.individualId === individualId && s.result);
  const missing = [];
  if (!hasVer) missing.push('ID');
  if (!hasScr) missing.push('Screening');
  return { complete: hasVer && hasScr, missing };
}

function cddBadge(individualId) {
  const state = cddStateForIndividual(individualId);
  return state.complete
    ? `<span class="badge badge-success">CDD complete</span>`
    : `<span class="badge badge-danger">Missing: ${state.missing.join(' + ')}</span>`;
}

function getEligibleIndividuals(entityId, query = '') {
  const linked = new Set(
    (S.links || [])
      .filter(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active')
      .map(l => l.individualId)
  );
  const q = String(query || '').trim().toLowerCase();
  let pool = (S.individuals || []).filter(i => !i.isStaff && !linked.has(i.individualId));
  if (q) {
    pool = pool.filter(i =>
      (i.fullName || '').toLowerCase().includes(q) ||
      (i.email    || '').toLowerCase().includes(q)
    );
  }
  return pool.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')).slice(0, 8);
}

function renderKPResults(fid, matches) {
  const el = document.getElementById(`kp-results-${fid}`);
  if (!el) return;
  if (!matches.length) {
    el.innerHTML = `
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);padding:var(--space-2) 0;">
        No matches — use "+ Create new individual" below if this person doesn't exist yet.
      </p>`;
    return;
  }
  el.innerHTML = matches.map(i => `
    <div onclick="kpAdd('${fid}','${i.individualId}','${(i.fullName || '').replace(/'/g, "\\'")}')"
         style="display:flex;align-items:center;justify-content:space-between;
                padding:var(--space-3);border:0.5px solid var(--color-border);
                border-radius:var(--radius-md);cursor:pointer;margin-bottom:4px;
                background:var(--color-surface);"
         onmouseover="this.style.background='var(--color-surface-alt)'"
         onmouseout="this.style.background='var(--color-surface)'">
      <div>
        <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">
          ${i.fullName || 'Unnamed'}
        </div>
        <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
          ${i.email || 'No email recorded'}
        </div>
      </div>
      <span style="font-size:var(--font-size-xs);color:var(--color-primary);
                   font-weight:var(--font-weight-medium);">+ Add existing</span>
    </div>`).join('');
}

function currentUserName() {
  return S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User';
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

  const keyPeople          = entity
    ? (S.links || []).filter(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active')
    : [];
  const incompleteCDDCount = keyPeople.filter(l => !cddStateForIndividual(l.individualId).complete).length;
  const allCDD             = keyPeople.length > 0 && incompleteCDDCount === 0;

  return `
    <div>

      <!-- HEADER -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="${isNew ? 'clearEntityType()' : "go('entities')"}"
                  class="btn-ghost"
                  style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isNew ? 'Change type' : 'Clients'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">
            ${isNew ? 'New ' + etype : entity.entityName}
          </h1>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1);flex-wrap:wrap;">
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${etype}</span>
            ${!isNew ? `
              ${riskBadge(entity.entityRiskRating)}
              ${keyPeople.length === 0
                ? `<span class="badge badge-warning">No key people</span>`
                : allCDD
                  ? `<span class="badge badge-success">CDD complete</span>`
                  : `<span class="badge badge-danger">${incompleteCDDCount} key ${incompleteCDDCount === 1 ? 'person' : 'people'} incomplete</span>`}
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
            ${inp(`f-name-${fid}`, 'text', entity?.entityName || '',
              etype === 'Trust' ? 'e.g. Smith Family Trust' :
              etype === 'SMSF'  ? 'e.g. Smith Super Fund'   : 'e.g. Acme Pty Ltd')}
          </div>

          <div class="form-row">
            <label class="label ${etype === 'Private Company' ? 'label-required' : ''}">ABN</label>
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

          ${etype === 'Trust' ? `
            <div class="form-row">
              <label class="label">Beneficiary class description, if applicable</label>
              <textarea id="f-beneficiary-class-${fid}" class="inp" rows="2"
                        placeholder="e.g. children and future descendants of the Smith family; charitable beneficiaries; unit holders as recorded in the trust deed"
              >${entity?.beneficiaryClassDescription || ''}</textarea>
            </div>
          ` : ''}

        </div>
      </div>

      <!-- CARD 2: ENTITY VERIFICATION -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">Entity verification</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          Record how you confirmed this entity exists. No document upload required — just record what you checked.
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
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          ${config.whoToAdd} CDD (ID verification + screening) is recorded on each person's individual record.
        </p>

        ${isNew ? `
          <div class="banner banner-info">
            Save this entity first, then you can add key people.
          </div>
        ` : `
          ${keyPeople.length > 0 ? `
            <div style="margin-bottom:var(--space-4);">
              ${keyPeople.map(l => {
                const ind   = (S.individuals || []).find(i => i.individualId === l.individualId);
                const label = ROLE_LABELS[l.roleType] || l.roleType;
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;
                              padding:var(--space-3);border:0.5px solid var(--color-border);
                              border-radius:var(--radius-lg);margin-bottom:var(--space-2);">
                    <div>
                      <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">
                        ${ind?.fullName || 'Unknown'}
                      </div>
                      <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                        ${label}
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;justify-content:flex-end;">
                      ${cddBadge(l.individualId)}
                      <button onclick="viewKeyPersonCDD('${l.individualId}')"
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

          <div style="${keyPeople.length > 0 ? 'border-top:0.5px solid var(--color-border-light);padding-top:var(--space-3);' : ''}">
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
                       placeholder="Type 2+ letters to search existing individuals..."
                       oninput="kpSearch('${fid}', this.value)"
                       autocomplete="off">
              </div>
            </div>
            <div id="kp-results-${fid}" style="margin-bottom:var(--space-2);"></div>
            <button onclick="addNewIndividualToEntity('${fid}')" class="btn-sec btn-sm">
              + Create new individual
            </button>
          </div>
        `}
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
            <select id="f-risk-rating-${fid}" class="inp" onchange="entityRiskAutoNext('${fid}')">
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
  const el     = document.getElementById(`f-risk-next-${fid}`);
  if (!el || !rating || !date) return;
  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  el.value = addMonthsISO(date, months);
};

window.kpSearch = function(fid, query) {
  const entityId = S.currentParams?.entityId;
  const el = document.getElementById(`kp-results-${fid}`);
  if (!el || !entityId) return;
  if (String(query || '').trim().length < 2) { el.innerHTML = ''; return; }
  renderKPResults(fid, getEligibleIndividuals(entityId, query));
};

window.kpAdd = async function(fid, individualId, name) {
  const entityId = S.currentParams?.entityId;
  if (!entityId) { toast('Save the entity first before adding people', 'err'); return; }

  const roleType = document.getElementById(`kp-role-${fid}`)?.value;
  if (!roleType) { toast('Select a role first', 'err'); return; }

  const alreadyLinked = (S.links || []).some(l =>
    l.individualId     === individualId &&
    l.linkedObjectId   === entityId     &&
    l.linkedObjectType === 'entity'     &&
    l.status           === 'active'
  );
  if (alreadyLinked) { toast('This individual is already linked to this client.', 'err'); return; }

  try {
    const now     = new Date().toISOString();
    const lid     = genId('link');
    const linkData = {
      linkId: lid, individualId, firmId: S.firmId,
      linkedObjectType: 'entity', linkedObjectId: entityId,
      roleType, status: 'active',
      startDate: now, createdAt: now, updatedAt: now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId, userName: currentUserName(),
      action: 'key_person_added', targetType: 'entity', targetId: entityId,
      targetName: S.entities?.find(e => e.entityId === entityId)?.entityName || '',
      detail: `${name} added as ${ROLE_LABELS[roleType] || roleType}`,
      timestamp: now,
    });
    toast(`${name} added`);
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

window.removeKeyPerson = async function(linkId) {
  if (!confirm('Remove this person from the entity? Their individual record is preserved.')) return;
  try {
    const now  = new Date().toISOString();
    await updateLink(linkId, { status: 'former', endDate: now });
    const link = (S.links || []).find(l => l.linkId === linkId);
    if (link) { link.status = 'former'; link.endDate = now; }
    toast('Person removed — individual record preserved');
    render();
  } catch (err) {
    toast('Failed to remove. Please try again.', 'err');
    console.error(err);
  }
};

window.viewKeyPersonCDD = function(individualId) {
  const selfLink = (S.links || []).find(l =>
    l.individualId     === individualId &&
    l.linkedObjectType === 'entity'     &&
    l.roleType         === 'self'       &&
    l.status           === 'active'
  );
  if (selfLink) {
    go('entity-detail', { entityId: selfLink.linkedObjectId });
  } else {
    go('entity-detail', {
      isNew:                true,
      entityType:           'Individual',
      returnToEntity:       S.currentParams?.entityId,
      existingIndividualId: individualId,
      roleType:             document.getElementById(`kp-role-${S.currentParams?.entityId || 'new'}`)?.value || '',
    });
  }
};

window.addNewIndividualToEntity = function(fid) {
  const entityId = S.currentParams?.entityId;
  if (!entityId) { toast('Save the entity first, then add people', 'err'); return; }
  go('entity-detail', {
    isNew:         true,
    entityType:    'Individual',
    returnToEntity: entityId,
    roleType:      document.getElementById(`kp-role-${fid}`)?.value || '',
  });
};

window.saveEntityClient = async function(fid, etype) {
  const g = id => document.getElementById(id);

  const name      = g(`f-name-${fid}`)?.value?.trim();
  const abn       = g(`f-abn-${fid}`)?.value?.trim()      || '';
  const acn       = g(`f-acn-${fid}`)?.value?.trim()      || '';
  const address   = g(`f-address-${fid}`)?.value?.trim()  || '';
  const purpose   = g(`f-purpose-${fid}`)?.value?.trim();
  const verSource = g(`f-ver-source-${fid}`)?.value       || '';
  const verDate   = g(`f-ver-date-${fid}`)?.value;
  const verBy     = g(`f-ver-by-${fid}`)?.value;
  const riskRating= g(`f-risk-rating-${fid}`)?.value      || '';
  const riskDate  = g(`f-risk-date-${fid}`)?.value        || '';
  const riskNext  = g(`f-risk-next-${fid}`)?.value        || '';
  const riskNotes = g(`f-risk-notes-${fid}`)?.value?.trim()|| '';

  const beneficiaryClassDescription =
    etype === 'Trust'
      ? (g(`f-beneficiary-class-${fid}`)?.value?.trim() || '')
      : '';

  const errEl = document.getElementById(`save-error-${fid}`);
  const fail  = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    else toast(msg, 'err');
    window.scrollTo(0, 0);
  };
  if (errEl) errEl.style.display = 'none';

  if (!name)    return fail('Entity name is required.');
  if (etype === 'Private Company' && !abn) return fail('ABN is required for a Private Company.');
  if (!purpose) return fail('Nature of business / purpose of relationship is required.');
  if (!verBy)   return fail('Verified by is required.');
  if (!verDate) return fail('Date verified is required.');

  const isNew    = fid === 'new';
  const entityId = isNew ? null : S.currentParams?.entityId;
  const now      = new Date().toISOString();
  const firmId   = S.firmId;

  const entityFields = {
    entityName:            name,
    entityType:            etype,
    abn, acn,
    registeredAddress:     address,
    purposeOfRelationship: purpose,
    beneficiaryClassDescription,
    entityVerSource:       verSource,
    entityVerDate:         verDate,
    entityVerBy:           verBy,
    entityRiskRating:      riskRating || null,
    riskAssessedBy:        verBy,
    riskAssessedDate:      riskDate,
    riskNextReviewDate:    riskNext,
    riskMethodology:       riskNotes,
  };

  try {
    if (isNew) {
      const eid        = genId('ent');
      const entityData = { entityId: eid, firmId, createdAt: now, updatedAt: now, ...entityFields };
      await saveEntity(eid, entityData);
      addEntityToState(entityData);
      await saveAuditEntry({
        firmId, userId: S.individualId, userName: currentUserName(),
        action: 'entity_created', targetType: 'entity', targetId: eid, targetName: name,
        detail: `Client created — ${name} (${etype}) — verified via ${verSource} by ${verBy}`,
        timestamp: now,
      });
      delete S._draft;
      toast('Client saved');
      go('entity-detail', { entityId: eid });

    } else {
      await updateEntity(entityId, { ...entityFields, updatedAt: now });
      const entityInState = S.entities.find(e => e.entityId === entityId);
      if (entityInState) Object.assign(entityInState, entityFields);
      await saveAuditEntry({
        firmId, userId: S.individualId, userName: currentUserName(),
        action: 'entity_updated', targetType: 'entity', targetId: entityId, targetName: name,
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
