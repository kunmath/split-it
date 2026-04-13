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

export function buildAuthRedirectHref(pathname: "/sign-in" | "/sign-up", redirectPath?: string | null) {
  const safeRedirectPath = getSafeRedirectPath(redirectPath);

  if (!safeRedirectPath) {
    return pathname;
  }

  return `${pathname}?redirect_url=${encodeURIComponent(safeRedirectPath)}`;
}
