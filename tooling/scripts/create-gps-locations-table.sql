-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB (v2.2) — GPS COORDINATES & GEOFENCING SCHEMA
-- Domain  : Administration & Infrastructure / Mobile Attendance Geofencing
-- Engine  : PostgreSQL 15+ (Supabase Native)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE GPS_LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.gps_locations (
    id                          TEXT PRIMARY KEY DEFAULT ('gps-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    branch_office               TEXT NOT NULL,
    latitude                    NUMERIC(11, 6) NOT NULL,
    longitude                   NUMERIC(11, 6) NOT NULL,
    radius_meters               INTEGER NOT NULL DEFAULT 100,
    status                      VARCHAR(20) NOT NULL DEFAULT 'Active',
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_gps_locations_name ON public.gps_locations(name);
CREATE INDEX IF NOT EXISTS idx_gps_locations_status ON public.gps_locations(status);
CREATE INDEX IF NOT EXISTS idx_gps_locations_coords ON public.gps_locations(latitude, longitude);

-- 4. AUTOMATED TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_gps_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gps_locations_updated_at ON public.gps_locations;
CREATE TRIGGER trg_gps_locations_updated_at
BEFORE UPDATE ON public.gps_locations
FOR EACH ROW
EXECUTE FUNCTION public.handle_gps_locations_updated_at();

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.gps_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on gps_locations" ON public.gps_locations;
CREATE POLICY "Allow public read on gps_locations"
    ON public.gps_locations FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow full access on gps_locations" ON public.gps_locations;
CREATE POLICY "Allow full access on gps_locations"
    ON public.gps_locations FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. INSERT ALL 32 MASTER JAAGO GPS LOCATIONS
INSERT INTO public.gps_locations (
    id, name, branch_office, latitude, longitude, radius_meters, status, notes
) VALUES
('gps-1', 'Khulna Office', 'Khulna Office', 22.815807, 89.553726, 100, 'Active', NULL),
('gps-2', 'Barishal Hub', 'Barishal Office', 22.709056, 90.351500, 100, 'Active', NULL),
('gps-3', 'SHIELD Office', 'SHIELD Office', 22.604659, 89.517587, 100, 'Active', NULL),
('gps-4', 'USA', 'USA Office', 38.070595, -77.375733, 100, 'Active', NULL),
('gps-5', 'UK Office', 'UK(55 Signia Court, Wembley Hill Road, Wembley, Postcode- HA9 8BE HP47+79 Wembley)', 51.555931, -0.286475, 500, 'Active', NULL),
('gps-6', 'Narayanganj Hub', 'Narayanganj Office', 23.626323, 90.500866, 100, 'Active', NULL),
('gps-7', 'Kishorganj Hub', 'Kishorganj Office', 24.441273, 91.055689, 100, 'Active', NULL),
('gps-8', 'EMK Center', 'Gulshan, Dhaka', 23.788983, 90.416538, 100, 'Active', NULL),
('gps-9', 'Uttara my Home', 'Test 1.0', 23.856372, 90.384102, 100, 'Inactive', 'Test only'),
('gps-10', 'JAAGO Foundation, Teknaf School', 'Upazila, Teknaf 4700', 20.848394, 92.279565, 100, 'Active', NULL),
('gps-11', 'JAAGO Foundation, Rangpur School', 'Kursha', 25.761484, 89.372932, 100, 'Active', NULL),
('gps-12', 'JAAGO Foundation School, Banani Branch', 'Holding# 289 Block-B Korail-1(South Unite), Word No:19', 23.786800, 90.412590, 100, 'Active', NULL),
('gps-13', 'JAAGO Foundation, Rayer Bazar School', '91 Sher-E-Bangla Rd, Dhaka 1207', 23.751279, 90.363015, 100, 'Active', NULL),
('gps-14', 'JAAGO Foundation, Rajshahi School', 'Rajshahi', 24.381226, 88.612499, 100, 'Active', NULL),
('gps-15', 'JAAGO Foundation, Madaripur School', 'Ukilpara Rd, Madaripur 7900', 23.169995, 90.212625, 100, 'Active', NULL),
('gps-16', 'JAAGO Foundation, Habiganj School', 'Jagadishpur', 24.135109, 91.396520, 100, 'Active', NULL),
('gps-17', 'JAAGO Foundation, Gaibandha School', 'Kuthipara', 25.330171, 89.559311, 100, 'Active', NULL),
('gps-18', 'JAAGO Foundation, Dinajpur School', 'Dhaka - Dinajpur Hwy, Sundarban', 25.757405, 88.727441, 100, 'Active', NULL),
('gps-19', 'JAAGO Foundation, Chittagong School', 'Moti Jharna Ln, Chattogram', 22.347640, 91.813281, 100, 'Active', NULL),
('gps-20', 'JAAGO Foundation, Bandarban School', 'Bandarban, Bandarban District 4600', 22.188409, 92.194601, 100, 'Active', NULL),
('gps-21', 'JAAGO Foundation, DSP Hub', 'House 09, Rd No.1/B, Block: L, Banani, Dhaka-1213, Bangladesh.', 23.796192, 90.406826, 100, 'Active', NULL),
('gps-22', 'JAAGO Foundation, Ali Kadam Hub', 'Thanda Mistri Para, Ward #1, Alikadam Bus Stand, Alikadam Sadar, Alikadam Upazila, Bandarban Hill Tract District.', 21.650474, 92.323384, 100, 'Active', NULL),
('gps-23', 'JAAGO Foundation, Lama Hub', 'Nunarjhiri Para, Ward #7, Lama Municipality, Lama Upazila, Bandarban Hill District.', 21.760756, 92.205013, 100, 'Active', NULL),
('gps-24', 'JAAGO Foundation, Cox''s Bazar Hub', 'JAAGO Foundation, Hatchery Zone, Marin Drive Road, Kolatoli, Cox''s Bazar 4700', 21.402682, 91.994479, 100, 'Active', NULL),
('gps-25', 'JAAGO Foundation, Bandarban Hub', 'Holding No: 0170-00, (Near the Hotel Darjeeling), Village: Moddhom Para, Ward No - 4, Prodhan Sarak, Bandarban Sadar, Bandarban, Bangladesh.', 22.199189, 92.219637, 100, 'Active', NULL),
('gps-26', 'JAAGO Foundation, Mymensingh Hub', '13 Swadeshi Bazar Rd, Mymensingh', 24.758830, 90.408423, 100, 'Active', NULL),
('gps-27', 'JAAGO Foundation, Chattogram Hub', 'A.S Tower (1st Floor), Mowlovipara, North Agrabad, Chittagong, Bangladesh.', 22.329640, 91.810856, 100, 'Active', NULL),
('gps-28', 'JAAGO Foundation, Sylhet Hub', 'Bangladesh Biman Office, Mojumdari, Airport Road, Sylhet, Bangladesh.', 24.910963, 91.870813, 100, 'Active', NULL),
('gps-29', 'JAAGO Foundation, Rangpur Hub', '2nd floor, Jobaida Tower, Road - 01, House - 24, New Sen Para, Grand Hotel More, Rangpur, Bangladesh.', 25.743642, 89.252173, 100, 'Active', NULL),
('gps-30', 'JAAGO Foundation, Rajshahi Hub', '180, Sipaipara, 8 No Ward, Rajpara, Rajshahi-6000, Bangladesh.', 24.369648, 88.588425, 100, 'Active', NULL),
('gps-31', 'JAAGO Foundation, HQ Extension', 'House 57, Road 7, Block H, Banani, Dhaka-1213, Bangladesh.', 23.789069, 90.408705, 100, 'Active', NULL),
('gps-32', 'JAAGO Foundation HQ', 'Banani, Dhaka - Current Administrative Office', 23.789555, 90.408706, 100, 'Active', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    branch_office = EXCLUDED.branch_office,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    radius_meters = EXCLUDED.radius_meters,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW();
