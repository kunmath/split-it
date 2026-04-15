import { ConvexError } from "convex/values";

const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const INVITE_EMAIL_FROM_ENV = "INVITE_EMAIL_FROM";
const APP_URL_ENV = "NEXT_PUBLIC_APP_URL";

function readEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function normalizeAppUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getInviteBaseUrl() {
  const appUrl = readEnv(APP_URL_ENV);

  return appUrl ? normalizeAppUrl(appUrl) : undefined;
}

export function isInviteEmailEnabled() {
  return Boolean(
    readEnv(RESEND_API_KEY_ENV) &&
      readEnv(INVITE_EMAIL_FROM_ENV) &&
      getInviteBaseUrl(),
  );
}

export function requireInviteEmailConfig() {
  const apiKey = readEnv(RESEND_API_KEY_ENV);
  const from = readEnv(INVITE_EMAIL_FROM_ENV);
  const appUrl = getInviteBaseUrl();

  if (!appUrl) {
    throw new ConvexError("NEXT_PUBLIC_APP_URL must be configured for invite links");
  }

  if (!apiKey || !from) {
    throw new ConvexError("Invite email delivery is not configured");
  }

  return {
    apiKey,
    from,
    appUrl,
  };
}

export function buildInviteUrl(token: string, appUrl = getInviteBaseUrl()) {
  if (!appUrl) {
    throw new ConvexError("NEXT_PUBLIC_APP_URL must be configured for invite links");
  }

  return `${appUrl}/invites/${token}`;
}
