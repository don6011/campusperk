/**
 * Deal eligibility matching engine.
 * Determines which deals a user can see based on campus, location, role, and scope.
 */

import { citiesMatch, statesMatch, toStateCode } from "./state-codes";

export interface UserEligibility {
  campusVerified: boolean;
  campusRole: string | null;
  campusRoleStatus: string;
  campusId: string | null;
  campusCity: string | null;
  campusState: string | null;
  userCity: string | null;
  userState: string | null;
  locationOptIn: boolean;
  isPremium: boolean;
  useCampusLocation: boolean;
}

export interface DealEligibilityFields {
  deal_scope: string;
  requires_campus_verification: boolean;
  requires_role_verification?: boolean;
  eligible_roles: string[] | null;
  eligible_campuses: string[] | null;
  eligible_cities: string[] | null;
  eligible_regions: string[] | null;
}

export type EligibilityResult = {
  eligible: boolean;
  reason?: string;
};

/**
 * Resolve the effective city/state for a user based on preference flags.
 *
 * Priority:
 * 1) If use_campus_location AND campus data present → campus
 * 2) Else if user_city/user_state present → user-provided
 * 3) Else → null (no local matching)
 */
export function resolveLocation(user: Pick<UserEligibility, "useCampusLocation" | "campusCity" | "campusState" | "userCity" | "userState">): {
  city: string | null;
  state: string | null;
  source: "campus" | "user" | "none";
} {
  if (user.useCampusLocation && (user.campusCity || user.campusState)) {
    return { city: user.campusCity, state: user.campusState, source: "campus" };
  }
  if (user.userCity || user.userState) {
    return { city: user.userCity, state: user.userState, source: "user" };
  }
  // Fallback: try campus even when flag is off (graceful degradation)
  if (user.campusCity || user.campusState) {
    return { city: user.campusCity, state: user.campusState, source: "campus" };
  }
  return { city: null, state: null, source: "none" };
}

export function checkDealEligibility(
  deal: DealEligibilityFields,
  user: UserEligibility
): EligibilityResult {
  // A) Campus verification gate
  if (deal.requires_campus_verification) {
    if (!user.campusVerified || user.campusRoleStatus !== "verified") {
      return { eligible: false, reason: "Campus verification required" };
    }
  }

  // B) Role eligibility
  const roles = deal.eligible_roles;
  if (roles && roles.length > 0) {
    if (!user.campusRole || !roles.includes(user.campusRole)) {
      return { eligible: false, reason: `Available to: ${roles.join(", ")}` };
    }
  }

  const loc = resolveLocation(user);

  // C) Scope rules
  switch (deal.deal_scope) {
    case "national":
      return { eligible: true };

    case "regional": {
      const cities = deal.eligible_cities ?? [];
      const regions = deal.eligible_regions ?? [];

      if (regions.length > 0 && loc.state && regions.some(r => statesMatch(r, loc.state))) {
        return { eligible: true };
      }
      if (cities.length > 0 && loc.city && cities.some(c => citiesMatch(c, loc.city))) {
        return { eligible: true };
      }
      // If no location data, still show regionals (graceful degradation)
      if (!loc.city && !loc.state) {
        return { eligible: true };
      }
      return { eligible: false, reason: "Not available in your region" };
    }

    case "local": {
      if (!user.locationOptIn) {
        return { eligible: false, reason: "Enable local deals to see this offer" };
      }

      const campuses = deal.eligible_campuses ?? [];
      const cities = deal.eligible_cities ?? [];
      const regions = deal.eligible_regions ?? [];

      // Campus match
      if (campuses.length > 0 && user.campusId && campuses.includes(user.campusId)) {
        return { eligible: true };
      }

      // City/state match using normalized comparison
      if (cities.length > 0 && loc.city && cities.some(c => citiesMatch(c, loc.city))) {
        return { eligible: true };
      }
      if (regions.length > 0 && loc.state && regions.some(r => statesMatch(r, loc.state))) {
        return { eligible: true };
      }

      return { eligible: false, reason: "Not available near your campus" };
    }

    default:
      return { eligible: true };
  }
}

/** Get the scope badge label for display */
export function scopeLabel(scope: string): { label: string; color: string } {
  switch (scope) {
    case "local":
      return { label: "Local", color: "bg-accent/15 text-accent border-accent/30" };
    case "regional":
      return { label: "Regional", color: "bg-primary/15 text-primary border-primary/30" };
    case "national":
    default:
      return { label: "National", color: "bg-secondary text-muted-foreground border-border" };
  }
}
