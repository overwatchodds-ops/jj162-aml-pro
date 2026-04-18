import { S } from '../../state/index.js';
import { getRequirements, getComplianceStatus, ROLE_LABELS } from '../../state/rules_matrix.js';
import { fmtDate, fmtDateTime } from '../../firebase/firestore.js';

// ─── STAFF VETTING CONFIG ─────────────────────────────────────────────────────
const STAFF_FUNCTIONS = {
  director_owner_beneficial_owner: {
    label: 'Director / owner / beneficial owner',
    desc: 'Has ownership or governance responsibility over the firm',
    level: 'key',
  },
  amlco_delegate: {
    label: 'AMLCO or delegate',
    desc: 'Holds formal responsibility for the AML/CTF program',
    level: 'key',
  },
  senior_manager_aml_authority: {
    label: 'Senior manager with AML/CTF authority',
    desc: 'Approves program, risk assessments or SMR decisions',
    level: 'key',
  },
  reporting_officer: {
    label: 'Reporting Officer',
    desc: 'Oversees suspicious matter reporting and escalation',
    level: 'key',
  },
  processes_client_cdd_kyc_checks: {
    label: 'Processes client CDD / KYC checks',
    desc: 'Collects and verifies client identity information',
    level: 'standard',
  },
  screens_clients_namescan: {
    label: 'Screens clients via NameScan or similar',
    desc: 'Runs PEP, sanctions or adverse media checks',
    level: 'standard',
  },
  supports_transaction_monitoring: {
    label: 'Supports transaction monitoring',
    desc: 'Reviews or flags unusual client activity',
    level: 'standard',
  },
  assists_smr_compliance_reporting: {
    label: 'Assists with SMR or compliance reporting',
    desc: 'Prepares or supports suspicious matter reports',
    level: 'standard',
  },
  none_of_the_above: {
    label: 'None of the above',
    desc: 'No AML/CTF functions are performed by this staff member',
    level: 'none',
  },
};

const KEY_PERSONNEL_CODES = [
  'director_owner_beneficial_owner',
  'amlco_delegate',
  'senior_manager_aml_authority',
  'reporting_officer',
];

const STANDARD_STAFF_CODES = [
  'processes_client_cdd_kyc_checks',
  'screens_clients_namescan',
  'supports_transaction_monitoring',
  'assists_smr_compliance_reporting',
];

const STAFF_REQUIREMENT_LABELS = {
  screening: 'PEP / sanctions screening',
  training: 'AML/CTF training',
  police_check: 'Police check',
  bankruptcy_check: 'Bankruptcy check',
};

// ─── GENERIC HELPERS ──────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function latestBy(items = [], field) {
  return [...items].sort((a, b) => (b?.[field] || '').localeCompare(a?.[field] || ''))[0];
}

function row(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);gap:var(--space-4);">
      <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);min-width:140px;flex-shrink:0;">${label}</span>
      <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);text-align:right;">${value}</span>
    </div>`;
}

function sectionActionButton(label, route, individualId, tab) {
  return `
    <button
      onclick="go('${route}',{individualId:'${individualId}'${tab ? `,tab:'${tab}'` : ''}})"
      class="btn-ghost"
      style="font-size:var(--font-size-xs);color:var(--color-primary);"
    >${label}</button>`;
}

function softBadge(text, tone = 'neutral') {
  const styles = {
    success: 'background:#dcfce7;color:#166534;',
    warning: 'background:#fef3c7;color:#92400e;',
    danger:  'background:#fee2e2;color:#991b1b;',
    info:    'background:#dbeafe;color:#1d4ed8;',
    neutral: 'background:#f1f5f9;color:#475569;',
    key:     'background:#fef3c7;color:#92400e;',
    standard:'background:#dbeafe;color:#1d4ed8;',
  };
  return `
    <span style="
      display:inline-flex;align-items:center;
      padding:3px 10px;border-radius:999px;
      font-size:10px;font-weight:700;
      ${styles[tone] || styles.neutral}
    ">${text}</span>`;
}

function requirementRow(label, ok) {
  return `
    <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="font-size:var(--font-size-sm);font-weight:700;color:${ok ? 'var(--color-success)' : 'var(--color-danger)'};">
        ${ok ? '✓' : '✗'}
      </span>
      <span style="font-size:var(--font-size-xs);color:${ok ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'};">
        ${label}
      </span>
    </div>`;
}

