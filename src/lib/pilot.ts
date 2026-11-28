// SPDX-License-Identifier: AGPL-3.0-or-later
// The hosted pilot's application window. The site rebuilds every six
// hours, so the home page notice comes down and the pilot page closes
// within a few hours of the deadline without a commit.

/** End of January 31, 2027, Pacific time. */
export const PILOT_DEADLINE = new Date('2027-02-01T08:00:00Z');
export const PILOT_DEADLINE_TEXT = 'January 31, 2027';

export function pilotOpen(now: Date = new Date()): boolean {
  return now < PILOT_DEADLINE;
}
