export type PlaceholderMode = "mock" | "live";

export type EnvSnapshot = {
  appUrl: string;
  clerkPublishableKey?: string;
  clerkSecretKey?: string;
  convexUrl?: string;
  convexDeployment?: string;
  hasClerkClientKey: boolean;
  isClerkConfigured: boolean;
  isConvexConfigured: boolean;
  placeholderMode: PlaceholderMode;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getEnvSnapshot(): EnvSnapshot {
  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  const clerkPublishableKey = readEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  const clerkSecretKey = readEnv("CLERK_SECRET_KEY");
  const convexUrl = readEnv("NEXT_PUBLIC_CONVEX_URL");
  const convexDeployment = readEnv("CONVEX_DEPLOYMENT");

  const hasClerkClientKey = Boolean(clerkPublishableKey);
  const isClerkConfigured = Boolean(clerkPublishableKey && clerkSecretKey);
  const isConvexConfigured = Boolean(convexUrl || convexDeployment);

  return {
    appUrl,
    clerkPublishableKey,
    clerkSecretKey,
    convexUrl,
    convexDeployment,
    hasClerkClientKey,
    isClerkConfigured,
    isConvexConfigured,
    placeholderMode: isClerkConfigured && isConvexConfigured ? "live" : "mock",
  };
}
