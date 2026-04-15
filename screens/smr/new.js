import { S, addIndividualToState }         from '../../state/index.js';
import { saveSMR, saveAuditEntry, genId }  from '../../firebase/firestore.js';

export function screen() {
  const d = S._draft || {};

  // Build individual and entity options for reference
  const individualOptions = (S.individuals || []).map(i =>
    `<option value="${i.individualId}" ${(d.relatedIndividuals||[]).includes(i.individualId)?'selected':''}>${i.fullName}</option>`
  ).join('');

  const entityOptions = (S.entities || []).map(e =>
    `<option value="${e.entityId}" ${(d.relatedEntities||[]).includes(e.entityId)?'selected':''}>${e.entityName}</option>`
  ).join('');

  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <div>
          <button onclick="go('smr')" class="btn-ghost" style="padding:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">← SMR</button>
          <h1 class="screen-title" style="margin-top:var(--space-2);">New SMR</h1>
        </div>
      </div>

      <div class="banner banner-danger" style="margin-bottom:var(--space-4);">
        <div class="banner-title">Tipping-off prohibition</div>
        You must not disclose to any person — including the subject of this report — that an SMR has been or may be submitted to AUSTRAC. This is a criminal offence under the AML/CTF Act.
      </div>

      <div class="card">
        <div class="section-heading">SMR details</div>
        <div class="form-grid" style="grid-template-columns:1fr;">

          <div class="form-row">
            <label class="label label-required">Submitted by</label>
            <input id="smr-by-name" type="text" class="inp" value="${d.submittedByName||''}" placeholder="Staff member name">
          </div>

          <div class="form-row">
            <label class="label label-required">Date submitted to AUSTRAC</label>
            <input id="smr-date" type="date" class="inp" value="${d.submittedDate||new Date().toISOString().split('T')[0]}">
          </div>

          <div class="form-row">
            <label class="label">AUSTRAC reference number</label>
            <input id="smr-ref" type="text" class="inp" value="${d.austracRef||''}" placeholder="Provided by AUSTRAC after submission">
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
            <textarea id="smr-details" class="inp" rows="6" placeholder="Describe the suspicious activity or matter. Include dates, amounts, and any relevant context. This is an internal record only.">${d.details||''}</textarea>
          </div>

        </div>
      </div>

      <div class="card">
        <div class="section-heading">Related individuals</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">Internal reference only. These links are never shared with other firms or visible outside your firm's SMR records.</p>
        <select id="smr-individuals" multiple class="inp" style="height:120px;" size="5">
          ${individualOptions}
        </select>
        <p style="font-size:10px;color:var(--color-text-muted);margin-top:4px;">Hold Ctrl / Cmd to select multiple.</p>
      </div>

      <div class="card">
        <div class="section-heading">Related entities</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">Internal reference only.</p>
        <select id="smr-entities" multiple class="inp" style="height:100px;" size="4">
          ${entityOptions}
        </select>
      </div>

      <div id="smr-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

      <div style="display:flex;gap:var(--space-3);">
        <button onclick="go('smr')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveSMRRecord()" class="btn" style="flex:2;">Save SMR</button>
      </div>
    </div>`;
}

window.saveSMRRecord = async function() {
  const byName  = document.getElementById('smr-by-name')?.value?.trim();
  const date    = document.getElementById('smr-date')?.value;
  const details = document.getElementById('smr-details')?.value?.trim();
  const status  = document.getElementById('smr-status')?.value;
  const errEl   = document.getElementById('smr-error');
  errEl.style.display = 'none';

  if (!byName)  { errEl.textContent='Submitted by is required.'; errEl.style.display='block'; return; }
  if (!details) { errEl.textContent='Details are required.'; errEl.style.display='block'; return; }

  // Get selected individuals and entities
  const indSelect = document.getElementById('smr-individuals');
  const entSelect = document.getElementById('smr-entities');
  const relatedIndividuals = indSelect ? Array.from(indSelect.selectedOptions).map(o=>o.value) : [];
  const relatedEntities    = entSelect ? Array.from(entSelect.selectedOptions).map(o=>o.value) : [];

  const now = new Date().toISOString();

  try {
    const smrId = await saveSMR({
      firmId:             S.firmId,
      submittedBy:        S.individualId,
      submittedByName:    byName,
      submittedDate:      date || now,
      austracRef:         document.getElementById('smr-ref')?.value?.trim() || '',
      status:             status || 'draft',
      details,
      relatedIndividuals,
      relatedEntities,
    });

    // Add to in-memory state
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

    // Audit entry — deliberately vague, no individual/entity names
    await saveAuditEntry({
      firmId:     S.firmId,
      userId:     S.individualId,
      userName:   S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
      action:     'smr_submitted',
      targetType: 'smr',
      targetId:   smrId,
      targetName: smrId,
      detail:     `SMR recorded — status: ${status || 'draft'}`,
      timestamp:  now,
    });

    delete S._draft;
    toast('SMR saved');
    go('smr');
  } catch (err) {
    errEl.textContent = 'Failed to save SMR. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};
