import { S, addEntityToState, addLinkToState, addIndividualToState } from '../../state/index.js';
import { ROLE_LABELS, ENTITY_ROLES }                                  from '../../state/rules_matrix.js';
import {
  saveEntity, saveLink, saveIndividual, saveAuditEntry,
  genId, fmtDate,
} from '../../firebase/firestore.js';

// ─── ENTITY OR CLIENT BUSINESS TYPES ─────────────────────────────────────────────────────────────
const ENTITY_TYPES = [
  'Individual',
  'Sole Trader',
  'Private Company',
  'Partnership',
  'Trust',
  'SMSF',
  'Incorporated Association',
  'Charity / NFP',
];

// Maps entity type to ENTITY_ROLES key
function entitySubtype(entityType) {
  const map = {
    'Individual':               'individual',
    'Sole Trader':              'soletrader',
    'Private Company':          'company',
    'Partnership':              'partnership',
    'Trust':                    'trust',
    'SMSF':                     'smsf',
    'Incorporated Association': 'association',
    'Charity / NFP':            'charity',
  };
  return map[entityType] || 'other';
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { entityId, tab } = S.currentParams || {};
  const isEdit  = !!entityId;
  const entity  = isEdit ? S.entities.find(e => e.entityId === entityId) : null;
  const d       = S._draft || (isEdit ? { ...entity } : {});
  const activeTab = tab || 'details';

  const tabs = [
    { key: 'details', label: 'Details'  },
    { key: 'risk',    label: 'Risk'     },
    { key: 'members', label: 'Members'  },
  ];

  return `
    <div>
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="cancelEntity()" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isEdit ? 'Client' : 'Back'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${isEdit ? 'Edit — ' + (entity?.entityName || '') : 'New client'}</h1>
        </div>
        ${isEdit ? `<span style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);color:var(--color-warning-text);background:var(--color-warning-light);border:0.5px solid var(--color-warning-border);padding:2px 10px;border-radius:var(--radius-pill);">Editing — previous version preserved</span>` : ''}
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:2px;border-bottom:0.5px solid var(--color-border);margin-bottom:var(--space-5);">
        ${tabs.map(t => `
          <button
            onclick="entityTab('${t.key}')"
            style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);padding:var(--space-2) var(--space-3);border:none;background:none;cursor:pointer;white-space:nowrap;font-family:var(--font-family);
              color:${activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)'};
              border-bottom:${activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent'};
              margin-bottom:-0.5px;"
          >${t.label}</button>
        `).join('')}
      </div>

      <!-- Tab content -->
      ${activeTab === 'details' ? tabDetails(d, isEdit) : ''}
      ${activeTab === 'risk'    ? tabRisk(d, isEdit, entityId) : ''}
      ${activeTab === 'members' ? tabMembers(d, isEdit, entityId) : ''}

      <!-- Save / Cancel -->
      ${activeTab === 'details' ? `
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
          <button onclick="cancelEntity()" class="btn-sec" style="flex:1;">Cancel</button>
          <button onclick="saveEntityRecord()" class="btn" style="flex:2;">
            ${isEdit ? 'Save changes' : 'Save client'}
          </button>
        </div>
      ` : ''}
    </div>`;
}

// ─── TAB: DETAILS ─────────────────────────────────────────────────────────────
function tabDetails(d, isEdit) {
  const etype = d.entityType || '';

  return `
    <div class="card">
      <div class="section-heading">Client details</div>
      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Client name</label>
          <input id="ent-name" type="text" class="inp" value="${d.entityName||''}" placeholder="e.g. Acme Pty Ltd">
        </div>

        <div class="form-row">
          <label class="label label-required">Client type</label>
          <select id="ent-type" class="inp" onchange="entityTypeChange()">
            <option value="">Select...</option>
            ${ENTITY_TYPES.map(t => `<option value="${t}" ${etype===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>

        <div class="form-row" id="ent-abn-row" style="display:${etype==='Individual'?'none':'block'};">
          <label class="label">ABN${etype==='Sole Trader'?' <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span>':''}</label>
          <input id="ent-abn" type="text" class="inp" value="${d.abn||''}" placeholder="12 345 678 901">
        </div>

        <div class="form-row" id="ent-acn-row" style="display:${etype==='Private Company'?'block':'none'};">
          <label class="label">ACN</label>
          <input id="ent-acn" type="text" class="inp" value="${d.acn||''}" placeholder="123 456 789">
        </div>

        <div class="form-row">
          <label class="label">Registered address</label>
          <input id="ent-address" type="text" class="inp" value="${d.registeredAddress||''}" placeholder="123 Collins St, Melbourne VIC 3000">
        </div>

        <div class="form-row" id="ent-inc-row" style="display:${etype==='Private Company'?'block':'none'};">
          <label class="label">Incorporation date</label>
          <input id="ent-inc-date" type="date" class="inp" value="${d.incorporationDate||''}">
        </div>

        <div class="form-row">
          <label class="label">Country of origin</label>
          <input id="ent-country" type="text" class="inp" value="${d.countryOfOrigin||'Australia'}" placeholder="Australia">
        </div>

        <div class="form-row">
          <label class="label">Status</label>
          <select id="ent-status" class="inp">
            ${['Active','Inactive','Dissolved'].map(s => `<option value="${s.toLowerCase()}" ${(d.status||'active')===s.toLowerCase()?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label">Notes</label>
          <textarea id="ent-notes" class="inp" rows="3" placeholder="Any additional notes...">${d.notes||''}</textarea>
        </div>

      </div>
      <div id="ent-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
    </div>`;
}

// ─── TAB: RISK ────────────────────────────────────────────────────────────────
function tabRisk(d, isEdit, entityId) {
  return `
    <div class="card">
      <div class="section-heading">Client risk assessment</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Assess the risk of this client relationship. Risk rating determines review cadence and drives compliance requirements for high-risk clients.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Risk rating</label>
          <select id="risk-rating" class="inp" onchange="entityRiskChange()">
            <option value="">Select...</option>
            <option value="Low"    ${d.entityRiskRating==='Low'   ?'selected':''}>Low</option>
            <option value="Medium" ${d.entityRiskRating==='Medium'?'selected':''}>Medium</option>
            <option value="High"   ${d.entityRiskRating==='High'  ?'selected':''}>High</option>
          </select>
        </div>

        <div class="form-row">
          <label class="label label-required">Assessed by</label>
          <input id="risk-by" type="text" class="inp" value="${d.riskAssessedBy||''}" placeholder="Staff member name">
        </div>

        <div class="form-row">
          <label class="label label-required">Assessed date</label>
          <input id="risk-date" type="date" class="inp" value="${d.riskAssessedDate || new Date().toISOString().split('T')[0]}" onchange="entityRiskChange()">
        </div>

        <div class="form-row">
          <label class="label">Next review date</label>
          <input id="risk-next-review" type="date" class="inp" value="${d.riskNextReviewDate||''}">
        </div>

        <div class="form-row">
          <label class="label">Risk factors / methodology notes</label>
          <textarea id="risk-methodology" class="inp" rows="4" placeholder="Describe the risk factors considered and methodology used...">${d.riskMethodology||''}</textarea>
        </div>

      </div>

      <div class="banner banner-info" style="margin-top:var(--space-4);">
        <div class="banner-title">Review cadence</div>
        High risk: review every 12 months · Medium risk: 24 months · Low risk: 36 months
      </div>

      <div id="risk-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <button onclick="saveEntityRisk('${entityId}')" class="btn btn-sm" style="margin-top:var(--space-4);">Save risk assessment</button>
    </div>`;
}

// ─── TAB: MEMBERS ─────────────────────────────────────────────────────────────
function tabMembers(d, isEdit, entityId) {
  const entity      = S.entities.find(e => e.entityId === entityId);
  const entityType  = entity?.entityType || d.entityType || '';
  const subtype     = entitySubtype(entityType);
  const roles       = ENTITY_ROLES[subtype] || ENTITY_ROLES.other;

  const existingLinks = isEdit
    ? S.links.filter(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active')
    : [];

  const pendingMembers = S._draft?._pendingMembers || [];

  return `
    <div class="card">
      <div class="section-heading">Members</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Add individuals to this entity. Search existing individuals first — create new ones if not found.</p>

      <!-- Existing members -->
      ${existingLinks.length > 0 ? `
        <div style="margin-bottom:var(--space-4);">
          <div class="section-heading">Current members</div>
          ${existingLinks.map(l => {
            const ind   = S.individuals.find(i => i.individualId === l.individualId);
            const label = ROLE_LABELS[l.roleType] || l.roleType;
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);">
                <div>
                  <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${ind?.fullName || 'Unknown'}</div>
                  <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label}</div>
                </div>
                <button onclick="endEntityMember('${l.linkId}')" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">End role</button>
              </div>`;
          }).join('')}
        </div>
      ` : ''}

      <!-- Pending members (new, not yet saved) -->
      ${pendingMembers.length > 0 ? `
        <div style="margin-bottom:var(--space-4);">
          <div class="section-heading">Pending — not yet saved</div>
          ${pendingMembers.map((m, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-primary-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);background:var(--color-primary-light);">
              <div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${m.name}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-primary-text);">${ROLE_LABELS[m.roleType] || m.roleType} · pending save</div>
              </div>
              <button onclick="removePendingMember(${i})" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">Remove</button>
            </div>`).join('')}
          <button onclick="savePendingMembers('${entityId}')" class="btn btn-sm">Save members</button>
        </div>
      ` : ''}

      <!-- Add member -->
      <div style="border-top:0.5px solid var(--color-border);padding-top:var(--space-4);">
        <div class="section-heading">Add a person</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">Search by name. Click a result to add them. Can't find them? Create a new individual.</p>

        <div class="form-row">
          <label class="label label-required">Role</label>
          <select id="member-role" class="inp">
            ${roles.map(r => `<option value="${r}">${ROLE_LABELS[r] || r}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label">Ownership %</label>
          <input id="member-ownership" type="number" class="inp" placeholder="e.g. 50 (for shareholders only)" min="0" max="100">
        </div>

        <div class="form-row">
          <label class="label">Search by name</label>
          <input
            id="member-search"
            type="text"
            class="inp"
            placeholder="Start typing a name..."
            oninput="memberSearchFilter(this.value)"
            autocomplete="off"
          >
        </div>

        <div id="member-search-results" style="margin-bottom:var(--space-3);"></div>

        <button onclick="addNewMember()" class="btn-sec btn-sm">+ Create new individual</button>
      </div>

    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.entityTab = function(tab) {
  S.currentParams = { ...S.currentParams, tab };
  render();
};

window.cancelEntity = function() {
  delete S._draft;
  const { entityId } = S.currentParams || {};
  go(entityId ? 'entity-detail' : 'entities', entityId ? { entityId } : {});
};

window.entityTypeChange = function() {
  const etype      = document.getElementById('ent-type')?.value;
  const isCompany  = etype === 'Private Company';
  const isIndividual = etype === 'Individual';

  // ABN — hidden for Individual only
  const abnRow = document.getElementById('ent-abn-row');
  if (abnRow) {
    abnRow.style.display = isIndividual ? 'none' : 'block';
    const abnLabel = abnRow.querySelector('label');
    if (abnLabel) abnLabel.innerHTML = etype === 'Sole Trader'
      ? 'ABN <span style="color:var(--color-text-muted);font-weight:400;">(optional)</span>'
      : 'ABN';
  }

  // ACN + Incorporation date — Private Company only
  const acnRow = document.getElementById('ent-acn-row');
  const incRow = document.getElementById('ent-inc-row');
  if (acnRow) acnRow.style.display = isCompany ? 'block' : 'none';
  if (incRow) incRow.style.display = isCompany ? 'block' : 'none';
};

window.entityRiskChange = function() {
  const rating = document.getElementById('risk-rating')?.value;
  const date   = document.getElementById('risk-date')?.value;
  if (!rating || !date) return;

  const months = rating === 'High' ? 12 : rating === 'Medium' ? 24 : 36;
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  const el = document.getElementById('risk-next-review');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.memberSearchFilter = function(query) {
  const resultsEl = document.getElementById('member-search-results');
  if (!resultsEl) return;
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }

  const q       = query.toLowerCase();
  const pending = S._draft?._pendingMembers || [];
  const pendingIds = pending.map(m => m.individualId);

  // Filter out staff (isStaff) and already-pending members
  const matches = (S.individuals || [])
    .filter(i => !i.isStaff && i.fullName?.toLowerCase().includes(q) && !pendingIds.includes(i.individualId))
    .slice(0, 6);

  if (!matches.length) {
    resultsEl.innerHTML = `
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);padding:var(--space-2) 0;">
        No results for "${query}". Use "Create new individual" below.
      </p>`;
    return;
  }

  resultsEl.innerHTML = matches.map(i => `
    <div
      onclick="addMemberFromSearch('${i.individualId}','${i.fullName.replace(/'/g,"\\'")}', this)"
      style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;margin-bottom:4px;background:var(--color-surface);"
      onmouseover="this.style.background='var(--color-surface-alt)'"
      onmouseout="this.style.background='var(--color-surface)'"
    >
      <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">${i.fullName}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-primary);font-weight:var(--font-weight-medium);">+ Add</span>
    </div>`).join('');
};

window.addMemberFromSearch = function(individualId, name, el) {
  const roleType  = document.getElementById('member-role')?.value;
  const ownership = document.getElementById('member-ownership')?.value;

  if (!roleType) { toast('Select a role first', 'err'); return; }

  if (!S._draft) S._draft = {};
  if (!S._draft._pendingMembers) S._draft._pendingMembers = [];

  // Check not already added
  if (S._draft._pendingMembers.find(m => m.individualId === individualId)) {
    toast('This person is already in the list', 'err');
    return;
  }

  S._draft._pendingMembers.push({
    individualId,
    name,
    roleType,
    ownershipPercent: ownership ? Number(ownership) : null,
    startDate: new Date().toISOString().split('T')[0],
    isNew: false,
  });

  // Clear search
  const searchEl = document.getElementById('member-search');
  const resultsEl = document.getElementById('member-search-results');
  if (searchEl) searchEl.value = '';
  if (resultsEl) resultsEl.innerHTML = '';

  render();
};

window.addNewMember = function() {
  const { entityId } = S.currentParams || {};
  go('individual-new', { entryPoint: 'entity', entityId });
};

window.removePendingMember = function(i) {
  if (S._draft?._pendingMembers) S._draft._pendingMembers.splice(i, 1);
  render();
};

window.savePendingMembers = async function(entityId) {
  const pending = S._draft?._pendingMembers || [];
  if (!pending.length) { toast('No pending members to save', 'err'); return; }

  const now = new Date().toISOString();
  for (const m of pending) {
    const lid = genId('link');
    const linkData = {
      linkId:           lid,
      individualId:     m.individualId,
      linkedObjectType: 'entity',
      linkedObjectId:   entityId,
      roleType:         m.roleType,
      ownershipPercent: m.ownershipPercent,
      status:           'active',
      startDate:        m.startDate,
      createdAt:        now,
      updatedAt:        now,
    };
    await saveLink(lid, linkData);
    addLinkToState(linkData);

    const ind = S.individuals.find(i => i.individualId === m.individualId);
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'member_added', targetType: 'entity', targetId: entityId,
      targetName: S.entities.find(e=>e.entityId===entityId)?.entityName || '',
      detail: `${ind?.fullName || m.name} added as ${ROLE_LABELS[m.roleType] || m.roleType}`,
      timestamp: now,
    });
  }

  if (S._draft) delete S._draft._pendingMembers;
  toast('Members saved');
  go('entity-detail', { entityId });
};

window.endEntityMember = async function(linkId) {
  if (!confirm('End this member role? The record will be preserved with an end date.')) return;
  const { updateLink } = await import('../../firebase/firestore.js');
  const now = new Date().toISOString();
  await updateLink(linkId, { status: 'former', endDate: now });
  const link = S.links.find(l => l.linkId === linkId);
  if (link) { link.status = 'former'; link.endDate = now; }
  toast('Role ended — record preserved');
  render();
};

window.saveEntityRecord = async function() {
  const { entityId } = S.currentParams || {};
  const isEdit = !!entityId;

  const name  = document.getElementById('ent-name')?.value?.trim();
  const etype = document.getElementById('ent-type')?.value;
  const errEl = document.getElementById('ent-error');
  errEl.style.display = 'none';

  if (!name)  { errEl.textContent = 'Client name is required.'; errEl.style.display='block'; return; }
  if (!etype) { errEl.textContent = 'Client type is required.'; errEl.style.display='block'; return; }

  const now = new Date().toISOString();
  const eid = isEdit ? entityId : genId('ent');
  const existing = isEdit ? S.entities.find(e => e.entityId === eid) : null;

  const entityData = {
    entityId:           eid,
    firmId:             S.firmId,
    entityName:         name,
    entityType:         etype,
    abn:                document.getElementById('ent-abn')?.value?.trim()     || '',
    acn:                document.getElementById('ent-acn')?.value?.trim()     || '',
    registeredAddress:  document.getElementById('ent-address')?.value?.trim()|| '',
    incorporationDate:  document.getElementById('ent-inc-date')?.value        || '',
    countryOfOrigin:    document.getElementById('ent-country')?.value?.trim() || 'Australia',
    status:             document.getElementById('ent-status')?.value          || 'active',
    notes:              document.getElementById('ent-notes')?.value?.trim()   || '',
    // Preserve existing risk data on edit
    entityRiskRating:   existing?.entityRiskRating   || null,
    riskAssessedBy:     existing?.riskAssessedBy     || '',
    riskAssessedDate:   existing?.riskAssessedDate   || '',
    riskNextReviewDate: existing?.riskNextReviewDate || '',
    riskMethodology:    existing?.riskMethodology    || '',
    createdAt: isEdit ? (existing?.createdAt || now) : now,
    updatedAt: now,
  };

  try {
    await saveEntity(eid, entityData);
    addEntityToState(entityData);

    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: isEdit ? 'entity_updated' : 'entity_created',
      targetType: 'entity', targetId: eid, targetName: name,
      detail: isEdit ? `Client record updated — ${name}` : `Client created — ${name} (${etype})`,
      timestamp: now,
    });

    delete S._draft;
    toast(isEdit ? 'Client updated — previous version preserved' : 'Client saved');
    go('entity-detail', { entityId: eid });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};

window.saveEntityRisk = async function(entityId) {
  const rating = document.getElementById('risk-rating')?.value;
  const by     = document.getElementById('risk-by')?.value?.trim();
  const date   = document.getElementById('risk-date')?.value;
  const errEl  = document.getElementById('risk-error');
  errEl.style.display = 'none';

  if (!rating) { errEl.textContent = 'Risk rating is required.'; errEl.style.display='block'; return; }
  if (!by)     { errEl.textContent = 'Assessed by is required.'; errEl.style.display='block'; return; }
  if (!date)   { errEl.textContent = 'Assessed date is required.'; errEl.style.display='block'; return; }

  const { updateEntity } = await import('../../firebase/firestore.js');
  const now = new Date().toISOString();

  const fields = {
    entityRiskRating:   rating,
    riskAssessedBy:     by,
    riskAssessedDate:   date,
    riskNextReviewDate: document.getElementById('risk-next-review')?.value || '',
    riskMethodology:    document.getElementById('risk-methodology')?.value?.trim() || '',
  };

  try {
    await updateEntity(entityId, fields);
    const entity = S.entities.find(e => e.entityId === entityId);
    if (entity) Object.assign(entity, fields);

    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'risk_assessed', targetType: 'entity', targetId: entityId,
      targetName: S.entities.find(e=>e.entityId===entityId)?.entityName || '',
      detail: `Risk assessment recorded — ${rating} risk — assessed by ${by}`,
      timestamp: now,
    });

    toast('Risk assessment saved');
    go('entity-detail', { entityId });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

export { screen as editScreen };
