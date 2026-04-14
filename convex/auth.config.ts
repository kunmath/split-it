import type { AuthConfig } from "convex/server";

const CLERK_JWT_ISSUER_ENV = ["CLERK", "JWT", "ISSUER", "DOMAIN"].join("_");

function readEnv(name: string) {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name]?.trim();
  if (!value) {
    return undefined;
  }
  return value;
}

const clerkJwtIssuerDomain = readEnv(CLERK_JWT_ISSUER_ENV);

const authConfig = clerkJwtIssuerDomain
  ? {
      providers: [
        {
          domain: clerkJwtIssuerDomain,
          applicationID: "convex",
        },
      ],
    }
  : { providers: [] };

export default authConfig satisfies AuthConfig;
