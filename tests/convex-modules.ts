/// <reference types="vite/client" />

// convex-test needs the bundled Convex function modules to run them in-memory.
export const modules = import.meta.glob([
  "../convex/**/*.{js,ts}",
  "!../convex/**/*.d.ts",
]);
