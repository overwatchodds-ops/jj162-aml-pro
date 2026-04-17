import { S } from '../../state/index.js';
import { saveIndividual, genId } from '../../firebase/firestore.js';

export function renderIdentityTab() {
  const d = S._draft || {};
  return `
    <div class="card">
      <div class="section-heading">Core Identity</div>
      <div class="form-grid mb-4">
        <div class="form-row span-2">
          <label class="label label-required">Full legal name *</label>
          <input type="text" class="inp" value="${d.fullName || ''}" oninput="updateDraft('fullName', this.value)">
        </div>
        <div class="form-row">
          <label class="label label-required">Job Title / Role *</label>
          <input type="text" class="inp" value="${d.role || ''}" oninput="updateDraft('role', this.value)">
        </div>
      </div>
    </div>`;
}

export async function handleIdentitySave() {
  const d = S._draft;
  if (!d?.fullName || !d?.role) {
    toast("Name and Role are required", "err");
    return false;
  }
  const iid = d.individualId || genId('ind');
  const record = { ...d, individualId: iid, isStaff: true, updatedAt: new Date().toISOString() };
  try {
    await saveIndividual(iid, record);
    S._draft = record;
    return true;
  } catch (e) {
    return false;
  }
}
