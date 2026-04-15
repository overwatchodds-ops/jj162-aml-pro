import { S, save } from '../../state/index.js';

export function screen() {
  const d = S._onboardingAustrac || {};

  return `
    <div class="card">
      <h1 class="screen-title" style="font-size:var(--font-size-lg);margin-bottom:var(--space-1);">AUSTRAC enrolment</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">Record your firm's AUSTRAC enrolment status. You must be enrolled before 1 July 2026.</p>

      <div class="form-row" style="margin-bottom:var(--space-4);">
        <label class="label label-required">Are you enrolled with AUSTRAC?</label>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-1);">
          <label class="check-row ${d.enrolled === true ? 'selected-primary' : ''}">
            <input type="radio" name="ob-enrolled" value="yes" ${d.enrolled === true ? 'checked' : ''} onchange="obAustracToggle(true)" style="margin-top:2px;flex-shrink:0;">
            <div>
              <div class="check-row-label">Yes — I am already enrolled</div>
              <div class="check-row-desc">Enter your enrolment ID below</div>
            </div>
          </label>
          <label class="check-row ${d.enrolled === false ? 'selected' : ''}">
            <input type="radio" name="ob-enrolled" value="no" ${d.enrolled === false ? 'checked' : ''} onchange="obAustracToggle(false)" style="margin-top:2px;flex-shrink:0;">
            <div>
              <div class="check-row-label">Not yet — I need to enrol</div>
              <div class="check-row-desc">You can record your enrolment ID later in Firm Profile</div>
            </div>
          </label>
        </div>
      </div>

      <div id="ob-enrolment-fields" style="display:${d.enrolled === true ? 'block' : 'none'};">
        <div class="form-row">
          <label class="label">AUSTRAC enrolment ID</label>
          <input id="ob-enrolment-id" type="text" class="inp" value="${d.enrolmentId||''}" placeholder="e.g. AUSTRAC-2026-XXXXX">
        </div>
        <div class="form-row">
          <label class="label">Enrolment date</label>
          <input id="ob-enrolment-date" type="date" class="inp" value="${d.enrolmentDate||''}">
        </div>
      </div>

      <div id="ob-enrolment-guidance" style="display:${d.enrolled === false ? 'block' : 'none'};">
        <div class="banner banner-warning">
          <div class="banner-title">Enrolment required by 1 July 2026</div>
          You must enrol with AUSTRAC before providing designated services. Visit
          <a href="https://www.austrac.gov.au/business/how-comply-guidance-and-resources/enrolment" target="_blank" style="color:var(--color-warning-text);font-weight:var(--font-weight-medium);">AUSTRAC Online</a>
          to complete your enrolment. Once enrolled, add your ID in Firm Profile.
        </div>
      </div>

      <div id="ob-austrac-error" class="banner banner-danger" style="display:none;margin-top:var(--space-3);"></div>

      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button onclick="go('onboarding-individual')" class="btn-sec" style="flex:1;">← Back</button>
        <button onclick="obAustracNext()" class="btn" style="flex:2;">Continue →</button>
      </div>
    </div>`;
}

window.obAustracToggle = function(enrolled) {
  if (!S._onboardingAustrac) S._onboardingAustrac = {};
  S._onboardingAustrac.enrolled = enrolled;
  save();
  go('onboarding-austrac');
};

window.obAustracNext = async function() {
  const d     = S._onboardingAustrac || {};
  const errEl = document.getElementById('ob-austrac-error');
  errEl.style.display = 'none';

  if (d.enrolled === undefined) {
    errEl.textContent = 'Please select your AUSTRAC enrolment status.';
    errEl.style.display = 'block';
    return;
  }

  S._onboardingAustrac = {
    enrolled:      d.enrolled,
    enrolmentId:   document.getElementById('ob-enrolment-id')?.value?.trim()   || '',
    enrolmentDate: document.getElementById('ob-enrolment-date')?.value         || '',
  };

  save();

  // Commit all onboarding data to Firestore
  try {
    await commitOnboarding();
    go('onboarding-complete');
  } catch (err) {
    errEl.textContent = 'Failed to save your data. Please try again.';
    errEl.style.display = 'block';
  }
};

async function commitOnboarding() {
  const { saveFirmProfile, saveIndividual, saveLink, saveAuditEntry } = await import('../../firebase/firestore.js');

  const firmData   = S._onboardingFirm       || {};
  const indData    = S._onboardingIndividual  || {};
  const austracData = S._onboardingAustrac    || {};
  const uid        = S.user?.uid;
  const now        = new Date().toISOString();

  // Generate IDs
  const firmId       = 'firm_' + uid;
  const individualId = 'ind_' + uid;
  const linkId       = 'link_' + uid + '_firm';

  // Save firm profile
  await saveFirmProfile(firmId, {
    firmId,
    firmName:   firmData.name,
    abn:        firmData.abn,
    acn:        firmData.acn        || '',
    address:    firmData.address,
    phone:      firmData.phone      || '',
    email:      firmData.email      || S.user?.email || '',
    austracEnrolment: {
      enrolled:      austracData.enrolled,
      enrolmentId:   austracData.enrolmentId   || '',
      enrolmentDate: austracData.enrolmentDate || '',
      status:        austracData.enrolled ? 'active' : 'pending',
    },
    amlProgram:      {},
    riskAssessment:  {},
    subscription:    { plan: 'pro', status: 'active' },
    createdAt:  now,
    updatedAt:  now,
  });

  // Save individual (the owner)
  await saveIndividual(individualId, {
    individualId,
    firmId,
    fullName:   indData.name,
    dateOfBirth: indData.dob,
    address:    indData.address,
    email:      S.user?.email || '',
    phone:      indData.phone || '',
    createdAt:  now,
    updatedAt:  now,
  });

  // Save link (owner → firm)
  await saveLink(linkId, {
    linkId,
    individualId,
    linkedObjectType: 'firm',
    linkedObjectId:   firmId,
    roleType:         indData.role || 'owner',
    status:           'active',
    startDate:        now,
    createdAt:        now,
  });

  // Audit log entry
  await saveAuditEntry({
    firmId,
    userId:     individualId,
    userName:   indData.name,
    action:     'firm_created',
    targetType: 'firm',
    targetId:   firmId,
    targetName: firmData.name,
    detail:     'Firm profile created during onboarding',
    timestamp:  now,
  });

  // Update local state
  S.firm         = { ...firmData, firmId };
  S.individualId = individualId;
  S.firmId       = firmId;

  // Clean up draft data
  delete S._onboardingFirm;
  delete S._onboardingIndividual;
  delete S._onboardingAustrac;

  save();
}
