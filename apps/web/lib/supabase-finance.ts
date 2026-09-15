import { getSupabase } from './supabase-auth';
import { fetchWithCache, invalidateCache } from './data-cache';

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & DOMAIN INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface BillAttachment {
  name: string;
  size?: string | undefined;
  url?: string | undefined;
  type?: string | undefined;
  uploadedAt?: string | undefined;
}

export interface LongTravelItem {
  id: string;
  budgetLine: string;
  date: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  mode: string;
  cost: number;
  billAttachment?: BillAttachment | null | undefined;
}

export interface AccommodationItem {
  id: string;
  budgetLine: string;
  districtCity: string;
  fromDate: string;
  toDate: string;
  hotelName: string;
  tariffPerDay: number;
  days: number;
  total: number;
  billAttachment?: BillAttachment | null | undefined;
}

export interface PerDiemItem {
  id: string;
  budgetLine: string;
  date: string;
  start: string;
  end: string;
  applicable: boolean;
  breakfast: number;
  lunch: number;
  dinner: number;
  incidental: number;
  total: number;
  billAttachment?: BillAttachment | null | undefined;
}

export interface LocalConveyanceItem {
  id: string;
  budgetLine: string;
  date: string;
  start: string;
  end: string;
  from: string;
  to: string;
  mode: string;
  amount: number;
  billAttachment?: BillAttachment | null | undefined;
}

export interface ProgramExpenseItem {
  id: string;
  date: string;
  itemDescription: string;
  budgetLine: string;
  unit: number;
  unitCost: number;
  total: number;
  billAttachment?: BillAttachment | null | undefined;
}

export interface FinanceApprovalStep {
  stepNumber: number;
  stepName: string;
  approverName: string;
  approverRole: string;
  approverEmail?: string | undefined;
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  signedAt?: string | undefined;
  comments?: string | undefined;
}

export interface FinanceHistoryLog {
  action: string;
  actor: string;
  details?: string | undefined;
  timestamp: string;
}

export interface FinanceAttachment {
  id: string;
  name: string;
  size?: string | undefined;
  url?: string | undefined;
  fileType?: string | undefined;
}

export interface FinanceAdvanceRequest {
  id: string;
  expenseCode: string; // e.g. EXP-000434
  title: string; // Subject / Purpose of visit / expense
  employeeName: string;
  employeeCode: string;
  employeeDesignation: string;
  department: string;
  project: string;
  activityCode: string; // Activity code / Budget Line
  visitingPlace: string;
  duration: string; // e.g. "3 Days"
  requestDate: string; // YYYY-MM-DD
  cashRequiredDate: string; // YYYY-MM-DD
  
  // Bank Information
  bankName: string;
  bankAccountNumber: string;
  routingNumber: string;
  bankAddress: string;

  // Remarks
  remarks?: string | undefined;

  // 5 Dynamic Expense Sections
  longTravelItems: LongTravelItem[];
  accommodationItems: AccommodationItem[];
  perDiemItems: PerDiemItem[];
  localConveyanceItems: LocalConveyanceItem[];
  programExpenseItems: ProgramExpenseItem[];

  // Subtotals
  longTravelSubtotal: number;
  accommodationSubtotal: number;
  perDiemSubtotal: number;
  localConveyanceSubtotal: number;
  programExpensesSubtotal: number;
  totalAmount: number; // Sum of 5 subtotals in BDT

  currency: string; // BDT
  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Approved' | 'Rejected' | 'Settled';
  approvalSteps: FinanceApprovalStep[];
  historyLogs: FinanceHistoryLog[];
  attachments?: FinanceAttachment[] | undefined;

  createdAt: string;
  updatedAt: string;
}

export interface FinanceLiquidationForm {
  id: string;
  liquidationCode: string; // e.g. LIQ-000434
  linkedAdvanceId?: string | undefined;
  linkedAdvanceCode?: string | undefined; // e.g. EXP-000434
  advanceAmountTaken: number; // e.g. 45000

  subject: string;
  employeeName: string;
  employeeCode: string;
  employeeDesignation: string;
  department: string;
  project: string;
  activityCode: string;
  visitingPlace: string;
  duration: string;

  dateAdvanceTaken: string;
  dateOfAdjustment: string;
  dateOfActualAdjustment: string;
  currency: string;
  justificationForDelay?: string | undefined;

  bankName?: string | undefined;
  bankAccountNumber?: string | undefined;

  // Actual incurred expense rows
  longTravelItems: LongTravelItem[];
  accommodationItems: AccommodationItem[];
  perDiemItems: PerDiemItem[];
  localConveyanceItems: LocalConveyanceItem[];
  programExpenseItems: ProgramExpenseItem[];

  longTravelSubtotal: number;
  accommodationSubtotal: number;
  perDiemSubtotal: number;
  localConveyanceSubtotal: number;
  programExpensesSubtotal: number;
  totalActualExpenses: number;

