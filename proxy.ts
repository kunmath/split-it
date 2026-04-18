import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/groups(.*)",
  "/friends(.*)",
  "/activity(.*)",
  "/account(.*)",
  "/onboarding/profile(.*)",
]);

const liveProxy = clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  await auth.protect();
  return NextResponse.next();
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();
  const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN?.trim();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

  if (!clerkPublishableKey || !clerkSecretKey || !clerkJwtIssuerDomain || !convexUrl) {
    return NextResponse.next();
  }

  return liveProxy(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|webp|ico|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
