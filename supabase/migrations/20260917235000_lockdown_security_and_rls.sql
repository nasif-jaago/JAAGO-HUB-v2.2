-- ============================================================================
-- CANONICAL PRODUCTION SECURITY HARDENING & RLS LOCKDOWN
-- Project: JAAGO-HUB v2.2
-- Purpose:
--   1. Revoke all anonymous ('anon') write, insert, update, and delete access
--      across all database tables to stop external manipulation.
--   2. Restrict sensitive employee, financial, attendance, and audit tables
--      strictly to 'authenticated' sessions and 'service_role'.
--   3. Ensure 100% zero-disruption for live users by granting seamless access
--      to 'authenticated' (logged-in staff/admins) and 'service_role' (APIs/workers).
--   4. Enforce security_invoker on all computed views.
-- ============================================================================

-- 1. SECURITY INVOKER ON VIEWS
ALTER VIEW IF EXISTS public.att_effective_daily SET (security_invoker = true);
GRANT SELECT ON public.att_effective_daily TO authenticated, anon;

-- 2. HARDEN SENSITIVE PEOPLE & CULTURE TABLES
-- Employees
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to employees for anon/authenticated" ON public.employees;
DROP POLICY IF EXISTS "employees_service_role" ON public.employees;
DROP POLICY IF EXISTS "employees_authenticated_full" ON public.employees;
CREATE POLICY "employees_service_role" ON public.employees FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "employees_authenticated_full" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employee Activity Logs
ALTER TABLE IF EXISTS public.employee_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to logs for anon/authenticated" ON public.employee_activity_logs;
DROP POLICY IF EXISTS "employee_logs_service_role" ON public.employee_activity_logs;
DROP POLICY IF EXISTS "employee_logs_authenticated_full" ON public.employee_activity_logs;
CREATE POLICY "employee_logs_service_role" ON public.employee_activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "employee_logs_authenticated_full" ON public.employee_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. HARDEN ATTENDANCE TABLES
-- attendance_records
ALTER TABLE IF EXISTS public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow full access on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_service_role" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_authenticated" ON public.attendance_records;
CREATE POLICY "attendance_records_service_role" ON public.attendance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "attendance_records_authenticated" ON public.attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attendance_events
ALTER TABLE IF EXISTS public.attendance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_events" ON public.attendance_events;
DROP POLICY IF EXISTS "Allow full access on attendance_events" ON public.attendance_events;
DROP POLICY IF EXISTS "attendance_events_service_role" ON public.attendance_events;
DROP POLICY IF EXISTS "attendance_events_authenticated" ON public.attendance_events;
CREATE POLICY "attendance_events_service_role" ON public.attendance_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "attendance_events_authenticated" ON public.attendance_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attendance_adjustments
ALTER TABLE IF EXISTS public.attendance_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_adjustments" ON public.attendance_adjustments;
DROP POLICY IF EXISTS "Allow full access on attendance_adjustments" ON public.attendance_adjustments;
DROP POLICY IF EXISTS "attendance_adjustments_service_role" ON public.attendance_adjustments;
DROP POLICY IF EXISTS "attendance_adjustments_authenticated" ON public.attendance_adjustments;
CREATE POLICY "attendance_adjustments_service_role" ON public.attendance_adjustments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "attendance_adjustments_authenticated" ON public.attendance_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attendance_logs
ALTER TABLE IF EXISTS public.attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow full access on attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_service_role" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_authenticated" ON public.attendance_logs;
CREATE POLICY "attendance_logs_service_role" ON public.attendance_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "attendance_logs_authenticated" ON public.attendance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attendance_settings (Global settings: read-only for anon if needed, full for authenticated/service)
ALTER TABLE IF EXISTS public.attendance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Allow full access on attendance_settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_service_role" ON public.attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_authenticated" ON public.attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_anon_read" ON public.attendance_settings;
CREATE POLICY "attendance_settings_service_role" ON public.attendance_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "attendance_settings_authenticated" ON public.attendance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "attendance_settings_anon_read" ON public.attendance_settings FOR SELECT TO anon USING (true);