// ─── STAFF HELPERS ────────────────────────────────────────────────────────────
function isStaffContext(ind) {
  return S.currentScreen === 'staff-detail' || ind?.isStaff === true;
}

function deriveFunctionsFromRole(role = '') {
  const r = String(role || '').toLowerCase();
  const out = [];

  if (
    r.includes('principal') ||
    r.includes('managing partner') ||
    r.includes('partner') ||
    r.includes('director') ||
    r.includes('owner')
  ) {
    out.push('director_owner_beneficial_owner');
  }

  if (r.includes('amlco')) {
    out.push('amlco_delegate');
  }

  if (r.includes('senior manager')) {
    out.push('senior_manager_aml_authority');
  }

  if (r.includes('reporting officer')) {
    out.push('reporting_officer');
  }

  return [...new Set(out)];
}

function normaliseStaffFunctions(ind) {
  const raw = ind?.staffFunctions || ind?.amlFunctions || ind?.functions || [];
  let selected = [];

  if (Array.isArray(raw)) {
    selected = raw.filter(Boolean);
  } else if (raw && typeof raw === 'object') {
    selected = Object.keys(raw).filter(k => !!raw[k]);
  }

  if (!selected.length) {
    selected = deriveFunctionsFromRole(ind?.role);
  }

  selected = selected.filter(code => STAFF_FUNCTIONS[code]);

  if (selected.includes('none_of_the_above') && selected.length > 1) {
    selected = selected.filter(code => code !== 'none_of_the_above');
  }

  return [...new Set(selected)];
}

function classificationFromFunctions(functions = []) {
  if (!functions.length || functions.includes('none_of_the_above')) {
    return 'none';
  }
  if (functions.some(code => KEY_PERSONNEL_CODES.includes(code))) {
    return 'key';
  }
  if (functions.some(code => STANDARD_STAFF_CODES.includes(code))) {
    return 'standard';
  }
  return 'none';
}

function classificationLabel(classification) {
  if (classification === 'key') return 'Key Personnel';
  if (classification === 'standard') return 'Standard Staff';
  return 'No AML functions';
}

function classificationBadge(classification) {
  if (classification === 'key') return softBadge('Key Personnel', 'key');
  if (classification === 'standard') return softBadge('Standard Staff', 'standard');
  return softBadge('No AML functions', 'neutral');
}

function requirementsForClassification(classification) {
  if (classification === 'key') {
    return ['screening', 'training', 'police_check', 'bankruptcy_check'];
  }
  if (classification === 'standard') {
    return ['screening', 'training'];
  }
  return [];
}

function staffRequirementStatus(classification, evidence) {
  const required = requirementsForClassification(classification);

  const satisfied = [];
  if (evidence.screening) satisfied.push('screening');
  if (evidence.training) satisfied.push('training');
  if (evidence.police_check) satisfied.push('police_check');
  if (evidence.bankruptcy_check) satisfied.push('bankruptcy_check');

  const missing = required
    .filter(code => !satisfied.includes(code))
    .map(code => ({ code, label: STAFF_REQUIREMENT_LABELS[code] || code }));

  let status = 'not_required';
  if (!required.length) {
    status = 'not_required';
  } else if (satisfied.length === 0) {
    status = 'not_started';
  } else if (missing.length === 0) {
    status = 'complete';
  } else {
    status = 'incomplete';
  }

  return { required, satisfied, missing, status };
}

function staffStatusBadge(status) {
  switch (status) {
    case 'complete':
      return softBadge('Complete', 'success');
    case 'incomplete':
      return softBadge('Incomplete', 'danger');
    case 'not_started':
      return softBadge('Not started', 'warning');
    case 'not_required':
    default:
      return softBadge('No checks required', 'neutral');
  }
}

