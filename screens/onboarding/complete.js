import { S } from '../../state/index.js';

export function screen() {
  const firm = S.firm || {};

  return `
    <div class="card" style="text-align:center;padding:var(--space-8);">

      <div style="width:56px;height:56px;background:var(--color-success-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <h1 class="screen-title" style="margin-bottom:var(--space-2);">${firm.name || 'Your firm'} is set up</h1>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--space-6);line-height:var(--line-height-relaxed);">
        Your compliance register is ready. Here's what to do next to complete your setup.
      </p>

      <div style="text-align:left;margin-bottom:var(--space-6);">
        <div class="section-heading">Recommended next steps</div>

        ${[
          { label: 'Complete your own vetting record', sub: 'Police check, bankruptcy check, and AML training as firm owner', screen: 'individual-detail', badge: 'Outstanding' },
          { label: 'Complete your AML/CTF Program',    sub: 'Document and approve your firm\'s AML/CTF program',             screen: 'firm-profile',    badge: 'Outstanding' },
          { label: 'Complete your Risk Assessment',     sub: 'Assess your firm\'s designated services and overall risk',       screen: 'firm-profile',    badge: 'Outstanding' },
          { label: 'Add your first client',             sub: 'Create an entity or individual client and complete their CDD',   screen: 'entity-new',      badge: null },
        ].map(item => `
          <div onclick="go('${item.screen}')" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);border:0.5px solid var(--color-border);border-radius:var(--radius-lg);cursor:pointer;margin-bottom:var(--space-2);background:var(--color-surface);transition:background var(--transition-fast);"
            onmouseover="this.style.background='var(--color-surface-alt)'" onmouseout="this.style.background='var(--color-surface)'">
            <div>
              <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-primary);margin-bottom:2px;">${item.label}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${item.sub}</div>
            </div>
            ${item.badge ? `<span class="badge badge-warning" style="flex-shrink:0;margin-left:var(--space-3);">${item.badge}</span>` : `<span style="color:var(--color-text-muted);font-size:var(--font-size-xs);flex-shrink:0;">→</span>`}
          </div>`).join('')}
      </div>

      <button onclick="go('dashboard')" class="btn btn-full">Go to dashboard →</button>
    </div>`;
}
