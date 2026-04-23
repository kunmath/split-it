import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel";

export const GROUP_ICON_KEYS = [
  "home",
  "plane",
  "utensils",
  "cart",
  "mountain",
  "fuel",
] as const;

export type GroupIconKey = (typeof GROUP_ICON_KEYS)[number];

export const groupIconKeyValidator = v.union(
  v.literal("home"),
  v.literal("plane"),
  v.literal("utensils"),
  v.literal("cart"),
  v.literal("mountain"),
  v.literal("fuel"),
);

function isGroupIconKey(value: string | undefined): value is GroupIconKey {
  return value !== undefined && GROUP_ICON_KEYS.includes(value as GroupIconKey);
}

export function getDefaultGroupIconKey(seed: string): GroupIconKey {
  const total = Array.from(seed).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );

  return GROUP_ICON_KEYS[total % GROUP_ICON_KEYS.length] ?? "home";
}

export function resolveGroupIconKey(
  group: Pick<Doc<"groups">, "iconKey" | "name">,
): GroupIconKey {
  return isGroupIconKey(group.iconKey)
    ? group.iconKey
    : getDefaultGroupIconKey(group.name);
}
