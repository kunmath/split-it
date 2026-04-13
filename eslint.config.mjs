import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [{ ignores: ["convex/_generated/**"] }, ...nextVitals, ...nextTypeScript];

export default eslintConfig;
