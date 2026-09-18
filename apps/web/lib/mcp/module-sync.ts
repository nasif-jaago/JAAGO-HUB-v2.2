import { SupabaseClient } from '@supabase/supabase-js';

export type McpItemCategory = 'core' | 'department' | 'menu' | 'page';

export interface McpItemDef {
  key: string;
  label: string;
  code: string;
  desc: string;
  category: McpItemCategory;
  path?: string;
}

/**
 * ── 1. CANONICAL CORE PLATFORM MODULES ──
 */
export const CORE_MODULES: McpItemDef[] = [
  { key: 'dashboard', label: 'Dashboard & Overview', code: 'DB', desc: 'Overview KPIs, employee profile, and system status', category: 'core', path: '/dashboard' },
  { key: 'attendance', label: 'Attendance & Biometrics', code: 'At', desc: 'Daily punches, shifts, RFID devices, and GPS geofences', category: 'core', path: '/attendance' },
  { key: 'leave', label: 'Time Off / Leaves', code: 'Lv', desc: 'Leave quotas, balances, and holiday calendars', category: 'core', path: '/leaves' },
  { key: 'on_duty', label: 'On-Duty & Travel', code: 'OD', desc: 'Field missions, school visits, and duty logs', category: 'core', path: '/on-duty' },
  { key: 'requests', label: 'Requests Hub & Workflows', code: 'Rq', desc: 'Requisitions, expenses, recruitment, and meeting rooms', category: 'core', path: '/workflows' },
  { key: 'hr', label: 'People & Culture', code: 'PC', desc: 'Employee records, directory, and insurance benefits', category: 'core', path: '/pnc/employees' },
  { key: 'payroll', label: 'JAAGO PAY', code: 'PY', desc: 'Salary structures, payslips, and disbursement summaries', category: 'core', path: '/pnc/payroll' },
  { key: 'finance', label: 'Finance & Accounting', code: 'Fi', desc: 'Invoices, payment vouchers, and budget allocations', category: 'core', path: '/finance' },
  { key: 'procurement', label: 'Procurement & Logistics', code: 'Pr', desc: 'Purchase orders, vendor catalogues, and inventory stock', category: 'core', path: '/admin-procurement' },
  { key: 'organization', label: 'Organization & Structure', code: 'Og', desc: 'Branches, departments, contacts, and KPI appraisals', category: 'core', path: '/organization/department' },
  { key: 'documents', label: 'Documents & Policies', code: 'Dc', desc: 'Compliance repository, SOPs, and governance guidelines', category: 'core', path: '/documents' },
  { key: 'settings', label: 'System Admin & Settings', code: 'St', desc: 'User accounts, RBAC matrices, GPS locations, logs, and SMTP', category: 'core', path: '/admin/control-center' },
  { key: 'contracts', label: 'Contracts & Agreements', code: 'Co', desc: 'Staff agreements, employment contracts, and renewal terms', category: 'core', path: '/pnc/contracts' },
  { key: 'approvals', label: 'Approval Engine', code: 'Ap', desc: 'Workflow authorizations, digital signatures, and signoffs', category: 'core', path: '/workflows' },
  { key: 'reporting', label: 'Reporting & Analytics', code: 'Rp', desc: 'Cross-module audit trails, summaries, and executive metrics', category: 'core', path: '/reports' },
];

/**
 * ── 2. PLATFORM MENUS & NAVIGATION SECTIONS ──
 */
