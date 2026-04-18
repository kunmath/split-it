"use client";

import { useAuth } from "@clerk/nextjs";
import { type ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

type ConvexClerkProviderProps = {
  children: ReactNode;
  client: ConvexReactClient;
};

export function ConvexClerkProvider({ children, client }: ConvexClerkProviderProps) {
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
