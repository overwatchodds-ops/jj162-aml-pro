import { S } from '../../state/index.js';
import { updateFirmProfile } from '../../firebase/firestore.js';
import { toast } from '../components/index.js';

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/
function _saveRA(patch) {
  const ra = Object.assign({}, S.firm.riskAssessment || {}, patch);
  S.firm.riskAssessment = ra;
  return updateFirmProfile(S.firmId, { riskAssessment: ra });
}

function autoGeoRisk(checks = []) {
  if (!checks.length) return null;
  if (['gr-overseas', 'gr-highrisk'].some(id => checks.includes(id))) return 'High';
  if (['gr-remote', 'gr-intermediary'].some(id => checks.includes(id))) return 'Medium';
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

const GEO_FACTORS = [
  {
    id: 'gr-local',
    name: 'All clients are Australian residents',
    why: 'Face-to-face or easily verifiable interactions. Identity documents are Australian-issued and can be verified through standard DVS checks.',
    level: 'Low',
  },
  {
    id: 'gr-remote',
    name: 'Clients onboarded or serviced remotely',
    why: 'Without face-to-face interaction, identity documents cannot be physically inspected. Remote onboarding increases the risk of impersonation and makes it harder to detect altered or fraudulent documents.',
    level: 'Medium',
  },
  {
    id: 'gr-intermediary',
    name: 'Services delivered via intermediaries or referrers',
    why: 'When another party introduces clients to your firm, you cannot directly verify how that party conducted their own due diligence. Reliance on third parties requires a formal reliance agreement under the AML/CTF Rules.',
    level: 'Medium',
  },
  {
    id: 'gr-overseas',
    name: 'Some clients located overseas',
    why: 'Cross-border clients are subject to different regulatory regimes and may be harder to verify. Foreign-sourced funds introduce additional layering risk and may require source-of-wealth documentation.',
    level: 'High',
  },
  {
    id: 'gr-highrisk',
    name: 'Clients connected to FATF high-risk jurisdictions',
    why: 'FATF publishes a list of jurisdictions with weak AML/CTF controls. Clients from these countries carry elevated ML/TF and sanctions risk. AUSTRAC expects enhanced scrutiny for any business connected to these jurisdictions.',
    level: 'High',
  },
];

/* ─── SCREEN ──────────────────────────────────────────────────────────────────*/
export function screen() {
  const ra       = S.firm.riskAssessment || {};
  const checks   = ra.geoChecks || [];
  const autoGR   = autoGeoRisk(checks);
  const override = ra.geoRatingOverride || '';
  const just     = ra.geoRatingJust || '';
  const effective = override || autoGR;

  const whyText = autoGR === 'High'
    ? 'Your firm services overseas clients or has connections to FATF high-risk jurisdictions. These introduce cross-border verification challenges and elevated sanctions exposure that require enhanced controls.'
    : autoGR === 'Medium'
    ? 'Your firm onboards or services clients remotely or via intermediaries. Without face-to-face interaction, additional verification steps are required to mitigate identity risk.'
    : autoGR === 'Low'
    ? 'Your clients are local and interactions are face-to-face or otherwise easily verifiable. Geography and delivery channels do not elevate your inherent risk.'
    : null;

  return `<div style="max-width:680px;">
    ${setupBanner()}

    <div style="margin-bottom:24px;">
      <div style="margin-bottom:6px;">
        <button onclick="go('customerrisk')" style="font-size:12px;color:#94a3b8;background:none;border:none;cursor:pointer;padding:0;">← Customer Risk</button>
      </div>
      <h1 style="font-size:20px;font-weight:500;color:#0f172a;margin-bottom:3px;">Geography &amp; Delivery Risk</h1>
      <p style="font-size:13px;color:#64748b;">Where your clients are and how you interact with them affects your ability to verify identity and detect suspicious behaviour.</p>
    </div>

    <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:500;color:#0f172a;margin-bottom:4px;">Delivery channels and client locations</div>
      <p style="font-size:11px;color:#94a3b8;margin-bottom:6px;">Tick all that apply to your firm's typical operating model — not individual transactions.</p>

      <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:11px;color:#64748b;margin-bottom:14px;line-height:1.6;">
        <span style="font-weight:500;color:#0f172a;">FATF jurisdictions: </span>The FATF list is published at <span style="color:#4f46e5;">fatf-gafi.org</span>. If any client has connections to a listed country, tick that item. Remote onboarding includes any client you have never met in person, even if they signed engagement letters by email.
      </div>

      <div style="margin-bottom:14px;">
        ${GEO_FACTORS.map(({ id, name, why, level }) => {
          const checked   = checks.includes(id);
          const borderCol = checked ? (level === 'High' ? '#fecaca' : level === 'Medium' ? '#fde68a' : '#bbf7d0') : '#e2e8f0';
          const bgCol     = checked ? (level === 'High' ? '#fef2f2' : level === 'Medium' ? '#fffbeb' : '#f0fdf4') : '#fff';
          const pillBg    = level === 'High' ? '#fef2f2' : level === 'Medium' ? '#fffbeb' : '#f0fdf4';
          const pillCol   = level === 'High' ? '#991b1b' : level === 'Medium' ? '#92400e' : '#166534';
          return `
          <label style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:0.5px solid ${borderCol};border-radius:10px;cursor:pointer;background:${bgCol};margin-bottom:6px;">
            <input type="checkbox" style="margin-top:2px;flex-shrink:0;" ${checked ? 'checked' : ''}
              onchange="grToggle('${id}', this.checked)">
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
          <div style="font-size:12px;font-weight:500;color:#0f172a;">Derived geography / delivery risk rating</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Calculated from selected factors</div>
        </div>
        ${ratingPill(autoGR)}
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
            return `<button onclick="grSetOverride('${v}')"
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
            onchange="grSetJust(this.value)">${just}</textarea>
        </div>` : ''}
        ${effective ? `<div style="font-size:12px;color:#0f172a;">Effective rating: ${ratingPill(effective)}</div>` : ''}
      </div>
    </div>

    <button onclick="grSave()"
      style="width:100%;font-size:13px;font-weight:500;color:#fff;background:#4f46e5;border:none;padding:11px 16px;border-radius:8px;cursor:pointer;">
      Save &amp; Continue to Overall Risk →
    </button>
  </div>`;
}

/* ─── ACTIONS ─────────────────────────────────────────────────────────────────*/
window.grToggle = function(id, checked) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  const checks = [...(ra.geoChecks || [])];
  if (checked) { if (!checks.includes(id)) checks.push(id); }
  else { const i = checks.indexOf(id); if (i > -1) checks.splice(i, 1); }
  ra.geoChecks = checks;
  S.firm.riskAssessment = ra;
  go('georisk');
};

window.grSetOverride = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.geoRatingOverride = val;
  if (!val) ra.geoRatingJust = '';
  S.firm.riskAssessment = ra;
  go('georisk');
};

window.grSetJust = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.geoRatingJust = val;
  S.firm.riskAssessment = ra;
};

window.grSave = async function() {
  const ra     = Object.assign({}, S.firm.riskAssessment || {});
  const checks = ra.geoChecks || [];
  if (!checks.length) { toast('Select at least one delivery channel or client location before saving', 'err'); return; }
  const override = ra.geoRatingOverride || '';
  if (override && !ra.geoRatingJust?.trim()) {
    toast('Add a justification for your override before saving', 'err'); return;
  }
  ra.geoRating = override || autoGeoRisk(checks);
  try {
    await _saveRA(ra);
    toast('Geography risk saved');
    go('overallrisk');
  } catch(e) {
    toast('Save failed — check your connection', 'err');
    console.error(e);
  }
};
