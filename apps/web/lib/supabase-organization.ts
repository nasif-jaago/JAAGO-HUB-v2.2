import { getSupabase } from './supabase-auth';

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface OrganizationEntity {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  banani?: string;
  city?: string;
  division?: string;
  postalCode?: string;
  country?: string;
  partnerCountry?: string;
  phone?: string;
  email?: string;
  website?: string;
  emailDomain?: string;
  brandColor?: string;
  taxId?: string;
  companyId?: string;
  currency?: string;
  isArchived?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationBranch {
  id: string;
  organizationId: string;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  createdAt?: string;
}

export interface OrganizationPolicy {
  id: string;
  organizationId: string;
  title: string;
  category: 'ALL' | 'GENERAL' | 'LEAVE' | 'ATTENDANCE' | 'CODE OF CONDUCT' | 'TRAVEL' | 'EXPENSES' | 'OTHER';
  description?: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentUrl?: string;
  uploadedAt?: string;
  createdAt?: string;
}

export interface DesignationItem {
  id: string;
  name: string;
  code?: string;
  grade?: string;
  departmentOrProject?: string;
  description?: string;
  isArchived?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  organizationId?: string;
  organizationName?: string;
  parentDepartmentId?: string;
  parentDepartmentName?: string;
  managerName?: string;
  managerId?: string;
  description?: string;
  isArchived?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  code?: string;
  organizationId?: string;
  organizationName?: string;
  parentDepartmentId?: string;
  parentDepartmentName?: string;
  projectManagerName?: string;
  projectManagerId?: string;
  managerName?: string;
  managerId?: string;
  financeLeadName?: string;
  financeLeadId?: string;
  description?: string;
  status?: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'PLANNING';
  budget?: number;
  isArchived?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMemberItem {
  id: string;
  teamId?: string;
  employeeId?: string;
  employeeName: string;
  employeeCode?: string;
  role?: string;
}

export interface TeamItem {
  id: string;
  name: string;
  code?: string;
  departmentOrProject?: string;
  teamLeadName?: string;
  teamLeadId?: string;
  description?: string;
  members?: TeamMemberItem[] | undefined;
  isArchived?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsuranceCategoryItem {
  id: string;
  name: string;
  monthlyPremium: number;
  description?: string;
  coverageDetails?: string;
  isActive?: boolean;
  isArchived?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INITIAL FALLBACK DATA
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_ORGANIZATIONS: OrganizationEntity[] = [
  {
    id: 'org-1',
    name: 'JAAGO Foundation',
    partnerCountry: 'Bangladesh',
    website: 'https://jaago.com.bd',
    address: 'HQ-House#57, Road#7B',
    banani: 'Banani',
    city: 'Dhaka',
    division: 'Dhaka Division',
    postalCode: '1213',
    country: 'Bangladesh',
    phone: '8801766666654',
    email: 'info@jaago.com.bd',
    emailDomain: 'jaago.com.bd',
    brandColor: '#FED900',
    taxId: '444095931072',
    companyId: 'S- 8027(48)',
    currency: 'BDT',
  },
  {
    id: 'org-2',
    name: 'JAAGO Foundation Trust',
    partnerCountry: 'Bangladesh',
    website: 'http://www.jaago.com.bd',
    address: 'House#57, Road#7B, Block H, Banani',
    banani: 'Banani',
    city: 'Dhaka',
    division: 'Dhaka Division',
    postalCode: '1213',
    country: 'Bangladesh',
    phone: '8801766666655',
    email: 'trust@jaago.com.bd',
    emailDomain: 'jaago.com.bd',
    brandColor: '#F97316',
    taxId: '555095931099',
    companyId: 'TR- 9012(11)',
    currency: 'BDT',
  },
  {
    id: 'org-3',
    name: 'JAAGO Foundation INC',
    partnerCountry: 'United States',
    website: 'http://www.jaago.com.bd',
    address: '500 7th Ave, 8th Floor',
    banani: 'Manhattan',
    city: 'New York',
    division: 'NY',
    postalCode: '10018',
    country: 'United States',
    phone: '+1 212 555 0192',
    email: 'usa@jaago.com.bd',
    emailDomain: 'jaago.com.bd',
    brandColor: '#3B82F6',
    taxId: 'US-EIN-992019',
    companyId: 'INC- 8820',
    currency: 'USD',
  },
  {
    id: 'org-4',
    name: 'JAAGO Foundation UK',
    partnerCountry: 'United Kingdom',
    website: 'http://www.jaago.com.bd',
    address: '30 St Mary Axe',
    banani: 'City of London',
    city: 'London',
    division: 'Greater London',
    postalCode: 'EC3A 8EP',
    country: 'United Kingdom',
    phone: '+44 20 7946 0912',
    email: 'uk@jaago.com.bd',
    emailDomain: 'jaago.com.bd',
    brandColor: '#10B981',
    taxId: 'UK-CHARITY-1029',
    companyId: 'UK- 10492',
    currency: 'GBP',
  },
];

export const INITIAL_BRANCHES: OrganizationBranch[] = [
  {
    id: 'br-1',
    organizationId: 'org-1',
    name: 'Banani Head Office',
    code: 'DHK-01',
    phone: '+88029881234',
    email: 'banani@jaago.com.bd',
    address: 'HQ-House#57, Road#7B, Block H, Banani',
    city: 'Dhaka',
    country: 'Bangladesh',
  },
  {
    id: 'br-2',
    organizationId: 'org-1',
    name: 'Rayer Bazar Free School',
    code: 'DHK-02',
    phone: '+88029881235',
    email: 'rayerbazar@jaago.com.bd',
    address: 'Sultanganj, Rayer Bazar',
    city: 'Dhaka',
    country: 'Bangladesh',
  },
  {
    id: 'br-3',
    organizationId: 'org-1',
    name: 'Chittagong Campus',
    code: 'CTG-01',
    phone: '+88031671234',
    email: 'chittagong@jaago.com.bd',
    address: 'Nasirabad H/S, Chittagong',
    city: 'Chittagong',
    country: 'Bangladesh',
  },
  {
    id: 'br-4',
    organizationId: 'org-1',
    name: "Cox's Bazar Branch",
    code: 'CXB-01',
    phone: '+88034162001',
    email: 'coxsbazar@jaago.com.bd',
    address: "Kolatoli Road, Cox's Bazar",
    city: "Cox's Bazar",
    country: 'Bangladesh',
  },
];

export const INITIAL_POLICIES: OrganizationPolicy[] = [
  {
    id: 'pol-1',
    organizationId: 'org-1',
    title: 'JAAGO Theory of Change',
    category: 'GENERAL',
    description: 'Strategic framework and social impact theory of change roadmap.',
    attachmentName: 'JAAGO_Theory_of_Change.pdf',
    attachmentSize: '813.0 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/theory_of_change.pdf',
  },
  {
    id: 'pol-2',
    organizationId: 'org-1',
    title: 'JAAGO Risk Matrix - Brief & Detailed',
    category: 'GENERAL',
    description: 'Institutional risk matrix and risk response guidelines.',
    attachmentName: 'JAAGO_Risk_Matrix_Brief_&_Detailed.pdf',
    attachmentSize: '69.1 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/risk_matrix.pdf',
  },
  {
    id: 'pol-3',
    organizationId: 'org-1',
    title: 'JF HR Policy Amendment 2025',
    category: 'GENERAL',
    description: 'Updated human resources provisions and employee benefits.',
    attachmentName: 'JF_HR_Policy_Amendment_2025.pdf',
    attachmentSize: '585.6 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/hr_policy.pdf',
  },
  {
    id: 'pol-4',
    organizationId: 'org-1',
    title: 'JF Shared Cost Allocation Policy',
    category: 'EXPENSES',
    description: 'Standard cost allocation methodology across donor-funded projects.',
    attachmentName: 'JF_Shared_Cost_Allocation_Policy.pdf',
    attachmentSize: '99.1 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/shared_cost.pdf',
  },
  {
    id: 'pol-5',
    organizationId: 'org-1',
    title: 'JF Partnership Policy',
    category: 'GENERAL',
    description: 'Protocol for institutional partnerships and NGO alliances.',
    attachmentName: 'JF_Partnership_Policy.pdf',
    attachmentSize: '620.1 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/partnership.pdf',
  },
  {
    id: 'pol-6',
    organizationId: 'org-1',
    title: 'JF Gender Policy',
    category: 'GENERAL',
    description: 'Gender equity, inclusion and zero-tolerance harassment standards.',
    attachmentName: 'JF_Gender_Policy.pdf',
    attachmentSize: '317.2 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/gender_policy.pdf',
  },
  {
    id: 'pol-7',
    organizationId: 'org-1',
    title: 'JF Child Protection Policy',
    category: 'GENERAL',
    description: 'Mandatory safeguarding standards for all child-centric projects.',
    attachmentName: 'JF_Child_Protection_Policy.pdf',
    attachmentSize: '302.2 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/child_protection.pdf',
  },
  {
    id: 'pol-8',
    organizationId: 'org-1',
    title: 'JF Whistleblowing Policy',
    category: 'GENERAL',
    description: 'Secure anonymous reporting mechanism for fraud, waste, and abuse.',
    attachmentName: 'JF_Whistleblowing_Policy.pdf',
    attachmentSize: '281.4 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/whistleblowing.pdf',
  },
  {
    id: 'pol-9',
    organizationId: 'org-1',
    title: 'JF Training & Staff Development Policy',
    category: 'GENERAL',
    description: 'Guidelines on capacity building, external training and study leave.',
    attachmentName: 'JF_Training_Policy.pdf',
    attachmentSize: '251.3 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/training.pdf',
  },
  {
    id: 'pol-10',
    organizationId: 'org-1',
    title: 'JF Theft and Misappropriation Policy',
    category: 'GENERAL',
    description: 'Financial compliance, asset protection and internal control norms.',
    attachmentName: 'JF_Theft_Policy.pdf',
    attachmentSize: '187.6 KB',
    attachmentUrl: 'https://hub.jaago.com.bd/policies/theft_policy.pdf',
  },
];

export const INITIAL_DESIGNATIONS: DesignationItem[] = [
  {
    id: 'des-1',
    name: 'Executive Director',
    code: 'ED-01',
    grade: 'Executive',
    departmentOrProject: 'Executive Office',
    description: 'Overall leadership and strategic direction of JAAGO Foundation.',
  },
  {
    id: 'des-2',
    name: 'Director, Program Implementation',
    code: 'DIR-PI-01',
    grade: 'Management',
    departmentOrProject: 'Program Implementation',
    description: 'Directs nationwide educational and development projects.',
  },
  {
    id: 'des-3',
    name: 'Coordinator, Tech 4 Development',
    code: 'COORD-T4D',
    grade: 'Grade 7',
    departmentOrProject: 'Digital School Program',
    description: 'Leads software development, digital platforms, and tech operations.',
  },
  {
    id: 'des-4',
    name: 'Program Officer',
    code: 'PO-01',
    grade: 'Grade 5',
    departmentOrProject: 'Program Implementation',
    description: 'Executes and monitors regional educational deliverables.',
  },
  {
    id: 'des-5',
    name: 'Finance & Accounts Officer',
    code: 'FAO-01',
    grade: 'Grade 5',
    departmentOrProject: 'Finance & Accounts',
    description: 'Manages grant bookkeeping, audits, and voucher verification.',
  },
  {
    id: 'des-6',
    name: 'Security Guard',
    code: 'SEC-01',
    grade: 'Staff',
    departmentOrProject: 'Program Implementation',
    description: 'Premises security, physical access verification, and safety patrol.',
  },
];

export const INITIAL_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept-1',
    name: 'Executive Office',
    code: 'EX-OFF',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: '',
    parentDepartmentName: '',
    managerName: 'Korvi Rakshand',
    description: 'Apex governing and strategic executive body.',
  },
  {
    id: 'dept-2',
    name: 'Program Implementation',
    code: 'PI',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-1',
    parentDepartmentName: 'Executive Office',
    managerName: 'Abdul Mazid',
    description: 'Educational operations, school governance, and volunteer programs.',
  },
  {
    id: 'dept-3',
    name: 'Digital School Program',
    code: 'DSP',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-2',
    parentDepartmentName: 'Program Implementation',
    managerName: 'Nasif Kamal',
    description: 'Online distance education, hardware classrooms, and digital syllabus.',
  },
  {
    id: 'dept-4',
    name: 'Finance & Accounts',
    code: 'FIN',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-1',
    parentDepartmentName: 'Executive Office',
    managerName: 'Habibur Rahman',
    description: 'Financial reporting, donor accounting, and statutory audit compliance.',
  },
  {
    id: 'dept-5',
    name: 'People and Culture',
    code: 'PNC',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-1',
    parentDepartmentName: 'Executive Office',
    managerName: 'Nusrat Jahan',
    description: 'Talent acquisition, payroll, employee welfare, and appraisals.',
  },
  {
    id: 'dept-6',
    name: 'Communications & Fundraising',
    code: 'COMM',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-1',
    parentDepartmentName: 'Executive Office',
    managerName: 'Tanvir Ahmed',
    description: 'Public relations, child sponsorship campaigns, and media communications.',
  },
];

export const INITIAL_PROJECTS: ProjectItem[] = [
  {
    id: 'prj-1',
    name: 'Telco Digital School',
    code: 'PRJ-TDS-01',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-3',
    parentDepartmentName: 'Digital School Program',
    projectManagerName: 'Nasif Kamal',
    financeLeadName: 'Habibur Rahman',
    description: 'Telecom-supported digital schooling across remote rural centers.',
    status: 'ACTIVE',
    budget: 12500000,
  },
  {
    id: 'prj-2',
    name: 'Free School Education for Underprivileged',
    code: 'PRJ-FSE-02',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-2',
    parentDepartmentName: 'Program Implementation',
    projectManagerName: 'Abdul Mazid',
    financeLeadName: 'Habibur Rahman',
    description: 'Comprehensive primary and secondary education for slum and rural youth.',
    status: 'ACTIVE',
    budget: 35000000,
  },
  {
    id: 'prj-3',
    name: 'Universal Youth Development & Volunteer Voice',
    code: 'PRJ-UVD-03',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: 'dept-2',
    parentDepartmentName: 'Program Implementation',
    projectManagerName: 'Korvi Rakshand',
    financeLeadName: 'Habibur Rahman',
    description: 'Volunteer for Bangladesh (VBD) youth empowerment chapters in 64 districts.',
    status: 'ACTIVE',
    budget: 8000000,
  },
];

export const INITIAL_TEAMS: TeamItem[] = [
  {
    id: 'tm-1',
    name: 'Tech 4 Development Engineering Core',
    code: 'TM-T4D-01',
    departmentOrProject: 'Digital School Program',
    teamLeadName: 'Nasif Kamal',
    description: 'Core full-stack software and cloud infrastructure team.',
    members: [
      { id: 'mem-1', employeeName: 'Nasif Kamal', employeeCode: 'EMP-001', role: 'Team Lead' },
      { id: 'mem-2', employeeName: 'Abdul Mazid', employeeCode: 'ADM811428100845', role: 'Product Specialist' },
    ],
  },
  {
    id: 'tm-2',
    name: 'Curriculum & Pedagogy Team',
    code: 'TM-CUR-02',
    departmentOrProject: 'Program Implementation',
    teamLeadName: 'Abdul Mazid',
    description: 'Lesson design, teacher training, and multimedia learning modules.',
    members: [
      { id: 'mem-3', employeeName: 'Abdul Mazid', employeeCode: 'ADM811428100845', role: 'Team Lead' },
    ],
  },
  {
    id: 'tm-3',
    name: 'Banani Campus Security Squad',
    code: 'TM-SEC-03',
    departmentOrProject: 'Program Implementation',
    teamLeadName: 'Abdul Aziz',
    description: '24/7 security watch and visitor management team.',
    members: [
      { id: 'mem-4', employeeName: 'Abdul Aziz', employeeCode: 'GLSP08241107940', role: 'Squad Lead' },
    ],
  },
];

export const INITIAL_INSURANCE_CATEGORIES: InsuranceCategoryItem[] = [
  {
    id: 'ins-1',
    name: 'Executive Health & Life Coverage',
    monthlyPremium: 2500,
    description: 'Comprehensive executive health, critical illness, accidental disability, and term life insurance.',
    coverageDetails: 'IPD ৳ 500,000 / OPD ৳ 50,000 / Life ৳ 1,000,000',
    isActive: true,
  },
  {
    id: 'ins-2',
    name: 'Standard Staff Hospitalization & Surgery',
    monthlyPremium: 1250,
    description: 'Staff inpatient medical, diagnostic coverage, emergency surgery, and accidental death.',
    coverageDetails: 'IPD ৳ 250,000 / OPD ৳ 20,000 / Life ৳ 500,000',
    isActive: true,
  },
  {
    id: 'ins-3',
    name: 'Support Staff & Field Care Coverage',
    monthlyPremium: 650,
    description: 'Basic hospitalization, accidental injury care, and term disability cover for field operators.',
    coverageDetails: 'IPD ৳ 100,000 / OPD ৳ 10,000 / Life ৳ 250,000',
    isActive: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. DATABASE SERVICES & SUPABASE FETCH/SAVE/DELETE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

export function getDeletedEntityIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('jaago_pnc_deleted_entity_ids');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function addDeletedEntityId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const ids = getDeletedEntityIds();
    ids.add(id);
    localStorage.setItem('jaago_pnc_deleted_entity_ids', JSON.stringify(Array.from(ids)));
  } catch {}
}

export function removeDeletedEntityId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const ids = getDeletedEntityIds();
    ids.delete(id);
    localStorage.setItem('jaago_pnc_deleted_entity_ids', JSON.stringify(Array.from(ids)));
  } catch {}
}