export const PLATFORM_MENUS: McpItemDef[] = [
  { key: 'menu_dashboard', label: 'Menu: My Dashboard', code: 'M-DB', desc: 'Top-level navigation menu for employee dashboard, profile, and quick actions', category: 'menu', path: '/dashboard' },
  { key: 'menu_requests', label: 'Menu: Requests Hub', code: 'M-RQ', desc: 'Navigation menu container for requisitions, approvals, and workflow submissions', category: 'menu', path: '/workflows' },
  { key: 'menu_attendance_leave', label: 'Menu: Attendance & Leave', code: 'M-AL', desc: 'Navigation menu container for attendance logs, leaves, and on-duty missions', category: 'menu', path: '/attendance' },
  { key: 'menu_organization', label: 'Menu: Organization', code: 'M-OG', desc: 'Navigation menu container for team, departmental hierarchies, and staff contacts', category: 'menu', path: '/organization/team' },
  { key: 'menu_departments', label: 'Menu: Departments Section', code: 'M-DP', desc: 'Navigation menu container listing all operational foundation departments', category: 'menu', path: '/workflows' },
  { key: 'menu_settings', label: 'Menu: System Settings', code: 'M-ST', desc: 'Navigation menu container for system administration, users, security, and developer integrations', category: 'menu', path: '/admin/control-center' },
  { key: 'menu_pnc_portal', label: 'Menu: People & Culture Portal', code: 'M-PC', desc: 'Dedicated portal navigation for People & Culture HR administration', category: 'menu', path: '/pnc' },
  { key: 'menu_proc_portal', label: 'Menu: Admin & Procurement Portal', code: 'M-PR', desc: 'Dedicated portal navigation for administrative logistics, warehouses, and purchasing', category: 'menu', path: '/admin-procurement' },
  { key: 'menu_finance_portal', label: 'Menu: Finance Portal', code: 'M-FN', desc: 'Dedicated portal navigation for accounting, payment vouchers, and expense claims', category: 'menu', path: '/finance' },
];

/**
 * ── 3. PLATFORM SUBMENUS & INDIVIDUAL PAGES ──
 */