-- work_shifts
ALTER TABLE IF EXISTS public.work_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on work_shifts" ON public.work_shifts;
DROP POLICY IF EXISTS "Allow full access on work_shifts" ON public.work_shifts;
DROP POLICY IF EXISTS "work_shifts_service_role" ON public.work_shifts;
DROP POLICY IF EXISTS "work_shifts_authenticated" ON public.work_shifts;
DROP POLICY IF EXISTS "work_shifts_anon_read" ON public.work_shifts;
CREATE POLICY "work_shifts_service_role" ON public.work_shifts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "work_shifts_authenticated" ON public.work_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "work_shifts_anon_read" ON public.work_shifts FOR SELECT TO anon USING (true);

-- employee_shift_assignments
ALTER TABLE IF EXISTS public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on employee_shift_assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Allow full access on employee_shift_assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "shift_assign_service_role" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "shift_assign_authenticated" ON public.employee_shift_assignments;
CREATE POLICY "shift_assign_service_role" ON public.employee_shift_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "shift_assign_authenticated" ON public.employee_shift_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- geofence_locations
ALTER TABLE IF EXISTS public.geofence_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on geofence_locations" ON public.geofence_locations;
DROP POLICY IF EXISTS "Allow full access on geofence_locations" ON public.geofence_locations;
DROP POLICY IF EXISTS "geofence_service_role" ON public.geofence_locations;
DROP POLICY IF EXISTS "geofence_authenticated" ON public.geofence_locations;
DROP POLICY IF EXISTS "geofence_anon_read" ON public.geofence_locations;
CREATE POLICY "geofence_service_role" ON public.geofence_locations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "geofence_authenticated" ON public.geofence_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "geofence_anon_read" ON public.geofence_locations FOR SELECT TO anon USING (true);

-- 4. HARDEN BIOTIME SYNC TABLES
-- att_biotime_employee_map
ALTER TABLE IF EXISTS public.att_biotime_employee_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on att_biotime_employee_map" ON public.att_biotime_employee_map;
DROP POLICY IF EXISTS "Allow full access on att_biotime_employee_map" ON public.att_biotime_employee_map;
DROP POLICY IF EXISTS "biotime_map_service_role" ON public.att_biotime_employee_map;
DROP POLICY IF EXISTS "biotime_map_authenticated" ON public.att_biotime_employee_map;
CREATE POLICY "biotime_map_service_role" ON public.att_biotime_employee_map FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "biotime_map_authenticated" ON public.att_biotime_employee_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- att_biotime_events
ALTER TABLE IF EXISTS public.att_biotime_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on att_biotime_events" ON public.att_biotime_events;
DROP POLICY IF EXISTS "Allow full access on att_biotime_events" ON public.att_biotime_events;
DROP POLICY IF EXISTS "biotime_events_service_role" ON public.att_biotime_events;
DROP POLICY IF EXISTS "biotime_events_authenticated" ON public.att_biotime_events;
CREATE POLICY "biotime_events_service_role" ON public.att_biotime_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "biotime_events_authenticated" ON public.att_biotime_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. HARDEN LEAVE & ON-DUTY TABLES
-- leave_requests
ALTER TABLE IF EXISTS public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow full access on leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_service_role" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_authenticated" ON public.leave_requests;
CREATE POLICY "leave_requests_service_role" ON public.leave_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "leave_requests_authenticated" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- on_duty_requests
ALTER TABLE IF EXISTS public.on_duty_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on on_duty_requests" ON public.on_duty_requests;
DROP POLICY IF EXISTS "Allow full access on on_duty_requests" ON public.on_duty_requests;
DROP POLICY IF EXISTS "on_duty_requests_service_role" ON public.on_duty_requests;
DROP POLICY IF EXISTS "on_duty_requests_authenticated" ON public.on_duty_requests;
CREATE POLICY "on_duty_requests_service_role" ON public.on_duty_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "on_duty_requests_authenticated" ON public.on_duty_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- on_duty_attendance_day
ALTER TABLE IF EXISTS public.on_duty_attendance_day ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on on_duty_attendance_day" ON public.on_duty_attendance_day;
DROP POLICY IF EXISTS "Allow full access on on_duty_attendance_day" ON public.on_duty_attendance_day;
DROP POLICY IF EXISTS "on_duty_day_service_role" ON public.on_duty_attendance_day;
DROP POLICY IF EXISTS "on_duty_day_authenticated" ON public.on_duty_attendance_day;
CREATE POLICY "on_duty_day_service_role" ON public.on_duty_attendance_day FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "on_duty_day_authenticated" ON public.on_duty_attendance_day FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- on_duty_logs
ALTER TABLE IF EXISTS public.on_duty_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on on_duty_logs" ON public.on_duty_logs;
DROP POLICY IF EXISTS "Allow full access on on_duty_logs" ON public.on_duty_logs;
DROP POLICY IF EXISTS "on_duty_logs_service_role" ON public.on_duty_logs;
DROP POLICY IF EXISTS "on_duty_logs_authenticated" ON public.on_duty_logs;
CREATE POLICY "on_duty_logs_service_role" ON public.on_duty_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "on_duty_logs_authenticated" ON public.on_duty_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. HARDEN ORGANIZATION & STRUCTURE TABLES
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'organizations',
            'organization_branches',
            'organization_policies',
            'departments',
            'designations',
            'projects',
            'teams',
            'team_members',
            'insurance_categories'
        ])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow public read on %s" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow full access on %s" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_anon_read" ON public.%I;', tbl, tbl);
            
            EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_anon_read" ON public.%I FOR SELECT TO anon USING (true);', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- 7. HARDEN PROCUREMENT TABLES (Strict: No anon access)
