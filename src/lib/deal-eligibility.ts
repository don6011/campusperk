/**
 * Deal eligibility matching engine.
 * Determines which deals a user can see based on campus, location, role, and scope.
 */

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

  // C) Scope rules
  switch (deal.deal_scope) {
    case "national":
      return { eligible: true };

    case "regional": {
      const effectiveCity = user.userCity || user.campusCity;
      const effectiveState = user.userState || user.campusState;
      const cities = deal.eligible_cities ?? [];
      const regions = deal.eligible_regions ?? [];

      if (regions.length > 0 && effectiveState && regions.some(r => r.toLowerCase() === effectiveState.toLowerCase())) {
        return { eligible: true };
      }
      if (cities.length > 0 && effectiveCity && cities.some(c => c.toLowerCase() === effectiveCity.toLowerCase())) {
        return { eligible: true };
      }
      // If no location data, still show regionals (graceful degradation)
      if (!effectiveCity && !effectiveState) {
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
      const effectiveCity = user.userCity || user.campusCity;
      const effectiveState = user.userState || user.campusState;

      // Campus match
      if (campuses.length > 0 && user.campusId && campuses.includes(user.campusId)) {
        return { eligible: true };
      }

      // City/state match
      if (cities.length > 0 && effectiveCity && cities.some(c => c.toLowerCase() === effectiveCity.toLowerCase())) {
        return { eligible: true };
      }
      if (regions.length > 0 && effectiveState && regions.some(r => r.toLowerCase() === effectiveState.toLowerCase())) {
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
