import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/auth-redirect";

function hasClerkKeys() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim(),
  );
}

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/groups(.*)",
  "/friends(.*)",
  "/activity(.*)",
  "/account(.*)",
]);
const isAuthRoute = createRouteMatcher([`${SIGN_IN_PATH}(.*)`, `${SIGN_UP_PATH}(.*)`]);

const clerkHandler = clerkMiddleware(
  async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
    }

    if (isAuthRoute(request)) {
      const { userId } = await auth();

      if (userId) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
  },
  {
    signInUrl: SIGN_IN_PATH,
    signUpUrl: SIGN_UP_PATH,
  },
);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasClerkKeys()) {
    return NextResponse.next();
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