DO $$
DECLARE
    p_tbl text;
BEGIN
    FOR p_tbl IN 
        SELECT unnest(ARRAY[
            'procurement_vendors',
            'procurement_purchase_orders',
            'procurement_requests',
            'procurement_rfqs',
            'procurement_goods_receipts',
            'procurement_inventory',
            'procurement_assets',
            'procurement_categories',
            'procurement_units',
            'procurement_warehouses',
            'procurement_contracts',
            'procurement_budgets'
        ])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p_tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', p_tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I;', p_tbl, p_tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I;', p_tbl, p_tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated" ON public.%I;', p_tbl, p_tbl);
            
            EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', p_tbl, p_tbl);
            EXECUTE format('CREATE POLICY "%s_authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', p_tbl, p_tbl);
        END IF;
    END LOOP;
END $$;

-- 8. HARDEN RBAC TABLES (Strict: Read-only for authenticated, full for service_role, zero for anon)
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_read" ON public.roles;
DROP POLICY IF EXISTS "permissions_read" ON public.permissions;
DROP POLICY IF EXISTS "role_permissions_read" ON public.role_permissions;
DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;
DROP POLICY IF EXISTS "roles_write" ON public.roles;
DROP POLICY IF EXISTS "permissions_write" ON public.permissions;
DROP POLICY IF EXISTS "role_permissions_write" ON public.role_permissions;
DROP POLICY IF EXISTS "user_roles_write" ON public.user_roles;

CREATE POLICY "roles_read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "roles_write" ON public.roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "permissions_write" ON public.permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "role_permissions_write" ON public.role_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_roles_write" ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. HARDEN EMAIL SUBSYSTEM (Strict: service_role only)
ALTER TABLE IF EXISTS public.email_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_servers_service_role" ON public.email_servers;
DROP POLICY IF EXISTS "email_templates_service_role" ON public.email_templates;
DROP POLICY IF EXISTS "email_logs_service_role" ON public.email_logs;

CREATE POLICY "email_servers_service_role" ON public.email_servers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "email_templates_service_role" ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "email_logs_service_role" ON public.email_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to view email logs and templates if needed for audit:
CREATE POLICY "email_templates_authenticated_read" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_logs_authenticated_read" ON public.email_logs FOR SELECT TO authenticated USING (true);

-- 10. HARDEN STORAGE BUCKET POLICIES
-- Avatar photos are public to read, but only authenticated users and service_role can upload/modify
DROP POLICY IF EXISTS "Allow Employee Photo Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Employee Photo Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Employee Photo Deletions" ON storage.objects;

CREATE POLICY "Allow Employee Photo Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employees');
CREATE POLICY "Allow Employee Photo Updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'employees');
CREATE POLICY "Allow Employee Photo Deletions" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'employees');
