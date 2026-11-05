// Import the TypeScript source directly so Turbopack bundles this browser-safe
// helper as an ESM module instead of reading the shared package's CommonJS build.
export { DEFAULT_AUTH_REDIRECT, getSafeRedirectPath } from '../../../../packages/shared/src/safeRedirect';
