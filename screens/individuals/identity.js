import { S } from '../../state/index.js';
import { saveIndividual, genId } from '../../firebase/firestore.js';

export async function handleIdentitySave() {
  const d = S._draft;

  // 1. STRICTOR VALIDATION
  if (!d.fullName || !d.role) {
    toast("Full Name and Job Title are required to create a record.", "err");
    return false; // Stop the flow
  }

  // 2. PREPARE THE PERMANENT RECORD
  const iid = d.individualId || genId('ind');
  const now = new Date().toISOString();
  
  const finalRecord = {
    ...d,
    individualId: iid,
    fullName: d.fullName,
    role: d.role,
    isStaff: true,
    updatedAt: now,
    createdAt: d.createdAt || now,
    // Logic: Status is "Incomplete" because vetting is still outstanding
    vettingStatus: d.noneSelected ? 'Complete' : 'Incomplete' 
  };

  try {
    // 3. PHYSICAL SAVE TO DATABASE
    await saveIndividual(iid, finalRecord);
    
    // 4. SYNC STATE
    S._draft = finalRecord; 
    const idx = S.individuals.findIndex(i => i.individualId === iid);
    if (idx > -1) S.individuals[idx] = finalRecord;
    else S.individuals.unshift(finalRecord);

    toast("Identity saved. Record is now live.", "success");
    return true; // Proceed to Vetting
  } catch (err) {
    console.error(err);
    toast("Database connection failed.", "err");
    return false;
  }
}
