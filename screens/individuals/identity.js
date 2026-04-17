import { S } from '../../state/index.js';
import { saveIndividual, genId } from '../../firebase/firestore.js';

/**
 * Identity Tab Renderer
 * Displays core staff details and AML/CTF function selection.
 */
export function renderIdentityTab() {
  const d = S._draft || {};

  return `
    <div class="card">
      <div class="section-heading">Core Identity</div>
      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name *</label>
          <input id="ind-name" type="text" class="inp" 
            value="${d.fullName || d.name || ''}" 
            oninput="updateDraft('fullName', this.value)"
            placeholder="Legal name for vetting purposes">
        </div>
        
        <div class="form-row">
          <label class="label label-required">Date of birth *</label>
          <input type="date" class="inp" 
            value="${d.dateOfBirth || ''}" 
            oninput="updateDraft('dateOfBirth', this.value)">
        </div>

        <div class="form-row">
          <label class="label label-required">Job Title / Role *</label>
          <input id="ind-role" type="text" class="inp" 
            value="${d.role || ''}" 
            oninput="updateDraft('role', this.value)"
            placeholder="e.g. Director, Advisor, AMLCO">
        </div>
      </div>

      <div class="section-heading">AML/CTF Functions</div>
      <p class="screen-subtitle mb-4">Select the tasks this person performs for the firm.</p>
      
      ${renderFunctionCheckboxes(d)}

      <label class="check-row ${d.noneSelected ? 'selected' : ''}" style="margin-top:20px;">
        <input type="checkbox" ${d.noneSelected ? 'checked' : ''} onchange="toggleNone()">
        <div>
          <div class="check-row-label">No AML/CTF functions</div>
          <div class="check-row-desc">Administrative or support staff with no regulated duties.</div>
        </div>
      </label>
    </div>
  `;
}

/**
 * Logic: Commits the Identity data to the database.
 * This is the point where the record is "born" in your register.
 */
export async function handleIdentitySave() {
  const d = S._draft;

  // 1. Mandatory Validation
  if (!d.fullName || !d.role) {
    toast("Full Name and Job Title are mandatory to create a record.", "err");
    return false;
  }

  // 2. ID Management: Use existing ID or generate ONE new one (Prevents duplicates)
  const iid = d.individualId || genId('ind');
  const now = new Date().toISOString();
  
  const record = {
    ...d,
    individualId: iid,
    isStaff: true, // Hard-lock the staff context
    updatedAt: now,
    createdAt: d.createdAt || now,
    // Status logic: If "No AML Functions", record is Complete. Otherwise, it's Incomplete.
    vettingStatus: d.noneSelected ? 'Complete' : 'Incomplete'
  };

  try {
    // 3. Save to Firebase
    await saveIndividual(iid, record);
    
    // 4. Update the global Draft with the final record (including the ID)
    S._draft = record; 
    
    // 5. Sync the main list in memory so the Register updates immediately
    const idx = S.individuals.findIndex(i => i.individualId === iid);
    if (idx > -1) S.individuals[idx] = record;
    else S.individuals.unshift(record);

    return true; 
  } catch (err) {
    console.error("Identity Save Error:", err);
    toast("Database connection error. Please try again.", "err");
    return false;
  }
}

function renderFunctionCheckboxes(d) {
  const items = [
    { id:'director', label:'Director / Owner / Beneficial Owner' },
    { id:'amlco',    label:'AMLCO or Delegate' },
    { id:'senior',   label:'Senior Manager' },
    { id:'cdd',      label:'Processes CDD / KYC' },
    { id:'screen',   label:'Screens Clients (PEP/Sanctions)' },
    { id:'monitor',  label:'Transaction Monitoring' },
    { id:'smr',      label:'SMR Reporting' }
  ];

  return items.map(f => `
    <label class="check-row ${d.functions?.includes(f.id) ? 'selected' : ''}">
      <input type="checkbox" ${d.functions?.includes(f.id) ? 'checked' : ''} 
        onchange="toggleFunction('${f.id}')">
      <div><div class="check-row-label">${f.label}</div></div>
    </label>
  `).join('');
}
