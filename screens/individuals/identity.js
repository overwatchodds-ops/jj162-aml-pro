import { S } from '../../state/index.js';
import { saveIndividual, genId } from '../../firebase/firestore.js';

export function renderIdentityTab() {
  const d = S._draft;
  
  return `
    <div class="card">
      <div class="section-heading">Core Identity</div>
      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name *</label>
          <input id="ind-name" type="text" class="inp" 
            value="${d.fullName || d.name || ''}" 
            oninput="updateDraft('fullName', this.value)"
            placeholder="Legal name for vetting">
        </div>
        <div class="form-row">
          <label class="label label-required">Job Title / Role *</label>
          <input type="text" class="inp" 
            value="${d.role || ''}" 
            oninput="updateDraft('role', this.value)"
            placeholder="e.g. Director">
        </div>
      </div>

      <div class="section-heading">AML/CTF Functions</div>
      ${renderFunctionCheckboxes(d)}

      <label class="check-row ${d.noneSelected ? 'selected' : ''}" style="margin-top:20px;">
        <input type="checkbox" ${d.noneSelected ? 'checked' : ''} onchange="toggleNone()">
        <div>
          <div class="check-row-label">No AML/CTF functions</div>
          <div class="check-row-desc">Administrative staff only.</div>
        </div>
      </label>
    </div>
  `;
}

// ─── THE SAVE LOGIC (Prevents Duplicates) ─────────────────────────────────────

export async function handleIdentitySave() {
  const d = S._draft;

  // 1. Validation Gate
  if (!d.fullName || !d.role) {
    toast("Name and Role are mandatory.", "err");
    return false;
  }

  // 2. ID Guard: Use existing ID or generate ONE new one
  const iid = d.individualId || genId('ind');
  const now = new Date().toISOString();
  
  const record = {
    ...d,
    individualId: iid,
    isStaff: true,
    updatedAt: now,
    createdAt: d.createdAt || now,
    vettingStatus: d.noneSelected ? 'Complete' : 'Incomplete'
  };

  try {
    // 3. Commit to Database
    await saveIndividual(iid, record);
    
    // 4. Update State so 'new.js' knows we have an ID now
    S._draft = record; 
    
    // Sync local list for immediate UI update
    const idx = S.individuals.findIndex(i => i.individualId === iid);
    if (idx > -1) S.individuals[idx] = record;
    else S.individuals.unshift(record);

    return true; 
  } catch (err) {
    toast("Connection error", "err");
    return false;
  }
}

function renderFunctionCheckboxes(d) {
  const items = [
    { id:'director', label:'Director / Owner' },
    { id:'amlco',    label:'AMLCO' },
    { id:'senior',   label:'Senior Manager' },
    { id:'cdd',      label:'Customer Due Diligence' }
  ];
  return items.map(f => `
    <label class="check-row ${d.functions?.includes(f.id) ? 'selected' : ''}">
      <input type="checkbox" ${d.functions?.includes(f.id) ? 'checked' : ''} onchange="toggleFunction('${f.id}')">
      <div><div class="check-row-label">${f.label}</div></div>
    </label>
  `).join('');
}
