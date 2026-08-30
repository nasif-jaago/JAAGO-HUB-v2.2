/**
 * Centralized Typed Actions for JAAGO HUB Authorization Engine (CASL)
 * Strict exhaustive union across all functional domains.
 */

export const ACTIONS = [
  'manage',   // Full wildcard administrative privilege on subject
  'read',     // View/query/read single or list of records
  'create',   // Create/provision a new record
  'update',   // Modify/edit an existing record
  'delete',   // Remove/archive/hard-delete a record
  'approve',  // Authorize/approve a workflow request (Leave, On-Duty, PO, Budget)
  'reject',   // Reject/decline a workflow request
  'process',  // Run automated operations (e.g. Payroll batch calculation)
  'submit',   // Submit self-service request for review
  'cancel',   // Cancel a pending request
  'export',   // Download/export reports/CSV data
  'import',   // Upload/bulk-import spreadsheets
  'assign',   // Assign roles, supervisors, shifts, or teams
  'transfer', // Reallocate budget, employee department, or inventory asset
  'adjust',   // Adjust balance/quota/manual attendance punch
] as const;

export type AppAction = typeof ACTIONS[number];

export function isAppAction(val: string): val is AppAction {
  return (ACTIONS as readonly string[]).includes(val);
}
