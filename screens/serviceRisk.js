import { S } from '../../state/index.js';
import { updateFirmProfile } from '../../firebase/firestore.js';
import { MATRIX } from '../../state/matrix.js';
import { toast } from '../components/index.js';

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/
function _saveRA(patch) {
  const ra = Object.assign({}, S.firm.riskAssessment || {}, patch);
  S.firm.riskAssessment = ra;
  return updateFirmProfile(S.firmId, { riskAssessment: ra });
}

function deriveServiceRisk(matched = []) {
  const itemNums = new Set();
  matched.forEach(r => {
    (r.table6_items || []).forEach(n => itemNums.add(n));
    if (!r.table6_items && r.table6) {
      const found = r.table6.match(/Item (\d+)/g) || [];
      found.forEach(m => itemNums.add(parseInt(m.replace('Item ', ''))));
    }
  });
  if ([2, 3, 4, 5].some(n => itemNums.has(n))) return 'High';
  if ([6, 7, 8, 9].some(n => itemNums.has(n))) return 'Medium';
  return 'Low';
}

function ratingPill(r) {
  if (!r) return '';
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

/* ─── SCREEN ──────────────────────────────────────────────────────────────────*/
export function screen() {
  const ra = S.firm.riskAssessment || {};
  const ids = S.firm.designatedServices || [];
  const matched = MATRIX.filter(m => ids.includes(m.id) && m.status === 'IN');

  // Guard: services must be confirmed first
  if (!matched.length) {
    return `<div style="max-width:680px;">
      ${setupBanner()}
      <div style="margin-bottom:24px;"><h1 style="font-size:20px;font-weight:500;color:#0f172a;">Service Risk</h1></div>
      <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:12px;color:#92400e;">
        Complete <strong>Designated Services</strong> first — your service risk rating is derived from your confirmed Table 6 services.
        <button onclick="go('firm-profile-edit',{'tab':'services'})" style="margin-left:8px;font-size:12px;color:#92400e;font-weight:500;background:none;border:none;cursor:pointer;text-decoration:underline;">Go there →</button>
      </div>
    </div>`;
  }

  const autoRating = deriveServiceRisk(matched);
  const override   = ra.serviceRatingOverride || '';
  const just       = ra.serviceRatingJust || '';
  const effective  = override || autoRating;

  const whyText = autoRating === 'High'
    ? 'One or more of your services involve direct control or movement of client funds, execution of business transactions, or property settlements — all considered high inherent ML/TF risk by AUSTRAC because they create direct opportunities for placement, layering, or integration of illicit funds.'
    : autoRating === 'Medium'
    ? 'Your services involve creating or managing legal structures, company secretarial functions, or registered office services. These do not directly control client funds but create entities and roles that can be misused to conceal beneficial ownership or facilitate illicit activity.'
    : 'Your designated services do not involve direct financial control or structural creation. Inherent service risk is low, though other risk lenses (customer and geography) may still elevate your overall rating.';

  return `<div style="max-width:680px;">
    ${setupBanner()}

    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:3px;">
        <button onclick="go('risk')" style="font-size:12px;color:#94a3b8;background:none;border:none;cursor:pointer;padding:0;">← Risk Assessment</button>
      </div>
      <h1 style="font-size:20px;font-weight:500;color:#0f172a;margin-bottom:3px;">Service Risk</h1>
      <p style="font-size:13px;color:#64748b;">The services you provide determine your firm's inherent exposure to ML/TF risk under AUSTRAC's framework.</p>
    </div>

    <!-- SERVICES TABLE -->
    <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:500;color:#0f172a;margin-bottom:4px;">Your services and their risk classification</div>
      <p style="font-size:11px;color:#94a3b8;margin-bottom:14px;">AUSTRAC groups designated services into risk tiers based on how directly they could be used to move, hide, or legitimise illicit funds.</p>

      <div style="border:0.5px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:0.5px solid #e2e8f0;">
              <th style="text-align:left;font-size:10px;font-weight:500;color:#94a3b8;padding:9px 14px;text-transform:uppercase;letter-spacing:.06em;">Task / Service</th>
              <th style="text-align:left;font-size:10px;font-weight:500;color:#94a3b8;padding:9px 14px;width:200px;text-transform:uppercase;letter-spacing:.06em;">Table 6 Item</th>
            </tr>
          </thead>
          <tbody>
            ${matched.map(r => `
            <tr style="border-bottom:0.5px solid #f1f5f9;">
              <td style="padding:10px 14px;font-size:12px;color:#0f172a;">${r.task || r.label || r}</td>
              <td style="padding:10px 14px;font-size:11px;color:#64748b;">${r.table6 || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- AUTO RATING DISPLAY -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">
        <div>
          <div style="font-size:12px;font-weight:500;color:#0f172a;">Derived service risk rating</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Calculated from your Table 6 items</div>
        </div>
        ${ratingPill(autoRating)}
      </div>

      <!-- WHY THIS RATING -->
      <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:11px;color:#64748b;line-height:1.6;margin-bottom:14px;">
        <span style="font-weight:500;color:#0f172a;">Why this rating: </span>${whyText}
      </div>

      <!-- OVERRIDE -->
      <div style="border-top:0.5px solid #f1f5f9;padding-top:14px;">
        <div style="font-size:12px;font-weight:500;color:#0f172a;margin-bottom:8px;">Override (optional)</div>
        <p style="font-size:11px;color:#94a3b8;margin-bottom:10px;">If your professional judgement differs from the derived rating, select an override below. A written justification is required for audit purposes.</p>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          ${['', 'Low', 'Medium', 'High'].map(v => {
            const label = v || 'Use derived';
            const active = override === v;
            const bg  = active ? (v === 'High' ? '#fef2f2' : v === 'Medium' ? '#fffbeb' : v === 'Low' ? '#f0fdf4' : '#eef2ff') : '#fff';
            const col = active ? (v === 'High' ? '#991b1b' : v === 'Medium' ? '#92400e' : v === 'Low' ? '#166534' : '#4338ca') : '#64748b';
            const brd = active ? (v === 'High' ? '#fecaca' : v === 'Medium' ? '#fde68a' : v === 'Low' ? '#bbf7d0' : '#c7d2fe') : '#e2e8f0';
            return `<button onclick="srSetOverride('${v}')"
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
            onchange="srSetJust(this.value)">${just}</textarea>
        </div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:12px;color:#0f172a;">Effective rating: ${ratingPill(effective)}</div>
        </div>
      </div>
    </div>

    <button onclick="srSave()"
      style="width:100%;font-size:13px;font-weight:500;color:#fff;background:#4f46e5;border:none;padding:11px 16px;border-radius:8px;cursor:pointer;">
      Save &amp; Continue to Customer Risk →
    </button>
  </div>`;
}

/* ─── ACTIONS ─────────────────────────────────────────────────────────────────*/
window.srSetOverride = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.serviceRatingOverride = val;
  if (!val) ra.serviceRatingJust = '';
  S.firm.riskAssessment = ra;
  go('servicerisk');
};

window.srSetJust = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.serviceRatingJust = val;
  S.firm.riskAssessment = ra;
  // no re-render — textarea retains value
};

window.srSave = async function() {
  const ra  = Object.assign({}, S.firm.riskAssessment || {});
  const ids = S.firm.designatedServices || [];
  const matched = MATRIX.filter(m => ids.includes(m.id) && m.status === 'IN');
  if (!matched.length) { toast('Complete Designated Services first', 'err'); return; }

  const auto   = deriveServiceRisk(matched);
  const override = ra.serviceRatingOverride || '';
  if (override && !ra.serviceRatingJust?.trim()) {
    toast('Add a justification for your override before saving', 'err'); return;
  }
  ra.serviceRating = override || auto;
  try {
    await _saveRA(ra);
    toast('Service risk saved');
    go('customerrisk');
  } catch(e) {
    toast('Save failed — check your connection', 'err');
    console.error(e);
  }
};
