import { TRAINING } from './cards/training.js';
import { LOCKER } from './cards/locker.js';
import { BUSINESS } from './cards/business.js';
import { PUBLIC } from './cards/public.js';
import { PERSONAL } from './cards/personal.js';
import { MATCH } from './cards/match.js';
import { SPECIAL } from './cards/special.js';

export const EVENTS = [...TRAINING, ...LOCKER, ...BUSINESS, ...PUBLIC, ...PERSONAL, ...MATCH, ...SPECIAL];

const BY_ID = new Map(EVENTS.map(event => [event.id, event]));

export function findEvent(id) {
  return BY_ID.get(id);
}