export const PLATFORM_PAGES: McpItemDef[] = [
  // Dashboard Pages
  { key: 'page_dashboard_overview', label: 'Page: Dashboard Overview', code: 'P-OV', desc: 'Overview KPI tiles, active punch widget, and quick summary', category: 'page', path: '/dashboard' },
  { key: 'page_dashboard_profile', label: 'Page: My Profile', code: 'P-PF', desc: 'Personal employee profile, emergency contacts, and job details', category: 'page', path: '/dashboard/my-profile' },

  // Requests Pages & Submenus
  { key: 'page_requests_all', label: 'Page: All Requests', code: 'P-AR', desc: 'Global workflow tracking list and status history', category: 'page', path: '/workflows' },
  { key: 'page_requests_general', label: 'Page: General Requisition', code: 'P-GR', desc: 'Requisition forms for office supplies, event budgets, and logistics', category: 'page', path: '/requests/general' },
  { key: 'page_requests_purchase', label: 'Page: Purchase Requisition', code: 'P-PR', desc: 'Official procurement requisitions with itemized BOM and pricing', category: 'page', path: '/requests/purchase' },
  { key: 'page_requests_expenses', label: 'Page: Expenses & Advances', code: 'P-EX', desc: 'Employee advance cash requisitions and liquidation settlement claims', category: 'page', path: '/requests/expenses' },
  { key: 'page_requests_meeting_rooms', label: 'Page: Meeting Rooms', code: 'P-MR', desc: 'Conference hall and meeting room calendar scheduling', category: 'page', path: '/meeting-rooms' },
  { key: 'page_requests_payment_voucher', label: 'Page: Payment Voucher', code: 'P-PV', desc: 'Financial disbursement authorizations and voucher settlements', category: 'page', path: '/finance/payment-vouchers' },

  // Attendance & Leave Pages
  { key: 'page_attendance_logs', label: 'Page: Attendance History', code: 'P-AT', desc: 'Personal punch log entries, geofences, and biometric timestamps', category: 'page', path: '/attendance' },
  { key: 'page_leave_my_leaves', label: 'Page: My Leave', code: 'P-LV', desc: 'Leave request submission, pending approvals, and remaining balances', category: 'page', path: '/leaves' },
  { key: 'page_on_duty_missions', label: 'Page: On Duty', code: 'P-OD', desc: 'Field movement tracking, school visits, and duty trip logs', category: 'page', path: '/on-duty' },

  // Organization Pages
  { key: 'page_org_team', label: 'Page: My Team', code: 'P-TM', desc: 'Direct reports, peer directory, and team attendance statuses', category: 'page', path: '/organization/team' },
  { key: 'page_org_department', label: 'Page: My Department', code: 'P-MD', desc: 'Departmental staff directory, leads, and organizational hierarchy', category: 'page', path: '/organization/department' },
  { key: 'page_org_cross_dept', label: 'Page: Cross Department', code: 'P-CD', desc: 'Cross-functional collaborative staff directory and team mapping', category: 'page', path: '/organization/cross-department' },
  { key: 'page_org_contacts', label: 'Page: Staff Contacts', code: 'P-CT', desc: 'Official company phonebook, emails, and emergency contacts', category: 'page', path: '/organization/contacts' },
  { key: 'page_org_on_leave', label: 'Page: Staff On Leave', code: 'P-OL', desc: 'Calendar roster of team members currently away on scheduled leave', category: 'page', path: '/organization/on-leave' },
  { key: 'page_org_performance', label: 'Page: Performance & Appraisals', code: 'P-PA', desc: 'Annual performance evaluations, KPI scorecards, and appraisals', category: 'page', path: '/organization/performance' },

  // System Administration & Settings Pages
  { key: 'page_admin_users', label: 'Page: User Management', code: 'P-UM', desc: 'User credential provisioning, account statuses, and role bindings', category: 'page', path: '/admin/users' },
  { key: 'page_admin_gps', label: 'Page: GPS Coordinates', code: 'P-GP', desc: 'Branch geofence locations, office radiuses, and biometric coordinates', category: 'page', path: '/admin/gps-coordinates' },
  { key: 'page_admin_modules', label: 'Page: Modules Manager', code: 'P-MM', desc: 'Modular app registry, runtime toggle switches, and lifecycle engine', category: 'page', path: '/admin/modules' },
  { key: 'page_admin_studio', label: 'Page: Studio-Lite Builder', code: 'P-SB', desc: 'No-code workflow schema editor and dynamic form designer', category: 'page', path: '/admin/studio' },
  { key: 'page_admin_control_center', label: 'Page: Control Center', code: 'P-CC', desc: 'Server health diagnostics, cache clearing, and environment checks', category: 'page', path: '/admin/control-center' },
  { key: 'page_admin_logs', label: 'Page: System Logs', code: 'P-SL', desc: 'Audit trails, auth events, API exceptions, and database activity', category: 'page', path: '/admin/logs' },
  { key: 'page_admin_api_keys', label: 'Page: API Settings', code: 'P-AK', desc: 'Developer API tokens, webhook configs, and service endpoints', category: 'page', path: '/admin/api-keys' },
  { key: 'page_admin_integrations', label: 'Page: Integrations Hub', code: 'P-IH', desc: 'Third-party integrations, external connectors, and webhook feeds', category: 'page', path: '/admin/integrations' },
  { key: 'page_admin_mcp_server', label: 'Page: MCP', code: 'P-MC', desc: 'Model Context Protocol inbound AI server, agents, tokens, and scopes', category: 'page', path: '/admin/integrations/mcp-server' },
  { key: 'page_admin_rbac', label: 'Page: RBAC Matrix', code: 'P-RB', desc: 'Role-based access control matrix with granular CRUD permissions', category: 'page', path: '/admin/rbac' },
  { key: 'page_admin_email', label: 'Page: Email & SMTP', code: 'P-EM', desc: 'SMTP gateway settings, notification templates, and mail routing', category: 'page', path: '/admin/email' },
  { key: 'page_admin_about', label: 'Page: About JAAGO HUB', code: 'P-AB', desc: 'System version build info, copyright, release notes, and documentation', category: 'page', path: '/admin/about' },

  // People & Culture (P&C) Portal Pages
  { key: 'page_pnc_employees', label: 'Page: P&C Employees Directory', code: 'P-PE', desc: 'Full human capital employee profiles, salary structures, and files', category: 'page', path: '/pnc/employees' },
  { key: 'page_pnc_attendance_logs', label: 'Page: P&C Attendance Logs', code: 'P-PAL', desc: 'Organization-wide biometric punch logs and exception management', category: 'page', path: '/pnc/attendance/logs' },
  { key: 'page_pnc_biotime', label: 'Page: P&C BioTime Device Sync', code: 'P-PBT', desc: 'ZKTeco / BioTime biometric device live sync and attendance push', category: 'page', path: '/pnc/attendance/biotime' },
  { key: 'page_pnc_shifts', label: 'Page: P&C Shifts Scheduling', code: 'P-PSH', desc: 'Work shift rosters, grace period rules, and weekend definitions', category: 'page', path: '/pnc/attendance/shifts' },
  { key: 'page_pnc_time_off', label: 'Page: P&C Time Off Requests', code: 'P-PTO', desc: 'Staff leave review, quota grants, and leave approval hierarchy', category: 'page', path: '/pnc/time-off/requests' },
  { key: 'page_pnc_holidays', label: 'Page: P&C Holiday Calendar', code: 'P-PHL', desc: 'National holidays, organization closure days, and working calendar', category: 'page', path: '/pnc/time-off/holidays' },
  { key: 'page_pnc_payroll', label: 'Page: P&C Payroll Pay Runs', code: 'P-PPY', desc: 'Monthly salary disbursements, tax deductions, and bank exports', category: 'page', path: '/pnc/payroll/pay-runs' },
  { key: 'page_pnc_payslips', label: 'Page: P&C Payslips', code: 'P-PPS', desc: 'PDF payslip generation, salary certificates, and staff delivery', category: 'page', path: '/pnc/payroll/payslips' },
  { key: 'page_pnc_contracts', label: 'Page: P&C Staff Contracts', code: 'P-PCO', desc: 'Probation reviews, contract renewals, and tenure records', category: 'page', path: '/pnc/contracts' },
  { key: 'page_pnc_insurance', label: 'Page: P&C Insurance & Benefits', code: 'P-PIN', desc: 'Health insurance policies, claims tracking, and staff coverage', category: 'page', path: '/pnc/insurance' },
  { key: 'page_pnc_departments', label: 'Page: P&C Departments Setup', code: 'P-PDD', desc: 'Department hierarchy setup, department leads, and code assignments', category: 'page', path: '/pnc/departments' },
  { key: 'page_pnc_designations', label: 'Page: P&C Designations Setup', code: 'P-PDS', desc: 'Job titles, grade bands, and organizational designation roles', category: 'page', path: '/pnc/designations' },

  // Admin & Procurement Portal Pages
  { key: 'page_proc_requests', label: 'Page: Procurement Requisitions', code: 'P-PRQ', desc: 'Purchase requisition intake, specifications, and approvals', category: 'page', path: '/admin-procurement/requests' },
  { key: 'page_proc_orders', label: 'Page: Purchase Orders (PO)', code: 'P-PPO', desc: 'Purchase order generation, vendor contracts, and tracking', category: 'page', path: '/admin-procurement/orders' },
  { key: 'page_proc_inventory', label: 'Page: Inventory & Stock', code: 'P-PINV', desc: 'Warehouse stock balance, asset tagging, and reorder levels', category: 'page', path: '/admin-procurement/inventory' },
  { key: 'page_proc_vendors', label: 'Page: Vendors Registry', code: 'P-PVN', desc: 'Approved vendor directory, tax certifications, and payment terms', category: 'page', path: '/admin-procurement/vendors' },
  { key: 'page_proc_warehouses', label: 'Page: Warehouses & Logistics', code: 'P-PWH', desc: 'Central store locations, regional stock depots, and dispatch logs', category: 'page', path: '/admin-procurement/warehouses' },
  { key: 'page_proc_budgets', label: 'Page: Procurement Budgets', code: 'P-PBG', desc: 'Departmental purchasing budgets, allocations, and expenditures', category: 'page', path: '/admin-procurement/budgets' },
  { key: 'page_proc_reports', label: 'Page: Procurement Reports', code: 'P-PRP', desc: 'Spend analysis, supplier delivery metrics, and audit summaries', category: 'page', path: '/admin-procurement/reports' },

  // Finance & Accounting Portal Pages
  { key: 'page_fin_advances', label: 'Page: Expense Advances', code: 'P-FAD', desc: 'Petty cash advances and travel fund disbursement tracking', category: 'page', path: '/finance/expenses/advance-requests' },
  { key: 'page_fin_liquidations', label: 'Page: Expense Liquidations', code: 'P-FLQ', desc: 'Expense receipt settlements and fund reconciliations', category: 'page', path: '/finance/expenses/liquidations' },
  { key: 'page_fin_reports', label: 'Page: Financial Reports', code: 'P-FRP', desc: 'Balance sheets, general ledger extracts, and donor audits', category: 'page', path: '/finance/reports' },
];

