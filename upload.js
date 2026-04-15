import { S, addIndividualToState, addEntityToState, addLinkToState } from '../../state/index.js';
import { saveIndividual, saveEntity, saveLink, saveAuditEntry, genId } from '../../firebase/firestore.js';
import { ENTITY_ROLES, ROLE_LABELS }                                    from '../../state/rules_matrix.js';

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const mode    = S.currentParams?.mode || 'individuals';
  const rows    = S._bulkRows || defaultRows(mode);
  const saved   = S._bulkSaved || 0;

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Bulk upload</h1>
          <p class="screen-subtitle">Add multiple records quickly using the spreadsheet-style table. Tab to move between fields, paste from Excel or Google Sheets.</p>
        </div>
      </div>

      <!-- Mode selector -->
      <div class="filter-tabs" style="margin-bottom:var(--space-4);display:inline-flex;">
        <button onclick="bulkMode('individuals')" class="filter-tab ${mode==='individuals'?'active':''}">Individuals</button>
        <button onclick="bulkMode('entities')"    class="filter-tab ${mode==='entities'   ?'active':''}">Entities</button>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        <div class="banner-title">How to use</div>
        Type directly into the table or paste from a spreadsheet. Tab moves to the next cell. Enter adds a new row. Each row creates one record. Required fields are marked with *.
        ${mode === 'individuals' ? ' After saving, go to each individual to add their connections (firm role or entity membership).' : ''}
      </div>

      <!-- Table -->
      <div style="overflow-x:auto;margin-bottom:var(--space-4);">
        <table style="border-collapse:collapse;width:100%;min-width:${mode==='individuals'?'700px':'600px'};">
          <thead>
            <tr style="background:var(--color-surface-alt);">
              <th style="padding:var(--space-2) var(--space-3);font-size:10px;font-weight:500;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;border:0.5px solid var(--color-border);width:30px;">#</th>
              ${tableHeaders(mode).map(h => `
                <th style="padding:var(--space-2) var(--space-3);font-size:10px;font-weight:500;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;border:0.5px solid var(--color-border);white-space:nowrap;">${h.label}${h.required?'*':''}</th>
              `).join('')}
              <th style="border:0.5px solid var(--color-border);width:32px;"></th>
            </tr>
          </thead>
          <tbody id="bulk-tbody">
            ${rows.map((row, i) => tableRow(mode, row, i)).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5);">
        <button onclick="addBulkRow()" class="btn-sec btn-sm">+ Add row</button>
        <button onclick="addBulkRows(5)" class="btn-sec btn-sm">+ Add 5 rows</button>
        <button onclick="clearBulkTable()" class="btn-ghost" style="color:var(--color-danger);font-size:var(--font-size-xs);">Clear all</button>
        <div style="flex:1;"></div>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${rows.length} row${rows.length!==1?'s':''}</span>
      </div>

      <div id="bulk-error" class="banner banner-danger" style="display:none;margin-bottom:var(--space-3);"></div>

      ${saved > 0 ? `
        <div class="banner banner-success" style="margin-bottom:var(--space-3);">
          ${saved} record${saved!==1?'s':''} saved successfully. <button onclick="go('${mode}')" class="btn-ghost" style="color:var(--color-success-text);font-size:var(--font-size-xs);">View ${mode} →</button>
        </div>
      ` : ''}

      <div style="display:flex;gap:var(--space-3);">
        <button onclick="go('${mode}')" class="btn-sec" style="flex:1;">Cancel</button>
        <button onclick="saveBulkRecords()" class="btn" style="flex:2;">Save all records</button>
      </div>
    </div>`;
}

// ─── TABLE HEADERS ────────────────────────────────────────────────────────────
function tableHeaders(mode) {
  if (mode === 'individuals') return [
    { key: 'fullName',    label: 'Full name',    required: true  },
    { key: 'dateOfBirth', label: 'Date of birth', required: true  },
    { key: 'address',     label: 'Address',       required: true  },
    { key: 'email',       label: 'Email',         required: false },
    { key: 'phone',       label: 'Phone',         required: false },
  ];
  if (mode === 'entities') return [
    { key: 'entityName',  label: 'Entity name',   required: true  },
    { key: 'entityType',  label: 'Type',          required: true  },
    { key: 'abn',         label: 'ABN',           required: false },
    { key: 'acn',         label: 'ACN',           required: false },
    { key: 'address',     label: 'Address',       required: false },
  ];
  return [];
}

// ─── DEFAULT ROWS ─────────────────────────────────────────────────────────────
function defaultRows(mode) {
  return Array.from({ length: 5 }, () => emptyRow(mode));
}

function emptyRow(mode) {
  if (mode === 'individuals') return { fullName:'', dateOfBirth:'', address:'', email:'', phone:'' };
  if (mode === 'entities')    return { entityName:'', entityType:'', abn:'', acn:'', address:'' };
  return {};
}

// ─── TABLE ROW HTML ───────────────────────────────────────────────────────────
function tableRow(mode, row, i) {
  const headers = tableHeaders(mode);
  const cellStyle = 'border:0.5px solid var(--color-border);padding:2px;';

  const cells = headers.map(h => {
    if (h.key === 'entityType') {
      return `<td style="${cellStyle}">
        <select onchange="bulkCellChange(${i},'${h.key}',this.value)" style="width:100%;border:none;font-size:var(--font-size-xs);padding:6px 4px;background:transparent;font-family:var(--font-family);">
          <option value="">Select...</option>
          ${['Private Company','Trust','SMSF','Partnership','Individual / Sole Trader','Other'].map(t => `<option value="${t}" ${row[h.key]===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </td>`;
    }
    if (h.key === 'dateOfBirth') {
      return `<td style="${cellStyle}">
        <input type="date" value="${row[h.key]||''}" onchange="bulkCellChange(${i},'${h.key}',this.value)" style="width:100%;border:none;font-size:var(--font-size-xs);padding:6px 4px;background:transparent;font-family:var(--font-family);">
      </td>`;
    }
    return `<td style="${cellStyle}">
      <input type="text" value="${row[h.key]||''}"
        onchange="bulkCellChange(${i},'${h.key}',this.value)"
        onkeydown="bulkKeyDown(event,${i},'${h.key}')"
        style="width:100%;border:none;font-size:var(--font-size-xs);padding:6px 4px;background:transparent;font-family:var(--font-family);"
        placeholder="${h.required?'Required':''}">
    </td>`;
  });

  return `
    <tr id="bulk-row-${i}" style="background:${i%2===0?'var(--color-surface)':'var(--color-surface-alt)'}">
      <td style="${cellStyle}padding:6px 8px;font-size:10px;color:var(--color-text-muted);text-align:center;">${i+1}</td>
      ${cells.join('')}
      <td style="${cellStyle}text-align:center;">
        <button onclick="removeBulkRow(${i})" class="btn-ghost" style="color:var(--color-text-light);font-size:10px;">✕</button>
      </td>
    </tr>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.bulkMode = function(mode) {
  S.currentParams = { mode };
  delete S._bulkRows;
  delete S._bulkSaved;
  render();
};

window.bulkCellChange = function(i, key, val) {
  if (!S._bulkRows) S._bulkRows = defaultRows(S.currentParams?.mode || 'individuals');
  if (S._bulkRows[i]) S._bulkRows[i][key] = val;
};

window.bulkKeyDown = function(e, i, key) {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Add new row if on last row
    if (i === (S._bulkRows?.length || 0) - 1) {
      addBulkRow();
    } else {
      // Move to next row same column
      const nextRow = document.getElementById(`bulk-row-${i+1}`);
      if (nextRow) {
        const inputs = nextRow.querySelectorAll('input,select');
        if (inputs.length) inputs[0].focus();
      }
    }
  }
};

window.addBulkRow = function() {
  const mode = S.currentParams?.mode || 'individuals';
  if (!S._bulkRows) S._bulkRows = defaultRows(mode);
  S._bulkRows.push(emptyRow(mode));
  render();
  // Focus new row
  setTimeout(() => {
    const lastRow = document.getElementById(`bulk-row-${S._bulkRows.length - 1}`);
    if (lastRow) {
      const inputs = lastRow.querySelectorAll('input,select');
      if (inputs.length) inputs[0].focus();
    }
  }, 50);
};

window.addBulkRows = function(n) {
  const mode = S.currentParams?.mode || 'individuals';
  if (!S._bulkRows) S._bulkRows = defaultRows(mode);
  for (let i = 0; i < n; i++) S._bulkRows.push(emptyRow(mode));
  render();
};

window.removeBulkRow = function(i) {
  if (S._bulkRows) S._bulkRows.splice(i, 1);
  render();
};

window.clearBulkTable = function() {
  if (!confirm('Clear all rows?')) return;
  const mode = S.currentParams?.mode || 'individuals';
  S._bulkRows = defaultRows(mode);
  render();
};

window.saveBulkRecords = async function() {
  const mode  = S.currentParams?.mode || 'individuals';
  const rows  = S._bulkRows || [];
  const errEl = document.getElementById('bulk-error');
  errEl.style.display = 'none';

  // Sync cell values from DOM before saving
  rows.forEach((row, i) => {
    const tr = document.getElementById(`bulk-row-${i}`);
    if (!tr) return;
    tr.querySelectorAll('input[type="text"],input[type="date"]').forEach(inp => {
      const key = inp.getAttribute('onchange')?.match(/'(\w+)'/)?.[1];
      if (key) row[key] = inp.value;
    });
    tr.querySelectorAll('select').forEach(sel => {
      const key = sel.getAttribute('onchange')?.match(/'(\w+)'/)?.[1];
      if (key) row[key] = sel.value;
    });
  });

  // Filter out completely empty rows
  const validRows = mode === 'individuals'
    ? rows.filter(r => r.fullName?.trim())
    : rows.filter(r => r.entityName?.trim());

  if (!validRows.length) {
    errEl.textContent = 'No valid rows to save. At least one row must have a name.';
    errEl.style.display = 'block';
    return;
  }

  // Validate required fields
  const errors = [];
  validRows.forEach((r, i) => {
    if (mode === 'individuals') {
      if (!r.fullName?.trim())    errors.push(`Row ${i+1}: Full name is required`);
      if (!r.dateOfBirth)         errors.push(`Row ${i+1}: Date of birth is required`);
      if (!r.address?.trim())     errors.push(`Row ${i+1}: Address is required`);
    } else {
      if (!r.entityName?.trim())  errors.push(`Row ${i+1}: Entity name is required`);
      if (!r.entityType)          errors.push(`Row ${i+1}: Entity type is required`);
    }
  });

  if (errors.length) {
    errEl.innerHTML = errors.slice(0, 5).join('<br>') + (errors.length > 5 ? `<br>+${errors.length-5} more` : '');
    errEl.style.display = 'block';
    return;
  }

  try {
    const now = new Date().toISOString();
    let saved = 0;

    for (const r of validRows) {
      if (mode === 'individuals') {
        const iid = genId('ind');
        const indData = {
          individualId: iid,
          firmId:       S.firmId,
          fullName:     r.fullName.trim(),
          dateOfBirth:  r.dateOfBirth || '',
          address:      r.address?.trim() || '',
          email:        r.email?.trim()   || '',
          phone:        r.phone?.trim()   || '',
          createdAt:    now,
          updatedAt:    now,
        };
        await saveIndividual(iid, indData);
        addIndividualToState(indData);
        await saveAuditEntry({
          firmId: S.firmId, userId: S.individualId,
          userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
          action: 'individual_created', targetType: 'individual',
          targetId: iid, targetName: r.fullName.trim(),
          detail: `Individual created via bulk upload — ${r.fullName.trim()}`,
          timestamp: now,
        });
      } else {
        const eid = genId('ent');
        const entData = {
          entityId:           eid,
          firmId:             S.firmId,
          entityName:         r.entityName.trim(),
          entityType:         r.entityType || '',
          abn:                r.abn?.trim()     || '',
          acn:                r.acn?.trim()     || '',
          registeredAddress:  r.address?.trim() || '',
          status:             'active',
          createdAt:          now,
          updatedAt:          now,
        };
        await saveEntity(eid, entData);
        addEntityToState(entData);
        await saveAuditEntry({
          firmId: S.firmId, userId: S.individualId,
          userName: S.individuals?.find(i=>i.individualId===S.individualId)?.fullName || 'User',
          action: 'entity_created', targetType: 'entity',
          targetId: eid, targetName: r.entityName.trim(),
          detail: `Entity created via bulk upload — ${r.entityName.trim()} (${r.entityType})`,
          timestamp: now,
        });
      }
      saved++;
    }

    S._bulkSaved = saved;
    S._bulkRows  = defaultRows(mode);
    toast(`${saved} record${saved!==1?'s':''} saved`);
    render();
  } catch (err) {
    errEl.textContent = 'Failed to save records. Please try again.';
    errEl.style.display = 'block';
    console.error(err);
  }
};
