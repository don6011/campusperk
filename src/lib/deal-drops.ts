/**
 * Surprise Deal Drop utilities.
 * 
 * Drop windows (user-local time):
 *   Morning:   09:00 – 11:00
 *   Afternoon: 13:00 – 16:00
 *   Evening:   19:00 – 22:00
 * 
 * Founding members get 3-hour early access before public release.
 */

export type DropWindow = "morning" | "afternoon" | "evening";

export interface DropWindowConfig {
  label: string;
  startHour: number;
  endHour: number;
}

export const DROP_WINDOWS: Record<DropWindow, DropWindowConfig> = {
  morning:   { label: "Morning Drop",   startHour: 9,  endHour: 11 },
  afternoon: { label: "Afternoon Drop", startHour: 13, endHour: 16 },
  evening:   { label: "Evening Drop",   startHour: 19, endHour: 22 },
};

export const FOUNDING_MEMBER_EARLY_ACCESS_HOURS = 3;

/** Get the ordered list of windows for the day */
const WINDOW_ORDER: DropWindow[] = ["morning", "afternoon", "evening"];

/** Get the current active drop window, or null */
export function getCurrentDropWindow(now = new Date()): DropWindow | null {
  const hour = now.getHours();
  for (const key of WINDOW_ORDER) {
    const w = DROP_WINDOWS[key];
    if (hour >= w.startHour && hour < w.endHour) return key;
  }
  return null;
}

/** Get the next upcoming drop window and its start time */
export function getNextDropWindow(now = new Date()): { window: DropWindow; startsAt: Date } {
  const hour = now.getHours();
  const today = new Date(now);

  for (const key of WINDOW_ORDER) {
    const w = DROP_WINDOWS[key];
    if (hour < w.startHour) {
      today.setHours(w.startHour, 0, 0, 0);
      return { window: key, startsAt: today };
    }
    // If currently in a window, skip to next
    if (hour >= w.startHour && hour < w.endHour) {
      continue;
    }
  }

  // All windows passed today → next is tomorrow morning
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(DROP_WINDOWS.morning.startHour, 0, 0, 0);
  return { window: "morning", startsAt: tomorrow };
}

/** Check if a deal drop is visible to a user based on founding member early access */
export function isDealDropVisible(
  dropTime: string | null,
  isFoundingMember: boolean,
  now = new Date()
): boolean {
  if (!dropTime) return true; // not a timed drop
  const dropDate = new Date(dropTime);
  
  if (isFoundingMember) {
    // Founding members see it 3 hours early
    const earlyDate = new Date(dropDate.getTime() - FOUNDING_MEMBER_EARLY_ACCESS_HOURS * 60 * 60 * 1000);
    return now >= earlyDate;
  }
  
  return now >= dropDate;
}

/** Get early access remaining time in ms (for founding members before public release) */
export function getEarlyAccessTimeRemaining(dropTime: string | null, now = new Date()): number | null {
  if (!dropTime) return null;
  const dropDate = new Date(dropTime);
  const remaining = dropDate.getTime() - now.getTime();
  if (remaining <= 0) return null; // already public
  return remaining;
}

/** Format milliseconds to a human-readable countdown */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