function getLocalCache<T extends { id: string }>(key: string, defaultVal: T[]): T[] {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultVal;
}

function setLocalCache<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function notifyEntityUpdated(entityType: 'organization' | 'department' | 'designation' | 'branch' | 'project' | 'team', item: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jaago_entity_updated', {
        detail: { entityType, item },
      })
    );
  }
}

export async function cascadeRenameEntity(
  entityType: 'organization' | 'department' | 'designation' | 'branch' | 'project' | 'team',
  oldName: string,
  newName: string
) {
  if (!oldName || !newName || oldName.trim() === newName.trim()) return;

  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();

  // 1. Update local storage employee profiles
  if (typeof window !== 'undefined') {
    try {
      const rawEmps = localStorage.getItem('jaago_pnc_employees_v2');
      if (rawEmps) {
        const emps = JSON.parse(rawEmps);
        if (Array.isArray(emps)) {
          const updated = emps.map((emp) => {
            const updatedEmp = { ...emp };
            if (entityType === 'organization' && emp.organization?.trim().toLowerCase() === trimmedOld.toLowerCase()) {
              updatedEmp.organization = trimmedNew;
            }
            if (entityType === 'department' && emp.department?.trim().toLowerCase() === trimmedOld.toLowerCase()) {
              updatedEmp.department = trimmedNew;
            }
            if (entityType === 'designation' && emp.designation?.trim().toLowerCase() === trimmedOld.toLowerCase()) {
              updatedEmp.designation = trimmedNew;
            }
            if (entityType === 'branch' && emp.branch?.trim().toLowerCase() === trimmedOld.toLowerCase()) {
              updatedEmp.branch = trimmedNew;
            }
            if (entityType === 'project' && emp.project?.trim().toLowerCase() === trimmedOld.toLowerCase()) {
              updatedEmp.project = trimmedNew;
            }
            if (entityType === 'team' && emp.team?.trim().toLowerCase() === trimmedOld.toLowerCase()) {
              updatedEmp.team = trimmedNew;
            }
            return updatedEmp;
          });
          localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(updated));
        }
      }
    } catch {}

    // Dispatch global real-time event
    window.dispatchEvent(
      new CustomEvent('jaago_entity_renamed', {
        detail: { entityType, oldName: trimmedOld, newName: trimmedNew },
      })
    );
  }

  // 2. Call backend cascading rename API for database synchronization
  try {
    await fetch('/api/v1/hr/entities/cascade-rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, oldName: trimmedOld, newName: trimmedNew }),
    });
  } catch (err) {
    console.warn('Cascade rename API error:', err);
  }
}