/**
 * ── 4. CANONICAL STANDARD OPERATIONAL DEPARTMENTS ──
 */
export const STANDARD_DEPARTMENTS: McpItemDef[] = [
  { key: 'dept_admin_procurement', label: 'Dept: Admin & Procurement', code: 'AP', desc: 'Procurement requests, inventory logistics, and administrative facilities', category: 'department', path: '/admin-procurement' },
  { key: 'dept_finance_accounting', label: 'Dept: Finance & Accounting', code: 'FA', desc: 'Expense liquidations, payment vouchers, and financial audits', category: 'department', path: '/finance' },
  { key: 'dept_child_welfare', label: 'Dept: Child Welfare', code: 'CW', desc: 'Child sponsorship tracking, student safeguarding, and nutrition programs', category: 'department', path: '/workflows' },
  { key: 'dept_digital_creative', label: 'Dept: Digital & Creative (DKL)', code: 'DK', desc: 'Digital school development, graphic branding, and tech innovation', category: 'department', path: '/workflows' },
  { key: 'dept_founders_office', label: "Dept: Founder's Office (FC)", code: 'FC', desc: 'Strategic governance, high-level directives, and executive briefings', category: 'department', path: '/workflows' },
  { key: 'dept_fundraising_grants', label: 'Dept: Fundraising & Grants', code: 'FG', desc: 'Donor proposals, grant tracking, and CSR partnership agreements', category: 'department', path: '/workflows' },
  { key: 'dept_impact_investment', label: 'Dept: Impact Investment', code: 'II', desc: 'Social enterprise projects, impact funding, and investment viability', category: 'department', path: '/workflows' },
  { key: 'dept_project_implementation', label: 'Dept: Project Implementation', code: 'PI', desc: 'Field school operations, project site rollouts, and delivery milestones', category: 'department', path: '/workflows' },
  { key: 'dept_programmes', label: 'Dept: Programmes', code: 'PG', desc: 'Nationwide education programs, community initiatives, and teacher training', category: 'department', path: '/workflows' },
  { key: 'dept_private_sector', label: 'Dept: Private Sector (PSE)', code: 'PS', desc: 'Corporate engagements, private sector partnerships, and sustainable sponsorship', category: 'department', path: '/workflows' },
  { key: 'dept_youth_development', label: 'Dept: Youth Development (YDF)', code: 'YD', desc: 'Volunteer For Bangladesh (VBD) chapters and youth leadership', category: 'department', path: '/workflows' },
  { key: 'dept_meal_monitoring', label: 'Dept: MEAL (Monitoring & Eval)', code: 'ME', desc: 'Monitoring, evaluation, accountability, and learning donor metrics', category: 'department', path: '/workflows' },
];

