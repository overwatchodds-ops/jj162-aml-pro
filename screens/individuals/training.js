import { S } from '../../state/index.js';
import { saveIndividual } from '../../firebase/firestore.js';

export function renderTrainingTab() {
  const d = S._draft;
  
  // Logic: Check if training is required based on their functions
  const isNone = d.noneSelected === true;

  if (isNone) {
    return `
      <div class="card empty-state">
        <div class="empty-state-title">No Training Required</div>
        <p>This individual has no regulated AML/CTF functions. No training evidence is required for this record.</p>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-heading">AML/CTF Training Evidence</div>
      <p class="screen-subtitle mb-4">Record the most recent training completed by this staff member.</p>
      
      <div class="form-grid">
        <div class="form-row span-2">
          <label class="label label-required">Training Provider</label>
          <input type="text" class="inp" 
            value="${d.trainingProvider || ''}" 
            placeholder="e.g. GRC Solutions, CPA Australia, Internal"
            oninput="updateDraft('trainingProvider', this.value)">
        </div>
        
        <div class="form-row">
          <label class="label label-required">Date Completed</label>
          <input type="date" class="inp" 
            value="${d.trainingDate || ''}" 
            onchange="handleTrainingDateChange(this.value)">
        </div>

        <div class="form-row">
          <label class="label">Next Training Due</label>
          <input type="date" class="inp" 
            value="${d.trainingExpiry || ''}" 
            oninput="updateDraft('trainingExpiry', this.value)">
        </div>

        <div class="form-row span-2">
          <label class="label">Training Type</label>
          <select class="inp" onchange="updateDraft('trainingType', this.value)">
            <option value="standard" ${d.trainingType === 'standard' ? 'selected' : ''}>Standard AML/CTF Awareness</option>
            <option value="enhanced" ${d.trainingType === 'enhanced' ? 'selected' : ''}>Enhanced (Key Personnel/AMLCO)</option>
          </select>
        </div>
      </div>
    </div>`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

window.handleTrainingDateChange = (val) => {
  if (!val) return;
  // Logic: Auto-calculate 1 year expiry for the user's convenience
  const date = new Date(val);
  date.setFullYear(date.getFullYear() + 1);
  
  updateDraft('trainingDate', val);
  updateDraft('trainingExpiry', date.toISOString().split('T')[0]);
  render();
};

export async function handleFinalSave() {
  const d = S._draft;
  const iid = d.individualId;
  const now = new Date().toISOString();

  // 1. Calculate final compliance status
  // Logic: They are only "Complete" if Identity, Vetting, and Training are all present.
  const isVettingDone = d.idType && d.nsResult && (d.isStaff ? d.declSigned : true);
  const isTrainingDone = d.noneSelected ? true : (d.trainingDate && d.trainingProvider);
  
  const finalStatus = (isVettingDone && isTrainingDone) ? 'Complete' : 'Incomplete';

  const updatedRecord = {
    ...d,
    vettingStatus: finalStatus,
    updatedAt: now
  };

  try {
    await saveIndividual(iid, updatedRecord);
    
    // 2. Clean up and redirect
    delete S._draft;
    toast("Staff onboarding complete.", "success");
    go('staff'); // Back to the main Register
  } catch (err) {
    console.error(err);
    toast("Final save failed.", "err");
  }
}
