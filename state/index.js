// ─── SIMPLEAML PRO — STATE ────────────────────────────────────────────────────
// Single state object S. Synced to Firestore on auth, cached in memory.
// localStorage used only for currentScreen and UI preferences.

import {
  getFirmProfile,
  getFirmIndividuals,
  getFirmEntities,
  getIndividualLinks,
  getFirmVerifications,
  getFirmScreenings,
  getFirmTrainingRecords,
  getFirmVettingRecords,
  getFirmUser,
  getFirmUsers,
} from '../firebase/firestore.js';

// ─── STATE OBJECT ─────────────────────────────────────────────────────────────
export let S = {
  // Session
  currentScreen:  'login',
  currentParams:  {},

  // Auth
  user:           null,
  firmId:         null,
  individualId:   null,

  // Access state
  accessBlocked:       false,
  accessBlockedReason: '',

  // Firm
  firm:           null,

  // Data
  individuals:    [],
  entities:       [],
  links:          [],
  verifications:  [],
  screenings:     [],
  training:       [],
  vetting:        [],

  // Users
  firmUsers:      [],

  // UI drafts
  _draft:         null,

  // Onboarding drafts
  _onboardingFirm:       undefined,
  _onboardingIndividual: undefined,
  _onboardingAustrac:    undefined,
};

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

function clearFirmData() {
  S.firm          = null;
  S.individuals   = [];
  S.entities      = [];
  S.links         = [];
  S.verifications = [];
  S.screenings    = [];
  S.training      = [];
  S.vetting       = [];
  S.firmUsers     = [];
}

function blockAccess(reason = 'Your access to this firm has been removed.') {
  S.accessBlocked       = true;
  S.accessBlockedReason = reason;
  S.firmId              = null;
  S.individualId        = null;
  clearFirmData();
}

function isActiveMembership(membership) {
  if (!membership) return false;

  // New records should explicitly be active.
  if (membership.status === 'active') return true;

  // Treat these as blocked.
  if (
    membership.status === 'removed' ||
    membership.status === 'disabled' ||
    membership.status === 'inactive'
  ) {
    return false;
  }

  // Backward compatibility: older manually-created membership records may not
  // have status yet. Keep them working for now if they have the required IDs.
  return !!(membership.firmId && membership.individualId);
}

// ─── LOAD ─────────────────────────────────────────────────────────────────────

