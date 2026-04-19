export const GROUP_MEMBER_ROLE = {
  OWNER: "owner",
  MEMBER: "member",
} as const;
export type GroupMemberRole = (typeof GROUP_MEMBER_ROLE)[keyof typeof GROUP_MEMBER_ROLE];

export const MEMBERSHIP_STATUS = {
  ACTIVE: "active",
  INVITED: "invited",
} as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

export const INVITE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
} as const;
export type InviteStatus = (typeof INVITE_STATUS)[keyof typeof INVITE_STATUS];

export const EXPENSE_KIND = {
  EXPENSE: "expense",
  SETTLEMENT: "settlement",
} as const;
export type ExpenseKind = (typeof EXPENSE_KIND)[keyof typeof EXPENSE_KIND];

export const EXPENSE_SPLIT_TYPE = {
  EQUAL: "equal",
  EXACT: "exact",
} as const;
export type ExpenseSplitType = (typeof EXPENSE_SPLIT_TYPE)[keyof typeof EXPENSE_SPLIT_TYPE];
