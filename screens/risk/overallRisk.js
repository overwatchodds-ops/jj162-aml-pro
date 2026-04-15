import { S } from '../../state/index.js';
import { updateFirmProfile } from '../../firebase/firestore.js';

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/
function _saveRA(patch) {
  const ra = Object.assign({}, S.firm.riskAssessment || {}, patch);
  S.firm.riskAssessment = ra;
  return updateFirmProfile(S.firmId, { riskAssessment: ra });
}

function autoOverallRisk(sr, cr, gr, pf) {
  const ratings = [sr, cr, gr, pf].filter(Boolean);
  if (!ratings.length) return null;
  if (ratings.includes('High'))   return 'High';
  if (ratings.includes('Medium')) return 'Medium';
  return 'Low';
}

function ratingPill(r, fallback) {
  if (!r) return fallback || '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Not yet assessed</span>';
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

function lensRow(label, rating, route, desc) {
  return `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid #f1f5f9;">
    <div>
      <div style="font-size:12px;font-weight:500;color:#0f172a;">${label}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${desc}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
      ${ratingPill(rating)}
      ${!rating
        ? `<button onclick="go('${route}')" style="font-size:11px;color:#4f46e5;background:none;border:none;cursor:pointer;font-weight:500;">Complete →</button>`
        : `<button onclick="go('${route}')" style="font-size:11px;color:#94a3b8;background:none;border:none;cursor:pointer;">Edit</button>`}
    </div>
  </div>`;
}

/* ─── SCREEN ──────────────────────────────────────────────────────────────────*/
export function screen() {
  const ra  = S.firm.riskAssessment || {};
  const sr  = ra.serviceRating  || null;
  const cr  = ra.customerRating || null;
  const gr  = ra.geoRating      || null;
  const pf  = ra.pfRating       || null;
  const autoOR   = autoOverallRisk(sr, cr, gr, pf);
  const override = ra.overallRatingOverride || '';
  const just     = ra.overallRatingJust || '';
  const effective = override || autoOR;
  const allComplete = sr && cr && gr && pf;

  const overallWhyText = autoOR === 'High'
    ? 'Your firm has high inherent ML/TF risk. Your AML/CTF program must include enhanced controls, documented risk mitigation strategies, and regular monitoring.'
    : autoOR === 'Medium'
    ? 'Your firm has medium inherent ML/TF risk. Standard controls are required with a documented risk assessment and at least annual review of your program.'
    : autoOR === 'Low'
    ? 'Your firm has low inherent ML/TF risk. Standard AML/CTF program controls apply. Even at Low, a documented program and regular review are mandatory.'
    : null;

  return `<div style="max-width:680px;">
    ${setupBanner()}

    <div style="margin-bottom:24px;">
      <div style="margin-bottom:6px;">
        <button onclick="go('georisk')" style="font-size:12px;color:#94a3b8;background:none;border:none;cursor:pointer;padding:0;">← Geography Risk</button>
      </div>
      <h1 style="font-size:20px;font-weight:500;color:#0f172a;margin-bottom:3px;">Overall Inherent Risk</h1>
      <p style="font-size:13px;color:#64748b;">Your overall inherent risk rating is the foundation of your AML/CTF program — it determines the level of controls your program must contain.</p>
    </div>

    <!-- LENS SUMMARY -->
    <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:500;color:#0f172a;margin-bottom:4px;">Risk lens summary</div>
      <p style="font-size:11px;color:#94a3b8;margin-bottom:14px;">The overall rating is the highest of the four lens ratings. A single High lens produces a High overall rating — the other lenses cannot offset it.</p>

      ${lensRow('Service Risk',              sr, 'servicerisk',  'How your services could be exploited for ML/TF')}
      ${lensRow('Customer Risk',             cr, 'customerrisk', 'Who increases the likelihood of ML/TF activity')}
      ${lensRow('Geography / Delivery Risk', gr, 'georisk',      'Where and how services are delivered')}
    </div>

    <!-- PROLIFERATION FINANCING -->
    <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:500;color:#0f172a;margin-bottom:4px;">Proliferation Financing (PF) Risk</div>
      <p style="font-size:11px;color:#94a3b8;margin-bottom:6px;">AUSTRAC requires all reporting entities to separately assess PF exposure. For most accounting firms, PF risk is Low — select High or Medium only if your firm acts for clients in defence, arms trading, sanctioned sectors, or dual-use technology.</p>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        ${['Low', 'Medium', 'High'].map(v => {
          const active = pf === v;
          const bg  = active ? (v === 'High' ? '#fef2f2' : v === 'Medium' ? '#fffbeb' : '#f0fdf4') : '#fff';
          const col = active ? (v === 'High' ? '#991b1b' : v === 'Medium' ? '#92400e' : '#166534') : '#64748b';
          const brd = active ? (v === 'High' ? '#fecaca' : v === 'Medium' ? '#fde68a' : '#bbf7d0') : '#e2e8f0';
          return `<button onclick="orSetPf('${v}')"
            style="padding:10px;border-radius:8px;font-size:12px;font-weight:500;border:0.5px solid ${brd};background:${bg};color:${col};cursor:pointer;">
            ${v}
          </button>`;
        }).join('')}
      </div>

      ${pf ? `
      <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:11px;color:#64748b;line-height:1.6;">
        <span style="font-weight:500;color:#0f172a;">Why this rating: </span>
        ${pf === 'Low'
          ? 'Most accounting firms are Low PF risk. Your clients are not connected to sanctioned sectors, defence manufacturing, or dual-use technology industries.'
          : pf === 'Medium'
          ? 'Your firm may have some exposure to sectors or clients that could have indirect connections to proliferation-sensitive activities. Enhanced awareness and screening is appropriate.'
          : 'Your firm services clients in sectors with direct proliferation financing exposure. Specific PF controls and OFAC/UN sanctions screening must be documented in your AML/CTF program.'}
      </div>` : ''}
    </div>

    <!-- OVERALL RATING -->
    <div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="font-size:13px;font-weight:500;color:#0f172a;margin-bottom:14px;">Overall Inherent Risk Rating</div>

      ${!allComplete ? `
      <div style="background:#fffbeb;border:0.5px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:11px;color:#92400e;margin-bottom:14px;">
        Complete all three risk lenses and set a PF rating before your overall risk can be calculated.
      </div>` : ''}

      <!-- DERIVED RATING DISPLAY -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">
        <div>
          <div style="font-size:12px;font-weight:500;color:#0f172a;">Derived overall rating</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Highest of: ${[sr,cr,gr,pf].filter(Boolean).join(', ') || 'no lenses complete'}</div>
        </div>
        ${ratingPill(autoOR)}
      </div>

      ${overallWhyText ? `
      <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:11px;color:#64748b;line-height:1.6;margin-bottom:14px;">
        <span style="font-weight:500;color:#0f172a;">What this means: </span>${overallWhyText}
      </div>` : ''}

      <!-- OVERRIDE -->
      ${allComplete && autoOR ? `
      <div style="border-top:0.5px solid #f1f5f9;padding-top:14px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:500;color:#0f172a;margin-bottom:8px;">Override (optional)</div>
        <p style="font-size:11px;color:#94a3b8;margin-bottom:10px;">Override only if your professional judgement differs. A written justification is required for audit purposes.</p>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          ${['', 'Low', 'Medium', 'High'].map(v => {
            const label = v || 'Use derived';
            const active = override === v;
            const bg  = active ? (v === 'High' ? '#fef2f2' : v === 'Medium' ? '#fffbeb' : v === 'Low' ? '#f0fdf4' : '#eef2ff') : '#fff';
            const col = active ? (v === 'High' ? '#991b1b' : v === 'Medium' ? '#92400e' : v === 'Low' ? '#166534' : '#4338ca') : '#64748b';
            const brd = active ? (v === 'High' ? '#fecaca' : v === 'Medium' ? '#fde68a' : v === 'Low' ? '#bbf7d0' : '#c7d2fe') : '#e2e8f0';
            return `<button onclick="orSetOverride('${v}')"
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
            onchange="orSetJust(this.value)">${just}</textarea>
        </div>` : ''}
        ${effective ? `<div style="font-size:12px;color:#0f172a;margin-bottom:14px;">Effective rating: ${ratingPill(effective)}</div>` : ''}
      </div>

      <!-- NEXT REVIEW DATE -->
      <div style="border-top:0.5px solid #f1f5f9;padding-top:14px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <label style="font-size:12px;font-weight:500;color:#0f172a;" for="or-next-review">Next review date</label>
          <span style="font-size:11px;color:#94a3b8;">AUSTRAC expects annual review</span>
        </div>
        <input id="or-next-review" type="date" class="inp"
          value="${ra.nextReviewDate || ''}"
          onchange="orSetNextReview(this.value)">
        <p style="font-size:11px;color:#94a3b8;margin-top:6px;">The risk assessment must be reviewed at least annually, or when there is a material change to your firm's services, clients, or operating environment.</p>
      </div>` : ''}

      <button onclick="orSave()"
        style="width:100%;font-size:13px;font-weight:500;border:none;padding:11px 16px;border-radius:8px;
          cursor:${allComplete && autoOR ? 'pointer' : 'not-allowed'};
          background:${allComplete && autoOR ? '#4f46e5' : '#f1f5f9'};
          color:${allComplete && autoOR ? '#fff' : '#94a3b8'};">
        Save Risk Assessment &amp; Continue to AML/CTF Program →
      </button>
    </div>
  </div>`;
}

/* ─── ACTIONS ─────────────────────────────────────────────────────────────────*/
window.orSetPf = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.pfRating = val;
  S.firm.riskAssessment = ra;
  go('overallrisk');
};

window.orSetOverride = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.overallRatingOverride = val;
  if (!val) ra.overallRatingJust = '';
  S.firm.riskAssessment = ra;
  go('overallrisk');
};

window.orSetJust = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.overallRatingJust = val;
  S.firm.riskAssessment = ra;
};

