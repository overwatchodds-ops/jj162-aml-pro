import { S, addIndividualToState, addLinkToState }   from '../../state/index.js';
import { ROLE_LABELS, ENTITY_ROLES, FIRM_ROLES }       from '../../state/rules_matrix.js';
import {
  saveIndividual, saveLink, saveVerification,
  saveScreening, saveTrainingRecord, saveVettingRecord,
  saveAuditEntry, genId, fmtDate,
} from '../../firebase/firestore.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
// Handles both new and edit flows.
// Entry point (via currentParams.entryPoint) determines which sections show.
// entryPoint: 'staff' | 'entity' | 'direct' | null (edit mode)

export function screen() {
  const { individualId, tab, entryPoint, entityId } = S.currentParams || {};
  const isEdit = !!individualId;
  const ind    = isEdit ? S.individuals.find(i => i.individualId === individualId) : null;
  const d      = S._draft || (isEdit ? { ...ind } : {});

  // Active tab
  const activeTab = tab || 'identity';

  // Entry point context for new individual
  const ep = entryPoint || (isEdit ? null : 'direct');

  // Tabs to show
  const tabs = [
    { key: 'identity',     label: 'Identity'      },
    { key: 'connections',  label: 'Connections'   },
    { key: 'verification', label: 'ID Verification'},
    { key: 'screening',    label: 'Screening'     },
    { key: 'training',     label: 'Training'      },
    { key: 'vetting',      label: 'Vetting'       },
  ];

  return `
    <div>
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="cancelIndividual()" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
            ← ${isEdit ? 'Individual' : 'Back'}
          </button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${isEdit ? 'Edit — ' + (ind?.fullName || '') : 'New individual'}</h1>
        </div>
        ${isEdit ? `<span style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);color:var(--color-warning-text);background:var(--color-warning-light);border:0.5px solid var(--color-warning-border);padding:2px 10px;border-radius:var(--radius-pill);">Editing — previous version preserved</span>` : ''}
      </div>

      <!-- Entry point context (new only) -->
      ${!isEdit && ep ? `
        <div class="banner banner-info" style="margin-bottom:var(--space-4);">
          ${ep === 'staff'  ? '<strong>Adding as staff.</strong> This individual will be connected directly to your firm. Staff vetting requirements will apply based on their AML/CTF functions.' : ''}
          ${ep === 'entity' ? `<strong>Adding as a member of ${S.entities.find(e=>e.entityId===entityId)?.entityName || 'an entity'}.</strong> Compliance requirements will be derived from their role.` : ''}
          ${ep === 'direct' ? '<strong>Adding as a direct client.</strong> This individual will be connected directly to your firm as a client.' : ''}
        </div>
      ` : ''}

      <!-- Tabs -->
      <div style="display:flex;gap:2px;border-bottom:0.5px solid var(--color-border);margin-bottom:var(--space-5);overflow-x:auto;">
        ${tabs.map(t => `
          <button
            onclick="indTab('${t.key}')"
            style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);padding:var(--space-2) var(--space-3);border:none;background:none;cursor:pointer;white-space:nowrap;font-family:var(--font-family);
              color:${activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)'};
              border-bottom:${activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent'};
              margin-bottom:-0.5px;"
          >${t.label}</button>
        `).join('')}
      </div>

      <!-- Tab content -->
      ${activeTab === 'identity'     ? tabIdentity(d, isEdit)     : ''}
      ${activeTab === 'connections'  ? tabConnections(d, isEdit, individualId) : ''}
      ${activeTab === 'verification' ? tabVerification(d, isEdit, individualId) : ''}
      ${activeTab === 'screening'    ? tabScreening(d, isEdit, individualId) : ''}
      ${activeTab === 'training'     ? tabTraining(d, isEdit, individualId) : ''}
      ${activeTab === 'vetting'      ? tabVetting(d, isEdit, individualId) : ''}

      <!-- Save / Cancel -->
      ${activeTab === 'identity' || activeTab === 'connections' ? `
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
          <button onclick="cancelIndividual()" class="btn-sec" style="flex:1;">Cancel</button>
          <button onclick="saveIndividualRecord()" class="btn" style="flex:2;">
            ${isEdit ? 'Save changes' : 'Save individual'}
          </button>
        </div>
      ` : ''}
    </div>`;
}

// ─── TAB: IDENTITY ────────────────────────────────────────────────────────────
function tabIdentity(d, isEdit) {
  return `
    <div class="card">
      <div class="section-heading">Core identity</div>
      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Full legal name</label>
          <input id="ind-name" type="text" class="inp" value="${d.fullName||''}" placeholder="Jane Elizabeth Smith">
        </div>

        <div class="form-row">
          <label class="label label-required">Date of birth</label>
          <input id="ind-dob" type="date" class="inp" value="${d.dateOfBirth||''}">
        </div>

        <div class="form-row">
          <label class="label label-required">Residential address</label>
          <input id="ind-address" type="text" class="inp" value="${d.address||''}" placeholder="12 Main St, Sydney NSW 2000">
        </div>

        <div class="form-row">
          <label class="label">Email</label>
          <input id="ind-email" type="email" class="inp" value="${d.email||''}" placeholder="jane@example.com">
        </div>

        <div class="form-row">
          <label class="label">Phone</label>
          <input id="ind-phone" type="tel" class="inp" value="${d.phone||''}" placeholder="0412 345 678">
        </div>

        <div class="form-row">
          <label class="label">Notes</label>
          <textarea id="ind-notes" class="inp" rows="3" placeholder="Any additional notes...">${d.notes||''}</textarea>
        </div>

      </div>
    </div>`;
}

// ─── TAB: CONNECTIONS ─────────────────────────────────────────────────────────
function tabConnections(d, isEdit, individualId) {
  const existingLinks = isEdit
    ? S.links.filter(l => l.individualId === individualId && l.status === 'active')
    : [];

  const pendingLinks = S._draft?._pendingLinks || [];

  return `
    <div class="card">
      <div class="section-heading">Active connections</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Connect this individual to the firm directly or via an entity. Compliance requirements derive automatically from these connections.</p>

      ${existingLinks.length > 0 ? existingLinks.map(l => {
        const label = ROLE_LABELS[l.roleType] || l.roleType;
        const target = l.linkedObjectType === 'firm'
          ? (S.firm?.firmName || 'Firm')
          : (S.entities.find(e => e.entityId === l.linkedObjectId)?.entityName || 'Entity');
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);">
            <div>
              <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${target}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label}</div>
            </div>
            <button onclick="endLink('${l.linkId}')" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">End role</button>
          </div>`;
      }).join('') : ''}

      ${pendingLinks.map((l, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);border:0.5px solid var(--color-primary-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);background:var(--color-primary-light);">
          <div>
            <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${l.targetName}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-primary-text);">${ROLE_LABELS[l.roleType] || l.roleType} · pending save</div>
          </div>
          <button onclick="removePendingLink(${i})" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">Remove</button>
        </div>`).join('')}

      <!-- Add connection -->
      <div style="margin-top:var(--space-4);">
        <div class="section-heading">Add connection</div>

        <div class="form-row">
          <label class="label">Connection type</label>
          <select id="link-type" class="inp" onchange="indLinkTypeChange()">
            <option value="">Select...</option>
            <option value="firm_staff">Firm — staff / owner role</option>
            <option value="firm_client">Firm — direct client</option>
            <option value="entity">Via entity</option>
          </select>
        </div>

        <div id="link-firm-staff-fields" style="display:none;">
          <div class="form-row">
            <label class="label">Firm role</label>
            <select id="link-firm-role" class="inp">
              <optgroup label="Key Personnel">
                ${FIRM_ROLES.key_personnel.map(r => `<option value="${r}">${ROLE_LABELS[r]}</option>`).join('')}
              </optgroup>
              <optgroup label="Standard Staff">
                ${FIRM_ROLES.standard_staff.map(r => `<option value="${r}">${ROLE_LABELS[r]}</option>`).join('')}
              </optgroup>
              <optgroup label="No AML functions">
                ${FIRM_ROLES.no_aml.map(r => `<option value="${r}">${ROLE_LABELS[r]}</option>`).join('')}
              </optgroup>
            </select>
          </div>
        </div>

        <div id="link-entity-fields" style="display:none;">
          <div class="form-row">
            <label class="label">Entity</label>
            <select id="link-entity-id" class="inp" onchange="indEntityChange()">
              <option value="">Select entity...</option>
              ${S.entities.map(e => `<option value="${e.entityId}">${e.entityName}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" id="link-entity-role-wrap" style="display:none;">
            <label class="label">Role</label>
            <select id="link-entity-role" class="inp"></select>
          </div>
        </div>

        <div class="form-row">
          <label class="label">Start date</label>
          <input id="link-start-date" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}">
        </div>

        <button onclick="addPendingLink()" class="btn-sec btn-sm">+ Add this connection</button>
      </div>
    </div>`;
}

// ─── TAB: ID VERIFICATION ─────────────────────────────────────────────────────
function tabVerification(d, isEdit, individualId) {
  return `
    <div class="card">
      <div class="section-heading">ID verification</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Each verification is saved as a new event record. Previous verifications are preserved.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">ID type</label>
          <select id="ver-id-type" class="inp">
            ${['Passport','Driver licence','Medicare card','Other government ID'].map(t => `<option>${t}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label label-required">ID number</label>
          <input id="ver-id-number" type="text" class="inp" placeholder="e.g. 12345678">
        </div>

        <div class="form-row">
          <label class="label">Issuing state / country</label>
          <input id="ver-issuing-state" type="text" class="inp" placeholder="e.g. NSW, Australia">
        </div>

        <div class="form-row">
          <label class="label">Expiry date</label>
          <input id="ver-expiry" type="date" class="inp">
        </div>

        <div class="form-row">
          <label class="label label-required">Verified by</label>
          <input id="ver-by" type="text" class="inp" placeholder="Staff member name">
        </div>

        <div class="form-row">
          <label class="label label-required">Verified date</label>
          <input id="ver-date" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}">
        </div>

        <div class="form-row">
          <label class="label">Method</label>
          <select id="ver-method" class="inp">
            ${['In person','Certified copy','Electronic verification'].map(m => `<option>${m}</option>`).join('')}
          </select>
        </div>

      </div>

      <div id="ver-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <button onclick="saveVerificationRecord('${individualId}')" class="btn btn-sm" style="margin-top:var(--space-4);">Save verification record</button>
    </div>`;
}

// ─── TAB: SCREENING ───────────────────────────────────────────────────────────
function tabScreening(d, isEdit, individualId) {
  return `
    <div class="card">
      <div class="section-heading">Screening</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Each screening is saved as a new event. All screening history is preserved.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Provider</label>
          <input id="scr-provider" type="text" class="inp" placeholder="e.g. NameScan">
        </div>

        <div class="form-row">
          <label class="label label-required">Screening date</label>
          <input id="scr-date" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}" onchange="scrAutoNextDue(this.value)">
        </div>

        <div class="form-row">
          <label class="label label-required">Result</label>
          <select id="scr-result" class="inp">
            ${['Clear','PEP match','Sanctions match','Adverse media','Refer for review'].map(r => `<option>${r}</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <label class="label">Reference ID</label>
          <input id="scr-ref" type="text" class="inp" placeholder="e.g. NS-98765">
        </div>

        <div class="form-row">
          <label class="label">Next screening due</label>
          <input id="scr-next-due" type="date" class="inp">
        </div>

      </div>

      <div style="margin-top:var(--space-3);">
        <a href="https://namescan.io/?ref=SIMPLEAML" target="_blank" class="btn-sec btn-sm">
          Open NameScan →
        </a>
      </div>

      <div id="scr-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <button onclick="saveScreeningRecord('${individualId}')" class="btn btn-sm" style="margin-top:var(--space-4);">Save screening record</button>
    </div>`;
}

// ─── TAB: TRAINING ────────────────────────────────────────────────────────────
function tabTraining(d, isEdit, individualId) {
  return `
    <div class="card">
      <div class="section-heading">Training</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Record AML/CTF training completion. Each record is preserved in history.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label label-required">Training type</label>
          <select id="trn-type" class="inp">
            <option value="standard">Standard AML/CTF training</option>
            <option value="enhanced">Enhanced AML/CTF training (Key Personnel)</option>
          </select>
        </div>

        <div class="form-row">
          <label class="label label-required">Completed date</label>
          <input id="trn-completed" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}" onchange="trnAutoExpiry(this.value)">
        </div>

        <div class="form-row">
          <label class="label">Provider</label>
          <input id="trn-provider" type="text" class="inp" placeholder="e.g. CPA Australia, CA ANZ">
        </div>

        <div class="form-row">
          <label class="label">Expiry date</label>
          <input id="trn-expiry" type="date" class="inp">
        </div>

        <div class="form-row">
          <label class="label">Certificate link</label>
          <input id="trn-cert" type="url" class="inp" placeholder="https://drive.google.com/...">
        </div>

      </div>

      <div id="trn-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <button onclick="saveTraining('${individualId}')" class="btn btn-sm" style="margin-top:var(--space-4);">Save training record</button>
    </div>`;
}

// ─── TAB: VETTING ─────────────────────────────────────────────────────────────
function tabVetting(d, isEdit, individualId) {
  return `
    <div class="card">
      <div class="section-heading">Staff vetting</div>
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-4);">Required for Key Personnel. Police check, bankruptcy check, and annual declaration.</p>

      <div class="form-grid" style="grid-template-columns:1fr;">

        <div class="form-row">
          <label class="label">Police check date</label>
          <input id="vet-police-date" type="date" class="inp">
        </div>

        <div class="form-row">
          <label class="label">Police check result</label>
          <select id="vet-police-result" class="inp">
            <option value="">Select...</option>
            <option>Clear</option>
            <option>Adverse finding</option>
          </select>
        </div>

        <div class="form-row">
          <label class="label">Police check reference</label>
          <input id="vet-police-ref" type="text" class="inp" placeholder="e.g. PC-2026-XXXXX">
        </div>

        <div class="form-row">
          <label class="label">Bankruptcy check date</label>
          <input id="vet-bankrupt-date" type="date" class="inp">
        </div>

        <div class="form-row">
          <label class="label">Bankruptcy check result</label>
          <select id="vet-bankrupt-result" class="inp">
            <option value="">Select...</option>
            <option>Clear</option>
            <option>Adverse finding</option>
          </select>
        </div>

        <div class="form-row">
          <label class="label">Declaration date</label>
          <input id="vet-decl-date" type="date" class="inp" value="${new Date().toISOString().split('T')[0]}" onchange="vetAutoNext(this.value)">
        </div>

        <div class="form-row">
          <label class="label">Next declaration due</label>
          <input id="vet-decl-next" type="date" class="inp">
        </div>

      </div>

      <label style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-3);cursor:pointer;font-size:var(--font-size-base);">
        <input id="vet-decl-signed" type="checkbox">
        Declaration signed by individual
      </label>

      <div id="vet-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <button onclick="saveVetting('${individualId}')" class="btn btn-sm" style="margin-top:var(--space-4);">Save vetting record</button>
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.indTab = function(tab) {
  S.currentParams = { ...S.currentParams, tab };
  render();
};

window.cancelIndividual = function() {
  delete S._draft;
  const { individualId } = S.currentParams || {};
  go(individualId ? 'individual-detail' : 'individuals', individualId ? { individualId } : {});
};

window.indLinkTypeChange = function() {
  const type = document.getElementById('link-type')?.value;
  document.getElementById('link-firm-staff-fields').style.display = (type === 'firm_staff') ? 'block' : 'none';
  document.getElementById('link-entity-fields').style.display     = (type === 'entity')     ? 'block' : 'none';
};

window.indEntityChange = function() {
  const entityId  = document.getElementById('link-entity-id')?.value;
  const roleWrap  = document.getElementById('link-entity-role-wrap');
  const roleSelect = document.getElementById('link-entity-role');
  if (!entityId || !roleWrap || !roleSelect) return;

  const entity = S.entities.find(e => e.entityId === entityId);
  if (!entity) return;

  const subtype = entity.entityType?.toLowerCase().replace(/ .*/, '') || 'other';
  const roles   = ENTITY_ROLES[subtype] || ENTITY_ROLES.other;

  roleSelect.innerHTML = roles.map(r => `<option value="${r}">${ROLE_LABELS[r] || r}</option>`).join('');
  roleWrap.style.display = 'block';
};

window.addPendingLink = function() {
  const type = document.getElementById('link-type')?.value;
  if (!type) { toast('Select a connection type', 'err'); return; }

  if (!S._draft) S._draft = {};
  if (!S._draft._pendingLinks) S._draft._pendingLinks = [];

  const startDate = document.getElementById('link-start-date')?.value || new Date().toISOString().split('T')[0];

  if (type === 'firm_staff' || type === 'firm_client') {
    const roleType = type === 'firm_client' ? 'direct_client' : (document.getElementById('link-firm-role')?.value || 'owner');
    S._draft._pendingLinks.push({
      linkedObjectType: 'firm',
      linkedObjectId:   S.firmId,
      targetName:       S.firm?.firmName || 'Firm',
      roleType,
      startDate,
    });
  } else if (type === 'entity') {
    const entityId   = document.getElementById('link-entity-id')?.value;
    const roleType   = document.getElementById('link-entity-role')?.value;
    const entity     = S.entities.find(e => e.entityId === entityId);
    if (!entityId || !roleType) { toast('Select an entity and role', 'err'); return; }
    S._draft._pendingLinks.push({
      linkedObjectType: 'entity',
      linkedObjectId:   entityId,
      targetName:       entity?.entityName || 'Entity',
      roleType,
      startDate,
    });
  }

  render();
};

window.removePendingLink = function(i) {
  if (S._draft?._pendingLinks) S._draft._pendingLinks.splice(i, 1);
  render();
};

window.saveIndividualRecord = async function() {
  const { individualId, entryPoint } = S.currentParams || {};
  const isEdit = !!individualId;

  const name    = document.getElementById('ind-name')?.value?.trim();
  const dob     = document.getElementById('ind-dob')?.value;
  const address = document.getElementById('ind-address')?.value?.trim();

  if (!name)    { toast('Full legal name is required', 'err'); return; }
  if (!dob)     { toast('Date of birth is required', 'err'); return; }
  if (!address) { toast('Residential address is required', 'err'); return; }

  const now  = new Date().toISOString();
  const iid  = isEdit ? individualId : genId('ind');

  const indData = {
    individualId: iid,
    firmId:       S.firmId,
    fullName:     name,
    dateOfBirth:  dob,
    address,
    email:        document.getElementById('ind-email')?.value?.trim()  || '',
    phone:        document.getElementById('ind-phone')?.value?.trim()  || '',
    notes:        document.getElementById('ind-notes')?.value?.trim()  || '',
    createdAt:    isEdit ? (S.individuals.find(i=>i.individualId===iid)?.createdAt || now) : now,
    updatedAt:    now,
  };

  try {
    await saveIndividual(iid, indData);
    addIndividualToState(indData);

    // Save pending links
    const pendingLinks = S._draft?._pendingLinks || [];
    for (const pl of pendingLinks) {
      const lid = genId('link');
      const linkData = {
        linkId:           lid,
        individualId:     iid,
        linkedObjectType: pl.linkedObjectType,
        linkedObjectId:   pl.linkedObjectId,
        roleType:         pl.roleType,
        status:           'active',
        startDate:        pl.startDate,
        createdAt:        now,
        updatedAt:        now,
      };
      await saveLink(lid, linkData);
      addLinkToState(linkData);
    }

    // Audit entry
    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action:     isEdit ? 'individual_updated' : 'individual_created',
      targetType: 'individual',
      targetId:   iid,
      targetName: name,
      detail:     isEdit ? `Individual record updated — ${name}` : `Individual created — ${name}`,
      timestamp:  now,
    });

    delete S._draft;
    toast(isEdit ? 'Individual updated — previous version preserved' : 'Individual saved');
    go('individual-detail', { individualId: iid });

  } catch (err) {
    toast('Failed to save. Please try again.', 'err');
    console.error(err);
  }
};

// Evidence save helpers
window.saveVerificationRecord = async function(individualId) {
  const idType  = document.getElementById('ver-id-type')?.value;
  const idNum   = document.getElementById('ver-id-number')?.value?.trim();
  const verBy   = document.getElementById('ver-by')?.value?.trim();
  const verDate = document.getElementById('ver-date')?.value;
  const errEl   = document.getElementById('ver-error');
  errEl.style.display = 'none';

  if (!idNum)   { errEl.textContent = 'ID number is required.'; errEl.style.display='block'; return; }
  if (!verBy)   { errEl.textContent = 'Verified by is required.'; errEl.style.display='block'; return; }
  if (!verDate) { errEl.textContent = 'Verified date is required.'; errEl.style.display='block'; return; }

  try {
    const now = new Date().toISOString();
    await saveVerification({
      individualId,
      firmId:          S.firmId,
      idType:          idType || '',
      idNumber:        idNum,
      issuingState:    document.getElementById('ver-issuing-state')?.value?.trim() || '',
      expiryDate:      document.getElementById('ver-expiry')?.value || '',
      verifiedBy:      verBy,
      verifiedDate:    verDate,
      verifiedMethod:  document.getElementById('ver-method')?.value || '',
    });
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'id_verified', targetType: 'individual', targetId: individualId,
      targetName: S.individuals.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `ID verification recorded — ${idType} verified by ${verBy}`,
      timestamp: now,
    });
    toast('Verification record saved');
    go('individual-detail', { individualId });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveScreeningRecord = async function(individualId) {
  const provider = document.getElementById('scr-provider')?.value?.trim();
  const date     = document.getElementById('scr-date')?.value;
  const result   = document.getElementById('scr-result')?.value;
  const errEl    = document.getElementById('scr-error');
  errEl.style.display = 'none';

  if (!provider) { errEl.textContent = 'Provider is required.'; errEl.style.display='block'; return; }
  if (!date)     { errEl.textContent = 'Screening date is required.'; errEl.style.display='block'; return; }

  try {
    const now = new Date().toISOString();
    await saveScreening({
      individualId,
      firmId:      S.firmId,
      provider,
      date,
      result:      result || '',
      referenceId: document.getElementById('scr-ref')?.value?.trim() || '',
      nextDueDate: document.getElementById('scr-next-due')?.value || '',
    });
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'screening_completed', targetType: 'individual', targetId: individualId,
      targetName: S.individuals.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `Screening completed via ${provider} — result: ${result}`,
      timestamp: now,
    });
    toast('Screening record saved');
    go('individual-detail', { individualId });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveTraining = async function(individualId) {
  const type      = document.getElementById('trn-type')?.value;
  const completed = document.getElementById('trn-completed')?.value;
  const errEl     = document.getElementById('trn-error');
  errEl.style.display = 'none';

  if (!completed) { errEl.textContent = 'Completed date is required.'; errEl.style.display='block'; return; }

  try {
    const now = new Date().toISOString();
    await saveTrainingRecord({
      individualId,
      firmId:        S.firmId,
      type:          type || 'standard',
      completedDate: completed,
      provider:      document.getElementById('trn-provider')?.value?.trim() || '',
      expiryDate:    document.getElementById('trn-expiry')?.value || '',
      certificateLink: document.getElementById('trn-cert')?.value?.trim() || '',
    });
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'training_completed', targetType: 'individual', targetId: individualId,
      targetName: S.individuals.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `AML/CTF training completed — ${type} — ${completed}`,
      timestamp: now,
    });
    toast('Training record saved');
    go('individual-detail', { individualId });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

window.saveVetting = async function(individualId) {
  const errEl = document.getElementById('vet-error');
  errEl.style.display = 'none';

  try {
    const now = new Date().toISOString();
    await saveVettingRecord({
      individualId,
      firmId:               S.firmId,
      policeCheckDate:      document.getElementById('vet-police-date')?.value   || '',
      policeCheckResult:    document.getElementById('vet-police-result')?.value || '',
      policeCheckRef:       document.getElementById('vet-police-ref')?.value?.trim() || '',
      bankruptcyCheckDate:  document.getElementById('vet-bankrupt-date')?.value   || '',
      bankruptcyCheckResult:document.getElementById('vet-bankrupt-result')?.value || '',
      declDate:             document.getElementById('vet-decl-date')?.value   || '',
      declNext:             document.getElementById('vet-decl-next')?.value   || '',
      declSigned:           document.getElementById('vet-decl-signed')?.checked || false,
    });
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'vetting_updated', targetType: 'individual', targetId: individualId,
      targetName: S.individuals.find(i=>i.individualId===individualId)?.fullName || '',
      detail: `Staff vetting record updated`,
      timestamp: now,
    });
    toast('Vetting record saved');
    go('individual-detail', { individualId });
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
  }
};

// Auto-date helpers
window.scrAutoNextDue = function(date) {
  if (!date) return;
  const d = new Date(date); d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById('scr-next-due');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.trnAutoExpiry = function(date) {
  if (!date) return;
  const d = new Date(date); d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById('trn-expiry');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.vetAutoNext = function(date) {
  if (!date) return;
  const d = new Date(date); d.setFullYear(d.getFullYear() + 1);
  const el = document.getElementById('vet-decl-next');
  if (el && !el.value) el.value = d.toISOString().split('T')[0];
};

window.endLink = async function(linkId) {
  if (!confirm('End this role? The record will be preserved with an end date.')) return;
  const { updateLink } = await import('../../firebase/firestore.js');
  const now = new Date().toISOString();
  await updateLink(linkId, { status: 'former', endDate: now });
  const link = S.links.find(l => l.linkId === linkId);
  if (link) { link.status = 'former'; link.endDate = now; }
  toast('Role ended — record preserved');
  render();
};

// edit.js just re-exports new.js with isEdit detected from params
export { screen as editScreen };
