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

  // UI drafts
  _draft:         null,

  // Onboarding drafts
  _onboardingFirm:       undefined,
  _onboardingIndividual: undefined,
  _onboardingAustrac:    undefined,
};

// ─── LOAD ─────────────────────────────────────────────────────────────────────

export async function load(uid) {
  try {
    const ui = localStorage.getItem('pro_v1_ui');
    if (ui) {
      const parsed = JSON.parse(ui);
      S.currentScreen          = parsed.currentScreen || 'dashboard';
      S.currentParams          = parsed.currentParams || {};
      S._onboardingFirm        = parsed._onboardingFirm;
      S._onboardingIndividual  = parsed._onboardingIndividual;
      S._onboardingAustrac     = parsed._onboardingAustrac;
    }
  } catch (e) {}

  const firmId = 'firm_' + uid;
  S.firmId     = firmId;

  try {
    const firmProfile = await getFirmProfile(firmId);

    // reset collections before reload
    S.firm          = firmProfile || null;
    S.individuals   = [];
    S.entities      = [];
    S.links         = [];
    S.verifications = [];
    S.screenings    = [];
    S.training      = [];
    S.vetting       = [];

    if (firmProfile) {
      S.individuals = await getFirmIndividuals(firmId);
      S.entities    = await getFirmEntities(firmId);

      const allLinks = [];
      for (const ind of S.individuals) {
        const indLinks = await getIndividualLinks(ind.individualId);
        allLinks.push(...indLinks);
      }

      const seen = new Set();
      S.links = allLinks.filter(l => {
        if (seen.has(l.linkId)) return false;
        seen.add(l.linkId);
        return true;
      });

      // load compliance evidence as firm-wide collections
      S.verifications = await getFirmVerifications(firmId);
      S.screenings    = await getFirmScreenings(firmId);
      S.training      = await getFirmTrainingRecords(firmId);
      S.vetting       = await getFirmVettingRecords(firmId);
    }
  } catch (e) {
    console.error('Error loading firm data:', e);
  }

  S.individualId = 'ind_' + uid;
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
  } catch (e) {}
}

// ─── RESET ────────────────────────────────────────────────────────────────────

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
    verifications:  [],
    screenings:     [],
    training:       [],
    vetting:        [],
    _draft:         null,
    _onboardingFirm:       undefined,
    _onboardingIndividual: undefined,
    _onboardingAustrac:    undefined,
  };
  try { localStorage.removeItem('pro_v1_ui'); } catch (e) {}
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
  return S.links.filter(l => l.linkedObjectId === entityId && l.linkedObjectType === 'entity' && l.status === 'active');
}

export function getFirmDirectLinks() {
  return S.links.filter(l => l.linkedObjectId === S.firmId && l.linkedObjectType === 'firm' && l.status === 'active');
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
