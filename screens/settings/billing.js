import { S }       from '../../state/index.js';
import { fmtDate } from '../../firebase/firestore.js';

export function screen() {
  const firm         = S.firm || {};
  const subscription = firm.subscription || {};

  return `
    <div class="screen-narrow">
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Billing</h1>
          <p class="screen-subtitle">Manage your SimpleAML Pro subscription.</p>
        </div>
      </div>

      <!-- Current plan -->
      <div class="card">
        <div class="section-heading">Current plan</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;">
          <div>
            <div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-medium);">SimpleAML Pro</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Up to 3 users · Cloud sync · Full audit trail</div>
          </div>
          <span class="badge ${subscription.status === 'active' ? 'badge-success' : 'badge-warning'}">${subscription.status || 'Active'}</span>
        </div>
        <div style="border-top:0.5px solid var(--color-border);padding-top:var(--space-3);margin-top:var(--space-2);">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Next billing date: ${fmtDate(subscription.billingDate) || '—'}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Stripe customer ID: ${subscription.stripeCustomerId || '—'}</div>
        </div>
      </div>

      <!-- Manage -->
      <div class="card">
        <div class="section-heading">Manage subscription</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-4);">Use the Stripe customer portal to update your payment method, download invoices, or cancel your subscription.</p>
        <button onclick="openStripePortal()" class="btn-sec btn-sm">Open billing portal →</button>
      </div>

      <!-- Cancel info -->
      <div class="card">
        <div class="section-heading">Cancellation</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:var(--line-height-relaxed);">If you cancel your subscription, your data will remain accessible in read-only mode for 30 days. During this period you can export your complete compliance records. After 30 days, the account will revert to the free tier and cloud sync will be disabled — your local data will be preserved in your browser.</p>
      </div>

    </div>`;
}

window.openStripePortal = function() {
  // Stripe customer portal URL — replace with your actual Stripe portal link
  const portalUrl = 'https://billing.stripe.com/p/login/REPLACE_WITH_YOUR_PORTAL_ID';
  window.open(portalUrl, '_blank');
};