export async function load(uid) {
  S.accessBlocked       = false;
  S.accessBlockedReason = '';

  // restore UI state first
  try {
    const ui = localStorage.getItem('pro_v1_ui');
    if (ui) {
      const parsed = JSON.parse(ui);
      S.currentScreen         = parsed.currentScreen || 'dashboard';
      S.currentParams         = parsed.currentParams || {};
      S._onboardingFirm       = parsed._onboardingFirm;
      S._onboardingIndividual = parsed._onboardingIndividual;
      S._onboardingAustrac    = parsed._onboardingAustrac;
    }
  } catch (e) {
    console.warn('Failed to restore UI state', e);
  }

  // ── Resolve firmId + individualId ─────────────────────────────────────────
  // Primary: look up firm_users/{uid} — supports multi-user.
  // Fallback: derive from uid — handles existing single-user firms with no record.
  try {
    const membership = await getFirmUser(uid);

    if (membership) {
      if (!isActiveMembership(membership)) {
        blockAccess('Your access to this firm has been removed or disabled.');
        return;
      }

      S.firmId       = membership.firmId;
      S.individualId = membership.individualId;
    } else {
      // Fallback for pre-existing single-user accounts created before firm_users.
      S.firmId       = 'firm_' + uid;
      S.individualId = 'ind_'  + uid;
    }
  } catch (e) {
    console.warn('Could not load firm_users record — falling back to derived IDs', e);

    // Keep old accounts working if the membership lookup itself fails.
    // Firestore rules may still block actual firm reads if the account has no
    // valid membership record.
    S.firmId       = 'firm_' + uid;
    S.individualId = 'ind_'  + uid;
  }

  const firmId = S.firmId;

  // If access was blocked above, firmId will be null.
  if (!firmId) {
    clearFirmData();
    return;
  }

  // reset collections before reloading
  clearFirmData();

  // 1) firm profile
  try {
    S.firm = await getFirmProfile(firmId);
  } catch (e) {
    console.error('Error loading firm profile:', e);
    S.firm = null;
  }

  // 2) individuals
  try {
    S.individuals = await getFirmIndividuals(firmId);
  } catch (e) {
    console.error('Error loading individuals:', e);
    S.individuals = [];
  }

  // 3) entities
  try {
    S.entities = await getFirmEntities(firmId);
  } catch (e) {
    console.error('Error loading entities:', e);
    S.entities = [];
  }

  // 4) links
  try {
    const allLinks = [];

    for (const ind of S.individuals) {
      try {
        const indLinks = await getIndividualLinks(ind.individualId);
        allLinks.push(...indLinks);
      } catch (e) {
        console.error(`Error loading links for individual ${ind.individualId}:`, e);
      }
    }

    const seen = new Set();

    S.links = allLinks.filter(l => {
      if (!l?.linkId) return false;
      if (seen.has(l.linkId)) return false;
      seen.add(l.linkId);
      return true;
    });
  } catch (e) {
    console.error('Error loading links:', e);
    S.links = [];
  }

  // 5) verifications
  try {
    S.verifications = await getFirmVerifications(firmId);
  } catch (e) {
    console.error('Error loading verifications:', e);
    S.verifications = [];
  }

  // 6) screenings
  try {
    S.screenings = await getFirmScreenings(firmId);
  } catch (e) {
    console.error('Error loading screenings:', e);
    S.screenings = [];
  }

  // 7) training
  try {
    S.training = await getFirmTrainingRecords(firmId);
  } catch (e) {
    console.error('Error loading training records:', e);
    S.training = [];
  }

  // 8) vetting
  try {
    S.vetting = await getFirmVettingRecords(firmId);
  } catch (e) {
    console.error('Error loading vetting records:', e);
    S.vetting = [];
  }

  // 9) firm users (all active users with access to this firm)
  try {
    const allFirmUsers = await getFirmUsers(firmId);
    S.firmUsers = allFirmUsers.filter(u => u.status !== 'removed' && u.status !== 'disabled');
  } catch (e) {
    console.error('Error loading firm users:', e);
    S.firmUsers = [];
  }

  // keep UI on a sensible screen if current one is empty/broken after load
  if (!S.currentScreen) S.currentScreen = 'dashboard';
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────

export function save() {
  try {
    localStorage.setItem('pro_v1_ui', JSON.stringify({
      currentScreen:         S.currentScreen,
      currentParams:         S.currentParams,
      _onboardingFirm:       S._onboardingFirm,
      _onboardingIndividual: S._onboardingIndividual,
      _onboardingAustrac:    S._onboardingAustrac,
    }));
  } catch (e) {
    console.warn('Failed to save UI state', e);
  }
}

// ─── RESET ────────────────────────────────────────────────────────────────────

export function reset() {
  S = {
    currentScreen:  'login',
    currentParams:  {},

    user:           null,
    firmId:         null,
    individualId:   null,

    accessBlocked:       false,
    accessBlockedReason: '',

    firm:           null,

    individuals:    [],
    entities:       [],
    links:          [],
    verifications:  [],
    screenings:     [],
    training:       [],
    vetting:        [],

    firmUsers:      [],

    _draft:         null,

    _onboardingFirm:       undefined,
    _onboardingIndividual: undefined,
    _onboardingAustrac:    undefined,
  };

  try {
    localStorage.removeItem('pro_v1_ui');
  } catch (e) {}
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getIndividual(individualId) {
  return S.individuals.find(i => i.individualId === individualId) || null;
}

export function getEntity(entityId) {
  return S.entities.find(e => e.entityId === entityId) || null;
}

export function getLinksForIndividual(individualId) {
  return S.links.filter(l => l.individualId === individualId && l.status === 'active');
}

export function getLinksForEntity(entityId) {
  return S.links.filter(l =>
    l.linkedObjectId === entityId &&
    l.linkedObjectType === 'entity' &&
    l.status === 'active'
  );
}

export function getFirmDirectLinks() {
  return S.links.filter(l =>
    l.linkedObjectId === S.firmId &&
    l.linkedObjectType === 'firm' &&
    l.status === 'active'
  );
}

export function addIndividualToState(individual) {
  const existing = S.individuals.findIndex(i => i.individualId === individual.individualId);

  if (existing >= 0) {
    S.individuals[existing] = individual;
  } else {
    S.individuals.unshift(individual);
  }
}

export function addEntityToState(entity) {
  const existing = S.entities.findIndex(e => e.entityId === entity.entityId);

  if (existing >= 0) {
    S.entities[existing] = entity;
  } else {
    S.entities.unshift(entity);
  }
}

export function addLinkToState(link) {
  const existing = S.links.findIndex(l => l.linkId === link.linkId);

  if (existing >= 0) {
    S.links[existing] = link;
  } else {
    S.links.unshift(link);
  }
}
