export const AVATAR_OPTIONS = [
  {
    key: "mint-orbit",
    label: "Mint Orbit",
    src: "/avatars/mint-orbit.svg",
  },
  {
    key: "sunset-stripe",
    label: "Sunset Stripe",
    src: "/avatars/sunset-stripe.svg",
  },
  {
    key: "ocean-bloom",
    label: "Ocean Bloom",
    src: "/avatars/ocean-bloom.svg",
  },
  {
    key: "ember-grid",
    label: "Ember Grid",
    src: "/avatars/ember-grid.svg",
  },
  {
    key: "cobalt-wave",
    label: "Cobalt Wave",
    src: "/avatars/cobalt-wave.svg",
  },
  {
    key: "graphite-star",
    label: "Graphite Star",
    src: "/avatars/graphite-star.svg",
  },
  {
    key: "amber-step",
    label: "Amber Step",
    src: "/avatars/amber-step.svg",
  },
  {
    key: "jade-checker",
    label: "Jade Checker",
    src: "/avatars/jade-checker.svg",
  },
  {
    key: "coral-loop",
    label: "Coral Loop",
    src: "/avatars/coral-loop.svg",
  },
  {
    key: "steel-petal",
    label: "Steel Petal",
    src: "/avatars/steel-petal.svg",
  },
] as const;

export type AvatarKey = (typeof AVATAR_OPTIONS)[number]["key"];

export function isAvatarKey(value: string): value is AvatarKey {
  return AVATAR_OPTIONS.some((option) => option.key === value);
}

export function getAvatarOption(value: AvatarKey) {
  return AVATAR_OPTIONS.find((option) => option.key === value)!;
}