/**
 * Helper to normalize department names into a valid McpModuleKey (<= 50 chars)
 */
export function normalizeDeptToModuleKey(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'dept_general';
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);

  const base = `dept_${clean}`;
  return base.slice(0, 50);
}

/**
 * Generates an intuitive 2-4 letter abbreviation code from a title
 */
export function generateCodeFromTitle(title?: string | null, defaultCode?: string | null): string {
  if (defaultCode && typeof defaultCode === 'string' && defaultCode.trim().length > 0) {
    return defaultCode.trim().slice(0, 5).toUpperCase();
  }
  if (!title || typeof title !== 'string') return 'GEN';
  const clean = title.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 'GEN';
  const w0 = words[0] || 'G';
  if (words.length === 1) return w0.slice(0, 3).toUpperCase();
  const w1 = words[1] || '';
  if (words.length === 2) return ((w0[0] || '') + (w1[0] || '')).toUpperCase() || 'DP';
  const w2 = words[2] || '';
  return ((w0[0] || '') + (w1[0] || '') + (w2[0] || '')).toUpperCase() || 'DPT';
}

/**
 * Synchronize all canonical modules, menus, submenus, pages, and live database departments
 * into `public.mcp_modules` in Supabase.
 *
 * Automatically captures:
 * 1. All Core Modules
 * 2. All Menus
 * 3. All Submenus & Individual Platform Pages
 * 4. All Canonical Operational Departments
 * 5. ALL Live Database Departments (including newly created / future departments)
 */
