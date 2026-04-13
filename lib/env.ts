export type PlaceholderMode = "mock" | "live";

const PLACEHOLDER_CLERK_JWT_ISSUER_DOMAIN = "https://placeholder.invalid";

export type EnvSnapshot = {
  appUrl: string;
  clerkPublishableKey?: string;
  clerkSecretKey?: string;
  clerkJwtIssuerDomain?: string;
  convexUrl?: string;
  convexDeployment?: string;
  hasClerkClientKey: boolean;
  isClerkConfigured: boolean;
  isConvexConfigured: boolean;
  isAuthBridgeConfigured: boolean;
  placeholderMode: PlaceholderMode;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value || value === PLACEHOLDER_CLERK_JWT_ISSUER_DOMAIN) {
    return undefined;
  }
  return value;
}

export function getEnvSnapshot(): EnvSnapshot {
  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  const clerkPublishableKey = readEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  const clerkSecretKey = readEnv("CLERK_SECRET_KEY");
  const clerkJwtIssuerDomain = readEnv("CLERK_JWT_ISSUER_DOMAIN");
  const convexUrl = readEnv("NEXT_PUBLIC_CONVEX_URL");
  const convexDeployment = readEnv("CONVEX_DEPLOYMENT");

  const hasClerkClientKey = Boolean(clerkPublishableKey);
  const isClerkConfigured = Boolean(clerkPublishableKey && clerkSecretKey);
  const isConvexConfigured = Boolean(convexUrl || convexDeployment);
  const isAuthBridgeConfigured = Boolean(clerkPublishableKey && clerkSecretKey && clerkJwtIssuerDomain && convexUrl);

  return {
    appUrl,
    clerkPublishableKey,
    clerkSecretKey,
    clerkJwtIssuerDomain,
    convexUrl,
    convexDeployment,
    hasClerkClientKey,
    isClerkConfigured,
    isConvexConfigured,
    isAuthBridgeConfigured,
    placeholderMode: isAuthBridgeConfigured ? "live" : "mock",
  };
}
