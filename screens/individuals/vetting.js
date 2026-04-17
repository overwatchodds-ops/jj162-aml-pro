// vetting.js

export function renderVettingTab() {
  const d = S._draft;
  const isKey = (d.functions?.some(f => ['director','amlco','senior'].includes(f))) || 
                (!d.functions?.length && !d.noneSelected);

  return `
    <div class="card">
      <div class="section-heading">Identity Verification</div>
      <div class="form-grid mb-4">
        <div class="form-row">
          <label class="label">ID Type</label>
          <select class="inp" onchange="updateDraft('idType', this.value); render();">
            <option value="">Select ID Type...</option>
            <option value="Passport" ${d.idType === 'Passport' ? 'selected' : ''}>Passport</option>
            <option value="Drivers Licence" ${d.idType === 'Drivers Licence' ? 'selected' : ''}>Drivers Licence</option>
            <option value="Medicare" ${d.idType === 'Medicare' ? 'selected' : ''}>Medicare Card</option>
          </select>
        </div>
        
        <div class="form-row">
          <label class="label">ID Number</label>
          <input type="text" class="inp" value="${d.idNumber || ''}" 
            oninput="updateDraft('idNumber', this.value)"
            placeholder="Enter document number">
        </div>
      </div>

      ${isKey ? renderKeyPersonnelChecks(d) : ''}
    </div>
  `;
}

function renderKeyPersonnelChecks(d) {
  return `
    <div class="divider"></div>
    <div class="section-heading">Background Checks (Key Personnel)</div>
    <div class="form-grid mb-4">
      <div class="form-row">
        <label class="label">Police Check Result</label>
        <select class="inp" onchange="updateDraft('policeResult', this.value); render();">
          <option value="">Select...</option>
          <option value="Pass" ${d.policeResult === 'Pass' ? 'selected' : ''}>Pass (Clear)</option>
          <option value="Fail" ${d.policeResult === 'Fail' ? 'selected' : ''}>Fail (Review Required)</option>
        </select>
      </div>
      <div class="form-row">
        <label class="label">Bankruptcy Check</label>
        <select class="inp" onchange="updateDraft('bankruptResult', this.value); render();">
          <option value="">Select...</option>
          <option value="Clear" ${d.bankruptResult === 'Clear' ? 'selected' : ''}>Clear (No Record)</option>
          <option value="Found" ${d.bankruptResult === 'Found' ? 'selected' : ''}>Record Found</option>
        </select>
      </div>
    </div>
  `;
}
