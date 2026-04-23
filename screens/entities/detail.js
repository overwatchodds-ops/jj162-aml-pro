// ─── ENTITY DETAIL ROUTER ─────────────────────────────────────────────────────
// Delegates to detail_individual.js or detail_entity.js based on entity type.
// Uses static imports so screen() stays synchronous — required by render loop.

import { S }                      from '../../state/index.js';
import { screen as indScreen }    from './detail_individual.js';
import { screen as entityScreen } from './detail_entity.js';

const PERSON_TYPES = ['Individual', 'Sole Trader'];

export function screen() {
  const { entityId, isNew, entityType: newType } = S.currentParams || {};

  // New mode — check draft or param for type
  if (isNew && !entityId) {
    const etype = newType || S._draft?.entityType || '';
    return PERSON_TYPES.includes(etype) ? indScreen() : entityScreen();
  }

  const entity = (S.entities || []).find(e => e.entityId === entityId);

  // No entity found — show not-found via entity screen
  if (!entity) return entityScreen();

  return PERSON_TYPES.includes(entity.entityType)
    ? indScreen()
    : entityScreen();
}
