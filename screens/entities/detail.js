// ─── ENTITY DETAIL ROUTER ─────────────────────────────────────────────────────
// Delegates to detail_individual.js or detail_entity.js based on entity type.
// app.html routes 'entity-detail' here — no changes needed in the router.

import { S } from '../../state/index.js';

const PERSON_TYPES = ['Individual', 'Sole Trader'];

export async function screen() {
  const { entityId } = S.currentParams || {};
  const entity = (S.entities || []).find(e => e.entityId === entityId);

  if (!entity) {
    // Unknown entity — fall through to entity screen which shows not-found state
    const { screen: entityScreen } = await import('./detail_entity.js');
    return entityScreen();
  }

  if (PERSON_TYPES.includes(entity.entityType)) {
    const { screen: indScreen } = await import('./detail_individual.js');
    return indScreen();
  } else {
    const { screen: entityScreen } = await import('./detail_entity.js');
    return entityScreen();
  }
}
