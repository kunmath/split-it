export function looksLikeConvexId(value: string) {
  return /^[a-z0-9]{32}$/.test(value);
}
