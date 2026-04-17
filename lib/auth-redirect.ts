export const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";
export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";

export function getSafeRedirectPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const parsed = new URL(value, "https://split-it.local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function buildAuthRedirectHref(
  pathname: typeof SIGN_IN_PATH | typeof SIGN_UP_PATH,
  redirectPath?: string | null,
) {
  const safeRedirectPath = getSafeRedirectPath(redirectPath);

  if (!safeRedirectPath) {
    return pathname;
  }

  return `${pathname}?redirect_url=${encodeURIComponent(safeRedirectPath)}`;
}
