import { S }                                                  from '../state/index.js';
import { getRequirements, getComplianceStatus }               from '../state/rules_matrix.js';
import { fmtDate }                                            from '../firebase/firestore.js';

// ─── COMPLIANCE ENGINE HELPERS ────────────────────────────────────────────────
function individualCompliance(ind) {
  const links    = S.links.filter(l => l.individualId === ind.individualId && l.status === 'active');
  if (!links.length) return { status: 'no_links', missing: [] };

  const required  = getRequirements(links, S.entities);
  const latestVer = (S.verifications||[]).filter(v=>v.individualId===ind.individualId).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt))[0];
  const latestScr = (S.screenings   ||[]).filter(s=>s.individualId===ind.individualId).sort((a,b)=>b.date?.localeCompare(a.date))[0];
  const latestTrn = (S.training     ||[]).filter(t=>t.individualId===ind.individualId).sort((a,b)=>b.completedDate?.localeCompare(a.completedDate))[0];
  const latestVet = (S.vetting      ||[]).filter(v=>v.individualId===ind.individualId).sort((a,b)=>b.policeCheckDate?.localeCompare(a.policeCheckDate))[0];

  return getComplianceStatus(required, {
    verification: latestVer || null,
    screening:    { result: latestScr?.result, date: latestScr?.date },
    training:     { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
    vetting:      latestVet || null,
  });
}

