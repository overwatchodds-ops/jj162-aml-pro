window.resumeOnboarding = (id) => {
  // 1. Find the existing staff member in the global state
  const person = S.individuals.find(i => i.individualId === id);
  
  if (!person) {
    toast("Error: Could not find staff record.", "err");
    return;
  }

  // 2. HYDRATION: Place their data into the 'scratchpad'
  // We use JSON.parse/stringify to create a clean copy that doesn't 
  // mess up the main list until we hit 'Save'.
  S._draft = JSON.parse(JSON.stringify(person));
  
  // 3. Set the routing parameters
  // If status is 'Incomplete', we go to vetting. If they want to edit ID, they can click the tab.
  const targetTab = person.vettingStatus === 'Complete' ? 'identity' : 'vetting';
  
  S.currentParams = { 
    individualId: id, 
    tab: targetTab 
  };
  
  // 4. Navigate to the edit screen
  go('staff-edit');
};