export async function syncMcpModules(supabase: SupabaseClient): Promise<{
  modules: McpItemDef[];
  stats: { total: number; coreCount: number; deptCount: number; menuCount: number; pageCount: number };
}> {
  // Start with canonical items
  const itemMap = new Map<string, McpItemDef>();

  // 1. Core Modules
  CORE_MODULES.forEach((m) => itemMap.set(m.key, m));

  // 2. Menus
  PLATFORM_MENUS.forEach((m) => itemMap.set(m.key, m));

  // 3. Submenus & Pages
  PLATFORM_PAGES.forEach((p) => itemMap.set(p.key, p));

  // 4. Standard Departments
  STANDARD_DEPARTMENTS.forEach((d) => itemMap.set(d.key, d));

  // 5. Query live database departments (discovering all already created & future departments)
  try {
    const { data: dbDepts, error } = await supabase
      .from('departments')
      .select('id, name, code, description')
      .order('name');

    if (!error && Array.isArray(dbDepts)) {
      const seenDeptKeys = new Set(STANDARD_DEPARTMENTS.map((d) => d.key));

      for (const d of dbDepts) {
        if (!d.name || typeof d.name !== 'string') continue;
        const rawKey = normalizeDeptToModuleKey(d.name);

        let finalKey = rawKey;
        if (seenDeptKeys.has(finalKey) && !itemMap.has(finalKey)) {
          const rawCode = typeof d.code === 'string' ? d.code.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const rawId = typeof d.id === 'string' ? d.id.slice(-4) : Math.random().toString(36).slice(-4);
          const codeSuffix = rawCode ? `_${rawCode}` : `_${rawId}`;
          finalKey = `${finalKey.slice(0, 50 - codeSuffix.length)}${codeSuffix}`;
        }

        // If not already defined or from DB
        if (!itemMap.has(finalKey)) {
          seenDeptKeys.add(finalKey);
          itemMap.set(finalKey, {
            key: finalKey,
            label: `Dept: ${d.name}`.slice(0, 100),
            code: generateCodeFromTitle(d.name, d.code),
            desc: d.description || `Departmental portal, operational records, and personnel for ${d.name}`,
            category: 'department',
            path: '/workflows',
          });
        }
      }
    }
  } catch (err) {
    console.error('[McpModuleSync] Warning: Failed to query departments table:', err);
  }

  const allItems = Array.from(itemMap.values());

  // Upsert all items into public.mcp_modules to guarantee foreign key integrity for agent scopes
  try {
    const rowsToUpsert = allItems.map((item) => ({
      module_key: item.key.slice(0, 50),
      label: item.label.slice(0, 100),
      description: item.desc || item.label,
      is_exposed: true,
    }));

    const { error: upsertErr } = await supabase
      .from('mcp_modules')
      .upsert(rowsToUpsert, { onConflict: 'module_key' });

    if (upsertErr) {
      console.error('[McpModuleSync] Error upserting modules to Supabase:', upsertErr.message);
    }
  } catch (err) {
    console.error('[McpModuleSync] Exception during mcp_modules upsert:', err);
  }

  const stats = {
    total: allItems.length,
    coreCount: allItems.filter((i) => i.category === 'core').length,
    deptCount: allItems.filter((i) => i.category === 'department').length,
    menuCount: allItems.filter((i) => i.category === 'menu').length,
    pageCount: allItems.filter((i) => i.category === 'page').length,
  };

  return { modules: allItems, stats };
}
