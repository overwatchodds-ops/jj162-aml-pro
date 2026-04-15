import { S }                              from '../../state/index.js';
import { updateSMR, saveAuditEntry, fmtDate, fmtDateTime } from '../../firebase/firestore.js';

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

  const relatedInds = (smr.relatedIndividuals || [])
    .map(id => S.individuals?.find(i => i.individualId === id)?.fullName || id);
  const relatedEnts = (smr.relatedEntities || [])
    .map(id => S.entities?.find(e => e.entityId === id)?.entityName || id);

  return `
    <div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6);">
        <div>
          <button onclick="go('smr')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← SMR</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">${smr.austracRef || 'Draft SMR'}</h1>
          <div style="margin-top:var(--space-1);">${statusBadge(smr.status)}</div>
        </div>
        ${smr.status === 'draft' ? `
          <button onclick="markSMRSubmitted('${smrId}')" class="btn btn-sm">Mark as submitted</button>
        ` : ''}
      </div>

      <div class="banner banner-warning" style="margin-bottom:var(--space-4);">
        <strong>Tipping-off reminder.</strong> Do not disclose to any person that this SMR has been or may be submitted to AUSTRAC.
      </div>

      <div class="card">
        <div class="section-heading">SMR record</div>
        ${row('SMRID',            smrId)}
        ${row('Submitted by',     smr.submittedByName)}
        ${row('Date submitted',   fmtDate(smr.submittedDate))}
        ${row('AUSTRAC reference',smr.austracRef)}
        ${row('Status',           smr.status)}
        ${row('Created',          fmtDate(smr.createdAt))}
      </div>

      <div class="card">
        <div class="section-heading">Details</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-primary);line-height:var(--line-height-relaxed);white-space:pre-wrap;">${smr.details || '—'}</p>
      </div>

      <div class="card">
        <div class="section-heading">Related individuals</div>
        <p style="font-size:10px;color:var(--color-text-muted);margin-bottom:var(--space-2);">Internal reference only. Not shared outside your firm.</p>
        ${relatedInds.length > 0
          ? relatedInds.map(name => `<div style="font-size:var(--font-size-xs);padding:var(--space-1) 0;border-bottom:0.5px solid var(--color-border-light);">${name}</div>`).join('')
          : `<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No individuals linked.</p>`}
      </div>

      <div class="card">
        <div class="section-heading">Related entities</div>
        <p style="font-size:10px;color:var(--color-text-muted);margin-bottom:var(--space-2);">Internal reference only.</p>
        ${relatedEnts.length > 0
          ? relatedEnts.map(name => `<div style="font-size:var(--font-size-xs);padding:var(--space-1) 0;border-bottom:0.5px solid var(--color-border-light);">${name}</div>`).join('')
          : `<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No entities linked.</p>`}
      </div>

      ${smr.status === 'submitted' ? `
        <div style="display:flex;gap:var(--space-3);">
          <button onclick="closeSMR('${smrId}')" class="btn-sec btn-sm">Close SMR</button>
        </div>
      ` : ''}
    </div>`;
}

window.markSMRSubmitted = async function(smrId) {
  const austracRef = prompt('Enter the AUSTRAC reference number provided after submission:');
  if (!austracRef) return;

  const now = new Date().toISOString();
  try {
    await updateSMR(smrId, { status: 'submitted', austracRef, submittedDate: now });
    const smr = S.smrs?.find(s => s.smrId === smrId);
    if (smr) { smr.status = 'submitted'; smr.austracRef = austracRef; smr.submittedDate = now; }
    await saveAuditEntry({
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'smr_submitted', targetType: 'smr', targetId: smrId, targetName: austracRef,
      detail: `SMR marked as submitted to AUSTRAC — ref: ${austracRef}`,
      timestamp: now,
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
      firmId: S.firmId, userId: S.individualId,
      userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action: 'smr_closed', targetType: 'smr', targetId: smrId, targetName: smrId,
      detail: 'SMR closed',
      timestamp: now,
    });
    toast('SMR closed');
    render();
  } catch (err) {
    toast('Failed to close SMR', 'err');
  }
};
