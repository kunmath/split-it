import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEnvSnapshot } from "@/lib/env";

export default async function HomePage() {
  const env = getEnvSnapshot();

  if (!env.isClerkConfigured) {
    redirect("/dashboard");
  }

  const { userId } = await auth();
  redirect(userId ? "/dashboard" : "/sign-in");
}
