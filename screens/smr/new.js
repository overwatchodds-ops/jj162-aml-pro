// ─── SMR — NEW ────────────────────────────────────────────────────────────────
// SMRs are always filed against an individual.
//
// Two entry modes:
//   1. From client record — S._draft.individualId + S._draft.entityId are set.
//      Form opens directly, individual shown as read-only locked field.
//   2. From SMR menu — no draft set.
//      Client search screen shown first. User finds the individual, then
//      proceeds to the form.

import { S }                              from '../../state/index.js';
import { saveSMR, saveAuditEntry, genId } from '../../firebase/firestore.js';

export function screen() {
  const d = S._draft || {};

  // ── Mode 1: individual already selected — show SMR form ───────────────────
  if (d.individualId) {
    const ind = (S.individuals || []).find(i => i.individualId === d.individualId);
    const indName = ind?.fullName || 'Unknown';

    return `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
          <div>
            <button onclick="smrCancelBack()" class="btn-ghost"
                    style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← Back</button>
            <h1 class="screen-title" style="margin-top:var(--space-2);">New SMR</h1>
          </div>
        </div>

        <div class="banner banner-danger" style="margin-bottom:var(--space-4);">
          <div class="banner-title">Tipping-off prohibition</div>
          You must not disclose to any person — including the subject of this report — that an SMR has been or may be submitted to AUSTRAC. This is a criminal offence under the AML/CTF Act.
        </div>

        <!-- Locked individual -->
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">Subject of this report</div>
          <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;">
            <div class="avatar" style="flex-shrink:0;">
              ${indName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${indName}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Individual · locked to this SMR</div>
            </div>
          </div>
        </div>

        <!-- SMR details -->
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">SMR details</div>
          <div class="form-grid" style="grid-template-columns:1fr;">

            <div class="form-row">
              <label class="label label-required">Submitted by</label>
              <input id="smr-by-name" type="text" class="inp"
                     value="${d.submittedByName||''}" placeholder="Staff member name">
            </div>

            <div class="form-row">
              <label class="label label-required">Date submitted to AUSTRAC</label>
              <input id="smr-date" type="date" class="inp"
                     value="${d.submittedDate||new Date().toISOString().split('T')[0]}">
            </div>

            <div class="form-row">
              <label class="label">AUSTRAC reference number</label>
              <input id="smr-ref" type="text" class="inp" value="${d.austracRef||''}"
                     placeholder="Provided by AUSTRAC after submission">
            </div>

            <div class="form-row">
              <label class="label label-required">Status</label>
              <select id="smr-status" class="inp">
                <option value="draft"     ${(d.status||'draft')==='draft'    ?'selected':''}>Draft</option>
                <option value="submitted" ${d.status==='submitted'?'selected':''}>Submitted to AUSTRAC</option>
                <option value="closed"    ${d.status==='closed'   ?'selected':''}>Closed</option>
              </select>
            </div>

            <div class="form-row">
              <label class="label label-required">Details</label>
              <textarea id="smr-details" class="inp" rows="6"
                        placeholder="Describe the suspicious activity or matter. Include dates, amounts, and any relevant context. This is an internal record only.">${d.details||''}</textarea>
            </div>

          </div>
        </div>

        <div id="smr-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

        <div style="display:flex;gap:var(--space-3);">
          <button onclick="smrCancelBack()" class="btn-sec" style="flex:1;">Cancel</button>
          <button onclick="saveSMRRecord()" class="btn" style="flex:2;">Save SMR</button>
        </div>
      </div>`;
  }

  // ── Mode 2: no individual selected — show client search ───────────────────
  const query   = S._smrSearch || '';
  const clients = (S.individuals || []).filter(i => !i.isStaff);
  const results = query.length >= 2
    ? clients.filter(i =>
        (i.fullName || '').toLowerCase().includes(query.toLowerCase()) ||
        (i.email    || '').toLowerCase().includes(query.toLowerCase())
      )
    : clients.slice(0, 10);

  return `
    <div>
      <div style="margin-bottom:var(--space-5);">
        <button onclick="go('smr')" class="btn-ghost"
                style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← SMR</button>
        <h1 class="screen-title" style="margin-top:var(--space-2);">New SMR — Find individual</h1>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        SMRs must be filed against an individual. Search for the person the suspicion relates to,
        then complete the report. If you need to file against an entity, find the individual
        who controls or operates through that entity.
      </div>

      <div class="card">
        <div class="section-heading">Search individuals</div>
        <input
          type="text"
          class="inp"
          placeholder="Search by name or email..."
          value="${query}"
          oninput="smrClientSearch(this.value)"
          style="margin-bottom:var(--space-3);"
        >

        ${results.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
            No individuals found. Add the client first under Clients.
          </p>
        ` : results.map(i => {
          const initials = (i.fullName||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';
          return `
            <div onclick="smrSelectIndividual('${i.individualId}')"
                 style="display:flex;align-items:center;gap:var(--space-3);
                        padding:var(--space-3) 0;border-bottom:0.5px solid var(--color-border-light);
                        cursor:pointer;">
              <div class="avatar" style="flex-shrink:0;">${initials}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">
                  ${i.fullName || '—'}
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                  ${i.email || ''}
                </div>
              </div>
              <span style="font-size:var(--font-size-xs);color:var(--color-primary);">Select →</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.smrClientSearch = function(value) {
  S._smrSearch = value;
  render();
};

window.smrSelectIndividual = function(individualId) {
  const ind = (S.individuals || []).find(i => i.individualId === individualId);
  // Find their self-entity
  const selfLink = (S.links || []).find(l =>
    l.individualId     === individualId &&
    l.linkedObjectType === 'entity'     &&
    l.roleType         === 'self'       &&
    l.status           === 'active'
  );
  S._draft = {
    individualId,
    entityId: selfLink?.linkedObjectId || null,
  };
  delete S._smrSearch;
  render();
};

window.smrCancelBack = function() {
  // If came from a client record, go back there
  const entityId = S._draft?.entityId;
  delete S._draft;
  delete S._smrSearch;
  if (entityId) {
    go('entity-detail', { entityId });
  } else {
    go('smr');
  }
};

window.saveSMRRecord = async function() {
  const byName  = document.getElementById('smr-by-name')?.value?.trim();
  const date    = document.getElementById('smr-date')?.value;
  const details = document.getElementById('smr-details')?.value?.trim();
  const status  = document.getElementById('smr-status')?.value;
  const errEl   = document.getElementById('smr-error');
  errEl.style.display = 'none';

  if (!byName)  { errEl.textContent = 'Submitted by is required.'; errEl.style.display = 'block'; return; }
  if (!details) { errEl.textContent = 'Details are required.';     errEl.style.display = 'block'; return; }

  const d   = S._draft || {};
  const now = new Date().toISOString();

  // Always link to the individual and their self-entity
  const relatedIndividuals = d.individualId ? [d.individualId] : [];
  const relatedEntities    = d.entityId     ? [d.entityId]     : [];

  try {
    const smrId = await saveSMR({
      firmId:          S.firmId,
      submittedBy:     S.individualId,
      submittedByName: byName,
      submittedDate:   date || now,
      austracRef:      document.getElementById('smr-ref')?.value?.trim() || '',
      status:          status || 'draft',
      details,
      relatedIndividuals,
      relatedEntities,
    });

    if (!S.smrs) S.smrs = [];
    S.smrs.unshift({
      smrId,
      firmId:          S.firmId,
      submittedByName: byName,
      submittedDate:   date || now,
      austracRef:      document.getElementById('smr-ref')?.value?.trim() || '',
      status:          status || 'draft',
      details,
      relatedIndividuals,
      relatedEntities,
      createdAt:       now,
    });

    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'smr_submitted',
      targetType: 'smr',
      targetId:   smrId,
      targetName: smrId,
      detail:     `SMR recorded — status: ${status || 'draft'}`,
      timestamp:  now,
    });

    const returnEntityId = d.entityId;
    delete S._draft;
    delete S._smrSearch;
    toast('SMR saved');

    // Return to client record if we came from one
    if (returnEntityId) {
      go('entity-detail', { entityId: returnEntityId });
    } else {
      go('smr');
    }

  } catch (err) {
    errEl.textContent = 'Failed to save SMR. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};