  // Settlement computation
  variance: number; // totalActualExpenses - advanceAmountTaken
  settlementType: 'REIMBURSEMENT_DUE' | 'REFUND_TO_ORGANIZATION' | 'BALANCED';
  balanceAmount: number; // Math.abs(variance)

  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Approved' | 'Settled' | 'Rejected';
  approvalSteps: FinanceApprovalStep[];
  historyLogs: FinanceHistoryLog[];
  attachments?: FinanceAttachment[] | undefined;

  createdAt: string;
  updatedAt: string;
}

export interface FinancePaymentVoucher {
  id: string;
  voucherNumber: string; // e.g. PV-2026-0089
  voucherType: 'Payment Voucher' | 'Vendor Bill' | 'Reimbursement Settlement';
  payeeName: string;
  payeeType: 'Employee' | 'Vendor' | 'Partner';
  amount: number;
  currency: string;
  paymentMethod: 'Bank Transfer' | 'Cheque' | 'Cash' | 'bKash / Mobile Wallet';
  bankName?: string | undefined;
  bankAccount?: string | undefined;
  chequeNumber?: string | undefined;
  expenseCategory: string;
  project: string;
  budgetLine: string;
  description: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Cancelled';
  voucherDate: string;
  paidAt?: string | undefined;
  paidBy?: string | undefined;
  referenceDoc?: string | undefined; // Linked EXP-000434 or PO number
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INITIAL SEED DATA
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_ADVANCE_REQUESTS: FinanceAdvanceRequest[] = [
  {
    id: 'adv-000434',
    expenseCode: 'EXP-000434',
    title: 'School Quality Assessment & Digital Hub Inspection Visit to Coxs Bazar',
    employeeName: 'Nasif Kamal',
    employeeCode: 'FO032507061190',
    employeeDesignation: 'Coordinator',
    department: "Founder's Office",
    project: 'Digital School Modernization',
    activityCode: 'ACT-2026-CSB-01',
    visitingPlace: 'Cox\'s Bazar, Ramu & Ukhiya',
    duration: '3 Days',
    requestDate: '2026-09-15',
    cashRequiredDate: '2026-09-18',
    bankName: 'Brac Bank LTD.',
    bankAccountNumber: '1068624040001',
    routingNumber: '60260680',
    bankAddress: 'Banani-11, Dhaka',
    remarks: 'Inspection of interactive panels and student welfare infrastructure.',
    longTravelItems: [
      {
        id: 'lt-1',
        budgetLine: 'BL-501',
        date: '2026-09-18',
        from: 'Dhaka (DAC)',
        to: 'Cox\'s Bazar (CXB)',
        departure: '08:30 AM',
        arrival: '09:40 AM',
        mode: 'Flight (US-Bangla)',
        cost: 6500,
      },
      {
        id: 'lt-2',
        budgetLine: 'BL-501',
        date: '2026-09-20',
        from: 'Cox\'s Bazar (CXB)',
        to: 'Dhaka (DAC)',
        departure: '05:00 PM',
        arrival: '06:10 PM',
        mode: 'Flight (Biman)',
        cost: 6500,
      },
    ],
    accommodationItems: [
      {
        id: 'acc-1',
        budgetLine: 'BL-502',
        districtCity: 'Cox\'s Bazar',
        fromDate: '2026-09-18',
        toDate: '2026-09-20',
        hotelName: 'Long Beach Hotel Cox\'s Bazar',
        tariffPerDay: 4500,
        days: 2,
        total: 9000,
      },
    ],
    perDiemItems: [
      {
        id: 'pd-1',
        budgetLine: 'BL-503',
        date: '2026-09-18',
        start: '08:00 AM',
        end: '09:00 PM',
        applicable: true,
        breakfast: 200,
        lunch: 500,
        dinner: 500,
        incidental: 300,
        total: 1500,
      },
      {
        id: 'pd-2',
        budgetLine: 'BL-503',
        date: '2026-09-19',
        start: '08:00 AM',
        end: '09:00 PM',
        applicable: true,
        breakfast: 200,
        lunch: 500,
        dinner: 500,
        incidental: 300,
        total: 1500,
      },
      {
        id: 'pd-3',
        budgetLine: 'BL-503',
        date: '2026-09-20',
        start: '08:00 AM',
        end: '08:00 PM',
        applicable: true,
        breakfast: 200,
        lunch: 500,
        dinner: 500,
        incidental: 300,
        total: 1500,
      },
    ],
    localConveyanceItems: [
      {
        id: 'lc-1',
        budgetLine: 'BL-504',
        date: '2026-09-18',
        start: '06:30 AM',
        end: '07:30 AM',
        from: 'Home (Banani)',
        to: 'Dhaka Airport',
        mode: 'Ride Share (Uber)',
        amount: 850,
      },
      {
        id: 'lc-2',
        budgetLine: 'BL-504',
        date: '2026-09-18',
        start: '10:30 AM',
        end: '05:00 PM',
        from: 'Cox Airport',
        to: 'Ramu Digital School & Camp 4',
        mode: 'Reserved Microbus',
        amount: 3500,
      },
      {
        id: 'lc-3',
        budgetLine: 'BL-504',
        date: '2026-09-19',
        start: '09:00 AM',
        end: '04:30 PM',
        from: 'Hotel',
        to: 'Ukhiya School & Community Hub',
        mode: 'Local Auto & CNG',
        amount: 2200,
      },
    ],
    programExpenseItems: [
      {
        id: 'pe-1',
        date: '2026-09-19',
        itemDescription: 'Workshop Stationery & Student Assessment Kits',
        budgetLine: 'BL-505',
        unit: 40,
        unitCost: 120,
        total: 4800,
      },
      {
        id: 'pe-2',
        date: '2026-09-19',
        itemDescription: 'Refreshments for 35 Community Teachers & Monitors',
        budgetLine: 'BL-505',
        unit: 35,
        unitCost: 160,
        total: 5600,
      },
    ],
    longTravelSubtotal: 13000,
    accommodationSubtotal: 9000,
    perDiemSubtotal: 4500,
    localConveyanceSubtotal: 6550,
    programExpensesSubtotal: 10400,
    totalAmount: 43450,
    currency: 'BDT',
    status: 'Approved',
    approvalSteps: [
      {
        stepNumber: 1,
        stepName: 'Supervisor',
        approverName: 'S M Nayeem Rahman',
        approverRole: 'Department Lead',
        approverEmail: 'nayeem.rahman@jaago.com.bd',
        status: 'SIGNED',
        signedAt: '2026-09-15T14:30:00Z',
        comments: 'Recommended. Inspection is critical for Q3 deliverables.',
      },
      {
        stepNumber: 2,
        stepName: 'Finance',
        approverName: 'Habibur Rahman',
        approverRole: 'Finance Lead',
        approverEmail: 'habibur.rahman@jaago.com.bd',
        status: 'SIGNED',
        signedAt: '2026-09-16T10:00:00Z',
        comments: 'Budget verified under Digital School Project line items.',
      },
      {
        stepNumber: 3,
        stepName: 'Organization Lead',
        approverName: 'Korvi Rakshand',
        approverRole: 'Executive Director',
        approverEmail: 'korvi@jaago.com.bd',
        status: 'SIGNED',
        signedAt: '2026-09-16T12:00:00Z',
        comments: 'Approved. Ensure timely liquidation post-travel.',
      },
    ],
    historyLogs: [
      {
        action: 'Form Created',
        actor: 'Nasif Kamal',
        timestamp: '2026-09-15T12:00:00Z',
        details: 'Draft initiated for travel visit.',
      },
      {
        action: 'Submitted for Approval',
        actor: 'Nasif Kamal',
        timestamp: '2026-09-15T12:30:00Z',
      },
      {
        action: 'Approved by Organization Lead',
        actor: 'Korvi Rakshand',
        timestamp: '2026-09-16T12:00:00Z',
      },
    ],
    createdAt: '2026-09-15T12:00:00Z',
    updatedAt: '2026-09-16T12:00:00Z',
  },
  {
    id: 'adv-000528',
    expenseCode: 'EXP-000528',
    title: 'Volunteer Verification & Applicant Screening Drive in Rajshahi',
    employeeName: 'Nusrat Jahan',
    employeeCode: 'PNC0825060012',
    employeeDesignation: 'People & Culture Executive',
    department: 'People and Culture',
    project: 'Child Welfare Sponsorship',
    activityCode: 'ACT-2026-RAJ-CW',
    visitingPlace: 'Rajshahi City & Paba Upazila',
    duration: '2 Days',
    requestDate: '2026-09-10',
    cashRequiredDate: '2026-09-12',
    bankName: 'Eastern Bank PLC',
    bankAccountNumber: '1092837465',
    routingNumber: '09526012',
    bankAddress: 'Gulshan-2, Dhaka',
    remarks: 'Field verification of 60 scholarship candidates and family visits.',
    longTravelItems: [
      {
        id: 'lt-3',
        budgetLine: 'BL-601',
        date: '2026-09-12',
        from: 'Dhaka (Kamalapur)',
        to: 'Rajshahi',
        departure: '06:00 AM',
        arrival: '11:30 AM',
        mode: 'Train (Silk City Express)',
        cost: 1100,
      },
      {
        id: 'lt-4',
        budgetLine: 'BL-601',
        date: '2026-09-13',
        from: 'Rajshahi',
        to: 'Dhaka',
        departure: '04:00 PM',
        arrival: '09:45 PM',
        mode: 'Train (Padma Express)',
        cost: 1100,
      },
    ],
    accommodationItems: [
      {
        id: 'acc-2',
        budgetLine: 'BL-602',
        districtCity: 'Rajshahi',
        fromDate: '2026-09-12',
        toDate: '2026-09-13',
        hotelName: 'Hotel Nice International',
        tariffPerDay: 2800,
        days: 1,
        total: 2800,
      },
    ],
    perDiemItems: [
      {
        id: 'pd-4',
        budgetLine: 'BL-603',
        date: '2026-09-12',
        start: '06:00 AM',
        end: '09:00 PM',
        applicable: true,
        breakfast: 150,
        lunch: 400,
        dinner: 400,
        incidental: 200,
        total: 1150,
      },
      {
        id: 'pd-5',
        budgetLine: 'BL-603',
        date: '2026-09-13',
        start: '07:00 AM',
        end: '08:00 PM',
        applicable: true,
        breakfast: 150,
        lunch: 400,
        dinner: 400,
        incidental: 200,
        total: 1150,
      },
    ],
    localConveyanceItems: [
      {
        id: 'lc-4',
        budgetLine: 'BL-604',
        date: '2026-09-12',
        start: '12:00 PM',
        end: '06:00 PM',
        from: 'Rajshahi Station',
        to: 'Paba Communities',
        mode: 'Auto Rickshaw Day Hire',
        amount: 1800,
      },
      {
        id: 'lc-5',
        budgetLine: 'BL-604',
        date: '2026-09-13',
        start: '08:30 AM',
        end: '03:00 PM',
        from: 'Hotel',
        to: 'Candidate Households',
        mode: 'Auto Rickshaw Day Hire',
        amount: 1600,
      },
    ],
    programExpenseItems: [],
    longTravelSubtotal: 2200,
    accommodationSubtotal: 2800,
    perDiemSubtotal: 2300,
    localConveyanceSubtotal: 3400,
    programExpensesSubtotal: 0,
    totalAmount: 10700,
    currency: 'BDT',
    status: 'Submitted',
    approvalSteps: [
      {
        stepNumber: 1,
        stepName: 'Supervisor',
        approverName: 'Tazreen Khan',
        approverRole: 'Head of P&C',
        approverEmail: 'tazreen@jaago.com.bd',
        status: 'SIGNED',
        signedAt: '2026-09-10T16:00:00Z',
      },
      {
        stepNumber: 2,
        stepName: 'Finance',
        approverName: 'Habibur Rahman',
        approverRole: 'Finance Lead',
        approverEmail: 'habibur.rahman@jaago.com.bd',
        status: 'PENDING',
      },
    ],
    historyLogs: [
      {
        action: 'Form Submitted',
        actor: 'Nusrat Jahan',
        timestamp: '2026-09-10T14:00:00Z',
      },
    ],
    createdAt: '2026-09-10T14:00:00Z',
    updatedAt: '2026-09-10T16:00:00Z',
  },
];

export const INITIAL_LIQUIDATIONS: FinanceLiquidationForm[] = [
  {
    id: 'liq-000412',
    liquidationCode: 'LIQ-000412',
    linkedAdvanceId: 'adv-legacy-412',
    linkedAdvanceCode: 'EXP-000412',
    advanceAmountTaken: 35000,
    subject: 'Quarterly Financial & Inventory Audit at Bandarban Digital School',
    employeeName: 'Habibur Rahman',
    employeeCode: 'FNA052408101',
    employeeDesignation: 'Finance & Accounts Officer',
    department: 'Finance & Accounting',
    project: 'Digital School Project',
    activityCode: 'ACT-2026-BDB-AUD',
    visitingPlace: 'Bandarban Sadar & Ruma',
    duration: '4 Days',
    dateAdvanceTaken: '2026-08-20',
    dateOfAdjustment: '2026-08-28',
    dateOfActualAdjustment: '2026-08-27',
    currency: 'BDT',
    justificationForDelay: 'Submitted on schedule within 7 days of trip conclusion.',
    bankName: 'Brac Bank LTD.',
    bankAccountNumber: '1068624040001',
    longTravelItems: [
      {
        id: 'liq-lt-1',
        budgetLine: 'BL-501',
        date: '2026-08-22',
        from: 'Dhaka',
        to: 'Bandarban',
        departure: '10:00 PM',
        arrival: '07:00 AM',
        mode: 'Bus (Saintmartin Paribahan AC)',
        cost: 1600,
      },
      {
        id: 'liq-lt-2',
        budgetLine: 'BL-501',
        date: '2026-08-25',
        from: 'Bandarban',
        to: 'Dhaka',
        departure: '09:30 PM',
        arrival: '06:30 AM',
        mode: 'Bus (Saintmartin Paribahan AC)',
        cost: 1600,
      },
    ],
    accommodationItems: [
      {
        id: 'liq-acc-1',
        budgetLine: 'BL-502',
        districtCity: 'Bandarban',
        fromDate: '2026-08-23',
        toDate: '2026-08-25',
        hotelName: 'Hotel Hilton Bandarban',
        tariffPerDay: 3200,
        days: 2,
        total: 6400,
      },
    ],
    perDiemItems: [
      {
        id: 'liq-pd-1',
        budgetLine: 'BL-503',
        date: '2026-08-23',
        start: '08:00 AM',
        end: '08:00 PM',
        applicable: true,
        breakfast: 150,
        lunch: 400,
        dinner: 450,
        incidental: 250,
        total: 1250,
      },
      {
        id: 'liq-pd-2',
        budgetLine: 'BL-503',
        date: '2026-08-24',
        start: '08:00 AM',
        end: '08:00 PM',
        applicable: true,
        breakfast: 150,
        lunch: 400,
        dinner: 450,
        incidental: 250,
        total: 1250,
      },
    ],
    localConveyanceItems: [
      {
        id: 'liq-lc-1',
        budgetLine: 'BL-504',
        date: '2026-08-23',
        start: '09:00 AM',
        end: '05:00 PM',
        from: 'Bandarban Town',
        to: 'Ruma School Campus',
        mode: 'Chander Gari (4WD)',
        amount: 8500,
      },
      {
        id: 'liq-lc-2',
        budgetLine: 'BL-504',
        date: '2026-08-24',
        start: '09:00 AM',
        end: '04:00 PM',
        from: 'Ruma Campus',
        to: 'Community Inspection',
        mode: 'Local Guide & Bike',
        amount: 4200,
      },
    ],
    programExpenseItems: [
      {
        id: 'liq-pe-1',
        date: '2026-08-24',
        itemDescription: 'Audit Printing & Photocopier Supplies',
        budgetLine: 'BL-505',
        unit: 1,
        unitCost: 1800,
        total: 1800,
      },
    ],
    longTravelSubtotal: 3200,
    accommodationSubtotal: 6400,
    perDiemSubtotal: 2500,
    localConveyanceSubtotal: 12700,
    programExpensesSubtotal: 1800,
    totalActualExpenses: 26600,
    variance: -8400, // Advance was 35000, Actual was 26600 -> Surplus 8400 refund
    settlementType: 'REFUND_TO_ORGANIZATION',
    balanceAmount: 8400,
    status: 'Settled',
    approvalSteps: [
      {
        stepNumber: 1,
        stepName: 'Finance Reviewer',
        approverName: 'Nabila Chowdhury',
        approverRole: 'Accounts Executive',
        status: 'SIGNED',
        signedAt: '2026-08-28T11:00:00Z',
        comments: 'Original bills and refund voucher verified.',
      },
      {
        stepNumber: 2,
        stepName: 'Finance Lead',
        approverName: 'Habibur Rahman',
        approverRole: 'Finance Lead',
        status: 'SIGNED',
        signedAt: '2026-08-28T14:30:00Z',
        comments: 'Surplus BDT 8,400 received in JAAGO petty cash account.',
      },
    ],
    historyLogs: [
      {
        action: 'Liquidation Submitted',
        actor: 'Habibur Rahman',
        timestamp: '2026-08-27T16:00:00Z',
      },
      {
        action: 'Settled & Closed',
        actor: 'Habibur Rahman',
        timestamp: '2026-08-28T14:30:00Z',
        details: 'Refund BDT 8,400 acknowledged.',
      },
    ],
    createdAt: '2026-08-27T16:00:00Z',
    updatedAt: '2026-08-28T14:30:00Z',
  },
];

export const INITIAL_PAYMENT_VOUCHERS: FinancePaymentVoucher[] = [
  {
    id: 'pv-0089',
    voucherNumber: 'PV-2026-0089',
    voucherType: 'Payment Voucher',
    payeeName: 'Rangs Technologies',
    payeeType: 'Vendor',
    amount: 485000,
    currency: 'BDT',
    paymentMethod: 'Bank Transfer',
    bankName: 'Dutch-Bangla Bank PLC',
    bankAccount: '115.120.0094812',
    expenseCategory: 'Capital Expenditure (Interactive Terminals)',
    project: 'Digital School Modernization',
    budgetLine: 'BL-IT-2026',
    description: 'Payment for 5 Smart Interactive Displays against approved PO-2026-0142',
    status: 'Approved',
    voucherDate: '2026-09-12',
    referenceDoc: 'PO-2026-0142',
    createdAt: '2026-09-12T10:00:00Z',
    updatedAt: '2026-09-13T11:00:00Z',
  },
  {
    id: 'pv-0090',
    voucherNumber: 'PV-2026-0090',
    voucherType: 'Reimbursement Settlement',
    payeeName: 'Nasif Kamal',
    payeeType: 'Employee',
    amount: 43450,
    currency: 'BDT',
    paymentMethod: 'Bank Transfer',
    bankName: 'Brac Bank LTD.',
    bankAccount: '1068624040001',
    expenseCategory: 'Travel & Program Advance',
    project: 'Digital School Modernization',
    budgetLine: 'BL-501/502',
    description: 'Advance disbursement for Cox\'s Bazar digital hub inspection EXP-000434',
    status: 'Paid',
    voucherDate: '2026-09-16',
    paidAt: '2026-09-16T15:00:00Z',
    paidBy: 'Habibur Rahman (Finance)',
    referenceDoc: 'EXP-000434',
    createdAt: '2026-09-16T10:30:00Z',
    updatedAt: '2026-09-16T15:00:00Z',
  },
  {
    id: 'pv-0091',
    voucherNumber: 'PV-2026-0091',
    voucherType: 'Vendor Bill',
    payeeName: 'Star Print House',
    payeeType: 'Vendor',
    amount: 68500,
    currency: 'BDT',
    paymentMethod: 'Cheque',
    bankName: 'Brac Bank LTD.',
    chequeNumber: 'CHQ-992014',
    expenseCategory: 'Stationery & Printing',
    project: 'Annual Report & Branding 2026',
    budgetLine: 'BL-COMMS-26',
    description: 'Printing of annual impact newsletters and report brochures',
    status: 'Pending Approval',
    voucherDate: '2026-09-14',
    referenceDoc: 'PO-2026-0140',
    createdAt: '2026-09-14T09:00:00Z',
    updatedAt: '2026-09-14T09:00:00Z',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. PERSISTENCE & SUPABASE SYNC HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const SCOPE_SYS = 'SYSTEM';
const SCOPE_ID_FIN = 'JAAGO_FINANCE_DATA';

function broadcastFinanceUpdate(key: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('jaago_finance_updated', { detail: { key } }));
  window.dispatchEvent(new Event('storage'));
}

function getLocalFallback<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(`jaago_fin_${key}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
}

function setLocalFallback<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`jaago_fin_${key}`, JSON.stringify(val));
  } catch {}
}

async function fetchSupabaseEntity<T>(key: string, seedFallback: T): Promise<T> {
  return fetchWithCache<T>(
    `finance_${key}`,
    async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('scope', SCOPE_SYS)
          .eq('scope_id', SCOPE_ID_FIN)
          .eq('key', key)
          .maybeSingle();

        if (error) {
          console.warn(`[Finance Supabase] Notice fetching ${key}:`, error.message);
          return getLocalFallback(key, seedFallback);
        }

        if (data && data.value) {
          setLocalFallback(key, data.value);
          return data.value as T;
        }

        // Seed initial data if first run
        await saveSupabaseEntity(key, seedFallback);
        return seedFallback;
      } catch (err) {
        console.warn(`[Finance Supabase] Error fetching ${key}:`, err);
        return getLocalFallback(key, seedFallback);
      }
    },
    15000 // 15s cache TTL
  );
}

async function saveSupabaseEntity<T>(key: string, value: T): Promise<void> {
  setLocalFallback(key, value);
  invalidateCache(`finance_${key}`);
  broadcastFinanceUpdate(key);

  try {
    const supabase = getSupabase();
    await supabase.from('settings').upsert(
      {
        scope: SCOPE_SYS,
        scope_id: SCOPE_ID_FIN,
        key,
        value: value as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'scope,scope_id,key' }
    );
  } catch (err) {
    console.warn(`[Finance Supabase] Background save failed for ${key}:`, err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. HIGH-LEVEL API EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// --- 4.1 Advance Requests ---

export async function getFinanceAdvanceRequests(): Promise<FinanceAdvanceRequest[]> {
  return fetchSupabaseEntity<FinanceAdvanceRequest[]>('advance_requests', INITIAL_ADVANCE_REQUESTS);
}

export async function saveFinanceAdvanceRequest(
  req: Partial<FinanceAdvanceRequest> & { title: string; employeeName: string; totalAmount: number }
): Promise<FinanceAdvanceRequest> {
  const list = await getFinanceAdvanceRequests();
  const existingIdx = list.findIndex(
    (r) => r.id === req.id || (req.expenseCode && r.expenseCode === req.expenseCode)
  );
  const now = new Date().toISOString();

  let target: FinanceAdvanceRequest;
  if (existingIdx >= 0) {
    target = {
      ...list[existingIdx]!,
      ...req,
      updatedAt: now,
    };
    list[existingIdx] = target;
  } else {
    // Generate unique EXP code: e.g. EXP-000435
    let expenseCode = req.expenseCode;
    if (!expenseCode) {
      const codeNum = Math.floor(100000 + Math.random() * 900000);
      expenseCode = `EXP-${String(codeNum).slice(0, 6)}`;
    }

    target = {
      id: req.id || `adv-${Date.now()}`,
      expenseCode,
      title: req.title,
      employeeName: req.employeeName,
      employeeCode: req.employeeCode || '',
      employeeDesignation: req.employeeDesignation || '',
      department: req.department || '',
      project: req.project || 'General Operations',
      activityCode: req.activityCode || '',
      visitingPlace: req.visitingPlace || '',
      duration: req.duration || '1 Day',
      requestDate: req.requestDate || now.split('T')[0]!,
      cashRequiredDate: req.cashRequiredDate || now.split('T')[0]!,
      bankName: req.bankName || 'Brac Bank LTD.',
      bankAccountNumber: req.bankAccountNumber || '',
      routingNumber: req.routingNumber || '',
      bankAddress: req.bankAddress || '',
      remarks: req.remarks || '',
      longTravelItems: req.longTravelItems || [],
      accommodationItems: req.accommodationItems || [],
      perDiemItems: req.perDiemItems || [],
      localConveyanceItems: req.localConveyanceItems || [],
      programExpenseItems: req.programExpenseItems || [],
      longTravelSubtotal: req.longTravelSubtotal || 0,
      accommodationSubtotal: req.accommodationSubtotal || 0,
      perDiemSubtotal: req.perDiemSubtotal || 0,
      localConveyanceSubtotal: req.localConveyanceSubtotal || 0,
      programExpensesSubtotal: req.programExpensesSubtotal || 0,
      totalAmount: req.totalAmount || 0,
      currency: req.currency || 'BDT',
      status: req.status || 'Draft',
      approvalSteps: req.approvalSteps || [
        {
          stepNumber: 1,
          stepName: 'Supervisor',
          approverName: 'Assigned Supervisor',
          approverRole: 'Department Lead',
          status: 'PENDING',
        },
        {
          stepNumber: 2,
          stepName: 'Finance',
          approverName: 'Habibur Rahman',
          approverRole: 'Finance Lead',
          status: 'PENDING',
        },
      ],
      historyLogs: req.historyLogs || [
        {
          action: 'Advance Request Created',
          actor: req.employeeName,
          timestamp: now,
        },
      ],
      attachments: req.attachments || [],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('advance_requests', list);
  return target;
}

export async function deleteFinanceAdvanceRequest(id: string): Promise<void> {
  const list = await getFinanceAdvanceRequests();
  const filtered = list.filter((r) => r.id !== id);
  await saveSupabaseEntity('advance_requests', filtered);
}

// --- 4.2 Liquidation Forms ---

export async function getFinanceLiquidations(): Promise<FinanceLiquidationForm[]> {
  return fetchSupabaseEntity<FinanceLiquidationForm[]>('liquidations', INITIAL_LIQUIDATIONS);
}

export async function saveFinanceLiquidation(
  liq: Partial<FinanceLiquidationForm> & { subject: string; employeeName: string; totalActualExpenses: number }
): Promise<FinanceLiquidationForm> {
  const list = await getFinanceLiquidations();
  const existingIdx = list.findIndex(
    (l) => l.id === liq.id || (liq.liquidationCode && l.liquidationCode === liq.liquidationCode)
  );
  const now = new Date().toISOString();

  const advanceTaken = liq.advanceAmountTaken ?? 0;
  const actualSpent = liq.totalActualExpenses ?? 0;
  const variance = actualSpent - advanceTaken;
  let settlementType: FinanceLiquidationForm['settlementType'] = 'BALANCED';
  if (variance > 0) settlementType = 'REIMBURSEMENT_DUE';
  else if (variance < 0) settlementType = 'REFUND_TO_ORGANIZATION';

  let target: FinanceLiquidationForm;
  if (existingIdx >= 0) {
    target = {
      ...list[existingIdx]!,
      ...liq,
      variance,
      settlementType,
      balanceAmount: Math.abs(variance),
      updatedAt: now,
    };
    list[existingIdx] = target;
  } else {
    let liquidationCode = liq.liquidationCode;
    if (!liquidationCode) {
      const codeNum = Math.floor(100000 + Math.random() * 900000);
      liquidationCode = `LIQ-${String(codeNum).slice(0, 6)}`;
    }

    target = {
      id: liq.id || `liq-${Date.now()}`,
      liquidationCode,
      linkedAdvanceId: liq.linkedAdvanceId,
      linkedAdvanceCode: liq.linkedAdvanceCode,
      advanceAmountTaken: advanceTaken,
      subject: liq.subject,
      employeeName: liq.employeeName,
      employeeCode: liq.employeeCode || '',
      employeeDesignation: liq.employeeDesignation || '',
      department: liq.department || '',
      project: liq.project || '',
      activityCode: liq.activityCode || '',
      visitingPlace: liq.visitingPlace || '',
      duration: liq.duration || '',
      dateAdvanceTaken: liq.dateAdvanceTaken || '',
      dateOfAdjustment: liq.dateOfAdjustment || now.split('T')[0]!,
      dateOfActualAdjustment: liq.dateOfActualAdjustment || now.split('T')[0]!,
      currency: liq.currency || 'BDT',
      justificationForDelay: liq.justificationForDelay || '',
      bankName: liq.bankName || '',
      bankAccountNumber: liq.bankAccountNumber || '',
      longTravelItems: liq.longTravelItems || [],
      accommodationItems: liq.accommodationItems || [],
      perDiemItems: liq.perDiemItems || [],
      localConveyanceItems: liq.localConveyanceItems || [],
      programExpenseItems: liq.programExpenseItems || [],
      longTravelSubtotal: liq.longTravelSubtotal || 0,
      accommodationSubtotal: reqNumber(liq.accommodationSubtotal),
      perDiemSubtotal: reqNumber(liq.perDiemSubtotal),
      localConveyanceSubtotal: reqNumber(liq.localConveyanceSubtotal),
      programExpensesSubtotal: reqNumber(liq.programExpensesSubtotal),
      totalActualExpenses: actualSpent,
      variance,
      settlementType,
      balanceAmount: Math.abs(variance),
      status: liq.status || 'Draft',
      approvalSteps: liq.approvalSteps || [
        {
          stepNumber: 1,
          stepName: 'Finance Reviewer',
          approverName: 'Nabila Chowdhury',
          approverRole: 'Accounts Executive',
          status: 'PENDING',
        },
        {
          stepNumber: 2,
          stepName: 'Finance Lead',
          approverName: 'Habibur Rahman',
          approverRole: 'Finance Lead',
          status: 'PENDING',
        },
      ],
      historyLogs: liq.historyLogs || [
        {
          action: 'Liquidation Created',
          actor: liq.employeeName,
          timestamp: now,
        },
      ],
      attachments: liq.attachments || [],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  // If this liquidation is submitted/approved, mark the linked advance as Settled
  if (target.linkedAdvanceCode && (target.status === 'Approved' || target.status === 'Settled')) {
    try {
      const advances = await getFinanceAdvanceRequests();
      const advIdx = advances.findIndex((a) => a.expenseCode === target.linkedAdvanceCode);
      if (advIdx >= 0 && advances[advIdx]!.status !== 'Settled') {
        advances[advIdx]!.status = 'Settled';
        advances[advIdx]!.updatedAt = now;
        await saveSupabaseEntity('advance_requests', advances);
      }
    } catch {}
  }

  await saveSupabaseEntity('liquidations', list);
  return target;
}

export async function deleteFinanceLiquidation(id: string): Promise<void> {
  const list = await getFinanceLiquidations();
  const filtered = list.filter((l) => l.id !== id);
  await saveSupabaseEntity('liquidations', filtered);
}

// --- 4.3 Payment Vouchers & Bills ---

export async function getPaymentVouchers(): Promise<FinancePaymentVoucher[]> {
  return fetchSupabaseEntity<FinancePaymentVoucher[]>('payment_vouchers', INITIAL_PAYMENT_VOUCHERS);
}

export async function savePaymentVoucher(
  voucher: Partial<FinancePaymentVoucher> & { payeeName: string; amount: number; voucherType: FinancePaymentVoucher['voucherType'] }
): Promise<FinancePaymentVoucher> {
  const list = await getPaymentVouchers();
  const existingIdx = list.findIndex(
    (v) => v.id === voucher.id || (voucher.voucherNumber && v.voucherNumber === voucher.voucherNumber)
  );
  const now = new Date().toISOString();

  let target: FinancePaymentVoucher;
  if (existingIdx >= 0) {
    target = {
      ...list[existingIdx]!,
      ...voucher,
      updatedAt: now,
    };
    list[existingIdx] = target;
  } else {
    let voucherNumber = voucher.voucherNumber;
    if (!voucherNumber) {
      const nextNum = String(list.length + 92).padStart(4, '0');
      voucherNumber = `PV-${new Date().getFullYear()}-${nextNum}`;
    }

    target = {
      id: voucher.id || `pv-${Date.now()}`,
      voucherNumber,
      voucherType: voucher.voucherType,
      payeeName: voucher.payeeName,
      payeeType: voucher.payeeType || 'Vendor',
      amount: voucher.amount,
      currency: voucher.currency || 'BDT',
      paymentMethod: voucher.paymentMethod || 'Bank Transfer',
      bankName: voucher.bankName || 'Brac Bank LTD.',
      bankAccount: voucher.bankAccount || '',
      chequeNumber: voucher.chequeNumber,
      expenseCategory: voucher.expenseCategory || 'General Expenditure',
      project: voucher.project || 'General Operations',
      budgetLine: voucher.budgetLine || '',
      description: voucher.description || '',
      status: voucher.status || 'Draft',
      voucherDate: voucher.voucherDate || now.split('T')[0]!,
      paidAt: voucher.paidAt,
      paidBy: voucher.paidBy,
      referenceDoc: voucher.referenceDoc,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  await saveSupabaseEntity('payment_vouchers', list);
  return target;
}

export async function deletePaymentVoucher(id: string): Promise<void> {
  const list = await getPaymentVouchers();
  const filtered = list.filter((v) => v.id !== id);
  await saveSupabaseEntity('payment_vouchers', filtered);
}

// --- 4.4 Lookup & Helper Utilities ---

export async function findAdvanceByCodeOrId(query: string): Promise<FinanceAdvanceRequest | null> {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase();
  const list = await getFinanceAdvanceRequests();
  return (
    list.find(
      (r) =>
        r.id.toLowerCase() === q ||
        r.expenseCode.toLowerCase() === q ||
        r.expenseCode.toLowerCase().replace('-', '') === q.replace('-', '')
    ) || null
  );
}

function reqNumber(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}
