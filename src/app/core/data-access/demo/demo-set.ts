import type { LogbookBundle, User } from '../../models/logbook.models';
import { createDemoLogbook } from './demo-logbook';
import { createExtraDemoLogbooks } from './demo-extras';

/** Everything a new user gets: one detailed logbook plus a spread of smaller ones. */
export function createDemoLogbooks(user: User, now = new Date()): LogbookBundle[] {
  return [createDemoLogbook(user, now), ...createExtraDemoLogbooks(user, now)];
}
