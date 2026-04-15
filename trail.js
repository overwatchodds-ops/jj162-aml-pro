import { S }                            from '../../state/index.js';
import { getFirmAuditLog, fmtDateTime } from '../../firebase/firestore.js';

export function screen() {
  const entries  = S._auditLog   || [];
  const loading  = S._auditLoading;
  const filter   = S.currentParams?.filterType || 'all';
  const search   = S.currentParams?.auditSearch || '';

  const ACTION_LABELS = {
    firm_created:          'Firm created',
    firm_details_updated:  'Firm details updated',
    austrac_enrolment_updated: 'AUSTRAC enrolment updated',
    services_updated:      'Designated services updated',
    risk_assessment_updated: 'Risk assessment updated',
    program_approved:      'AML/CTF Program approved',
    individual_created:    'Individual created',
    individual_updated:    'Individual updated',
    id_verified:           'ID verified',
    screening_completed:   'Screening completed',
    training_completed:    'Training completed',
    vetting_updated:       'Vetting updated',
    member_added:          'Member added',
    entity_created:        'Entity created',
    entity_updated:        'Entity updated',
    risk_assessed:         'Risk assessed',
    link_ended:            'Role ended',
    smr_submitted:         'SMR submitted',
    smr_closed:            'SMR closed',
  };

  const TARGET_TYPES = ['all','firm','individual','entity','smr'];

  let filtered = entries;
  if (filter !== 'all') filtered = filtered.filter(e => e.targetType === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e =>
      e.detail?.toLowerCase().includes(q) ||
      e.targetName?.toLowerCase().includes(q) ||
      e.userName?.toLowerCase().includes(q)
    );
  }

  return `
    <div>
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Audit trail</h1>
          <p class="screen-subtitle">A timestamped, append-only record of every compliance action taken by your firm.</p>
        </div>
        <button onclick="go('audit-report')" class="btn-sec btn-sm">Export report →</button>
      </div>

      <div class="banner banner-info" style="margin-bottom:var(--space-4);">
        The audit trail is append-only and cannot be edited or deleted. Every action is timestamped and attributed to the staff member who took it. This record satisfies AUSTRAC's 7-year retention requirement.
      </div>

      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            class="search-inp"
            placeholder="Search audit trail..."
            value="${search}"
            oninput="auditSearch(this.value)"
          >
        </div>
        <div class="filter-tabs">
          ${TARGET_TYPES.map(t => `
            <button onclick="auditFilter('${t}')" class="filter-tab ${filter===t?'active':''}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>
          `).join('')}
        </div>
      </div>

      ${!entries.length && !loading ? `
        <div class="empty-state">
          <div class="empty-state-title">Audit trail not loaded.</div>
          <div class="empty-state-sub">Click Load to fetch your firm's complete audit trail.</div>
          <button onclick="loadAuditTrail()" class="btn btn-sm" style="margin-top:var(--space-3);">Load audit trail</button>
        </div>
      ` : loading ? `
        <div class="empty-state">
          <div class="empty-state-title">Loading...</div>
        </div>
      ` : filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-title">No entries match your filter.</div>
        </div>
      ` : `
        <div class="card" style="padding:0;">
          ${filtered.map((e, i) => `
            <div style="display:flex;gap:var(--space-3);padding:var(--space-3) 22px;border-bottom:${i < filtered.length-1 ? '0.5px solid var(--color-border-light)' : 'none'};">
              <div style="flex-shrink:0;width:120px;">
                <div style="font-size:10px;color:var(--color-text-muted);">${fmtDateTime(e.timestamp)}</div>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);color:var(--color-text-primary);margin-bottom:2px;">
                  ${ACTION_LABELS[e.action] || e.action}
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${e.detail}</div>
                <div style="font-size:10px;color:var(--color-text-muted);margin-top:2px;">by ${e.userName || '—'}</div>
              </div>
              <div style="flex-shrink:0;">
                <span class="badge badge-neutral" style="font-size:9px;">${e.targetType}</span>
              </div>
            </div>`).join('')}
        </div>

        <div style="text-align:center;margin-top:var(--space-4);">
          <button onclick="loadMoreAudit()" class="btn-sec btn-sm">Load more</button>
          <div style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Showing ${filtered.length} of ${entries.length} entries</div>
        </div>
      `}
    </div>`;
}

window.loadAuditTrail = async function() {
  S._auditLoading = true;
  render();
  try {
    const entries = await getFirmAuditLog(S.firmId, 100);
    S._auditLog     = entries;
    S._auditLoading = false;
    render();
  } catch (err) {
    S._auditLoading = false;
    toast('Failed to load audit trail', 'err');
    render();
  }
};

window.loadMoreAudit = async function() {
  try {
    const entries = await getFirmAuditLog(S.firmId, (S._auditLog?.length || 0) + 100);
    S._auditLog = entries;
    render();
  } catch (err) {
    toast('Failed to load more entries', 'err');
  }
};

window.auditSearch = function(val) {
  S.currentParams = { ...S.currentParams, auditSearch: val };
  render();
};

window.auditFilter = function(filterType) {
  S.currentParams = { ...S.currentParams, filterType };
  render();
};
