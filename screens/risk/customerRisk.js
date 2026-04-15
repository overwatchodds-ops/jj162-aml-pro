import { S } from '../../state/index.js';
import { updateFirmProfile } from '../../firebase/firestore.js';
import { toast } from '../components/index.js';

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/
function _saveRA(patch) {
  const ra = Object.assign({}, S.firm.riskAssessment || {}, patch);
  S.firm.riskAssessment = ra;
  return updateFirmProfile(S.firmId, { riskAssessment: ra });
}

function autoClientRisk(checks = []) {
  if (!checks.length) return null;
  if (['cr-international', 'cr-cash', 'cr-pep'].some(id => checks.includes(id))) return 'High';
  if (checks.includes('cr-trusts')) return 'Medium';
  return 'Low';
}

function ratingPill(r) {
  if (!r) return '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Not yet assessed</span>';
  const bg  = r === 'High' ? '#fef2f2' : r === 'Medium' ? '#fffbeb' : '#f0fdf4';
  const col = r === 'High' ? '#991b1b' : r === 'Medium' ? '#92400e' : '#166534';
  return `<span style="font-size:11px;font-weight:500;padding:3px 10px;border-radius:99px;background:${bg};color:${col};">${r}</span>`;
}

function setupBanner() {
  const f = S.firm;
  const steps = [
    !!(f.firmName && f.abn),
    !!(f.designatedServices?.length),
    !!(f.riskAssessment?.rating),
    !!(f.amlProgram?.approvedBy && f.amlProgram?.approvedDate),
    !!(f.austracEnrolment?.enrolmentId || f.austracEnrolment?.enrolled),
  ];
  const done = steps.filter(Boolean).length;
  if (done >= 5) return '';
  return `<div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:10px;padding:10px 16px;font-size:12px;color:#92400e;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
    <span>${done} of 5 setup steps complete</span>
    <button onclick="go('setup')" style="font-size:12px;color:#92400e;font-weight:500;background:none;border:none;cursor:pointer;text-decoration:underline;">← Back to checklist</button>
  </div>`;
}

const CLIENT_TYPES = [
  {
    id: 'cr-individuals',
    name: 'Local individuals / PAYG employees',
    why: 'Standard identity verification applies. Face-to-face interaction is typical and source of funds is straightforward to establish.',
    level: 'Low',
  },
  {
    id: 'cr-sme',
    name: 'SMEs in common industries',
    why: 'Standard Australian businesses with ABN registration. Ownership structures are generally simple and verifiable through ASIC.',
    level: 'Low',
  },
  {
    id: 'cr-trusts',
    name: 'Trusts and companies with complex structures',
    why: 'Trusts and multi-layered company structures can obscure the true beneficial owner. AUSTRAC requires firms to identify and verify all controllers, not just the named entity.',
    level: 'Medium',
  },
  {
    id: 'cr-international',
    name: 'International clients or overseas connections',
    why: 'Cross-border clients are harder to verify and may be subject to different regulatory regimes. Foreign ownership also introduces sanctions exposure that domestic clients do not carry.',
    level: 'High',
  },
  {
    id: 'cr-cash',
    name: 'Cash-intensive industries',
    why: 'Hospitality, retail, construction and trades handle high volumes of cash, making it easier to introduce illicit funds into the financial system. AUSTRAC considers these industries inherently higher risk.',
    level: 'High',
  },
  {
    id: 'cr-pep',
    name: 'Politically exposed persons (PEPs) or their associates',
    why: 'PEPs hold or have held prominent public positions and carry elevated corruption risk. AUSTRAC requires enhanced CDD for all PEPs, regardless of jurisdiction.',
    level: 'High',
  },
];

