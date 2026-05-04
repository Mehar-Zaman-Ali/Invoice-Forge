/**
 * Deployment mode for InvoiceForge.
 *
 * `true` — single operator: no accounts, roles, `/admin`, or session auth.
 * All API routes serve the shared database as one workspace.
 *
 * When you add multi-user support, set this to `false` and wire auth + optional
 * admin routes (see commented template in `server/index.ts`).
 */
export const SINGLE_USER_MODE = true as const;