function renderStaffDetail(individualId, ind) {
  const screenings = (S.screenings || []).filter(s => s.individualId === individualId);
  const training = (S.training || []).filter(t => t.individualId === individualId);
  const vetting = (S.vetting || []).filter(v => v.individualId === individualId);

  const latestScr = latestBy(screenings, 'date');
  const latestTrn = latestBy(training, 'completedDate');
  const latestVet = latestBy(vetting, 'policeCheckDate');

  const functions = normaliseStaffFunctions(ind);
  const classification = ind?.staffClassification || classificationFromFunctions(functions);

  const evidence = {
    screening: !!latestScr?.result,
    training: !!latestTrn?.completedDate,
    police_check: !!latestVet?.policeCheckDate,
    bankruptcy_check: !!latestVet?.bankruptcyCheckDate,
  };

  const { required, satisfied, status } = staffRequirementStatus(classification, evidence);
  const auditEntries = (S._auditCache?.[individualId] || []).slice(0, 5);

  return `
    <div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6);">
        <div style="display:flex;align-items:center;gap:var(--space-4);">
          <button onclick="go('staff')" class="btn-ghost" style="color:var(--color-text-muted);padding:0;font-size:var(--font-size-sm);">← Staff</button>
        </div>
        <button onclick="go('staff-edit',{individualId:'${individualId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);">
          <div class="avatar" style="width:48px;height:48px;font-size:var(--font-size-lg);">${initials(ind.fullName)}</div>
          <div>
            <div style="font-size:var(--font-size-xl);font-weight:var(--font-weight-medium);margin-bottom:var(--space-2);">${ind.fullName || '—'}</div>
            <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
              ${classificationBadge(classification)}
              ${staffStatusBadge(status)}
            </div>
          </div>
        </div>

        <div class="section-heading">Identity</div>
        ${row('Role / title', ind.role)}
        ${row('Date of birth', fmtDate(ind.dateOfBirth))}
        ${row('Residential address', ind.address)}
        ${row('Email', ind.email)}
        ${row('Phone', ind.phone)}
        ${row('Notes', ind.notes)}
        ${row('Created', fmtDate(ind.createdAt))}
        ${row('Last updated', fmtDate(ind.updatedAt))}
      </div>

      <div class="card">
        <div class="section-heading">AML/CTF functions</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          Classification is derived from the AML/CTF functions this staff member performs.
        </p>

        ${functions.length ? functions.map(code => {
          const meta = STAFF_FUNCTIONS[code];
          return `
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);padding:var(--space-3) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div>
                <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);">${meta.label}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">${meta.desc}</div>
              </div>
              ${meta.level === 'key' ? softBadge('Key Personnel', 'key') : meta.level === 'standard' ? softBadge('Standard Staff', 'standard') : softBadge('None', 'neutral')}
            </div>`;
        }).join('') : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No AML/CTF functions selected yet.</p>
        `}
      </div>

      <div class="card">
        <div class="section-heading">Vetting requirements</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">
          Required checks are derived from this staff member's AML/CTF functions.
        </p>

        ${required.length ? required.map(code => requirementRow(STAFF_REQUIREMENT_LABELS[code], satisfied.includes(code))).join('') : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No AML/CTF vetting checks are currently required for this staff member.</p>
        `}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Screening</div>
          ${sectionActionButton(latestScr ? 'Update' : '+ Add', 'staff-edit', individualId, 'screening')}
        </div>

        ${latestScr ? `
          ${row('Provider', latestScr.provider)}
          ${row('Date', fmtDate(latestScr.date))}
          ${row('Result', latestScr.result)}
          ${row('Reference ID', latestScr.referenceId)}
          ${row('Next due', fmtDate(latestScr.nextDueDate))}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No screening recorded yet.</p>
        `}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Training</div>
          ${sectionActionButton(latestTrn ? 'Add new' : '+ Add', 'staff-edit', individualId, 'training')}
        </div>

        ${latestTrn ? `
          ${row('Type', latestTrn.type)}
          ${row('Completed date', fmtDate(latestTrn.completedDate))}
          ${row('Provider', latestTrn.provider)}
          ${row('Expiry date', fmtDate(latestTrn.expiryDate))}
          ${latestTrn.certificateLink ? row('Certificate', `<a href="${latestTrn.certificateLink}" target="_blank" style="color:var(--color-primary);">View →</a>`) : ''}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No training recorded yet.</p>
        `}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Vetting</div>
          ${sectionActionButton(latestVet ? 'Update' : '+ Add', 'staff-edit', individualId, 'vetting')}
        </div>

        ${latestVet ? `
          ${row('Police check date', fmtDate(latestVet.policeCheckDate))}
          ${row('Police check result', latestVet.policeCheckResult)}
          ${row('Police check ref', latestVet.policeCheckRef)}
          ${row('Bankruptcy date', fmtDate(latestVet.bankruptcyCheckDate))}
          ${row('Bankruptcy result', latestVet.bankruptcyCheckResult)}
          ${row('Declaration date', fmtDate(latestVet.declDate))}
          ${row('Declaration next', fmtDate(latestVet.declNext))}
          ${row('Declaration signed', latestVet.declSigned ? 'Yes' : 'No')}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No vetting records yet.</p>
        `}
      </div>

      <div class="card">
        <div class="section-heading">SMR</div>
        <button onclick="viewIndividualSMRs('${individualId}')" class="btn-sec btn-sm">View SMRs involving this staff member</button>
        <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Only your firm's SMRs are shown. Tipping-off rules apply.</p>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Recent activity</div>
          <button onclick="loadIndividualAudit('${individualId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Load</button>
        </div>

        ${auditEntries.length > 0 ? auditEntries.map(e => `
          <div class="audit-row">
            <span class="audit-arrow">→</span>
            <span class="audit-date">${fmtDateTime(e.timestamp)}</span>
            <span>${e.detail}</span>
          </div>
        `).join('') : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Click Load to view activity for this staff record.</p>
        `}

        <button onclick="go('audit-trail',{individualId:'${individualId}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);margin-top:var(--space-2);">View full audit trail →</button>
      </div>
    </div>`;
}

// ─── NON-STAFF / LEGACY INDIVIDUAL DETAIL ─────────────────────────────────────
function legacyReqRow(code, label, satisfied, missing) {
  const isSatisfied = satisfied.includes(code);
  const missingItem = missing.find(m => m.code === code);
  const icon  = isSatisfied ? '✓' : '✗';
  const color = isSatisfied ? 'var(--color-success)' : 'var(--color-danger)';
  const msg   = isSatisfied ? label : (missingItem?.label || label);

  return `
    <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
      <span style="color:${color};font-size:var(--font-size-sm);font-weight:var(--font-weight-bold);flex-shrink:0;">${icon}</span>
      <span style="font-size:var(--font-size-xs);color:${isSatisfied ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'};">${msg}</span>
    </div>`;
}

function renderLegacyIndividualDetail(individualId, ind) {
  const links = S.links.filter(l => l.individualId === individualId && l.status === 'active');
  const formerLinks = S.links.filter(l => l.individualId === individualId && l.status === 'former');

  const required = getRequirements(links, S.entities);
  const verifications = (S.verifications || []).filter(v => v.individualId === individualId);
  const screenings = (S.screenings || []).filter(s => s.individualId === individualId);
  const training = (S.training || []).filter(t => t.individualId === individualId);
  const vetting = (S.vetting || []).filter(v => v.individualId === individualId);

  const latestVer = latestBy(verifications, 'createdAt');
  const latestScr = latestBy(screenings, 'date');
  const latestTrn = latestBy(training, 'completedDate');
  const latestVet = latestBy(vetting, 'policeCheckDate');

  const { status, missing, satisfied } = getComplianceStatus(required, {
    verification: latestVer || null,
    screening: { result: latestScr?.result, date: latestScr?.date },
    training: { type: latestTrn?.type, completedDate: latestTrn?.completedDate },
    vetting: latestVet || null,
  });

  const statusBadge = status === 'compliant'
    ? `<span class="badge badge-success">Compliant</span>`
    : `<span class="badge badge-danger">Action required</span>`;

  const auditEntries = (S._auditCache?.[individualId] || []).slice(0, 5);

  return `
    <div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6);">
        <div style="display:flex;align-items:center;gap:var(--space-4);">
          <button onclick="go('individuals')" class="btn-ghost" style="color:var(--color-text-muted);padding:0;font-size:var(--font-size-sm);">← Individuals</button>
        </div>
        <button onclick="go('individual-edit',{individualId:'${individualId}'})" class="btn-sec btn-sm">Edit</button>
      </div>

      <div class="card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);">
          <div class="avatar" style="width:48px;height:48px;font-size:var(--font-size-lg);">${initials(ind.fullName)}</div>
          <div>
            <div style="font-size:var(--font-size-xl);font-weight:var(--font-weight-medium);margin-bottom:var(--space-1);">${ind.fullName}</div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">${statusBadge}</div>
          </div>
        </div>

        <div class="section-heading">Core identity</div>
        ${row('Date of birth', fmtDate(ind.dateOfBirth))}
        ${row('Address', ind.address)}
        ${row('Email', ind.email)}
        ${row('Phone', ind.phone)}
        ${row('Created', fmtDate(ind.createdAt))}
        ${row('Last updated', fmtDate(ind.updatedAt))}
      </div>

      ${required.length > 0 ? `
      <div class="card">
        <div class="section-heading">Compliance requirements</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);">Derived from this individual's connections and roles.</p>
        ${required.map(code => {
          const labels = {
            id_verification: 'ID verification',
            screening: 'Screening (PEP / sanctions)',
            police_check: 'Police check',
            bankruptcy_check: 'Bankruptcy check',
            training_enhanced: 'Enhanced AML/CTF training',
            training_standard: 'Standard AML/CTF training',
            declaration_signed: 'Annual declaration signed',
            assessment_recorded: 'AML/CTF function assessment',
          };
          return legacyReqRow(code, labels[code] || code, satisfied, missing);
        }).join('')}
      </div>` : `
      <div class="card">
        <div class="section-heading">Compliance requirements</div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No requirements yet — add a connection to this individual to derive their compliance obligations.</p>
      </div>`}

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Active connections</div>
          <button onclick="go('individual-edit',{individualId:'${individualId}',tab:'connections'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">+ Add connection</button>
        </div>

        ${links.length === 0 ? `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No active connections. Add a firm or entity connection to generate compliance requirements.</p>
        ` : links.map(l => {
          const label = ROLE_LABELS[l.roleType] || l.roleType;
          let target = '';
          if (l.linkedObjectType === 'firm') {
            target = S.firm?.firmName || 'Firm';
          } else {
            const entity = S.entities.find(e => e.entityId === l.linkedObjectId);
            target = entity?.entityName || 'Entity';
          }
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
              <div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);">${target}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label} · since ${fmtDate(l.startDate)}</div>
              </div>
              <span class="badge badge-success" style="font-size:9px;">Active</span>
            </div>`;
        }).join('')}

        ${formerLinks.length > 0 ? `
          <div style="margin-top:var(--space-4);">
            <div class="section-heading">Former connections</div>
            ${formerLinks.map(l => {
              const label = ROLE_LABELS[l.roleType] || l.roleType;
              let target = '';
              if (l.linkedObjectType === 'firm') {
                target = S.firm?.firmName || 'Firm';
              } else {
                const entity = S.entities.find(e => e.entityId === l.linkedObjectId);
                target = entity?.entityName || 'Entity';
              }
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:0.5px solid var(--color-border-light);">
                  <div>
                    <div style="font-size:var(--font-size-base);color:var(--color-text-muted);">${target}</div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${label} · ended ${fmtDate(l.endDate)}</div>
                  </div>
                  <span class="badge badge-neutral" style="font-size:9px;">Former</span>
                </div>`;
            }).join('')}
          </div>
        ` : ''}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">ID verification</div>
          ${sectionActionButton(latestVer ? 'Update' : '+ Add', 'individual-edit', individualId, 'verification')}
        </div>
        ${latestVer ? `
          ${row('ID type', latestVer.idType)}
          ${row('ID number', latestVer.idNumber)}
          ${row('Issuing state', latestVer.issuingState)}
          ${row('Expiry date', fmtDate(latestVer.expiryDate))}
          ${row('Verified by', latestVer.verifiedBy)}
          ${row('Verified date', fmtDate(latestVer.verifiedDate))}
          ${row('Method', latestVer.verifiedMethod)}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No ID verification recorded yet.</p>
        `}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Screening</div>
          ${sectionActionButton(latestScr ? 'Add new' : '+ Add', 'individual-edit', individualId, 'screening')}
        </div>
        ${latestScr ? `
          ${row('Provider', latestScr.provider)}
          ${row('Date', fmtDate(latestScr.date))}
          ${row('Result', latestScr.result)}
          ${row('Reference ID', latestScr.referenceId)}
          ${row('Next due', fmtDate(latestScr.nextDueDate))}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No screening recorded yet.</p>
        `}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Training</div>
          ${sectionActionButton(latestTrn ? 'Add new' : '+ Add', 'individual-edit', individualId, 'training')}
        </div>
        ${latestTrn ? `
          ${row('Type', latestTrn.type)}
          ${row('Completed date', fmtDate(latestTrn.completedDate))}
          ${row('Provider', latestTrn.provider)}
          ${row('Expiry date', fmtDate(latestTrn.expiryDate))}
          ${latestTrn.certificateLink ? row('Certificate', `<a href="${latestTrn.certificateLink}" target="_blank" style="color:var(--color-primary);">View →</a>`) : ''}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No training recorded yet.</p>
        `}
      </div>

      ${required.includes('police_check') || required.includes('bankruptcy_check') || required.includes('declaration_signed') ? `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Staff vetting</div>
          ${sectionActionButton(latestVet ? 'Update' : '+ Add', 'individual-edit', individualId, 'vetting')}
        </div>
        ${latestVet ? `
          ${row('Police check date', fmtDate(latestVet.policeCheckDate))}
          ${row('Police check result', latestVet.policeCheckResult)}
          ${row('Police check ref', latestVet.policeCheckRef)}
          ${row('Bankruptcy date', fmtDate(latestVet.bankruptcyCheckDate))}
          ${row('Bankruptcy result', latestVet.bankruptcyCheckResult)}
          ${row('Declaration date', fmtDate(latestVet.declDate))}
          ${row('Declaration next', fmtDate(latestVet.declNext))}
          ${row('Declaration signed', latestVet.declSigned ? 'Yes' : 'No')}
        ` : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">No vetting records yet.</p>
        `}
      </div>` : ''}

      <div class="card">
        <div class="section-heading">SMR</div>
        <button onclick="viewIndividualSMRs('${individualId}')" class="btn-sec btn-sm">View SMRs involving this individual</button>
        <p style="font-size:10px;color:var(--color-text-muted);margin-top:var(--space-2);">Only your firm's SMRs are shown. Tipping-off rules apply.</p>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
          <div class="section-heading" style="margin:0;">Recent activity</div>
          <button onclick="loadIndividualAudit('${individualId}')" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);">Load</button>
        </div>
        ${auditEntries.length > 0 ? auditEntries.map(e => `
          <div class="audit-row">
            <span class="audit-arrow">→</span>
            <span class="audit-date">${fmtDateTime(e.timestamp)}</span>
            <span>${e.detail}</span>
          </div>`).join('') : `
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Click Load to view activity for this individual.</p>
        `}
        <button onclick="go('audit-trail',{individualId:'${individualId}'})" class="btn-ghost" style="font-size:var(--font-size-xs);color:var(--color-primary);margin-top:var(--space-2);">View full audit trail →</button>
      </div>
    </div>`;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export function screen() {
  const { individualId } = S.currentParams || {};
  const ind = (S.individuals || []).find(i => i.individualId === individualId);

  if (!ind) {
    const backRoute = S.currentScreen === 'staff-detail' ? 'staff' : 'individuals';
    const backLabel = S.currentScreen === 'staff-detail' ? 'Staff' : 'Individuals';
    return `
      <div class="empty-state">
        <div class="empty-state-title">${S.currentScreen === 'staff-detail' ? 'Staff record not found.' : 'Individual not found.'}</div>
        <button onclick="go('${backRoute}')" class="btn-sec btn-sm" style="margin-top:var(--space-3);">← Back to ${backLabel}</button>
      </div>`;
  }

  if (isStaffContext(ind)) {
    return renderStaffDetail(individualId, ind);
  }

  return renderLegacyIndividualDetail(individualId, ind);
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
window.viewIndividualSMRs = function(individualId) {
  go('smr', { filterIndividual: individualId });
};

window.loadIndividualAudit = async function(individualId) {
  const { getIndividualAuditLog } = await import('../../firebase/firestore.js');
  const entries = await getIndividualAuditLog(S.firmId, individualId);
  if (!S._auditCache) S._auditCache = {};
  S._auditCache[individualId] = entries;
  render();
};
