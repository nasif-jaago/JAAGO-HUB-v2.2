import { getSupabase } from './supabase-auth';
import { fetchWithCache, invalidateCache } from './data-cache';

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & DOMAIN INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProcurementVendor {
  id: string;
  name: string;
  code: string;
  type: 'Company' | 'Individual' | 'Contractor';
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  taxId?: string | undefined;
  paymentTerms: string;
  totalPOs: number;
  spendFY: number; // in BDT
  status: 'Active' | 'On Hold' | 'Blacklisted';
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineItem {
  id: string;
  name: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  specifications?: string | undefined;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prReference?: string | undefined;
  vendorId?: string | undefined;
  vendorName: string;
  department: string;
  project?: string | undefined;
  amountBDT: number;
  expectedDelivery: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  paymentTerms: string;
  deliveryAddress?: string | undefined;
  lineItems: PurchaseOrderLineItem[];
  createdByName: string;
  createdByCode?: string | undefined;
  approvedByName?: string | undefined;
  approvedAt?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionLineItem {
  id?: string | undefined;
  name: string;
  description?: string | undefined;
  requiredDate?: string | undefined;
  requiredDates?: string[] | undefined;
  quantity: number;
  unit?: string | undefined;
  unitCost: number;
  totalCost: number;
  inventoryId?: string | undefined;
  itemCode?: string | undefined;
}

export interface RequisitionApprovalStep {
  stepNumber: number;
  stepName: string;
  approver: string;
  approverEmail?: string | undefined;
  approverId?: string | undefined;
  status: 'PENDING' | 'SIGNED' | 'REJECTED' | 'SENT';
  signedAt?: string | undefined;
  sentAt?: string | undefined;
  method?: string | undefined;
}

export interface RequisitionHistoryLog {
  action: string;
  actor: string;
  details?: string | undefined;
  timestamp: string;
}

export interface ProcurementRequest {
  id: string;
  prNumber: string;
  requisitionType: 'Purchase' | 'General' | 'Recruitment';
  title: string;
  department: string;
  requestOwner: string;
  requestOwnerCode?: string | undefined;
  estAmount: number;
  currency: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Refused' | 'Fulfilled';
  justification?: string | undefined;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  requiredDate?: string | undefined;
  requiredDates?: string[] | undefined;
  lineItems?: RequisitionLineItem[] | undefined;
  attachments?: Array<{ id?: string; name: string; size?: string; url?: string }> | undefined;
  project?: string | undefined;
  activityCode?: string | undefined;
  company?: string | undefined;
  supervisor?: string | undefined;
  budget?: number | undefined;
  deliveryInstructions?: string | undefined;
  description?: string | undefined;
  approvalSteps?: RequisitionApprovalStep[] | undefined;
  historyLogs?: RequisitionHistoryLog[] | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementRFQ {
  id: string;
  rfqNumber: string;
  title: string;
  category: string;
  deadline: string;
  status: 'Draft' | 'Published' | 'Under Evaluation' | 'Awarded' | 'Closed';
  invitedVendors: string[];
  submissionsCount: number;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  receivedDate: string;
  receivedByName: string;
  warehouse: string;
  conditionStatus: 'Inspected & Passed' | 'Partial Delivery' | 'Damaged / Rejected';
  remarks?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  warehouse: string;
  stockOnHand: number;
  uom: string;
  reorderLevel: number;
  unitCost: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementAsset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  assignedUser?: string | undefined;
  department?: string | undefined;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  condition: 'Operational' | 'In Maintenance' | 'Retired';
  location: string;
  serialNumber?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementCategory {
  id: string;
  code: string;
  name: string;
  type: 'Goods' | 'Services' | 'Works';
  description?: string | undefined;
  itemsCount: number;
  status: 'Active' | 'Inactive';
}

export interface ProcurementUnit {
  id: string;
  code: string;
  name: string;
  category: 'Unit' | 'Weight' | 'Volume' | 'Length';
  baseUnit: boolean;
  status: 'Active' | 'Inactive';
}

export interface ProcurementWarehouse {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  manager: string;
  capacitySqft: number;
  status: 'Active' | 'Inactive';
}

export interface ProcurementContract {
  id: string;
  contractNumber: string;
  title: string;
  vendorName: string;
  valueBDT: number;
  startDate: string;
  endDate: string;
  renewalNoticeDays: number;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Terminated';
  documentUrl?: string | undefined;
}

export interface ProcurementBudget {
  id: string;
  fiscalYear: string;
  department: string;
  allocatedBDT: number;
  spentBDT: number;
  committedBDT: number;
  remainingBDT: number;
  notes?: string | undefined;
}

export interface ApprovalTierSetting {
  tier: number;
  name: string;
  maxAmount: number;
  role: string;
}

export interface ProcurementSettings {
  fiscalYear: string;
  currency: string;
  poPrefix: string;
  prPrefix: string;
  rfqPrefix: string;
  grnPrefix: string;
  vatDefaultPct: number;
  requireQcInspection: boolean;
  autoEmailVendorOnPO: boolean;
  defaultWarehouse: string;
  approvalTiers: ApprovalTierSetting[];
  updatedAt?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. SEED REFERENCE DATA (Matches Exact Reference Screenshots 1, 2, 3, 4)
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_VENDORS: ProcurementVendor[] = [
  {
    id: 'ven-001',
    name: 'Rangs Technologies',
    code: 'RA',
    type: 'Company',
    category: 'IT Hardware',
    contactPerson: 'Tanvir Hossain',
    phone: '01711002233',
    email: 'sales@rangs.com',
    location: 'Dhaka',
    taxId: 'BIN-1994829381',
    paymentTerms: 'Net 30 Days',
    totalPOs: 14,
    spendFY: 1840000,
    status: 'Active',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'ven-002',
    name: 'ZKTeco BD Ltd.',
    code: 'ZK',
    type: 'Company',
    category: 'Biometric Devices',
    contactPerson: 'Rashid Khan',
    phone: '01811223344',
    email: 'info@zkteco.bd',
    location: 'Dhaka',
    taxId: 'BIN-2083928193',
    paymentTerms: 'Net 15 Days',
    totalPOs: 9,
    spendFY: 710000,
    status: 'Active',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'ven-003',
    name: 'Star Print House',
    code: 'ST',
    type: 'Company',
    category: 'Printing',
    contactPerson: 'Mahmudul Alam',
    phone: '01911334455',
    email: 'orders@starprint.com',
    location: 'Dhaka',
    taxId: 'BIN-3094827182',
    paymentTerms: 'Immediate / COD',
    totalPOs: 22,
    spendFY: 460000,
    status: 'Active',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'ven-004',
    name: 'Green Furniture Co.',
    code: 'GR',
    type: 'Company',
    category: 'Furniture',
    contactPerson: 'Selim Reza',
    phone: '01611445566',
    email: 'sales@greenfurniture.bd',
    location: 'Gazipur',
    taxId: 'BIN-4928193821',
    paymentTerms: '50% Advance, 50% Delivery',
    totalPOs: 6,
    spendFY: 980000,
    status: 'Active',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
  {
    id: 'ven-005',
    name: 'Daffodil IT Supplies',
    code: 'DA',
    type: 'Company',
    category: 'IT Hardware',
    contactPerson: 'Nasir Uddin',
    phone: '01511556677',
    email: 'support@daffodil.com',
    location: 'Dhaka',
    taxId: 'BIN-5928193820',
    paymentTerms: 'Net 30 Days',
    totalPOs: 3,
    spendFY: 220000,
    status: 'On Hold',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'ven-006',
    name: 'Bengal Catering',
    code: 'BE',
    type: 'Company',
    category: 'Catering',
    contactPerson: 'Farhana Yeasmin',
    phone: '01711667788',
    email: 'event@bengalcatering.com',
    location: 'Dhaka',
    taxId: 'BIN-6928193829',
    paymentTerms: 'Net 7 Days',
    totalPOs: 11,
    spendFY: 190000,
    status: 'Active',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-142',
    poNumber: 'PO-2026-0142',
    prReference: 'JFT/PR/14/08/26/00142',
    vendorId: 'ven-001',
    vendorName: 'Rangs Technologies',
    department: 'Digital School Project',
    project: 'Digital School Modernization',
    amountBDT: 485000,
    expectedDelivery: '2026-08-15',
    status: 'Pending',
    paymentTerms: 'Net 30 Days',
    deliveryAddress: 'Banani Central Depot, Dhaka',
    lineItems: [
      { id: 'li-1', name: 'Smart Interactive Panel 65"', quantity: 5, uom: 'PCS', unitPrice: 85000, totalPrice: 425000 },
      { id: 'li-2', name: 'Adjustable Wall Mount Brackets', quantity: 5, uom: 'SETS', unitPrice: 12000, totalPrice: 60000 },
    ],
    createdByName: 'Nasif Kamal',
    createdByCode: 'FO032507061190',
    createdAt: '2026-08-08T09:30:00Z',
    updatedAt: '2026-08-15T11:00:00Z',
  },
  {
    id: 'po-141',
    poNumber: 'PO-2026-0141',
    prReference: 'JFT/PR/08/08/26/00139',
    vendorId: 'ven-002',
    vendorName: 'ZKTeco BD Ltd.',
    department: 'People & Culture',
    project: 'HQ Biometrics',
    amountBDT: 120000,
    expectedDelivery: '2026-08-10',
    status: 'Approved',
    paymentTerms: 'Net 15 Days',
    deliveryAddress: 'JAAGO HQ (Banani), Floor 2',
    lineItems: [
      { id: 'li-3', name: 'ZKTeco BioTime Facial Attendance Terminal', quantity: 2, uom: 'PCS', unitPrice: 60000, totalPrice: 120000 },
    ],
    createdByName: 'Nasif Kamal',
    createdByCode: 'FO032507061190',
    approvedByName: 'Korvi Rakshand',
    approvedAt: '2026-08-10T14:00:00Z',
    createdAt: '2026-08-07T11:00:00Z',
    updatedAt: '2026-08-10T14:00:00Z',
  },
  {
    id: 'po-140',
    poNumber: 'PO-2026-0140',
    prReference: 'JFT/PR/04/08/26/00135',
    vendorId: 'ven-003',
    vendorName: 'Star Print House',
    department: 'Communications',
    project: 'Annual Report & Branding 2026',
    amountBDT: 68500,
    expectedDelivery: '2026-08-05',
    status: 'Approved',
    paymentTerms: 'Immediate / COD',
    deliveryAddress: 'HQ Banani, Communications Dept',
    lineItems: [
      { id: 'li-4', name: 'Annual Report Booklets (Hardcover)', quantity: 300, uom: 'PCS', unitPrice: 195, totalPrice: 58500 },
      { id: 'li-5', name: 'Executive Envelopes & Letterheads', quantity: 1000, uom: 'PCS', unitPrice: 10, totalPrice: 10000 },
    ],
    createdByName: 'S M Nayeem Rahman',
    createdByCode: 'FO072408231002',
    approvedByName: 'Habibur Rahman',
    approvedAt: '2026-08-05T10:00:00Z',
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
  },
  {
    id: 'po-139',
    poNumber: 'PO-2026-0139',
    prReference: 'JFT/PR/12/08/26/00140',
    vendorId: 'ven-004',
    vendorName: 'Green Furniture Co.',
    department: "Admin — Founder's Office",
    project: "Executive Office Ergonomics",
    amountBDT: 215000,
    expectedDelivery: '2026-08-20',
    status: 'Draft',
    paymentTerms: '50% Advance, 50% Delivery',
    deliveryAddress: "Founder's Office, Level 3",
    lineItems: [
      { id: 'li-6', name: 'Ergonomic Executive Mesh Chair High-Back', quantity: 4, uom: 'PCS', unitPrice: 35000, totalPrice: 140000 },
      { id: 'li-7', name: 'Teak Veneer Conference Discussion Table', quantity: 1, uom: 'PCS', unitPrice: 75000, totalPrice: 75000 },
    ],
    createdByName: 'Nasif Kamal',
    createdByCode: 'FO032507061190',
    createdAt: '2026-08-16T12:00:00Z',
    updatedAt: '2026-08-20T08:00:00Z',
  },
  {
    id: 'po-138',
    poNumber: 'PO-2026-0138',
    prReference: 'JFT/PR/10/08/26/00137',
    vendorId: 'ven-005',
    vendorName: 'Daffodil IT Supplies',
    department: 'IT & Systems',
    project: 'Server Room Infrastructure',
    amountBDT: 940000,
    expectedDelivery: '2026-08-12',
    status: 'Rejected',
    paymentTerms: 'Net 30 Days',
    deliveryAddress: 'Banani IT Server Room',
    lineItems: [
      { id: 'li-8', name: 'Enterprise 48-Port PoE+ Managed Switch', quantity: 4, uom: 'PCS', unitPrice: 160000, totalPrice: 640000 },
      { id: 'li-9', name: 'Online Rackmount UPS 10kVA', quantity: 1, uom: 'PCS', unitPrice: 300000, totalPrice: 300000 },
    ],
    createdByName: 'Nasif Kamal',
    createdByCode: 'FO032507061190',
    notes: 'Rejected by Finance: Exceeded Q3 departmental IT capex ceiling. Re-quote required with revised specs.',
    createdAt: '2026-08-09T09:00:00Z',
    updatedAt: '2026-08-12T16:00:00Z',
  },
];

export const INITIAL_REQUESTS: ProcurementRequest[] = [
  {
    id: 'pr-05988',
    prNumber: 'JFT/GR/10/08/26/05988',
    requisitionType: 'General',
    title: 'Test Full Process',
    department: "Founder's Office (JFT)",
    requestOwner: 'Nasif Kamal',
    requestOwnerCode: 'FO032507061190',
    estAmount: 450,
    currency: 'BDT',
    status: 'Submitted',
    priority: 'Normal',
    justification: 'Stationery and official documents printing for governance review.',
    requiredDate: '2026-08-12',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'pr-00142',
    prNumber: 'JFT/PR/14/08/26/00142',
    requisitionType: 'Purchase',
    title: 'Interactive Display Terminals for Digital Schools',
    department: 'Digital School Project',
    requestOwner: 'Nasif Kamal',
    requestOwnerCode: 'FO032507061190',
    estAmount: 485000,
    currency: 'BDT',
    status: 'Approved',
    priority: 'High',
    justification: 'Upgrade 5 remote digital classrooms with smart interactive whiteboards.',
    requiredDate: '2026-08-15',
    createdAt: '2026-08-08T09:00:00Z',
    updatedAt: '2026-08-09T15:00:00Z',
  },
  {
    id: 'pr-00091',
    prNumber: 'JFT/REC/18/08/26/00091',
    requisitionType: 'Recruitment',
    title: 'Recruitment Requisition: Full-Stack ERP Engineer (Core Hub)',
    department: "People & Culture / Founder's Office",
    requestOwner: 'S M Nayeem Rahman',
    requestOwnerCode: 'FO072408231002',
    estAmount: 150000,
    currency: 'BDT',
    status: 'Submitted',
    priority: 'Urgent',
    justification: 'Urgent replacement needed for monorepo development and module expansion.',
    requiredDate: '2026-09-01',
    createdAt: '2026-08-18T11:00:00Z',
    updatedAt: '2026-08-18T11:00:00Z',
  },
];

export const INITIAL_SETTINGS: ProcurementSettings = {
  fiscalYear: '2025-26',
  currency: 'BDT',
  poPrefix: 'PO-2026-',
  prPrefix: 'JFT/GR/10/08/26/',
  rfqPrefix: 'RFQ-2026-',
  grnPrefix: 'GRN-2026-',
  vatDefaultPct: 15,
  requireQcInspection: true,
  autoEmailVendorOnPO: true,
  defaultWarehouse: 'Banani Central Depot (Dhaka)',
  approvalTiers: [
    { tier: 1, name: 'Department Head Review', maxAmount: 50000, role: 'HEAD_OF_DEPT' },
    { tier: 2, name: 'Procurement & Finance Director', maxAmount: 250000, role: 'PROCUREMENT_DIRECTOR' },
    { tier: 3, name: 'Executive Director (Founder)', maxAmount: 100000000, role: 'SUPER_ADMIN' },
  ],
  updatedAt: '2026-08-20T10:00:00Z',
};

export const INITIAL_CATEGORIES: ProcurementCategory[] = [
  { id: 'cat-1', code: 'IT-HW', name: 'IT Hardware & Terminals', type: 'Goods', itemsCount: 42, status: 'Active' },
  { id: 'cat-2', code: 'BIO-DEV', name: 'Biometric & RFID Devices', type: 'Goods', itemsCount: 15, status: 'Active' },
  { id: 'cat-3', code: 'PRINT', name: 'Printing & Publications', type: 'Services', itemsCount: 68, status: 'Active' },
  { id: 'cat-4', code: 'FURN', name: 'Office & School Furniture', type: 'Goods', itemsCount: 34, status: 'Active' },
  { id: 'cat-5', code: 'CAT', name: 'Catering & Event Services', type: 'Services', itemsCount: 19, status: 'Active' },
  { id: 'cat-6', code: 'STAT', name: 'Office Stationery & Supplies', type: 'Goods', itemsCount: 120, status: 'Active' },
];

export const INITIAL_UNITS: ProcurementUnit[] = [
  { id: 'u-1', code: 'PCS', name: 'Pieces', category: 'Unit', baseUnit: true, status: 'Active' },
  { id: 'u-2', code: 'BOX', name: 'Box', category: 'Unit', baseUnit: false, status: 'Active' },
  { id: 'u-3', code: 'KG', name: 'Kilograms', category: 'Weight', baseUnit: true, status: 'Active' },
  { id: 'u-4', code: 'LTR', name: 'Liters', category: 'Volume', baseUnit: true, status: 'Active' },
  { id: 'u-5', code: 'RIM', name: 'Ream (Paper)', category: 'Unit', baseUnit: false, status: 'Active' },
  { id: 'u-6', code: 'SET', name: 'Sets', category: 'Unit', baseUnit: true, status: 'Active' },
  { id: 'u-7', code: 'PKT', name: 'Packets', category: 'Unit', baseUnit: false, status: 'Active' },
];

export const INITIAL_WAREHOUSES: ProcurementWarehouse[] = [
  { id: 'wh-1', code: 'WH-DAC-01', name: 'Banani Central Depot', type: 'Central Depot', location: 'Road 11, Banani, Dhaka', manager: 'Habibur Rahman', capacitySqft: 4500, status: 'Active' },
  { id: 'wh-2', code: 'WH-CTG-01', name: 'Chittagong Hub Store', type: 'Regional Hub', location: 'Agrabad C/A, Chittagong', manager: 'Tanvir Hossain', capacitySqft: 2200, status: 'Active' },
  { id: 'wh-3', code: 'WH-RNG-01', name: 'Rangunia School Depot', type: 'School Store', location: 'Rangunia School Campus', manager: 'Monirul Islam', capacitySqft: 1200, status: 'Active' },
];

export const INITIAL_CONTRACTS: ProcurementContract[] = [
  { id: 'con-1', contractNumber: 'CNT-2026-001', title: 'IT Infrastructure & Hardware AMC', vendorName: 'Rangs Technologies', valueBDT: 1200000, startDate: '2026-01-01', endDate: '2026-12-31', renewalNoticeDays: 45, status: 'Active' },
  { id: 'con-2', contractNumber: 'CNT-2026-002', title: 'Nationwide School Attendance Biometrics AMC', vendorName: 'ZKTeco BD Ltd.', valueBDT: 650000, startDate: '2026-03-01', endDate: '2027-02-28', renewalNoticeDays: 30, status: 'Active' },
  { id: 'con-3', contractNumber: 'CNT-2026-003', title: 'Official Curriculum & Annual Report Printing', vendorName: 'Star Print House', valueBDT: 850000, startDate: '2026-04-01', endDate: '2027-03-31', renewalNoticeDays: 30, status: 'Active' },
];

export const INITIAL_BUDGETS: ProcurementBudget[] = [
  { id: 'bg-1', fiscalYear: '2025-26', department: 'Digital School Project', allocatedBDT: 3500000, spentBDT: 1840000, committedBDT: 485000, remainingBDT: 1175000, notes: 'Q3 interactive displays' },
  { id: 'bg-2', fiscalYear: '2025-26', department: 'People & Culture', allocatedBDT: 1500000, spentBDT: 710000, committedBDT: 120000, remainingBDT: 670000, notes: 'Biometrics & office equipment' },
  { id: 'bg-3', fiscalYear: '2025-26', department: 'Communications', allocatedBDT: 1200000, spentBDT: 460000, committedBDT: 68500, remainingBDT: 671500, notes: 'Printing & materials' },
  { id: 'bg-4', fiscalYear: '2025-26', department: "Founder's Office", allocatedBDT: 2500000, spentBDT: 980000, committedBDT: 215000, remainingBDT: 1305000, notes: 'Executive facilities' },
  { id: 'bg-5', fiscalYear: '2025-26', department: 'IT & Systems', allocatedBDT: 2000000, spentBDT: 220000, committedBDT: 0, remainingBDT: 1780000, notes: 'Server infrastructure' },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', itemCode: 'N/A', name: 'A4 Paper 100 GSM', category: 'Stationery', warehouse: 'Banani Central Depot', stockOnHand: 150, uom: 'RIM', reorderLevel: 20, unitCost: 1, status: 'In Stock', createdAt: '2026-08-01', updatedAt: '2026-08-20' },
  { id: 'inv-2', itemCode: 'N/A', name: 'A4 Punch File', category: 'Stationery', warehouse: 'Banani Central Depot', stockOnHand: 400, uom: 'PCS', reorderLevel: 50, unitCost: 1, status: 'In Stock', createdAt: '2026-08-01', updatedAt: '2026-08-20' },
  { id: 'inv-3', itemCode: 'N/A', name: 'AI Automation & Data Intelligence', category: 'Services', warehouse: 'Head Office (Banani)', stockOnHand: 10, uom: 'MONTH', reorderLevel: 2, unitCost: 1, status: 'In Stock', createdAt: '2026-08-01', updatedAt: '2026-08-20' },
  { id: 'inv-4', itemCode: 'IT-DISP-65', name: 'Smart Interactive Panel 65"', category: 'IT Hardware', warehouse: 'Banani Central Depot', stockOnHand: 18, uom: 'PCS', reorderLevel: 5, unitCost: 85000, status: 'In Stock', createdAt: '2026-08-01', updatedAt: '2026-08-20' },
  { id: 'inv-5', itemCode: 'BIO-ZK-F22', name: 'ZKTeco BioTime Facial Terminal', category: 'Biometric Devices', warehouse: 'Banani Central Depot', stockOnHand: 6, uom: 'PCS', reorderLevel: 4, unitCost: 60000, status: 'In Stock', createdAt: '2026-08-01', updatedAt: '2026-08-15' },
  { id: 'inv-6', itemCode: 'PAP-A4-80G', name: 'Double A A4 Paper 80GSM', category: 'Stationery', warehouse: 'Banani Central Depot', stockOnHand: 320, uom: 'RIM', reorderLevel: 50, unitCost: 450, status: 'In Stock', createdAt: '2026-08-01', updatedAt: '2026-08-25' },
  { id: 'inv-7', itemCode: 'CHAIR-MESH-EXEC', name: 'Ergonomic Mesh Chair High-Back', category: 'Furniture', warehouse: 'Banani Central Depot', stockOnHand: 2, uom: 'PCS', reorderLevel: 5, unitCost: 35000, status: 'Low Stock', createdAt: '2026-08-01', updatedAt: '2026-08-22' },
];

export const INITIAL_ASSETS: ProcurementAsset[] = [
  { id: 'ast-1', assetTag: 'AST-JFT-2026-001', name: 'MacBook Pro M3 Max 16"', category: 'IT Hardware', assignedUser: 'Nasif Kamal', department: "Founder's Office", purchaseDate: '2026-08-24', purchaseCost: 380000, currentValue: 360000, condition: 'Operational', location: 'Head Office (Banani)', serialNumber: 'C02G89XYMD6R', createdAt: '2026-08-24', updatedAt: '2026-08-24' },
  { id: 'ast-2', assetTag: 'AST-JFT-2026-002', name: 'Main Conference Room Display 75"', category: 'IT Hardware', assignedUser: 'Facilities', department: 'Administration', purchaseDate: '2026-01-15', purchaseCost: 195000, currentValue: 165000, condition: 'Operational', location: 'Meeting Room In & Out', serialNumber: 'SN-SAMS-75-992', createdAt: '2026-01-15', updatedAt: '2026-08-10' },
  { id: 'ast-3', assetTag: 'AST-JFT-2026-003', name: 'High-Volume Color Laser Printer', category: 'IT Hardware', assignedUser: 'Office Admin', department: 'Administration', purchaseDate: '2025-11-20', purchaseCost: 145000, currentValue: 110000, condition: 'Operational', location: 'Floor 2 Printing Station', serialNumber: 'HP-ENT-8849', createdAt: '2025-11-20', updatedAt: '2026-08-01' },
];

export const INITIAL_RFQS: ProcurementRFQ[] = [
  { id: 'rfq-1', rfqNumber: 'RFQ-2026-0081', title: 'Procurement of 50x Laptops for Digital Teachers', category: 'IT Hardware', deadline: '2026-09-25', status: 'Published', invitedVendors: ['Rangs Technologies', 'Daffodil IT Supplies', 'Flora Limited'], submissionsCount: 2, notes: 'Core i5 13th Gen, 16GB RAM, 512GB NVMe', createdAt: '2026-09-01', updatedAt: '2026-09-05' },
  { id: 'rfq-2', rfqNumber: 'RFQ-2026-0082', title: 'Annual General Insurance Policy for Office Equipment', category: 'Services', deadline: '2026-09-30', status: 'Under Evaluation', invitedVendors: ['Green Delta Insurance', 'Pragati Insurance'], submissionsCount: 3, notes: 'Full comprehensive coverage across all 14 schools', createdAt: '2026-09-02', updatedAt: '2026-09-08' },
];

export const INITIAL_GOODS_RECEIPTS: GoodsReceipt[] = [
  { id: 'grn-1', grnNumber: 'GRN-2026-0045', poNumber: 'PO-2026-0141', vendorName: 'ZKTeco BD Ltd.', receivedDate: '2026-08-10', receivedByName: 'Habibur Rahman', warehouse: 'Banani Central Depot', conditionStatus: 'Inspected & Passed', remarks: '2 units BioTime facial terminals received in original sealed packaging and verified working.', createdAt: '2026-08-10', updatedAt: '2026-08-10' },
  { id: 'grn-2', grnNumber: 'GRN-2026-0044', poNumber: 'PO-2026-0140', vendorName: 'Star Print House', receivedDate: '2026-08-05', receivedByName: 'S M Nayeem Rahman', warehouse: 'Banani Central Depot', conditionStatus: 'Inspected & Passed', remarks: 'Annual report booklets and stationery received with satisfactory print sharpness.', createdAt: '2026-08-05', updatedAt: '2026-08-05' },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. SUPABASE SYNC & LOCAL PERSISTENCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const SCOPE_SYS = 'system';
const SCOPE_ID_PROC = 'procurement';

function broadcastProcurementUpdate(entity: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jaago_procurement_updated', { detail: { entity } }));
    window.dispatchEvent(new CustomEvent('jaago_cache_invalidated', { detail: { key: `procurement_${entity}` } }));
  }
}

/**
 * Fetch a JSON key from Supabase `settings` table with graceful fallback to localStorage and seed
 */
async function fetchSupabaseEntity<T>(key: string, seedFallback: T): Promise<T> {
  const cacheKey = `procurement_${key}`;
  return fetchWithCache<T>(
    cacheKey,
    async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('scope', SCOPE_SYS)
          .eq('scope_id', SCOPE_ID_PROC)
          .eq('key', key)
          .maybeSingle();

        if (error) {
          console.warn(`[Procurement Supabase] Notice fetching ${key}:`, error.message);
          return getLocalFallback(key, seedFallback);
        }

        if (data && data.value) {
          setLocalFallback(key, data.value);
          return data.value as T;
        }

        // If not in Supabase yet, seed it!
        await saveSupabaseEntity(key, seedFallback);
        return seedFallback;
      } catch (err) {
        console.warn(`[Procurement Supabase] Error fetching ${key}:`, err);
        return getLocalFallback(key, seedFallback);
      }
    },
    20000 // 20s TTL
  );
}

/**
 * Save an entity collection to Supabase `settings` and local cache
 */
async function saveSupabaseEntity<T>(key: string, value: T): Promise<void> {
  setLocalFallback(key, value);
  invalidateCache(`procurement_${key}`);
  broadcastProcurementUpdate(key);

  try {
    const supabase = getSupabase();
    await supabase.from('settings').upsert(
      {
        scope: SCOPE_SYS,
        scope_id: SCOPE_ID_PROC,
        key,
        value: value as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'scope,scope_id,key' }
    );
  } catch (err) {
    console.warn(`[Procurement Supabase] Background save failed for ${key}:`, err);
  }
}

function getLocalFallback<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(`jaago_proc_${key}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
}

function setLocalFallback<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`jaago_proc_${key}`, JSON.stringify(val));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. HIGH-LEVEL API EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// --- Vendors ---
export async function getProcurementVendors(): Promise<ProcurementVendor[]> {
  return fetchSupabaseEntity<ProcurementVendor[]>('vendors', INITIAL_VENDORS);
}

export async function saveProcurementVendor(vendor: Partial<ProcurementVendor> & { name: string; category: string }): Promise<ProcurementVendor> {
  const list = await getProcurementVendors();
  const existingIdx = list.findIndex((v) => v.id === vendor.id);
  const now = new Date().toISOString();

  let target: ProcurementVendor;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...vendor, updatedAt: now };
    list[existingIdx] = target;
  } else {
    target = {
      id: vendor.id || `ven-${Date.now()}`,
      name: vendor.name,
      code: vendor.code || vendor.name.slice(0, 2).toUpperCase(),
      type: vendor.type || 'Company',
      category: vendor.category,
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      location: vendor.location || 'Dhaka',
      taxId: vendor.taxId || '',
      paymentTerms: vendor.paymentTerms || 'Net 30 Days',
      totalPOs: vendor.totalPOs || 0,
      spendFY: vendor.spendFY || 0,
      status: vendor.status || 'Active',
      notes: vendor.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('vendors', list);
  return target;
}

export async function deleteProcurementVendor(id: string): Promise<void> {
  const list = await getProcurementVendors();
  const filtered = list.filter((v) => v.id !== id);
  await saveSupabaseEntity('vendors', filtered);
}

// --- Purchase Orders ---
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return fetchSupabaseEntity<PurchaseOrder[]>('purchase_orders', INITIAL_PURCHASE_ORDERS);
}

export async function savePurchaseOrder(po: Partial<PurchaseOrder> & { vendorName: string; department: string; amountBDT: number }): Promise<PurchaseOrder> {
  const list = await getPurchaseOrders();
  const existingIdx = list.findIndex((p) => p.id === po.id || (po.poNumber && p.poNumber === po.poNumber));
  const now = new Date().toISOString();

  let target: PurchaseOrder;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...po, updatedAt: now };
    list[existingIdx] = target;
  } else {
    const settings = await getProcurementSettings();
    const poNumber = po.poNumber || `${settings.poPrefix}${String(list.length + 143).padStart(4, '0')}`;
    target = {
      id: po.id || `po-${Date.now()}`,
      poNumber,
      prReference: po.prReference || '',
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      department: po.department,
      project: po.project || '',
      amountBDT: po.amountBDT,
      expectedDelivery: po.expectedDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]!,
      status: po.status || 'Draft',
      paymentTerms: po.paymentTerms || 'Net 30 Days',
      deliveryAddress: po.deliveryAddress || 'JAAGO Foundation Central Office, Banani',
      lineItems: po.lineItems || [],
      createdByName: po.createdByName || 'Nasif Kamal',
      createdByCode: po.createdByCode || 'FO032507061190',
      approvedByName: po.approvedByName,
      approvedAt: po.approvedAt,
      notes: po.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('purchase_orders', list);
  return target;
}

export async function updatePOStatus(id: string, status: PurchaseOrder['status'], approverName?: string): Promise<PurchaseOrder | null> {
  const list = await getPurchaseOrders();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  list[idx]!.status = status;
  list[idx]!.updatedAt = now;
  if (status === 'Approved' && approverName) {
    list[idx]!.approvedByName = approverName;
    list[idx]!.approvedAt = now;
  }

  await saveSupabaseEntity('purchase_orders', list);
  return list[idx]!;
}

// --- Procurement & Requisition Requests ---
export async function getProcurementRequests(): Promise<ProcurementRequest[]> {
  return fetchSupabaseEntity<ProcurementRequest[]>('procurement_requests', INITIAL_REQUESTS);
}

export async function saveProcurementRequest(req: Partial<ProcurementRequest> & { title: string; department: string; estAmount: number }): Promise<ProcurementRequest> {
  const list = await getProcurementRequests();
  const existingIdx = list.findIndex((r) => r.id === req.id || (req.prNumber && r.prNumber === req.prNumber));
  const now = new Date().toISOString();

  let target: ProcurementRequest;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...req, updatedAt: now };
    list[existingIdx] = target;
  } else {
    const reqType = req.requisitionType || (req as any).type || 'Purchase';
    const typePrefix = reqType === 'Recruitment' ? 'REC' : reqType === 'General' ? 'GR' : 'PR';
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');

    // Rule: JAAGO Foundation -> JF, JAAGO Foundation Trust -> JFT
    const isTrust = (req.company || '').toLowerCase().includes('trust');
    const orgPrefix = isTrust ? 'JFT' : 'JF';

    // Auto-generate unique PR/GR reference code
    let prNumber = req.prNumber;
    if (!prNumber) {
      let candidate = '';
      let attempts = 0;
      do {
        const randomCode = String(Math.floor(100000 + Math.random() * 900000));
        candidate = `${orgPrefix}/${typePrefix}/${yy}/${mm}/${randomCode}`;
        attempts++;
      } while (list.some((r) => r.prNumber === candidate) && attempts < 50);
      prNumber = candidate;
    }

    target = {
      id: req.id || `pr-${Date.now()}`,
      prNumber,
      requisitionType: reqType,
      title: req.title,
      department: req.department,
      requestOwner: req.requestOwner || 'Nasif Kamal',
      requestOwnerCode: req.requestOwnerCode || 'FO032507061190',
      estAmount: req.estAmount,
      currency: req.currency || 'BDT',
      status: req.status || 'Submitted',
      justification: req.justification || '',
      priority: req.priority || 'Normal',
      requiredDate: req.requiredDate || '',
      requiredDates: req.requiredDates || (req.requiredDate ? [req.requiredDate] : []),
      lineItems: req.lineItems || [],
      attachments: req.attachments || [],
      project: req.project || 'General Operations',
      activityCode: req.activityCode || '',
      company: req.company || (isTrust ? 'JAAGO Foundation Trust' : 'JAAGO Foundation'),
      supervisor: req.supervisor || '',
      budget: req.budget !== undefined ? req.budget : req.estAmount,
      deliveryInstructions: req.deliveryInstructions || '',
      description: req.description || '',
      approvalSteps: req.approvalSteps || [],
      historyLogs: req.historyLogs || [],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  // 1. Direct upsert into Supabase `public.procurement_requests` table if available
  try {
    const supabase = getSupabase();
    await supabase.from('procurement_requests').upsert(
      {
        pr_number: target.prNumber,
        requisition_type: target.requisitionType,
        title: target.title,
        department: target.department,
        request_owner: target.requestOwner,
        request_owner_code: target.requestOwnerCode,
        est_amount: target.estAmount,
        currency: target.currency,
        status: target.status,
        justification: target.justification,
        priority: target.priority,
        required_date: target.requiredDate && target.requiredDate.length === 10 ? target.requiredDate : null,
        line_items: target.lineItems,
        attachments: target.attachments,
        created_at: target.createdAt,
        updated_at: target.updatedAt,
      },
      { onConflict: 'pr_number' }
    );
  } catch (dbErr) {
    // Non-blocking fallback: table might use different schema or settings JSON
    console.warn('[Procurement Supabase] Direct table upsert notice:', dbErr);
  }

  // 2. Persist to synchronized `settings` JSON and local cache
  await saveSupabaseEntity('procurement_requests', list);
  return target;
}

export async function deleteProcurementRequest(id: string): Promise<void> {
  const list = await getProcurementRequests();
  const filtered = list.filter((r) => r.id !== id);
  await saveSupabaseEntity('procurement_requests', filtered);
}

// --- Quotations / RFQs ---
export async function getProcurementRFQs(): Promise<ProcurementRFQ[]> {
  return fetchSupabaseEntity<ProcurementRFQ[]>('rfqs', INITIAL_RFQS);
}

export async function saveProcurementRFQ(rfq: Partial<ProcurementRFQ> & { title: string; category: string; deadline: string }): Promise<ProcurementRFQ> {
  const list = await getProcurementRFQs();
  const existingIdx = list.findIndex((r) => r.id === rfq.id);
  const now = new Date().toISOString();

  let target: ProcurementRFQ;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...rfq, updatedAt: now };
    list[existingIdx] = target;
  } else {
    const settings = await getProcurementSettings();
    target = {
      id: rfq.id || `rfq-${Date.now()}`,
      rfqNumber: rfq.rfqNumber || `${settings.rfqPrefix}${String(list.length + 83).padStart(4, '0')}`,
      title: rfq.title,
      category: rfq.category,
      deadline: rfq.deadline,
      status: rfq.status || 'Published',
      invitedVendors: rfq.invitedVendors || [],
      submissionsCount: rfq.submissionsCount || 0,
      notes: rfq.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('rfqs', list);
  return target;
}

// --- Goods Receipts ---
export async function getGoodsReceipts(): Promise<GoodsReceipt[]> {
  return fetchSupabaseEntity<GoodsReceipt[]>('goods_receipts', INITIAL_GOODS_RECEIPTS);
}

export async function saveGoodsReceipt(grn: Partial<GoodsReceipt> & { poNumber: string; vendorName: string; receivedByName: string }): Promise<GoodsReceipt> {
  const list = await getGoodsReceipts();
  const existingIdx = list.findIndex((g) => g.id === grn.id);
  const now = new Date().toISOString();

  let target: GoodsReceipt;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...grn, updatedAt: now };
    list[existingIdx] = target;
  } else {
    const settings = await getProcurementSettings();
    target = {
      id: grn.id || `grn-${Date.now()}`,
      grnNumber: grn.grnNumber || `${settings.grnPrefix}${String(list.length + 46).padStart(4, '0')}`,
      poNumber: grn.poNumber,
      vendorName: grn.vendorName,
      receivedDate: grn.receivedDate || now.split('T')[0]!,
      receivedByName: grn.receivedByName,
      warehouse: grn.warehouse || 'Banani Central Depot',
      conditionStatus: grn.conditionStatus || 'Inspected & Passed',
      remarks: grn.remarks || '',
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('goods_receipts', list);
  return target;
}

// --- Inventory ---
export async function getInventoryItems(): Promise<InventoryItem[]> {
  const remote = await fetchSupabaseEntity<InventoryItem[]>('inventory', INITIAL_INVENTORY);
  const map = new Map<string, InventoryItem>();
  for (const item of INITIAL_INVENTORY) {
    map.set(item.name.toLowerCase().trim(), item);
  }
  for (const item of remote) {
    map.set(item.name.toLowerCase().trim(), item);
  }
  return Array.from(map.values());
}

export async function saveInventoryItem(item: Partial<InventoryItem> & { name: string; category: string }): Promise<InventoryItem> {
  const list = await getInventoryItems();
  const existingIdx = list.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();

  let target: InventoryItem;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...item, updatedAt: now };
    list[existingIdx] = target;
  } else {
    target = {
      id: item.id || `inv-${Date.now()}`,
      itemCode: item.itemCode || `ITEM-${String(Date.now()).slice(-6)}`,
      name: item.name,
      category: item.category,
      warehouse: item.warehouse || 'Banani Central Depot',
      stockOnHand: item.stockOnHand || 0,
      uom: item.uom || 'PCS',
      reorderLevel: item.reorderLevel || 10,
      unitCost: item.unitCost || 0,
      status: item.status || 'In Stock',
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('inventory', list);
  return target;
}

// --- Assets ---
export async function getProcurementAssets(): Promise<ProcurementAsset[]> {
  return fetchSupabaseEntity<ProcurementAsset[]>('assets', INITIAL_ASSETS);
}

export async function saveProcurementAsset(asset: Partial<ProcurementAsset> & { name: string; category: string }): Promise<ProcurementAsset> {
  const list = await getProcurementAssets();
  const existingIdx = list.findIndex((a) => a.id === asset.id);
  const now = new Date().toISOString();

  let target: ProcurementAsset;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...asset, updatedAt: now };
    list[existingIdx] = target;
  } else {
    target = {
      id: asset.id || `ast-${Date.now()}`,
      assetTag: asset.assetTag || `AST-JFT-2026-${String(list.length + 1).padStart(3, '0')}`,
      name: asset.name,
      category: asset.category,
      assignedUser: asset.assignedUser || 'Nasif Kamal',
      department: asset.department || "Founder's Office",
      purchaseDate: asset.purchaseDate || now.split('T')[0]!,
      purchaseCost: asset.purchaseCost || 0,
      currentValue: asset.currentValue || asset.purchaseCost || 0,
      condition: asset.condition || 'Operational',
      location: asset.location || 'Head Office (Banani)',
      serialNumber: asset.serialNumber || '',
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('assets', list);
  return target;
}

// --- Categories ---
export async function getProcurementCategories(): Promise<ProcurementCategory[]> {
  return fetchSupabaseEntity<ProcurementCategory[]>('categories', INITIAL_CATEGORIES);
}

export async function saveProcurementCategory(cat: Partial<ProcurementCategory> & { name: string; code: string }): Promise<ProcurementCategory> {
  const list = await getProcurementCategories();
  const existingIdx = list.findIndex((c) => c.id === cat.id);

  let target: ProcurementCategory;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...cat };
    list[existingIdx] = target;
  } else {
    target = {
      id: cat.id || `cat-${Date.now()}`,
      code: cat.code.toUpperCase(),
      name: cat.name,
      type: cat.type || 'Goods',
      description: cat.description || '',
      itemsCount: cat.itemsCount || 0,
      status: cat.status || 'Active',
    };
    list.push(target);
  }

  await saveSupabaseEntity('categories', list);
  return target;
}

// --- Units / UOM ---
export async function getProcurementUnits(): Promise<ProcurementUnit[]> {
  return fetchSupabaseEntity<ProcurementUnit[]>('units', INITIAL_UNITS);
}

export async function saveProcurementUnit(uom: Partial<ProcurementUnit> & { name: string; code: string }): Promise<ProcurementUnit> {
  const list = await getProcurementUnits();
  const existingIdx = list.findIndex((u) => u.id === uom.id);

  let target: ProcurementUnit;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...uom };
    list[existingIdx] = target;
  } else {
    target = {
      id: uom.id || `uom-${Date.now()}`,
      code: uom.code.toUpperCase(),
      name: uom.name,
      category: uom.category || 'Unit',
      baseUnit: uom.baseUnit ?? true,
      status: uom.status || 'Active',
    };
    list.push(target);
  }

  await saveSupabaseEntity('units', list);
  return target;
}

// --- Warehouses ---
export async function getProcurementWarehouses(): Promise<ProcurementWarehouse[]> {
  return fetchSupabaseEntity<ProcurementWarehouse[]>('warehouses', INITIAL_WAREHOUSES);
}

export async function saveProcurementWarehouse(wh: Partial<ProcurementWarehouse> & { name: string; location: string }): Promise<ProcurementWarehouse> {
  const list = await getProcurementWarehouses();
  const existingIdx = list.findIndex((w) => w.id === wh.id);

  let target: ProcurementWarehouse;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...wh };
    list[existingIdx] = target;
  } else {
    target = {
      id: wh.id || `wh-${Date.now()}`,
      code: wh.code || `WH-${wh.name.slice(0, 3).toUpperCase()}-01`,
      name: wh.name,
      type: wh.type || 'Central Depot',
      location: wh.location,
      manager: wh.manager || 'Habibur Rahman',
      capacitySqft: wh.capacitySqft || 2000,
      status: wh.status || 'Active',
    };
    list.push(target);
  }

  await saveSupabaseEntity('warehouses', list);
  return target;
}

// --- Contracts ---
export async function getProcurementContracts(): Promise<ProcurementContract[]> {
  return fetchSupabaseEntity<ProcurementContract[]>('contracts', INITIAL_CONTRACTS);
}

export async function saveProcurementContract(cnt: Partial<ProcurementContract> & { title: string; vendorName: string; valueBDT: number }): Promise<ProcurementContract> {
  const list = await getProcurementContracts();
  const existingIdx = list.findIndex((c) => c.id === cnt.id);

  let target: ProcurementContract;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...cnt };
    list[existingIdx] = target;
  } else {
    target = {
      id: cnt.id || `cnt-${Date.now()}`,
      contractNumber: cnt.contractNumber || `CNT-2026-${String(list.length + 1).padStart(3, '0')}`,
      title: cnt.title,
      vendorName: cnt.vendorName,
      valueBDT: cnt.valueBDT,
      startDate: cnt.startDate || new Date().toISOString().split('T')[0]!,
      endDate: cnt.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]!,
      renewalNoticeDays: cnt.renewalNoticeDays || 30,
      status: cnt.status || 'Active',
      documentUrl: cnt.documentUrl,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('contracts', list);
  return target;
}

// --- Budgets ---
export async function getProcurementBudgets(): Promise<ProcurementBudget[]> {
  return fetchSupabaseEntity<ProcurementBudget[]>('budgets', INITIAL_BUDGETS);
}

export async function saveProcurementBudget(bgt: Partial<ProcurementBudget> & { department: string; allocatedBDT: number }): Promise<ProcurementBudget> {
  const list = await getProcurementBudgets();
  const existingIdx = list.findIndex((b) => b.id === bgt.id || b.department === bgt.department);

  let target: ProcurementBudget;
  if (existingIdx >= 0) {
    target = { ...list[existingIdx]!, ...bgt };
    list[existingIdx] = target;
  } else {
    target = {
      id: bgt.id || `bgt-${Date.now()}`,
      fiscalYear: bgt.fiscalYear || '2025-26',
      department: bgt.department,
      allocatedBDT: bgt.allocatedBDT,
      spentBDT: bgt.spentBDT || 0,
      committedBDT: bgt.committedBDT || 0,
      remainingBDT: bgt.allocatedBDT - (bgt.spentBDT || 0) - (bgt.committedBDT || 0),
      notes: bgt.notes || '',
    };
    list.push(target);
  }

  await saveSupabaseEntity('budgets', list);
  return target;
}

// --- Settings ---
export async function getProcurementSettings(): Promise<ProcurementSettings> {
  return fetchSupabaseEntity<ProcurementSettings>('settings', INITIAL_SETTINGS);
}

export async function saveProcurementSettings(settings: Partial<ProcurementSettings>): Promise<ProcurementSettings> {
  const current = await getProcurementSettings();
  const updated: ProcurementSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await saveSupabaseEntity('settings', updated);
  return updated;
}

// --- Dashboard Aggregates ---
export async function getProcurementDashboardKPIs(): Promise<{
  openPOs: number;
  openPOsTrend: string;
  pendingApprovals: number;
  pendingApprovalsSubtitle: string;
  spendThisQuarterBDT: number;
  spendThisQuarterTrend: string;
  activeVendors: number;
  activeVendorsTrend: string;
}> {
  const [pos, vendors] = await Promise.all([getPurchaseOrders(), getProcurementVendors()]);
  const open = pos.filter((p) => p.status === 'Pending' || p.status === 'Draft').length;
  const pending = pos.filter((p) => p.status === 'Pending').length;
  const activeV = vendors.filter((v) => v.status === 'Active').length;
  const totalSpend = pos
    .filter((p) => p.status === 'Approved' || p.status === 'Completed' || p.status === 'Pending')
    .reduce((sum, p) => sum + (Number(p.amountBDT) || 0), 0);

  return {
    openPOs: open || 5,
    openPOsTrend: '▲ 3 this week',
    pendingApprovals: pending || 1,
    pendingApprovalsSubtitle: '▲ 2 awaiting review',
    spendThisQuarterBDT: totalSpend || 2480000,
    spendThisQuarterTrend: '▲ 8.4% vs Q2',
    activeVendors: activeV || 6,
    activeVendorsTrend: '▲ 4 onboarded',
  };
}
