import { S } from '../../state/index.js';

export function screen() {
  const firm = S.firm || {};
  const subscription = firm.subscription || {};

  const status = subscription.status || 'Private beta';
  const planName = subscription.planName || 'SimpleAML Pro — Private Beta';

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Billing</h1>
          <p class="screen-subtitle">Subscription and billing information.</p>
        </div>
      </div>

      <!-- Beta notice -->
      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        Billing is not yet enabled during the private beta. You can continue using SimpleAML Pro while beta testing is active.
      </div>

      <!-- Current plan -->
      <div class="card">
        <div class="section-heading">Current plan</div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;">
          <div>
            <div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-medium);">
              ${planName}
            </div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
              Cloud sync · Firm records · Client CDD · Staff vetting · Audit trail
            </div>
          </div>

          <span class="badge badge-warning">${status}</span>
        </div>

        <div style="border-top:0.5px solid var(--color-border);padding-top:var(--space-3);margin-top:var(--space-2);">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
            Billing date: Not applicable during private beta
          </div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
            Stripe customer ID: Not yet connected
          </div>
        </div>
      </div>

      <!-- Manage subscription -->
      <div class="card">
        <div class="section-heading">Manage subscription</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);margin-bottom:var(--space-4);">
          Stripe billing and invoice management will be enabled before paid subscriptions are launched.
          During private beta, no payment method is required and no billing portal is available.
        </p>

        <button
          class="btn-sec btn-sm"
          disabled
          style="opacity:0.55;cursor:not-allowed;"
          title="Billing portal is not yet enabled during private beta"
        >
          Billing portal coming soon
        </button>
      </div>

      <!-- Cancellation info -->
      <div class="card">
        <div class="section-heading">Cancellation and data export</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);">
          Paid cancellation terms will be confirmed before SimpleAML Pro becomes generally available.
          You can export your firm records from Backup &amp; export at any time during beta.
        </p>
      </div>

    </div>`;
}