/* ─── SCREEN ──────────────────────────────────────────────────────────────────*/
export function screen() {
  const ra       = S.firm.riskAssessment || {};
  const checks   = ra.customerChecks || [];
  const autoCR   = autoClientRisk(checks);
  const override = ra.customerRatingOverride || '';
  const just     = ra.customerRatingJust || '';
  const effective = override || autoCR;

  const whyText = autoCR === 'High'
    ? 'Your client base includes international clients, PEPs, or cash-intensive industries — all of which AUSTRAC considers to carry elevated ML/TF exposure requiring enhanced due diligence.'
    : autoCR === 'Medium'
    ? 'Your client base includes trusts or companies with complex structures, requiring beneficial ownership assessment and ongoing monitoring to identify who ultimately controls the entity.'
    : autoCR === 'Low'
    ? 'Your clients are primarily local individuals and standard SMEs. Standard CDD procedures apply with no elevated monitoring requirements from a customer risk perspective.'
    : null;

  return `<div style="max-width:680px;">
    ${setupBanner()}

    <div style="margin-bottom:24px;">
      <div style="margin-bottom:6px;">
        <button onclick="go('servicerisk')" style="font-size:12px;color:#94a3b8;background:none;border:none;cursor:pointer;padding:0;">← Service Risk</button>
      </div>
      <h1 style="font-size:20px;font-weight:500;color:#0f172a;margin-bottom:3px;">Customer Risk</h1>
      <p style="font-size:13px;color:#64748b;">Who you act for directly affects the likelihood that your services could be misused. Some client types require enhanced due diligence regardless of the service provided.</p>
    </div>

    <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:500;color:#0f172a;margin-bottom:4px;">Your client base</div>
      <p style="font-size:11px;color:#94a3b8;margin-bottom:14px;">Tick every client type your firm regularly acts for. You are assessing the composition of your client base — individual client risk is assessed in the Client Register.</p>

      <div style="margin-bottom:14px;">
        ${CLIENT_TYPES.map(({ id, name, why, level }) => {
          const checked   = checks.includes(id);
          const borderCol = checked ? (level === 'High' ? '#fecaca' : level === 'Medium' ? '#fde68a' : '#bbf7d0') : '#e2e8f0';
          const bgCol     = checked ? (level === 'High' ? '#fef2f2' : level === 'Medium' ? '#fffbeb' : '#f0fdf4') : '#fff';
          const pillBg    = level === 'High' ? '#fef2f2' : level === 'Medium' ? '#fffbeb' : '#f0fdf4';
          const pillCol   = level === 'High' ? '#991b1b' : level === 'Medium' ? '#92400e' : '#166534';
          return `
          <label style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:0.5px solid ${borderCol};border-radius:10px;cursor:pointer;background:${bgCol};margin-bottom:6px;">
            <input type="checkbox" style="margin-top:2px;flex-shrink:0;" ${checked ? 'checked' : ''}
              onchange="crToggle('${id}', this.checked)">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;">
                <div style="font-size:12px;font-weight:500;color:#0f172a;">${name}</div>
                <span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:99px;flex-shrink:0;background:${pillBg};color:${pillCol};">${level}</span>
              </div>
              <div style="font-size:11px;color:#94a3b8;line-height:1.5;">${why}</div>
            </div>
          </label>`;
        }).join('')}
      </div>

      <!-- DERIVED RATING -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">
        <div>
          <div style="font-size:12px;font-weight:500;color:#0f172a;">Derived customer risk rating</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Calculated from selected client types</div>
        </div>
        ${ratingPill(autoCR)}
      </div>

      ${whyText ? `
      <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:11px;color:#64748b;line-height:1.6;margin-bottom:14px;">
        <span style="font-weight:500;color:#0f172a;">Why this rating: </span>${whyText}
      </div>` : ''}

      <!-- OVERRIDE -->
      <div style="border-top:0.5px solid #f1f5f9;padding-top:14px;">
        <div style="font-size:12px;font-weight:500;color:#0f172a;margin-bottom:8px;">Override (optional)</div>
        <p style="font-size:11px;color:#94a3b8;margin-bottom:10px;">Override only if your professional judgement differs. A written justification is required for audit purposes.</p>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          ${['', 'Low', 'Medium', 'High'].map(v => {
            const label = v || 'Use derived';
            const active = override === v;
            const bg  = active ? (v === 'High' ? '#fef2f2' : v === 'Medium' ? '#fffbeb' : v === 'Low' ? '#f0fdf4' : '#eef2ff') : '#fff';
            const col = active ? (v === 'High' ? '#991b1b' : v === 'Medium' ? '#92400e' : v === 'Low' ? '#166534' : '#4338ca') : '#64748b';
            const brd = active ? (v === 'High' ? '#fecaca' : v === 'Medium' ? '#fde68a' : v === 'Low' ? '#bbf7d0' : '#c7d2fe') : '#e2e8f0';
            return `<button onclick="crSetOverride('${v}')"
              style="flex:1;padding:8px 4px;border-radius:8px;font-size:11px;font-weight:500;border:0.5px solid ${brd};background:${bg};color:${col};cursor:pointer;">
              ${label}
            </button>`;
          }).join('')}
        </div>
        ${override ? `
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;font-weight:500;color:#0f172a;display:block;margin-bottom:4px;">Justification <span style="color:#ef4444;">*</span></label>
          <textarea rows="3" class="inp" style="font-size:12px;"
            placeholder="Explain why your professional judgement differs from the derived rating…"
            onchange="crSetJust(this.value)">${just}</textarea>
        </div>` : ''}
        ${effective ? `<div style="font-size:12px;color:#0f172a;">Effective rating: ${ratingPill(effective)}</div>` : ''}
      </div>
    </div>

    <button onclick="crSave()"
      style="width:100%;font-size:13px;font-weight:500;color:#fff;background:#4f46e5;border:none;padding:11px 16px;border-radius:8px;cursor:pointer;">
      Save &amp; Continue to Geography Risk →
    </button>
  </div>`;
}

/* ─── ACTIONS ─────────────────────────────────────────────────────────────────*/
window.crToggle = function(id, checked) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  const checks = [...(ra.customerChecks || [])];
  if (checked) { if (!checks.includes(id)) checks.push(id); }
  else { const i = checks.indexOf(id); if (i > -1) checks.splice(i, 1); }
  ra.customerChecks = checks;
  S.firm.riskAssessment = ra;
  go('customerrisk');
};

window.crSetOverride = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.customerRatingOverride = val;
  if (!val) ra.customerRatingJust = '';
  S.firm.riskAssessment = ra;
  go('customerrisk');
};

window.crSetJust = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.customerRatingJust = val;
  S.firm.riskAssessment = ra;
};

window.crSave = async function() {
  const ra     = Object.assign({}, S.firm.riskAssessment || {});
  const checks = ra.customerChecks || [];
  if (!checks.length) { toast('Select at least one client type before saving', 'err'); return; }
  const override = ra.customerRatingOverride || '';
  if (override && !ra.customerRatingJust?.trim()) {
    toast('Add a justification for your override before saving', 'err'); return;
  }
  ra.customerRating = override || autoClientRisk(checks);
  try {
    await _saveRA(ra);
    toast('Customer risk saved');
    go('georisk');
  } catch(e) {
    toast('Save failed — check your connection', 'err');
    console.error(e);
  }
};
