// ─── ENTITY DETAIL ROUTER ─────────────────────────────────────────────────────
// Delegates to detail_individual.js or detail_entity.js based on entity type.
// Uses static imports so screen() stays synchronous — required by render loop.

import { S }                          from '../../state/index.js';
import { screen as indScreen }        from './detail_individual.js';
import { screen as entityScreen }     from './detail_entity.js';

const PERSON_TYPES = ['Individual', 'Sole Trader'];

export function screen() {
  const { entityId } = S.currentParams || {};
  const entity = (S.entities || []).find(e => e.entityId === entityId);

  if (!entity) return entityScreen(); // detail_entity shows not-found state

  return PERSON_TYPES.includes(entity.entityType)
    ? indScreen()
    : entityScreen();
}