// --- ORGANIZATIONS ---
const ORGS_CACHE_KEY = 'jaago_pnc_organizations_cache';

export async function fetchOrganizationsFromSupabase(): Promise<OrganizationEntity[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: OrganizationEntity[] = INITIAL_ORGANIZATIONS;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('organizations').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          logoUrl: row.logo_url || '',
          address: row.address || '',
          banani: row.banani || '',
          city: row.city || 'Dhaka',
          division: row.division || 'Dhaka Division',
          postalCode: row.postal_code || '1213',
          country: row.country || 'Bangladesh',
          partnerCountry: row.partner_country || 'Bangladesh',
          phone: row.phone || '',
          email: row.email || '',
          website: row.website || 'https://jaago.com.bd',
          emailDomain: row.email_domain || 'jaago.com.bd',
          brandColor: row.brand_color || '#FED900',
          taxId: row.tax_id || '',
          companyId: row.company_id || '',
          currency: row.currency || 'BDT',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_ORGANIZATIONS.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(ORGS_CACHE_KEY, baseList);
  const result = cached.filter((o) => !deletedIds.has(o.id));
  setLocalCache(ORGS_CACHE_KEY, result);
  return result;
}

export async function saveOrganizationToSupabase(org: OrganizationEntity, oldName?: string): Promise<boolean> {
  removeDeletedEntityId(org.id);
  const current = await fetchOrganizationsFromSupabase();
  const existing = current.find((o) => o.id === org.id);
  const previousName = oldName || (existing && existing.name !== org.name ? existing.name : undefined);

  const filtered = current.filter((o) => o.id !== org.id);
  const updated = [org, ...filtered];
  setLocalCache(ORGS_CACHE_KEY, updated);

  if (previousName && previousName !== org.name) {
    await cascadeRenameEntity('organization', previousName, org.name);
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      id: org.id || `org-${Date.now()}`,
      name: org.name,
      logo_url: org.logoUrl || '',
      address: org.address || '',
      banani: org.banani || '',
      city: org.city || 'Dhaka',
      division: org.division || 'Dhaka Division',
      postal_code: org.postalCode || '1213',
      country: org.country || 'Bangladesh',
      partner_country: org.partnerCountry || 'Bangladesh',
      phone: org.phone || '',
      email: org.email || '',
      website: org.website || 'https://jaago.com.bd',
      email_domain: org.emailDomain || 'jaago.com.bd',
      brand_color: org.brandColor || '#FED900',
      tax_id: org.taxId || '',
      company_id: org.companyId || '',
      currency: org.currency || 'BDT',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('organizations').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteOrganizationFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(ORGS_CACHE_KEY, INITIAL_ORGANIZATIONS).filter((o) => o.id !== id);
  setLocalCache(ORGS_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('organizations').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- BRANCHES ---
const BRANCHES_CACHE_KEY = 'jaago_pnc_branches_cache';

export async function fetchBranchesFromSupabase(organizationId?: string): Promise<OrganizationBranch[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: OrganizationBranch[] = INITIAL_BRANCHES;
  try {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from('organization_branches').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data, error } = await query.order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          organizationId: row.organization_id,
          name: row.name,
          code: row.code || '',
          phone: row.phone || '',
          email: row.email || '',
          address: row.address || '',
          city: row.city || 'Dhaka',
          country: row.country || 'Bangladesh',
          createdAt: row.created_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_BRANCHES.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(BRANCHES_CACHE_KEY, baseList);
  const filteredByOrg = organizationId ? cached.filter((b) => b.organizationId === organizationId) : cached;
  const result = filteredByOrg.filter((b) => !deletedIds.has(b.id));
  setLocalCache(BRANCHES_CACHE_KEY, result);
  return result;
}

export async function saveBranchToSupabase(branch: OrganizationBranch, oldName?: string): Promise<boolean> {
  removeDeletedEntityId(branch.id);
  const current = await fetchBranchesFromSupabase();
  const existing = current.find((b) => b.id === branch.id);
  const previousName = oldName || (existing && existing.name !== branch.name ? existing.name : undefined);

  const cached = getLocalCache(BRANCHES_CACHE_KEY, INITIAL_BRANCHES).filter((b) => b.id !== branch.id);
  setLocalCache(BRANCHES_CACHE_KEY, [branch, ...cached]);

  if (previousName && previousName !== branch.name) {
    await cascadeRenameEntity('branch', previousName, branch.name);
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      id: branch.id || `br-${Date.now()}`,
      organization_id: branch.organizationId,
      name: branch.name,
      code: branch.code || '',
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || '',
      city: branch.city || 'Dhaka',
      country: branch.country || 'Bangladesh',
    };
    const { error } = await supabase.from('organization_branches').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteBranchFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(BRANCHES_CACHE_KEY, INITIAL_BRANCHES).filter((b) => b.id !== id);
  setLocalCache(BRANCHES_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('organization_branches').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- POLICIES ---
const POLICIES_CACHE_KEY = 'jaago_pnc_policies_cache';

export async function fetchPoliciesFromSupabase(organizationId?: string): Promise<OrganizationPolicy[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: OrganizationPolicy[] = INITIAL_POLICIES;
  try {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from('organization_policies').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          organizationId: row.organization_id,
          title: row.title,
          category: row.category || 'GENERAL',
          description: row.description || '',
          attachmentName: row.attachment_name || '',
          attachmentSize: row.attachment_size || '',
          attachmentUrl: row.attachment_url || '',
          uploadedAt: row.uploaded_at,
          createdAt: row.created_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_POLICIES.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(POLICIES_CACHE_KEY, baseList);
  const filteredByOrg = organizationId ? cached.filter((p) => p.organizationId === organizationId) : cached;
  const result = filteredByOrg.filter((p) => !deletedIds.has(p.id));
  setLocalCache(POLICIES_CACHE_KEY, result);
  return result;
}

export async function savePolicyToSupabase(policy: OrganizationPolicy): Promise<boolean> {
  removeDeletedEntityId(policy.id);
  const cached = getLocalCache(POLICIES_CACHE_KEY, INITIAL_POLICIES).filter((p) => p.id !== policy.id);
  setLocalCache(POLICIES_CACHE_KEY, [policy, ...cached]);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      id: policy.id || `pol-${Date.now()}`,
      organization_id: policy.organizationId,
      title: policy.title,
      category: policy.category || 'GENERAL',
      description: policy.description || '',
      attachment_name: policy.attachmentName || '',
      attachment_size: policy.attachmentSize || '',
      attachment_url: policy.attachmentUrl || '',
      uploaded_at: policy.uploadedAt || new Date().toISOString(),
    };
    const { error } = await supabase.from('organization_policies').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return true;
  }
}

export async function deletePolicyFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(POLICIES_CACHE_KEY, INITIAL_POLICIES).filter((p) => p.id !== id);
  setLocalCache(POLICIES_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('organization_policies').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- DESIGNATIONS ---
const DESIGNATIONS_CACHE_KEY = 'jaago_pnc_designations_cache';

export async function fetchDesignationsFromSupabase(): Promise<DesignationItem[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: DesignationItem[] = INITIAL_DESIGNATIONS;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('designations').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code || '',
          grade: row.grade || '',
          departmentOrProject: row.department_or_project || '',
          description: row.description || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_DESIGNATIONS.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(DESIGNATIONS_CACHE_KEY, baseList);
  const result = cached.filter((d) => !deletedIds.has(d.id));
  setLocalCache(DESIGNATIONS_CACHE_KEY, result);
  return result;
}

export async function saveDesignationToSupabase(des: DesignationItem, oldName?: string): Promise<boolean> {
  removeDeletedEntityId(des.id);
  const current = await fetchDesignationsFromSupabase();
  const existing = current.find((d) => d.id === des.id);
  const previousName = oldName || (existing && existing.name !== des.name ? existing.name : undefined);

  const cached = getLocalCache(DESIGNATIONS_CACHE_KEY, INITIAL_DESIGNATIONS).filter((d) => d.id !== des.id);
  setLocalCache(DESIGNATIONS_CACHE_KEY, [des, ...cached]);

  if (previousName && previousName !== des.name) {
    await cascadeRenameEntity('designation', previousName, des.name);
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      id: des.id || `des-${Date.now()}`,
      name: des.name,
      code: des.code || '',
      grade: des.grade || '',
      department_or_project: des.departmentOrProject || '',
      description: des.description || '',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('designations').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteDesignationFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(DESIGNATIONS_CACHE_KEY, INITIAL_DESIGNATIONS).filter((d) => d.id !== id);
  setLocalCache(DESIGNATIONS_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('designations').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- DEPARTMENTS ---
const DEPARTMENTS_CACHE_KEY = 'jaago_pnc_departments_cache';

export async function fetchDepartmentsFromSupabase(): Promise<DepartmentItem[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: DepartmentItem[] = INITIAL_DEPARTMENTS;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code || '',
          organizationId: row.organization_id || '',
          organizationName: row.organization_name || '',
          parentDepartmentId: row.parent_department_id || '',
          parentDepartmentName: row.parent_department_name || '',
          managerName: row.manager_name || '',
          managerId: row.manager_id || '',
          description: row.description || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_DEPARTMENTS.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(DEPARTMENTS_CACHE_KEY, baseList);
  const result = cached.filter((d) => !deletedIds.has(d.id));
  setLocalCache(DEPARTMENTS_CACHE_KEY, result);
  return result;
}

export async function saveDepartmentToSupabase(dept: DepartmentItem, oldName?: string): Promise<boolean> {
  removeDeletedEntityId(dept.id);
  const current = await fetchDepartmentsFromSupabase();
  const existing = current.find((d) => d.id === dept.id);
  const previousName = oldName || (existing && existing.name !== dept.name ? existing.name : undefined);

  const cached = getLocalCache(DEPARTMENTS_CACHE_KEY, INITIAL_DEPARTMENTS).filter((d) => d.id !== dept.id);
  setLocalCache(DEPARTMENTS_CACHE_KEY, [dept, ...cached]);

  if (previousName && previousName !== dept.name) {
    await cascadeRenameEntity('department', previousName, dept.name);
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      name: dept.name,
      code: dept.code || '',
      organization_id: dept.organizationId || '',
      organization_name: dept.organizationName || '',
      parent_department_id: dept.parentDepartmentId || '',
      parent_department_name: dept.parentDepartmentName || '',
      manager_name: dept.managerName || '',
      manager_id: dept.managerId || '',
      description: dept.description || '',
      updated_at: new Date().toISOString(),
    };

    // For existing departments: try to UPDATE by id first.
    // If the id is a local-generated synthetic id (not a UUID), fall back to matching by old name.
    const isRealUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dept.id || '');

    if (dept.id && isRealUUID) {
      // Proper UUID — do a clean UPDATE by id
      const { error } = await supabase
        .from('departments')
        .update(payload)
        .eq('id', dept.id);
      if (!error) return true;
    }

    // Synthetic / no id — try UPDATE by old name (case-insensitive) if we have it
    if (previousName) {
      const { data: matched, error: fetchErr } = await supabase
        .from('departments')
        .select('id')
        .ilike('name', previousName)
        .limit(1);
      if (!fetchErr && matched && matched.length > 0) {
        const realId = matched[0]?.id;
        if (!realId) return false;
        const { error } = await supabase
          .from('departments')
          .update(payload)
          .eq('id', realId);
        return !error;
      }
    }

    // Truly new department — INSERT with a fresh UUID
    const { error } = await supabase
      .from('departments')
      .insert({ ...payload, id: dept.id && isRealUUID ? dept.id : undefined });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteDepartmentFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(DEPARTMENTS_CACHE_KEY, INITIAL_DEPARTMENTS).filter((d) => d.id !== id);
  setLocalCache(DEPARTMENTS_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('departments').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- PROJECTS ---
const PROJECTS_CACHE_KEY = 'jaago_pnc_projects_cache';

export async function fetchProjectsFromSupabase(): Promise<ProjectItem[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: ProjectItem[] = INITIAL_PROJECTS;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('projects').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code || '',
          organizationId: row.organization_id || '',
          organizationName: row.organization_name || '',
          parentDepartmentId: row.parent_department_id || '',
          parentDepartmentName: row.parent_department_name || '',
          projectManagerName: row.project_manager_name || '',
          projectManagerId: row.project_manager_id || '',
          managerName: row.project_manager_name || '',
          managerId: row.project_manager_id || '',
          financeLeadName: row.finance_lead_name || '',
          financeLeadId: row.finance_lead_id || '',
          description: row.description || '',
          status: row.status || 'ACTIVE',
          budget: Number(row.budget || 0),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_PROJECTS.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(PROJECTS_CACHE_KEY, baseList);
  const result = cached.filter((p) => !deletedIds.has(p.id));
  setLocalCache(PROJECTS_CACHE_KEY, result);
  return result;
}

export async function saveProjectToSupabase(proj: ProjectItem, oldName?: string): Promise<boolean> {
  removeDeletedEntityId(proj.id);
  const current = await fetchProjectsFromSupabase();
  const existing = current.find((p) => p.id === proj.id);
  const previousName = oldName || (existing && existing.name !== proj.name ? existing.name : undefined);

  const cached = getLocalCache(PROJECTS_CACHE_KEY, INITIAL_PROJECTS).filter((p) => p.id !== proj.id);
  setLocalCache(PROJECTS_CACHE_KEY, [proj, ...cached]);

  if (previousName && previousName !== proj.name) {
    await cascadeRenameEntity('project', previousName, proj.name);
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      id: proj.id || `prj-${Date.now()}`,
      name: proj.name,
      code: proj.code || '',
      organization_id: proj.organizationId || '',
      organization_name: proj.organizationName || '',
      parent_department_id: proj.parentDepartmentId || '',
      parent_department_name: proj.parentDepartmentName || '',
      project_manager_name: proj.projectManagerName || proj.managerName || '',
      project_manager_id: proj.projectManagerId || proj.managerId || '',
      finance_lead_name: proj.financeLeadName || '',
      finance_lead_id: proj.financeLeadId || '',
      description: proj.description || '',
      status: proj.status || 'ACTIVE',
      budget: proj.budget || 0,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('projects').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteProjectFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(PROJECTS_CACHE_KEY, INITIAL_PROJECTS).filter((p) => p.id !== id);
  setLocalCache(PROJECTS_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('projects').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- TEAMS & MEMBERS ---
const TEAMS_CACHE_KEY = 'jaago_pnc_teams_cache';

export async function fetchTeamsFromSupabase(): Promise<TeamItem[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: TeamItem[] = INITIAL_TEAMS;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*').order('name', { ascending: true });
      if (!teamsError && Array.isArray(teamsData) && teamsData.length > 0) {
        const { data: membersData } = await supabase.from('team_members').select('*');

        const dbItems = teamsData.map((t: any) => {
          const teamMems = (membersData || [])
            .filter((m: any) => m.team_id === t.id)
            .map((m: any) => ({
              id: m.id,
              teamId: m.team_id,
              employeeId: m.employee_id,
              employeeName: m.employee_name,
              employeeCode: m.employee_code,
              role: m.role || 'Member',
            }));

          return {
            id: t.id,
            name: t.name,
            code: t.code || '',
            departmentOrProject: t.department_or_project || '',
            teamLeadName: t.team_lead_name || '',
            teamLeadId: t.team_lead_id || '',
            description: t.description || '',
            members: teamMems.length > 0 ? teamMems : undefined,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          };
        });
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_TEAMS.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(TEAMS_CACHE_KEY, baseList);
  const result = cached.filter((t) => !deletedIds.has(t.id));
  setLocalCache(TEAMS_CACHE_KEY, result);
  return result;
}

export async function saveTeamToSupabase(team: TeamItem, oldName?: string): Promise<boolean> {
  removeDeletedEntityId(team.id);
  const current = await fetchTeamsFromSupabase();
  const existing = current.find((t) => t.id === team.id);
  const previousName = oldName || (existing && existing.name !== team.name ? existing.name : undefined);

  const cached = getLocalCache(TEAMS_CACHE_KEY, INITIAL_TEAMS).filter((t) => t.id !== team.id);
  setLocalCache(TEAMS_CACHE_KEY, [team, ...cached]);

  if (previousName && previousName !== team.name) {
    await cascadeRenameEntity('team', previousName, team.name);
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const teamId = team.id || `tm-${Date.now()}`;
    const payload = {
      id: teamId,
      name: team.name,
      code: team.code || '',
      department_or_project: team.departmentOrProject || '',
      team_lead_name: team.teamLeadName || '',
      team_lead_id: team.teamLeadId || '',
      description: team.description || '',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('teams').upsert(payload, { onConflict: 'id' });
    if (error) return true;

    // Sync team members
    if (team.members && team.members.length > 0) {
      await supabase.from('team_members').delete().eq('team_id', teamId);
      const memberPayloads = team.members.map((m, idx) => ({
        id: m.id || `mem-${teamId}-${idx}-${Date.now()}`,
        team_id: teamId,
        employee_id: m.employeeId || '',
        employee_name: m.employeeName,
        employee_code: m.employeeCode || '',
        role: m.role || 'Member',
      }));
      await supabase.from('team_members').insert(memberPayloads);
    }
    return true;
  } catch {
    return true;
  }
}

export async function deleteTeamFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(TEAMS_CACHE_KEY, INITIAL_TEAMS).filter((t) => t.id !== id);
  setLocalCache(TEAMS_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('team_members').delete().eq('team_id', id);
    await supabase.from('teams').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

// --- INSURANCE CATEGORIES ---
const INSURANCE_CACHE_KEY = 'jaago_pnc_insurance_categories_cache';

export async function fetchInsuranceCategoriesFromSupabase(): Promise<InsuranceCategoryItem[]> {
  const deletedIds = getDeletedEntityIds();
  let baseList: InsuranceCategoryItem[] = INITIAL_INSURANCE_CATEGORIES;
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('insurance_categories').select('*').order('monthly_premium', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          monthlyPremium: Number(row.monthly_premium || 0),
          description: row.description || '',
          coverageDetails: row.coverage_details || '',
          isActive: Boolean(row.is_active),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        const dbIdSet = new Set(dbItems.map((d) => d.id));
        baseList = [...dbItems, ...INITIAL_INSURANCE_CATEGORIES.filter((i) => !dbIdSet.has(i.id))];
      }
    }
  } catch {}
  const cached = getLocalCache(INSURANCE_CACHE_KEY, baseList);
  const result = cached.filter((c) => !deletedIds.has(c.id));
  setLocalCache(INSURANCE_CACHE_KEY, result);
  return result;
}

export async function saveInsuranceCategoryToSupabase(cat: InsuranceCategoryItem): Promise<boolean> {
  removeDeletedEntityId(cat.id);
  const cached = getLocalCache(INSURANCE_CACHE_KEY, INITIAL_INSURANCE_CATEGORIES).filter((c) => c.id !== cat.id);
  setLocalCache(INSURANCE_CACHE_KEY, [cat, ...cached]);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    const payload = {
      id: cat.id || `ins-${Date.now()}`,
      name: cat.name,
      monthly_premium: cat.monthlyPremium,
      description: cat.description || '',
      coverage_details: cat.coverageDetails || '',
      is_active: cat.isActive ?? true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('insurance_categories').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteInsuranceCategoryFromSupabase(id: string): Promise<boolean> {
  addDeletedEntityId(id);
  const cached = getLocalCache(INSURANCE_CACHE_KEY, INITIAL_INSURANCE_CATEGORIES).filter((c) => c.id !== id);
  setLocalCache(INSURANCE_CACHE_KEY, cached);

  try {
    const supabase = getSupabase();
    if (!supabase) return true;
    await supabase.from('insurance_categories').delete().eq('id', id);
    return true;
  } catch {
    return true;
  }
}

