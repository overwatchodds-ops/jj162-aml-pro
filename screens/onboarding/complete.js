import { S } from '../../state/index.js';

export function screen() {
  const firm = S.firm || {};

  const NEXT_STEPS = [
    {
      label:  'Complete your Firm Profile',
      sub:    'Practice type, address and principal contact details.',
      screen: 'firm-profile',
    },
    {
      label:  'Select your Designated Services',
      sub:    'Tell AUSTRAC which designated services your firm provides.',
      screen: 'firm-profile',
      params: { tab: 'services' },
    },
    {
      label:  'Complete your Risk Assessment',
      sub:    'Assess service risk, client risk, geographic risk and overall rating.',
      screen: 'firm-profile',
      params: { tab: 'risk' },
    },
    {
      label:  'Approve your AML/CTF Program',
      sub:    'Document and approve your firm\'s AML/CTF program.',
      screen: 'firm-profile',
      params: { tab: 'program' },
    },
    {
      label:  'Confirm AUSTRAC Enrolment',
      sub:    'Record your AUSTRAC enrolment ID before 1 July 2026.',
      screen: 'firm-profile',
      params: { tab: 'enrolment' },
    },
  ];

  return `
    <div class="card" style="text-align:center;padding:var(--space-8);">

      <div style="width:56px;height:56px;background:var(--color-success-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <h1 class="screen-title" style="margin-bottom:var(--space-2);">Welcome to SimpleAML Pro</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-6);line-height:var(--line-height-relaxed);">
        Your account is created. Complete these five steps before 1 July 2026 to meet your AUSTRAC obligations — each step builds on the previous one.
      </p>

      <div style="text-align:left;margin-bottom:var(--space-6);">
        <div class="section-heading">Complete in this order</div>

        ${NEXT_STEPS.map((item, i) => `
          <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border:0.5px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-2);background:var(--color-surface);">
            <div style="width:22px;height:22px;border-radius:50%;border:1.5px solid var(--color-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:10px;font-weight:var(--font-weight-bold);color:var(--color-text-muted);">${i + 1}</span>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);margin-bottom:2px;">${item.label}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${item.sub}</div>
            </div>
          </div>`).join('')}
      </div>

      <button onclick="go('setup')" class="btn btn-full">Start firm setup →</button>

    </div>`;
}
