import { S }                                          from '../../state/index.js';
import { updateSMR, saveAuditEntry, fmtDate }        from '../../firebase/firestore.js';

export function screen() {
  const { smrId } = S.currentParams || {};
  const smr = (S.smrs || []).find(s => s.smrId === smrId);

  if (!smr) return `
    <div class="empty-state">
      <div class="empty-state-title">SMR not found.</div>
      <button onclick="go('smr')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Back to SMR</button>
    </div>`;

  function statusBadge(status) {
    switch (status) {
      case 'submitted': return `<span class="badge badge-success">Submitted</span>`;
      case 'draft':     return `<span class="badge badge-warning">Draft</span>`;
      case 'closed':    return `<span class="badge badge-neutral">Closed</span>`;
      default:          return `<span class="badge badge-neutral">${status}</span>`;
    }
  }

  function row(label, value) {
    if (!value) return '';
    return `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);min-width:160px;flex-shrink:0;">${label}</span>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);text-align:right;">${value}</span>
      </div>`;
  }

  // Resolve individual and entity
  const indId   = (smr.relatedIndividuals || [])[0];
  const ind     = indId ? (S.individuals || []).find(i => i.individualId === indId) : null;
  const entId   = (smr.relatedEntities || [])[0];
  const ent     = entId ? (S.entities || []).find(e => e.entityId === entId) : null;
  const isDraft = smr.status === 'draft';

  return `
    <div>
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          ${ind && entId
            ? `<button onclick="go('entity-detail',{entityId:'${entId}'})" class="btn-ghost"
                       style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
                 ← ${ind.fullName || 'Individual'}
               </button>`
            : `<button onclick="go('smr')" class="btn-ghost"
                       style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">
                 ← SMR
               </button>`}
          <h1 class="screen-title" style="margin-top:var(--space-2);">${smr.austracRef || 'Draft SMR'}</h1>
          <div style="margin-top:var(--space-1);">${statusBadge(smr.status)}</div>
        </div>
        ${isDraft ? `<button onclick="markSMRSubmitted('${smrId}')" class="btn btn-sm">Mark as submitted</button>` : ''}
      </div>

      <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
        <strong>Tipping-off reminder.</strong> Do not disclose to any person that this SMR has been or may be submitted to AUSTRAC.
      </div>

      <!-- Individual subject -->
      ${ind ? `
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">Subject of this report</div>
          <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;">
            <div class="avatar" style="flex-shrink:0;">
              ${(ind.fullName||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style="flex:1;">
              <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${ind.fullName || '—'}</div>
              ${ent ? `<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${ent.entityName || ''} · ${ent.entityType || ''}</div>` : ''}
            </div>
            ${entId ? `
              <button onclick="go('entity-detail',{entityId:'${entId}'})" class="btn-ghost"
                      style="font-size:var(--font-size-xs);color:var(--color-primary);">
                View record →
              </button>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- SMR record — editable if draft, read-only if submitted/closed -->
      <div class="card" style="margin-bottom:var(--space-3);">
        <div class="section-heading">SMR record</div>
        ${isDraft ? `
          <div class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-row">
              <label class="label label-required">Submitted by</label>
              <input id="smr-edit-by" type="text" class="inp" value="${smr.submittedByName || ''}" placeholder="Staff member name">
            </div>
            <div class="form-row">
              <label class="label label-required">Date submitted to AUSTRAC</label>
              <input id="smr-edit-date" type="date" class="inp" value="${smr.submittedDate ? smr.submittedDate.split('T')[0] : ''}">
            </div>
            <div class="form-row">
              <label class="label">AUSTRAC reference number</label>
              <input id="smr-edit-ref" type="text" class="inp" value="${smr.austracRef || ''}" placeholder="Provided by AUSTRAC after submission">
            </div>
            <div class="form-row">
              <label class="label label-required">Details</label>
              <textarea id="smr-edit-details" class="inp" rows="6">${smr.details || ''}</textarea>
            </div>
          </div>
          <div id="smr-edit-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>
          <button onclick="saveSMREdits('${smrId}')" class="btn btn-sm" style="margin-top:var(--space-3);">Save changes</button>
        ` : `
          ${row('SMR ID',            smrId)}
          ${row('Submitted by',      smr.submittedByName)}
          ${row('Date submitted',    fmtDate(smr.submittedDate))}
          ${row('AUSTRAC reference', smr.austracRef)}
          ${row('Status',            smr.status)}
          ${row('Created',           fmtDate(smr.createdAt))}
        `}
      </div>

      <!-- Details — read-only if submitted/closed -->
      ${!isDraft ? `
        <div class="card" style="margin-bottom:var(--space-3);">
          <div class="section-heading">Details</div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-primary);line-height:var(--line-height-relaxed);white-space:pre-wrap;">${smr.details || '—'}</p>
        </div>
      ` : ''}

      <!-- Actions -->
      ${smr.status === 'submitted' ? `
        <div style="display:flex;gap:var(--space-3);">
          <button onclick="closeSMR('${smrId}')" class="btn-sec btn-sm">Close SMR</button>
        </div>
      ` : ''}
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.saveSMREdits = async function(smrId) {
  const byName  = document.getElementById('smr-edit-by')?.value?.trim();
  const date    = document.getElementById('smr-edit-date')?.value;
  const ref     = document.getElementById('smr-edit-ref')?.value?.trim() || '';
  const details = document.getElementById('smr-edit-details')?.value?.trim();
  const errEl   = document.getElementById('smr-edit-error');
  errEl.style.display = 'none';

  if (!byName)  { errEl.textContent = 'Submitted by is required.'; errEl.style.display = 'block'; return; }
  if (!details) { errEl.textContent = 'Details are required.';     errEl.style.display = 'block'; return; }

  const now = new Date().toISOString();
  try {
    await updateSMR(smrId, {
      submittedByName: byName,
      submittedDate:   date || null,
      austracRef:      ref,
      details,
      updatedAt:       now,
    });
    const smr = S.smrs?.find(s => s.smrId === smrId);
    if (smr) {
      smr.submittedByName = byName;
      smr.submittedDate   = date || null;
      smr.austracRef      = ref;
      smr.details         = details;
    }
    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'smr_updated',
      targetType: 'smr',
      targetId:   smrId,
      targetName: smrId,
      detail:     'SMR draft updated',
      timestamp:  now,
    });
    toast('SMR updated');
    render();
  } catch (err) {
    errEl.textContent = 'Failed to save. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};

window.markSMRSubmitted = async function(smrId) {
  const austracRef = prompt('Enter the AUSTRAC reference number provided after submission:');
  if (!austracRef) return;

  const now = new Date().toISOString();
  try {
    await updateSMR(smrId, { status: 'submitted', austracRef, submittedDate: now });
    const smr = S.smrs?.find(s => s.smrId === smrId);
    if (smr) { smr.status = 'submitted'; smr.austracRef = austracRef; smr.submittedDate = now; }
    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'smr_submitted',
      targetType: 'smr',
      targetId:   smrId,
      targetName: austracRef,
      detail:     `SMR marked as submitted to AUSTRAC — ref: ${austracRef}`,
      timestamp:  now,
    });
    toast('SMR marked as submitted');
    render();
  } catch (err) {
    toast('Failed to update SMR', 'err');
  }
};

window.closeSMR = async function(smrId) {
  if (!confirm('Close this SMR? The record will be preserved.')) return;
  const now = new Date().toISOString();
  try {
    await updateSMR(smrId, { status: 'closed' });
    const smr = S.smrs?.find(s => s.smrId === smrId);
    if (smr) smr.status = 'closed';
    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals?.find(i => i.individualId === S.individualId)?.fullName || 'User',
      action:     'smr_closed',
      targetType: 'smr',
      targetId:   smrId,
      targetName: smrId,
      detail:     'SMR closed',
      timestamp:  now,
    });
    toast('SMR closed');
    render();
  } catch (err) {
    toast('Failed to close SMR', 'err');
  }
};
