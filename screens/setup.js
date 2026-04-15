import { S } from '../state/index.js';

// ─── SETUP COMPUTE ────────────────────────────────────────────────────────────
// Determines which setup steps are complete based on firm state.
export function computeSetup(firm) {
  const f = firm || {};
  return {
    firmProfile:       !!(f.firmName && f.abn),
    designatedServices:!!(f.designatedServices?.length),
    riskAssessment:    !!(f.riskAssessment?.rating),
    amlProgram:        !!(f.amlProgram?.approvedBy && f.amlProgram?.approvedDate),
    austracEnrolment:  !!(f.austracEnrolment?.enrolmentId || f.austracEnrolment?.enrolled),
  };
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const firm  = S.firm || {};
  const steps = computeSetup(firm);

  const doneCount = Object.values(steps).filter(Boolean).length;
  const allDone   = doneCount === 5;

  const STEPS = [
    {
      key:     'firmProfile',
      label:   'Firm Profile',
      desc:    'Practice name, ABN, address, practice type and principal contact.',
      screen:  'firm-profile-edit',
      params:  { tab: 'details' },
      locked:  false,
    },
    {
      key:     'designatedServices',
      label:   'Designated Services',
      desc:    'Select the AUSTRAC-designated services your firm provides.',
      screen:  'firm-profile-edit',
      params:  { tab: 'services' },
      locked:  !steps.firmProfile,
    },
    {
      key:     'riskAssessment',
      label:   'Risk Assessment',
      desc:    'Assess service risk, client risk, geographic risk and overall rating.',
      screen:  'firm-profile-edit',
      params:  { tab: 'risk' },
      locked:  !steps.designatedServices,
    },
    {
      key:     'amlProgram',
      label:   'AML/CTF Program',
      desc:    'Document and approve your AML/CTF program.',
      screen:  'firm-profile-edit',
      params:  { tab: 'program' },
      locked:  !steps.riskAssessment,
    },
    {
      key:     'austracEnrolment',
      label:   'AUSTRAC Enrolment',
      desc:    'Confirm your firm is enrolled with AUSTRAC before 1 July 2026.',
      screen:  'firm-profile-edit',
      params:  { tab: 'enrolment' },
      locked:  !steps.amlProgram,
    },
  ];

  const stepRow = (step, index) => {
    const done   = steps[step.key];
    const locked = step.locked && !done;
    const status = done ? 'done' : locked ? 'locked' : 'todo';

    const icon = done
      ? `<div style="width:28px;height:28px;border-radius:50%;background:var(--color-success);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
           <span style="color:#fff;font-size:13px;font-weight:700;">✓</span>
         </div>`
      : locked
        ? `<div style="width:28px;height:28px;border-radius:50%;background:var(--color-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
             <span style="color:var(--color-text-muted);font-size:11px;">🔒</span>
           </div>`
        : `<div style="width:28px;height:28px;border-radius:50%;border:2px solid var(--color-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
             <span style="color:var(--color-primary);font-size:11px;font-weight:700;">${index + 1}</span>
           </div>`;

    const actionBtn = done
      ? `<button onclick="go('${step.screen}'${step.params ? ','+JSON.stringify(step.params) : ''})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Review →</button>`
      : locked
        ? `<span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Complete step ${index} first</span>`
        : `<button onclick="go('${step.screen}'${step.params ? ','+JSON.stringify(step.params) : ''})" class="btn" style="font-size:var(--font-size-xs);padding:6px 14px;">Start →</button>`;

    return `
      <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4) 0;border-bottom:0.5px solid var(--color-border-light);opacity:${locked ? '0.5' : '1'};">
        ${icon}
        <div style="flex:1;min-width:0;">
          <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:${done ? 'var(--color-text-muted)' : 'var(--color-text-primary)'};${done ? 'text-decoration:line-through;' : ''}">${step.label}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">${step.desc}</div>
        </div>
        <div style="flex-shrink:0;">${actionBtn}</div>
      </div>`;
  };

  return `
    <div style="max-width:600px;">

      <!-- Header -->
      <div style="margin-bottom:var(--space-6);">
        <h1 class="screen-title">Firm Setup</h1>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);">Complete these five steps before 1 July 2026 to meet your AUSTRAC obligations. Each step builds on the previous one.</p>
      </div>

      <!-- Progress -->
      <div style="background:var(--color-surface);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:2px;">Progress</div>
          <div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);color:${allDone ? 'var(--color-success)' : 'var(--color-primary)'};">${doneCount} of 5 complete</div>
        </div>
        <div style="width:120px;height:6px;background:var(--color-border);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${(doneCount/5)*100}%;background:${allDone ? 'var(--color-success)' : 'var(--color-primary)'};border-radius:99px;transition:width .3s;"></div>
        </div>
      </div>

      ${allDone ? `
      <div class="banner banner-success" style="margin-bottom:var(--space-4);">
        <div class="banner-title">Firm setup complete</div>
        Your firm's compliance foundation is in place. You can now add staff and clients.
        <div style="margin-top:var(--space-3);">
          <button onclick="go('dashboard')" class="btn" style="font-size:var(--font-size-xs);padding:8px 16px;">Go to Dashboard →</button>
        </div>
      </div>` : ''}

      <!-- Steps -->
      <div style="background:var(--color-surface);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);padding:0 var(--space-5);">
        ${STEPS.map((step, i) => stepRow(step, i)).join('')}
      </div>

      ${!allDone ? `
      <div style="margin-top:var(--space-4);text-align:center;">
        <button onclick="go('dashboard')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Skip for now — go to dashboard</button>
      </div>` : ''}

    </div>`;
}
