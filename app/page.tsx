import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEnvSnapshot } from "@/lib/env";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  const env = getEnvSnapshot();

  if (!env.isClerkConfigured) {
    redirect(ROUTES.dashboard);
  }

  const { userId } = await auth();
  redirect(userId ? ROUTES.dashboard : ROUTES.signIn);
}
