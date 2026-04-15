// ─── SIMPLEAML PRO — STATE ────────────────────────────────────────────────────
// Single state object S. Synced to Firestore on every save().
// Storage key: pro_v1 (never change — breaks existing sessions)
// State is loaded from Firestore on auth, cached in memory.
// localStorage used only for currentScreen and UI preferences.

import { getFirmProfile, getFirmIndividuals, getFirmEntities, getIndividualLinks } from '../firebase/firestore.js';

// ─── STATE OBJECT ─────────────────────────────────────────────────────────────
export let S = {
  // Session
  currentScreen:  'login',
  currentParams:  {},

  // Auth
  user:           null,   // { uid, email }
  firmId:         null,
  individualId:   null,   // the logged-in user's own INDIVIDUALID

  // Firm
  firm:           null,   // firm_profiles document

  // Data (loaded from Firestore)
  individuals:    [],     // all individuals for this firm
  entities:       [],     // all entities for this firm
  links:          [],     // all links for this firm

  // UI drafts (temp, not persisted to Firestore)
  _draft:         null,

  // Onboarding drafts
  _onboardingFirm:       undefined,
  _onboardingIndividual: undefined,
  _onboardingAustrac:    undefined,
};

// ─── LOAD ─────────────────────────────────────────────────────────────────────
// Called after Firebase Auth confirms user is signed in.
// Loads all firm data from Firestore into memory.

export async function load(uid) {
  // Restore UI state from localStorage
  try {
    const ui = localStorage.getItem('pro_v1_ui');
    if (ui) {
      const parsed = JSON.parse(ui);
      S.currentScreen = parsed.currentScreen || 'dashboard';
      S.currentParams = parsed.currentParams || {};
    }
  } catch (e) {}

  // Derive firmId from uid
  const firmId = 'firm_' + uid;
  S.firmId     = firmId;

  // Load firm profile
  try {
    const firmProfile = await getFirmProfile(firmId);
    if (firmProfile) {
      S.firm = firmProfile;

      // Load individuals
      S.individuals = await getFirmIndividuals(firmId);

      // Load entities
      S.entities = await getFirmEntities(firmId);

      // Load links for all individuals
      const allLinks = [];
      for (const ind of S.individuals) {
        const indLinks = await getIndividualLinks(ind.individualId);
        allLinks.push(...indLinks);
      }
      // Deduplicate
      const seen = new Set();
      S.links = allLinks.filter(l => {
        if (seen.has(l.linkId)) return false;
        seen.add(l.linkId);
        return true;
      });
    }
  } catch (e) {
    console.error('Error loading firm data:', e);
  }

  // Set the owner's individualId
  S.individualId = 'ind_' + uid;
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────
// Saves UI state to localStorage only.
// Firestore writes happen explicitly via firestore.js helpers.
// This keeps save() fast and synchronous — same feel as the free app.

export function save() {
  try {
    localStorage.setItem('pro_v1_ui', JSON.stringify({
      currentScreen:  S.currentScreen,
      currentParams:  S.currentParams,
      // Persist onboarding drafts locally so refresh doesn't lose them
      _onboardingFirm:       S._onboardingFirm,
      _onboardingIndividual: S._onboardingIndividual,
      _onboardingAustrac:    S._onboardingAustrac,
    }));
  } catch (e) {}
}

// ─── RESET ────────────────────────────────────────────────────────────────────
// Called on sign out. Clears all state.

export function reset() {
  S = {
    currentScreen:  'login',
    currentParams:  {},
    user:           null,
    firmId:         null,
    individualId:   null,
    firm:           null,
    individuals:    [],
    entities:       [],
    links:          [],
    _draft:         null,
  };
  try { localStorage.removeItem('pro_v1_ui'); } catch (e) {}
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Get individual by ID from in-memory state
export function getIndividual(individualId) {
  return S.individuals.find(i => i.individualId === individualId) || null;
}

// Get entity by ID from in-memory state
export function getEntity(entityId) {
  return S.entities.find(e => e.entityId === entityId) || null;
}

// Get all active links for an individual
export function getLinksForIndividual(individualId) {
  return S.links.filter(l => l.individualId === individualId && l.status === 'active');
}

// Get all active links for an entity
export function getLinksForEntity(entityId) {
  return S.links.filter(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active');
}

// Get all active links for the firm directly
export function getFirmDirectLinks() {
  return S.links.filter(l => l.linkedObjectId === S.firmId && l.linkedObjectType === 'firm' && l.status === 'active');
}

// Add individual to in-memory state
export function addIndividualToState(individual) {
  const existing = S.individuals.findIndex(i => i.individualId === individual.individualId);
  if (existing >= 0) {
    S.individuals[existing] = individual;
  } else {
    S.individuals.unshift(individual);
  }
}

// Add entity to in-memory state
export function addEntityToState(entity) {
  const existing = S.entities.findIndex(e => e.entityId === entity.entityId);
  if (existing >= 0) {
    S.entities[existing] = entity;
  } else {
    S.entities.unshift(entity);
  }
}

// Add link to in-memory state
export function addLinkToState(link) {
  const existing = S.links.findIndex(l => l.linkId === link.linkId);
  if (existing >= 0) {
    S.links[existing] = link;
  } else {
    S.links.unshift(link);
  }
}
