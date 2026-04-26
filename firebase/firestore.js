// ─── SIMPLEAML PRO — FIRESTORE HELPERS ───────────────────────────────────────
// All Firestore read/write operations live here.
// Screens import from this file — never call Firestore directly from screens.
// This abstraction means switching databases later only requires changes here.

import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs,
  query, where, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { app } from './config.js';

const db = getFirestore(app);

// ─── FIRM PROFILES ────────────────────────────────────────────────────────────

export async function saveFirmProfile(firmId, data) {
  await setDoc(doc(db, 'firm_profiles', firmId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getFirmProfile(firmId) {
  const snap = await getDoc(doc(db, 'firm_profiles', firmId));
  return snap.exists() ? snap.data() : null;
}

export async function updateFirmProfile(firmId, fields) {
  await updateDoc(doc(db, 'firm_profiles', firmId), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

// ─── FIRM USERS ───────────────────────────────────────────────────────────────
// One record per authenticated user. Maps uid → firmId + individualId.
// Created during onboarding (complete.js). Used by load() in state/index.js.
// Foundation for multi-user: additional staff members will each get their own
// firm_users record pointing to the same firmId.

export async function saveFirmUser(uid, data) {
  await setDoc(doc(db, 'firm_users', uid), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getFirmUser(uid) {
  const snap = await getDoc(doc(db, 'firm_users', uid));
  return snap.exists() ? snap.data() : null;
}

// ─── INDIVIDUALS ──────────────────────────────────────────────────────────────

export async function saveIndividual(individualId, data) {
  await setDoc(doc(db, 'individuals', individualId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getIndividual(individualId) {
  const snap = await getDoc(doc(db, 'individuals', individualId));
  return snap.exists() ? snap.data() : null;
}

export async function updateIndividual(individualId, fields) {
  await updateDoc(doc(db, 'individuals', individualId), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

export async function getFirmIndividuals(firmId) {
  const q    = query(collection(db, 'individuals'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ─── ENTITIES ─────────────────────────────────────────────────────────────────

export async function saveEntity(entityId, data) {
  await setDoc(doc(db, 'entities', entityId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getEntity(entityId) {
  const snap = await getDoc(doc(db, 'entities', entityId));
  return snap.exists() ? snap.data() : null;
}

export async function updateEntity(entityId, fields) {
  await updateDoc(doc(db, 'entities', entityId), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

export async function getFirmEntities(firmId) {
  const q    = query(collection(db, 'entities'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ─── LINKS ────────────────────────────────────────────────────────────────────

export async function saveLink(linkId, data) {
  await setDoc(doc(db, 'links', linkId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getLink(linkId) {
  const snap = await getDoc(doc(db, 'links', linkId));
  return snap.exists() ? snap.data() : null;
}

export async function updateLink(linkId, fields) {
  await updateDoc(doc(db, 'links', linkId), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

export async function getIndividualLinks(individualId) {
  const q    = query(collection(db, 'links'), where('individualId', '==', individualId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getFirmLinks(firmId) {
  const q    = query(collection(db, 'links'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getEntityLinks(entityId) {
  const q    = query(
    collection(db, 'links'),
    where('linkedObjectId', '==', entityId),
    where('linkedObjectType', '==', 'entity')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ─── COMPLIANCE EVIDENCE ──────────────────────────────────────────────────────

export async function saveVerification(data) {
  const ref = doc(collection(db, 'verifications'));
  const id  = ref.id;
  await setDoc(ref, {
    verificationId: id,
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getIndividualVerifications(individualId, firmId) {
  const q    = query(
    collection(db, 'verifications'),
    where('individualId', '==', individualId),
    where('firmId', '==', firmId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getFirmVerifications(firmId) {
  const q    = query(collection(db, 'verifications'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function saveScreening(data) {
  const ref = doc(collection(db, 'screenings'));
  const id  = ref.id;
  await setDoc(ref, {
    screeningId: id,
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getIndividualScreenings(individualId, firmId) {
  const q    = query(
    collection(db, 'screenings'),
    where('individualId', '==', individualId),
    where('firmId', '==', firmId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getFirmScreenings(firmId) {
  const q    = query(collection(db, 'screenings'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function saveTrainingRecord(data) {
  const ref = doc(collection(db, 'training_records'));
  const id  = ref.id;
  await setDoc(ref, {
    trainingId: id,
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getIndividualTraining(individualId, firmId) {
  const q    = query(
    collection(db, 'training_records'),
    where('individualId', '==', individualId),
    where('firmId', '==', firmId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getFirmTrainingRecords(firmId) {
  const q    = query(collection(db, 'training_records'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function saveVettingRecord(data) {
  const ref = doc(collection(db, 'vetting_records'));
  const id  = ref.id;
  await setDoc(ref, {
    vettingId: id,
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getIndividualVetting(individualId, firmId) {
  const q    = query(
    collection(db, 'vetting_records'),
    where('individualId', '==', individualId),
    where('firmId', '==', firmId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getFirmVettingRecords(firmId) {
  const q    = query(collection(db, 'vetting_records'), where('firmId', '==', firmId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ─── SMR ──────────────────────────────────────────────────────────────────────

export async function saveSMR(data) {
  const ref = doc(collection(db, 'smrs'));
  const id  = ref.id;
  await setDoc(ref, {
    smrId: id,
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getSMR(smrId) {
  const snap = await getDoc(doc(db, 'smrs', smrId));
  return snap.exists() ? snap.data() : null;
}

export async function updateSMR(smrId, fields) {
  await updateDoc(doc(db, 'smrs', smrId), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

export async function getFirmSMRs(firmId) {
  const q    = query(
    collection(db, 'smrs'),
    where('firmId', '==', firmId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

export async function saveAuditEntry(data) {
  const ref = doc(collection(db, 'audit_log'));
  await setDoc(ref, {
    logId: ref.id,
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  });
  return ref.id;
}

export async function getFirmAuditLog(firmId, limitCount = 50) {
  const q    = query(
    collection(db, 'audit_log'),
    where('firmId', '==', firmId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getIndividualAuditLog(firmId, individualId) {
  const q    = query(
    collection(db, 'audit_log'),
    where('firmId', '==', firmId),
    where('targetId', '==', individualId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getEntityAuditLog(firmId, entityId) {
  const q    = query(
    collection(db, 'audit_log'),
    where('firmId', '==', firmId),
    where('targetId', '==', entityId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ─── ID GENERATOR ─────────────────────────────────────────────────────────────

export function genId(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}