window.orSetNextReview = function(val) {
  const ra = Object.assign({}, S.firm.riskAssessment || {});
  ra.nextReviewDate = val;
  S.firm.riskAssessment = ra;
};

window.orSave = async function() {
  const ra  = Object.assign({}, S.firm.riskAssessment || {});
  const sr  = ra.serviceRating  || null;
  const cr  = ra.customerRating || null;
  const gr  = ra.geoRating      || null;
  const pf  = ra.pfRating       || null;

  if (!pf)  { toast('Select a Proliferation Financing (PF) risk rating before saving', 'err'); return; }
  if (!sr)  { toast('Complete Service Risk before saving', 'err'); return; }
  if (!cr)  { toast('Complete Customer Risk before saving', 'err'); return; }
  if (!gr)  { toast('Complete Geography Risk before saving', 'err'); return; }

  const override = ra.overallRatingOverride || '';
  if (override && !ra.overallRatingJust?.trim()) {
    toast('Add a justification for your overall rating override before saving', 'err'); return;
  }

  const autoOR = autoOverallRisk(sr, cr, gr, pf);
  ra.overallRating = override || autoOR;
  ra.rating        = ra.overallRating; // top-level field checked by isSetupComplete()
  ra.assessedDate  = new Date().toISOString().split('T')[0];

  // Auto-set next review to +12 months if not already set
  if (!ra.nextReviewDate) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    ra.nextReviewDate = d.toISOString().split('T')[0];
  }

  try {
    await _saveRA(ra);
    toast('Risk assessment saved');
    go('firm-profile-edit',{'tab':'program'});
  } catch(e) {
    toast('Save failed — check your connection', 'err');
    console.error(e);
  }
};
