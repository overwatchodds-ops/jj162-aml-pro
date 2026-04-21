// ─── SIMPLEAML PRO — CDD REQUIREMENTS MATRIX ─────────────────────────────────
// Source: Extracted directly from staff.js and newclient.js (free app logic).
// Drives compliance requirement derivation per individual based on their
// firm and entity connections (links collection).
//
// Two contexts:
//   "firm"   → individual linked directly to a firm profile (staff, owner, client)
//   "entity" → individual linked to a legal entity (director, trustee, partner etc)
//
// Highest requirement wins across all links for a given individual.
// Any row with level "required" = must be completed.
//
// requirementCode values:
//   id_verification     → full ID verification (type, number, expiry, verified by, method)
//   screening           → PEP / sanctions / adverse media screening (NameScan or similar)
//   police_check        → National Police Certificate
//   bankruptcy_check    → bankruptcy / insolvency clearance
//   training_enhanced   → enhanced AML/CTF training (key personnel)
//   training_standard   → standard AML/CTF training (operational staff)
//   declaration_signed  → annual re-vetting declaration signed
//   assessment_recorded → classification assessed, no checks required
//
// Update only when AUSTRAC releases new CDD guidance.
// activeFlag: false = rule suspended without code change.

export const RULES_MATRIX = [

  // ─── FIRM CONTEXT — KEY PERSONNEL ─────────────────────────────────────────
  // Source: staff.js — classification "Key Personnel"
  // Functions: director / amlco / senior_manager (any one = Key Personnel)

  { id: 1,  contextType: 'firm', entitySubtype: null, roleType: 'owner',          requirementCode: 'id_verification',   level: 'required',     activeFlag: true },
  { id: 2,  contextType: 'firm', entitySubtype: null, roleType: 'owner',          requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 3,  contextType: 'firm', entitySubtype: null, roleType: 'owner',          requirementCode: 'police_check',      level: 'required',     activeFlag: true },
  { id: 4,  contextType: 'firm', entitySubtype: null, roleType: 'owner',          requirementCode: 'bankruptcy_check',  level: 'required',     activeFlag: true },
  { id: 5,  contextType: 'firm', entitySubtype: null, roleType: 'owner',          requirementCode: 'training_enhanced', level: 'required',     activeFlag: true },
  { id: 6,  contextType: 'firm', entitySubtype: null, roleType: 'owner',          requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  { id: 7,  contextType: 'firm', entitySubtype: null, roleType: 'amlco',          requirementCode: 'id_verification',   level: 'required',     activeFlag: true },
  { id: 8,  contextType: 'firm', entitySubtype: null, roleType: 'amlco',          requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 9,  contextType: 'firm', entitySubtype: null, roleType: 'amlco',          requirementCode: 'police_check',      level: 'required',     activeFlag: true },
  { id: 10, contextType: 'firm', entitySubtype: null, roleType: 'amlco',          requirementCode: 'bankruptcy_check',  level: 'required',     activeFlag: true },
  { id: 11, contextType: 'firm', entitySubtype: null, roleType: 'amlco',          requirementCode: 'training_enhanced', level: 'required',     activeFlag: true },
  { id: 12, contextType: 'firm', entitySubtype: null, roleType: 'amlco',          requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  { id: 13, contextType: 'firm', entitySubtype: null, roleType: 'senior_manager', requirementCode: 'id_verification',   level: 'required',     activeFlag: true },
  { id: 14, contextType: 'firm', entitySubtype: null, roleType: 'senior_manager', requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 15, contextType: 'firm', entitySubtype: null, roleType: 'senior_manager', requirementCode: 'police_check',      level: 'required',     activeFlag: true },
  { id: 16, contextType: 'firm', entitySubtype: null, roleType: 'senior_manager', requirementCode: 'bankruptcy_check',  level: 'required',     activeFlag: true },
  { id: 17, contextType: 'firm', entitySubtype: null, roleType: 'senior_manager', requirementCode: 'training_enhanced', level: 'required',     activeFlag: true },
  { id: 18, contextType: 'firm', entitySubtype: null, roleType: 'senior_manager', requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  // ─── FIRM CONTEXT — STANDARD AML/CTF STAFF ────────────────────────────────
  // Source: staff.js — classification "Standard AML/CTF Staff"
  // Functions: cdd / screen / monitor / smr (any one, no key function)

  { id: 19, contextType: 'firm', entitySubtype: null, roleType: 'staff_cdd',     requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 20, contextType: 'firm', entitySubtype: null, roleType: 'staff_cdd',     requirementCode: 'training_standard', level: 'required',     activeFlag: true },
  { id: 21, contextType: 'firm', entitySubtype: null, roleType: 'staff_cdd',     requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  { id: 22, contextType: 'firm', entitySubtype: null, roleType: 'staff_screen',  requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 23, contextType: 'firm', entitySubtype: null, roleType: 'staff_screen',  requirementCode: 'training_standard', level: 'required',     activeFlag: true },
  { id: 24, contextType: 'firm', entitySubtype: null, roleType: 'staff_screen',  requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  { id: 25, contextType: 'firm', entitySubtype: null, roleType: 'staff_monitor', requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 26, contextType: 'firm', entitySubtype: null, roleType: 'staff_monitor', requirementCode: 'training_standard', level: 'required',     activeFlag: true },
  { id: 27, contextType: 'firm', entitySubtype: null, roleType: 'staff_monitor', requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  { id: 28, contextType: 'firm', entitySubtype: null, roleType: 'staff_smr',     requirementCode: 'screening',         level: 'required',     activeFlag: true },
  { id: 29, contextType: 'firm', entitySubtype: null, roleType: 'staff_smr',     requirementCode: 'training_standard', level: 'required',     activeFlag: true },
  { id: 30, contextType: 'firm', entitySubtype: null, roleType: 'staff_smr',     requirementCode: 'declaration_signed',level: 'required',     activeFlag: true },

  // ─── FIRM CONTEXT — NO AML/CTF FUNCTIONS ──────────────────────────────────
  // Source: staff.js — classification "No AML/CTF functions"
  // Record the assessment — no vetting checks required

  { id: 31, contextType: 'firm', entitySubtype: null, roleType: 'no_aml_functions', requirementCode: 'assessment_recorded', level: 'required', activeFlag: true },

  // ─── FIRM CONTEXT — DIRECT CLIENT ─────────────────────────────────────────
  // Source: newclient.js — Individual / Sole Trader linked directly to firm
  // No staff role — purely a client relationship

  { id: 32, contextType: 'firm', entitySubtype: null, roleType: 'direct_client', requirementCode: 'id_verification',   level: 'required',     activeFlag: true },
  { id: 33, contextType: 'firm', entitySubtype: null, roleType: 'direct_client', requirementCode: 'screening',         level: 'required',     activeFlag: true },

  // ─── ENTITY CONTEXT — PRIVATE COMPANY ─────────────────────────────────────
  // Source: newclient.js — ENTITY_CONFIG['Private Company']
  // Roles: Director / Beneficial Owner ≥25% / Secretary / Authorised Representative

  { id: 34, contextType: 'entity', entitySubtype: 'company', roleType: 'director',            requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 35, contextType: 'entity', entitySubtype: 'company', roleType: 'director',            requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 36, contextType: 'entity', entitySubtype: 'company', roleType: 'beneficial_owner_25', requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 37, contextType: 'entity', entitySubtype: 'company', roleType: 'beneficial_owner_25', requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 38, contextType: 'entity', entitySubtype: 'company', roleType: 'secretary',           requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 39, contextType: 'entity', entitySubtype: 'company', roleType: 'secretary',           requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 40, contextType: 'entity', entitySubtype: 'company', roleType: 'authorised_rep',      requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  // authorised_rep: screening not required per current app logic

  // ─── ENTITY CONTEXT — PARTNERSHIP ─────────────────────────────────────────
  // Source: newclient.js — ENTITY_CONFIG['Partnership']
  // Roles: Partner / Authorised Representative

  { id: 41, contextType: 'entity', entitySubtype: 'partnership', roleType: 'partner',         requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 42, contextType: 'entity', entitySubtype: 'partnership', roleType: 'partner',         requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 43, contextType: 'entity', entitySubtype: 'partnership', roleType: 'authorised_rep',  requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  // authorised_rep: screening not required per current app logic

  // ─── ENTITY CONTEXT — TRUST ───────────────────────────────────────────────
  // Source: newclient.js — ENTITY_CONFIG['Trust']
  // Roles: Trustee (Individual) / Trustee (Corporate) / Settlor /
  //        Appointor / Beneficiary ≥25% / Beneficial Owner

  { id: 44, contextType: 'entity', entitySubtype: 'trust', roleType: 'trustee_individual',   requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 45, contextType: 'entity', entitySubtype: 'trust', roleType: 'trustee_individual',   requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 46, contextType: 'entity', entitySubtype: 'trust', roleType: 'trustee_corporate',    requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 47, contextType: 'entity', entitySubtype: 'trust', roleType: 'trustee_corporate',    requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 48, contextType: 'entity', entitySubtype: 'trust', roleType: 'settlor',              requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 49, contextType: 'entity', entitySubtype: 'trust', roleType: 'settlor',              requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 50, contextType: 'entity', entitySubtype: 'trust', roleType: 'appointor',            requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 51, contextType: 'entity', entitySubtype: 'trust', roleType: 'appointor',            requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 52, contextType: 'entity', entitySubtype: 'trust', roleType: 'beneficiary_25',       requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 53, contextType: 'entity', entitySubtype: 'trust', roleType: 'beneficiary_25',       requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 54, contextType: 'entity', entitySubtype: 'trust', roleType: 'beneficial_owner',     requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 55, contextType: 'entity', entitySubtype: 'trust', roleType: 'beneficial_owner',     requirementCode: 'screening',       level: 'required',     activeFlag: true },

  // beneficiary with no unit holding threshold — assessment recorded, no checks
  { id: 56, contextType: 'entity', entitySubtype: 'trust', roleType: 'beneficiary',          requirementCode: 'assessment_recorded', level: 'required', activeFlag: true },

  // ─── ENTITY CONTEXT — SMSF ────────────────────────────────────────────────
  // Source: newclient.js — ENTITY_CONFIG['SMSF']
  // Roles: Trustee / Member / Corporate Trustee Director

  { id: 57, contextType: 'entity', entitySubtype: 'smsf', roleType: 'trustee_member',             requirementCode: 'id_verification', level: 'required', activeFlag: true },
  { id: 58, contextType: 'entity', entitySubtype: 'smsf', roleType: 'trustee_member',             requirementCode: 'screening',       level: 'required', activeFlag: true },

  { id: 59, contextType: 'entity', entitySubtype: 'smsf', roleType: 'corporate_trustee_director', requirementCode: 'id_verification', level: 'required', activeFlag: true },
  { id: 60, contextType: 'entity', entitySubtype: 'smsf', roleType: 'corporate_trustee_director', requirementCode: 'screening',       level: 'required', activeFlag: true },

  // ─── ENTITY CONTEXT — INDIVIDUAL / SOLE TRADER ────────────────────────────
  // Source: newclient.js — ENTITY_CONFIG['Individual / Sole Trader']
  // The individual IS the entity — no separate roles

  { id: 61, contextType: 'entity', entitySubtype: 'individual', roleType: 'self',            requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 62, contextType: 'entity', entitySubtype: 'individual', roleType: 'self',            requirementCode: 'screening',       level: 'required',     activeFlag: true },

  // ─── ENTITY CONTEXT — SOLE TRADER ─────────────────────────────────────────
  // Same requirements as Individual — the person IS the business

  { id: 68, contextType: 'entity', entitySubtype: 'soletrader', roleType: 'self',            requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 69, contextType: 'entity', entitySubtype: 'soletrader', roleType: 'self',            requirementCode: 'screening',       level: 'required',     activeFlag: true },

  // ─── ENTITY CONTEXT — OTHER ───────────────────────────────────────────────
  // Source: newclient.js — ENTITY_CONFIG['Other']
  // Roles: Director / Owner / Authorised Representative

  { id: 63, contextType: 'entity', entitySubtype: 'other', roleType: 'director',            requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 64, contextType: 'entity', entitySubtype: 'other', roleType: 'director',            requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 65, contextType: 'entity', entitySubtype: 'other', roleType: 'owner',               requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  { id: 66, contextType: 'entity', entitySubtype: 'other', roleType: 'owner',               requirementCode: 'screening',       level: 'required',     activeFlag: true },

  { id: 67, contextType: 'entity', entitySubtype: 'other', roleType: 'authorised_rep',      requirementCode: 'id_verification', level: 'required',     activeFlag: true },
  // authorised_rep: screening not required

  // ─── ENTITY CONTEXT — INCORPORATED ASSOCIATION ────────────────────────────
  // Committee members and responsible persons must be identified
  // Authorised representatives: ID verification only

  { id: 70, contextType: 'entity', entitySubtype: 'association', roleType: 'responsible_person', requirementCode: 'id_verification', level: 'required', activeFlag: true },
  { id: 71, contextType: 'entity', entitySubtype: 'association', roleType: 'responsible_person', requirementCode: 'screening',       level: 'required', activeFlag: true },

  { id: 72, contextType: 'entity', entitySubtype: 'association', roleType: 'committee_member',   requirementCode: 'id_verification', level: 'required', activeFlag: true },
  { id: 73, contextType: 'entity', entitySubtype: 'association', roleType: 'committee_member',   requirementCode: 'screening',       level: 'required', activeFlag: true },

  { id: 74, contextType: 'entity', entitySubtype: 'association', roleType: 'authorised_rep',     requirementCode: 'id_verification', level: 'required', activeFlag: true },

  // ─── ENTITY CONTEXT — CHARITY / NFP ───────────────────────────────────────
  // Responsible persons and board members (controllers) must be identified
  // Often registered with ACNC — treat controllers as beneficial owners

  { id: 75, contextType: 'entity', entitySubtype: 'charity', roleType: 'responsible_person', requirementCode: 'id_verification', level: 'required', activeFlag: true },
  { id: 76, contextType: 'entity', entitySubtype: 'charity', roleType: 'responsible_person', requirementCode: 'screening',       level: 'required', activeFlag: true },

  { id: 77, contextType: 'entity', entitySubtype: 'charity', roleType: 'board_member',       requirementCode: 'id_verification', level: 'required', activeFlag: true },
  { id: 78, contextType: 'entity', entitySubtype: 'charity', roleType: 'board_member',       requirementCode: 'screening',       level: 'required', activeFlag: true },

  { id: 79, contextType: 'entity', entitySubtype: 'charity', roleType: 'authorised_rep',     requirementCode: 'id_verification', level: 'required', activeFlag: true },

];

// ─── COMPLIANCE ENGINE ────────────────────────────────────────────────────────
// Derives required compliance items for an individual based on their links.
// Called with an array of link objects for one individual.
// Returns a deduplicated array of requirementCodes that must be satisfied.
//
// Usage:
//   import { getRequirements } from '../state/rules_matrix.js';
//   const required = getRequirements(links, entities);

export function getRequirements(links, entities = []) {
  const required = new Set();

  for (const link of links) {
    if (!link || link.status === 'former') continue; // skip ended relationships

    const contextType = link.linkedObjectType; // 'firm' or 'entity'
    const roleType    = link.roleType;

    // For entity links, look up the entity subtype
    let entitySubtype = null;
    if (contextType === 'entity') {
      const entity = entities.find(e => e.entityId === link.linkedObjectId);
      entitySubtype = entity?.entityType || null;
    }

    // Find matching rules
    const matchingRules = RULES_MATRIX.filter(rule =>
      rule.activeFlag === true &&
      rule.contextType === contextType &&
      rule.roleType === roleType &&
      (rule.entitySubtype === null || rule.entitySubtype === entitySubtype)
    );

    // Add all required codes — highest requirement wins
    for (const rule of matchingRules) {
      if (rule.level === 'required') {
        required.add(rule.requirementCode);
      }
    }
  }

  return Array.from(required);
}

// ─── COMPLIANCE STATUS ────────────────────────────────────────────────────────
// Compares required items against evidence records.
// Returns { status, missing, satisfied }
//
// Usage:
//   import { getComplianceStatus } from '../state/rules_matrix.js';
//   const { status, missing } = getComplianceStatus(required, evidence);

export function getComplianceStatus(required, evidence = {}) {
  const missing    = [];
  const satisfied  = [];

  for (const code of required) {
    switch (code) {

      case 'id_verification':
        if (evidence.verification?.idType && evidence.verification?.verifiedDate) {
          satisfied.push(code);
        } else {
          missing.push({ code, label: 'ID verification outstanding' });
        }
        break;

      case 'screening':
        if (evidence.screening?.result && evidence.screening?.date) {
          // Check not overdue — screening valid for 12 months
          const screenDate = new Date(evidence.screening.date);
          const cutoff     = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 1);
          if (screenDate > cutoff) {
            satisfied.push(code);
          } else {
            missing.push({ code, label: 'Screening overdue — re-screen required' });
          }
        } else {
          missing.push({ code, label: 'Screening not yet completed' });
        }
        break;

      case 'police_check':
        if (evidence.vetting?.policeCheckResult && evidence.vetting?.policeCheckDate) {
          satisfied.push(code);
        } else {
          missing.push({ code, label: 'Police check outstanding' });
        }
        break;

      case 'bankruptcy_check':
        if (evidence.vetting?.bankruptcyCheckResult && evidence.vetting?.bankruptcyCheckDate) {
          satisfied.push(code);
        } else {
          missing.push({ code, label: 'Bankruptcy check outstanding' });
        }
        break;

      case 'training_enhanced':
        if (evidence.training?.type === 'enhanced' && evidence.training?.completedDate) {
          // Check not expired — training valid for 12 months
          const trainDate = new Date(evidence.training.completedDate);
          const cutoff    = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 1);
          if (trainDate > cutoff) {
            satisfied.push(code);
          } else {
            missing.push({ code, label: 'Enhanced training expired — renewal required' });
          }
        } else {
          missing.push({ code, label: 'Enhanced AML/CTF training outstanding' });
        }
        break;

      case 'training_standard':
        if (
          (evidence.training?.type === 'standard' || evidence.training?.type === 'enhanced') &&
          evidence.training?.completedDate
        ) {
          const trainDate = new Date(evidence.training.completedDate);
          const cutoff    = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 1);
          if (trainDate > cutoff) {
            satisfied.push(code);
          } else {
            missing.push({ code, label: 'AML/CTF training expired — renewal required' });
          }
        } else {
          missing.push({ code, label: 'AML/CTF training outstanding' });
        }
        break;

      case 'declaration_signed':
        if (evidence.vetting?.declSigned && evidence.vetting?.declDate) {
          // Check not overdue — declaration valid for 12 months
          const declDate = new Date(evidence.vetting.declDate);
          const cutoff   = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 1);
          if (declDate > cutoff) {
            satisfied.push(code);
          } else {
            missing.push({ code, label: 'Annual declaration overdue' });
          }
        } else {
          missing.push({ code, label: 'Annual declaration not yet signed' });
        }
        break;

      case 'assessment_recorded':
        if (evidence.assessmentRecorded) {
          satisfied.push(code);
        } else {
          missing.push({ code, label: 'AML/CTF function assessment not yet recorded' });
        }
        break;

      default:
        break;
    }
  }

  // Overall status
  let status;
  if (missing.length === 0)  status = 'compliant';
  else                       status = 'action_required';

  return { status, missing, satisfied };
}

// ─── REVIEW CADENCE ───────────────────────────────────────────────────────────
// Source: autoSetNextReview() in newclient.js — unchanged
// Returns next review date based on entity risk rating.

export function getNextReviewDate(riskRating, fromDate = new Date()) {
  const months = riskRating === 'High' ? 12 : riskRating === 'Medium' ? 24 : 36;
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

// ─── ROLE LABELS ─────────────────────────────────────────────────────────────
// Human-readable labels for roleType values.
// Used in UI dropdowns and display.

export const ROLE_LABELS = {
  // Firm roles
  owner:                    'Owner / Principal',
  amlco:                    'AMLCO or delegate',
  senior_manager:           'Senior manager with AML/CTF authority',
  staff_cdd:                'Processes client CDD / KYC checks',
  staff_screen:             'Screens clients via NameScan or similar',
  staff_monitor:            'Supports transaction monitoring',
  staff_smr:                'Assists with SMR or compliance reporting',
  no_aml_functions:         'No AML/CTF functions',
  direct_client:            'Direct client',

  // Entity roles — company
  director:                 'Director',
  beneficial_owner_25:      'Beneficial Owner (≥25%)',
  secretary:                'Secretary',
  authorised_rep:           'Authorised Representative',

  // Entity roles — partnership
  partner:                  'Partner',

  // Entity roles — trust
  trustee_individual:       'Trustee (Individual)',
  trustee_corporate:        'Trustee (Corporate)',
  settlor:                  'Settlor',
  appointor:                'Appointor / Protector',
  beneficiary_25:           'Beneficiary (≥25% unit holder)',
  beneficial_owner:         'Beneficial Owner',
  beneficiary:              'Beneficiary',

  // Entity roles — smsf
  trustee_member:           'Trustee / Member',
  corporate_trustee_director: 'Corporate Trustee Director',

  // Entity roles — individual
  self:                     'Individual / Sole Trader',

  // Entity roles — other
  owner:                    'Owner',

  // Entity roles — association
  responsible_person:       'Responsible Person',
  committee_member:         'Committee Member',

  // Entity roles — charity / NFP
  board_member:             'Board Member',
};

// ─── ENTITY SUBTYPE ROLES ─────────────────────────────────────────────────────
// Roles available per entity subtype.
// Used to populate role dropdowns when adding a member to an entity.

export const ENTITY_ROLES = {
  company:     ['director', 'beneficial_owner_25', 'secretary', 'authorised_rep'],
  partnership: ['partner', 'authorised_rep'],
  trust:       ['trustee_individual', 'trustee_corporate', 'settlor', 'appointor', 'beneficiary_25', 'beneficial_owner', 'beneficiary'],
  smsf:        ['trustee_member', 'corporate_trustee_director'],
  individual:  ['self'],
  soletrader:  ['self'],
  association: ['responsible_person', 'committee_member', 'authorised_rep'],
  charity:     ['responsible_person', 'board_member', 'authorised_rep'],
  other:       ['director', 'owner', 'authorised_rep'],
};

// ─── FIRM ROLES ───────────────────────────────────────────────────────────────
// Roles available when linking an individual directly to a firm.
// Used to populate role dropdowns in staff and direct client flows.

export const FIRM_ROLES = {
  key_personnel:  ['owner', 'amlco', 'senior_manager'],
  standard_staff: ['staff_cdd', 'staff_screen', 'staff_monitor', 'staff_smr'],
  no_aml:         ['no_aml_functions'],
  client:         ['direct_client'],
};
