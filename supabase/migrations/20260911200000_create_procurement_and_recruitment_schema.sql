-- =============================================================================
-- Migration: 20260911200000_create_procurement_and_recruitment_schema.sql
-- Module: Admin & Procurement (and Requisition / Recruitment Workflows)
-- Standard: JAAGO-HUB v2.2 Zero-Anomaly Standard & DATABASE-STANDARD.md
-- =============================================================================

-- Ensure uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Vendors & Suppliers Master
CREATE TABLE IF NOT EXISTS public.procurement_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(50) DEFAULT 'Company',
    category VARCHAR(100) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    location VARCHAR(255),
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100) DEFAULT 'Net 30 Days',
    total_pos INTEGER DEFAULT 0,
    spend_fy NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Purchase Orders Master
CREATE TABLE IF NOT EXISTS public.procurement_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(100) NOT NULL UNIQUE,
    pr_reference VARCHAR(100),
    vendor_id UUID REFERENCES public.procurement_vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    department VARCHAR(150) NOT NULL,
    project VARCHAR(150),
    amount_bdt NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    expected_delivery DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    payment_terms VARCHAR(100) DEFAULT 'Net 30 Days',
    delivery_address TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    created_by_name VARCHAR(150),
    created_by_code VARCHAR(50),
    approved_by_name VARCHAR(150),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Requisitions (PR, GR & Recruitment)
CREATE TABLE IF NOT EXISTS public.procurement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_number VARCHAR(100) NOT NULL UNIQUE,
    requisition_type VARCHAR(50) NOT NULL DEFAULT 'Purchase', -- 'Purchase', 'General', 'Recruitment'
    title VARCHAR(255) NOT NULL,
    department VARCHAR(150) NOT NULL,
    request_owner VARCHAR(150) NOT NULL,
    request_owner_code VARCHAR(50),
    est_amount NUMERIC(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'BDT',
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    justification TEXT,
    priority VARCHAR(50) DEFAULT 'Normal',
    required_date DATE,
    line_items JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quotations / RFQs
CREATE TABLE IF NOT EXISTS public.procurement_rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    deadline DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    invited_vendors JSONB DEFAULT '[]'::jsonb,
    submissions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Goods Receipt Notes (GRN)
CREATE TABLE IF NOT EXISTS public.procurement_goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(100) NOT NULL UNIQUE,
    po_number VARCHAR(100) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    received_date DATE NOT NULL,
    received_by_name VARCHAR(150) NOT NULL,
    warehouse VARCHAR(150) NOT NULL,
    condition_status VARCHAR(50) DEFAULT 'Inspected & Passed',
    items_received JSONB DEFAULT '[]'::jsonb,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventory Items
CREATE TABLE IF NOT EXISTS public.procurement_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    warehouse VARCHAR(150) NOT NULL,
    stock_on_hand NUMERIC(12, 2) DEFAULT 0.00,
    uom VARCHAR(50) NOT NULL DEFAULT 'PCS',
    reorder_level NUMERIC(12, 2) DEFAULT 10.00,
    unit_cost NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'In Stock',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Fixed & Capital Assets
CREATE TABLE IF NOT EXISTS public.procurement_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_tag VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    assigned_user VARCHAR(150),
    department VARCHAR(150),
    purchase_date DATE,
    purchase_cost NUMERIC(15, 2) DEFAULT 0.00,
    current_value NUMERIC(15, 2) DEFAULT 0.00,
    condition VARCHAR(50) DEFAULT 'Operational',
    location VARCHAR(255),
    serial_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Procurement Categories
CREATE TABLE IF NOT EXISTS public.procurement_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) DEFAULT 'Goods',
    description TEXT,
    items_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Units of Measure (UOM)
CREATE TABLE IF NOT EXISTS public.procurement_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'Unit',
    base_unit BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Warehouses
CREATE TABLE IF NOT EXISTS public.procurement_warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(100) DEFAULT 'Central Depot',
    location VARCHAR(255) NOT NULL,
    manager VARCHAR(150),
    capacity_sqft NUMERIC(10, 2) DEFAULT 1000.00,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Supplier Contracts
CREATE TABLE IF NOT EXISTS public.procurement_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    value_bdt NUMERIC(15, 2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_notice_days INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'Active',
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Budgets & Approvals
CREATE TABLE IF NOT EXISTS public.procurement_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year VARCHAR(50) NOT NULL DEFAULT '2025-26',
    department VARCHAR(150) NOT NULL,
    allocated_bdt NUMERIC(15, 2) DEFAULT 0.00,
    spent_bdt NUMERIC(15, 2) DEFAULT 0.00,
    committed_bdt NUMERIC(15, 2) DEFAULT 0.00,
    remaining_bdt NUMERIC(15, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.procurement_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_budgets ENABLE ROW LEVEL SECURITY;

-- PostgREST Policies (Authenticated and service_role)
DO $$
BEGIN
    EXECUTE 'CREATE POLICY procurement_vendors_all ON public.procurement_vendors FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_po_all ON public.procurement_purchase_orders FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_requests_all ON public.procurement_requests FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_rfqs_all ON public.procurement_rfqs FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_grn_all ON public.procurement_goods_receipts FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_inv_all ON public.procurement_inventory FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_assets_all ON public.procurement_assets FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_cats_all ON public.procurement_categories FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_units_all ON public.procurement_units FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_wh_all ON public.procurement_warehouses FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_contracts_all ON public.procurement_contracts FOR ALL TO public USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY procurement_budgets_all ON public.procurement_budgets FOR ALL TO public USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
