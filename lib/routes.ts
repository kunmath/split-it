export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  groups: "/groups",
  friends: "/friends",
  activity: "/activity",
  account: "/account",
  signIn: "/sign-in",
  signUp: "/sign-up",
  ssoCallback: "/sso-callback",
  onboardingProfile: "/onboarding/profile",
} as const;

export const PROTECTED_ROUTE_MATCHERS = [
  `${ROUTES.dashboard}(.*)`,
  `${ROUTES.groups}(.*)`,
  `${ROUTES.friends}(.*)`,
  `${ROUTES.activity}(.*)`,
  `${ROUTES.account}(.*)`,
  `${ROUTES.onboardingProfile}(.*)`,
] as const;

export const DASHBOARD_CREATE_GROUP_HREF = `${ROUTES.dashboard}?create=1`;

export function groupPath(groupId: string) {
  return `${ROUTES.groups}/${groupId}`;
}

export function groupSettingsPath(groupId: string) {
  return `${groupPath(groupId)}/settings`;
}

export function groupExpenseNewPath(groupId: string) {
  return `${groupPath(groupId)}/expenses/new`;
}

export function groupExpenseEditPath(groupId: string, expenseId: string) {
  return `${groupPath(groupId)}/expenses/${expenseId}/edit`;
}

export function inviteAcceptPath(token: string) {
  return `/invites/${token}`;
}