function firmGaps() {
  const firm = S.firm || {};
  const gaps = [];
  if (!firm.austracEnrolment?.enrolmentId) gaps.push({ label: 'AUSTRAC enrolment ID not recorded', screen: 'firm-profile-edit', params: { tab: 'enrolment' } });
  if (!firm.amlProgram?.version)            gaps.push({ label: 'AML/CTF Program not approved',        screen: 'firm-profile-edit', params: { tab: 'program'   } });
  if (!firm.riskAssessment?.rating)         gaps.push({ label: 'Firm risk assessment not completed',   screen: 'firm-profile-edit', params: { tab: 'risk'      } });
  if (!firm.designatedServices?.length)     gaps.push({ label: 'Designated services not recorded',     screen: 'firm-profile-edit', params: { tab: 'services'  } });
  return gaps;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const firm = S.firm || {};
  const individuals = S.individuals || [];
  const entities    = S.entities    || [];

  // Individual compliance summary
  const indResults = individuals.map(i => ({ ind: i, result: individualCompliance(i) }));
  const compliant  = indResults.filter(r => r.result.status === 'compliant');
  const action     = indResults.filter(r => r.result.status === 'action_required');
  const noLinks    = indResults.filter(r => r.result.status === 'no_links');

  // Firm gaps
  const gaps = firmGaps();

  // Overall verdict
  const totalIssues = action.length + gaps.length;
  const verdict = totalIssues === 0 && individuals.length > 0
    ? { label: 'Compliant', color: 'var(--color-success)', bg: 'var(--color-success-light)', border: 'var(--color-success-border)' }
    : totalIssues > 0
      ? { label: 'Action required', color: 'var(--color-danger)', bg: 'var(--color-danger-light)', border: 'var(--color-danger-border)' }
      : { label: 'Getting started', color: 'var(--color-warning)', bg: 'var(--color-warning-light)', border: 'var(--color-warning-border)' };

  // Upcoming reviews (entities with next review date in next 90 days)
  const today    = new Date();
  const in90     = new Date(); in90.setDate(today.getDate() + 90);
  const upcoming = entities
    .filter(e => e.riskNextReviewDate && new Date(e.riskNextReviewDate) <= in90 && new Date(e.riskNextReviewDate) >= today)
    .sort((a,b) => a.riskNextReviewDate.localeCompare(b.riskNextReviewDate))
    .slice(0, 5);

  // Program review due
  const progReviewDate = firm.amlProgram?.nextReviewDate;
  const progDue        = progReviewDate && new Date(progReviewDate) <= in90;

  // Recently active (last 5 updated individuals)
  const recent = [...individuals]
    .sort((a,b) => b.updatedAt?.localeCompare(a.updatedAt))
    .slice(0, 5);

  const initials = name => (name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';

  return `
    <div>
      <!-- Header -->
      <div class="screen-header">
        <div>
          <h1 class="screen-title">Dashboard</h1>
          <p class="screen-subtitle">${firm.firmName || 'Your firm'} · SimpleAML Pro</p>
        </div>
        <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      <!-- Verdict banner -->
      <div style="background:${verdict.bg};border:0.5px solid ${verdict.border};border-radius:var(--radius-xl);padding:var(--space-5) 22px;margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:var(--font-size-xs);color:${verdict.color};font-weight:var(--font-weight-medium);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Overall compliance status</div>
          <div style="font-size:22px;font-weight:var(--font-weight-medium);color:${verdict.color};">${verdict.label}</div>
          ${totalIssues > 0 ? `<div style="font-size:var(--font-size-xs);color:${verdict.color};margin-top:4px;">${totalIssues} item${totalIssues!==1?'s':''} need${totalIssues===1?'s':''} attention</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:28px;font-weight:var(--font-weight-bold);color:${verdict.color};">${compliant.length}/${individuals.length}</div>
          <div style="font-size:var(--font-size-xs);color:${verdict.color};">staff compliant</div>
        </div>
      </div>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-3);margin-bottom:var(--space-4);">
        ${[
          { label: 'Staff',          value: individuals.length, screen: 'staff',        color: 'var(--color-primary)' },
          { label: 'Clients',        value: entities.length,    screen: 'clients',      color: 'var(--color-primary)' },
          { label: 'Action needed', value: action.length,      screen: 'staff',        color: action.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
          { label: 'Firm gaps',     value: gaps.length,        screen: 'firm-profile', color: gaps.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
        ].map(s => `
          <div
            onclick="go('${s.screen}')"
            style="background:var(--color-surface);border:0.5px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-4);cursor:pointer;transition:background var(--transition-fast);"
            onmouseover="this.style.background='var(--color-surface-alt)'"
            onmouseout="this.style.background='var(--color-surface)'"
          >
            <div style="font-size:24px;font-weight:var(--font-weight-bold);color:${s.color};margin-bottom:4px;">${s.value}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${s.label}</div>
          </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-4);">

        <!-- Left column -->
        <div>

          <!-- Firm obligations -->
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
              <div class="section-heading" style="margin:0;">Firm obligations</div>
              <button onclick="go('firm-profile')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">View all</button>
            </div>
            ${gaps.length === 0 ? `
              <div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--font-size-xs);color:var(--color-success);">
                <span style="font-weight:bold;">✓</span> All firm obligations recorded
              </div>
            ` : gaps.map(g => `
              <div
                onclick="go('${g.screen}',${JSON.stringify(g.params)})"
                style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);cursor:pointer;"
              >
                <span style="color:var(--color-danger);font-weight:bold;flex-shrink:0;">✗</span>
                <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);">${g.label}</span>
              </div>`).join('')}

            ${progDue ? `
              <div style="margin-top:var(--space-3);padding:var(--space-2) 0;border-top:0.5px solid var(--color-border);">
                <div style="display:flex;align-items:center;gap:var(--space-2);">
                  <span style="color:var(--color-warning);font-weight:bold;flex-shrink:0;">⚠</span>
                  <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);">AML/CTF Program review due ${fmtDate(progReviewDate)}</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Action required individuals -->
          ${action.length > 0 ? `
            <div class="card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
                <div class="section-heading" style="margin:0;">Action required</div>
                <button onclick="go('staff',{filter:'action'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">View all</button>
              </div>
              ${action.slice(0,5).map(r => `
                <div
                  onclick="go('staff-detail',{individualId:'${r.ind.individualId}'})"
                  style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);cursor:pointer;"
                >
                  <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0;">${initials(r.ind.fullName)}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.ind.fullName}</div>
                    <div style="font-size:10px;color:var(--color-danger);">${r.result.missing[0]?.label || 'Incomplete'}</div>
                  </div>
                  <span style="color:var(--color-danger);font-size:var(--font-size-xs);flex-shrink:0;">→</span>
                </div>`).join('')}
              ${action.length > 5 ? `<div style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">+${action.length-5} more</div>` : ''}
            </div>
          ` : ''}

          <!-- No links -->
          ${noLinks.length > 0 ? `
            <div class="card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
                <div class="section-heading" style="margin:0;">No connections</div>
                <button onclick="go('staff',{filter:'no_links'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">View all</button>
              </div>
              <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${noLinks.length} individual${noLinks.length!==1?'s':''} not yet linked to a firm role or client.</p>
            </div>
          ` : ''}

        </div>

        <!-- Right column -->
        <div>

          <!-- Upcoming reviews -->
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
              <div class="section-heading" style="margin:0;">Upcoming reviews (90 days)</div>
              <button onclick="go('clients')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">All entities</button>
            </div>
            ${upcoming.length === 0 ? `
              <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No entity reviews due in the next 90 days.</p>
            ` : upcoming.map(e => {
              const daysLeft = Math.ceil((new Date(e.riskNextReviewDate) - today) / (1000 * 60 * 60 * 24));
              const urgent   = daysLeft <= 30;
              return `
                <div
                  onclick="go('client-detail',{entityId:'${e.entityId}'})"
                  style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);cursor:pointer;"
                >
                  <div>
                    <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);">${e.entityName}</div>
                    <div style="font-size:10px;color:var(--color-text-muted);">${fmtDate(e.riskNextReviewDate)}</div>
                  </div>
                  <span class="badge ${urgent?'badge-danger':'badge-warning'}">${daysLeft} day${daysLeft!==1?'s':''}</span>
                </div>`;
            }).join('')}
          </div>

          <!-- Recent activity -->
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
              <div class="section-heading" style="margin:0;">Recently updated</div>
              <button onclick="go('audit-trail')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Audit trail</button>
            </div>
            ${recent.length === 0 ? `
              <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No individuals yet. Add your first staff member or client to get started.</p>
            ` : recent.map(i => `
              <div
                onclick="go('staff-detail',{individualId:'${i.individualId}'})"
                style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);cursor:pointer;"
              >
                <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0;">${initials(i.fullName)}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i.fullName}</div>
                  <div style="font-size:10px;color:var(--color-text-muted);">${fmtDate(i.updatedAt)}</div>
                </div>
              </div>`).join('')}
          </div>

          <!-- Quick actions -->
          <div class="card">
            <div class="section-heading">Quick actions</div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              ${[
                { label: '+ Add staff member',   screen: 'staff-new',       params: {}                    },
                { label: '+ New client',         screen: 'client-new',      params: {}                    },
                { label: '+ Bulk upload',        screen: 'bulk-upload',     params: {}                    },
                { label: '+ New SMR',            screen: 'smr-new',         params: {}                    },
                { label: 'Generate report',      screen: 'report',          params: {}                    },
              ].map(a => `
                <button
                  onclick="go('${a.screen}',${JSON.stringify(a.params)})"
                  class="btn-sec"
                  style="text-align:left;justify-content:flex-start;font-size:var(--font-size-xs);"
                >${a.label}</button>`).join('')}
            </div>
          </div>

        </div>
      </div>
    </div>`;
}
