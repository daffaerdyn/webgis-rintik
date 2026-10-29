-- RINTIK - Hak akses tabel dan 15 fungsi PostGIS
-- Jalankan hanya setelah tabel dan fungsi selesai dibuat pada database baru.
-- Tidak perlu dijalankan lagi pada database Supabase saat ini.
-- Pengaturan mengikuti pemeriksaan izin 28 Oktober 2026.
-- RLS dan CREATE POLICY disimpan terpisah dalam rintik_rls_policies.sql.

-- 1. Batasi akses langsung pada kelima tabel.
REVOKE ALL PRIVILEGES ON TABLE
    public.umkm,
    public.jalan,
    public.sekolah,
    public.poi,
    public.wilayah
FROM anon, authenticated;

-- Pengunjung tanpa login hanya boleh membaca empat tabel publik.
GRANT SELECT ON TABLE
    public.umkm,
    public.jalan,
    public.sekolah,
    public.poi
TO anon;

-- Tabel wilayah tidak boleh dibaca langsung oleh anon / authenticated.
-- Data wilayah tersedia melalui fungsi get_wilayah_geojson().

-- 2. Cabut izin EXECUTE bawaan PUBLIC untuk 15 fungsi RPC.
-- Pencabutan izin eksplisit mencegah hak akses yang lebih luas dari kebutuhan.
REVOKE ALL PRIVILEGES ON FUNCTION
    public.generate_buffer(double precision, double precision, double precision),
    public.get_jalan_geojson(double precision, double precision, double precision, double precision),
    public.get_nearby_facilities(double precision, double precision, double precision),
    public.get_nearest_facilities(double precision, double precision),
    public.get_nearest_umkm(double precision, double precision, integer, text),
    public.get_poi_geojson(double precision, double precision, double precision, double precision),
    public.get_sekolah_geojson(double precision, double precision, double precision, double precision),
    public.get_umkm_in_radius(double precision, double precision, double precision, text),
    public.get_umkm_statistics(),
    public.get_wilayah_geojson(),
    public.is_point_in_bogor(double precision, double precision),
    public.search_umkm_in_radius(double precision, double precision, double precision, text, text, text, text, integer, integer),
    public.get_umkm_map_geojson(double precision, double precision, double precision, double precision),
    public.get_umkm_map_filtered_geojson(double precision, double precision, double precision, double precision, text, text, text, text),
    public.get_umkm_map_radius_geojson(double precision, double precision, double precision, double precision, double precision, double precision, double precision, text, text, text, text)
FROM PUBLIC, anon, authenticated;

-- Sesuai izin Supabase yang telah diperiksa: kedua role dapat EXECUTE.
GRANT EXECUTE ON FUNCTION
    public.generate_buffer(double precision, double precision, double precision),
    public.get_jalan_geojson(double precision, double precision, double precision, double precision),
    public.get_nearby_facilities(double precision, double precision, double precision),
    public.get_nearest_facilities(double precision, double precision),
    public.get_nearest_umkm(double precision, double precision, integer, text),
    public.get_poi_geojson(double precision, double precision, double precision, double precision),
    public.get_sekolah_geojson(double precision, double precision, double precision, double precision),
    public.get_umkm_in_radius(double precision, double precision, double precision, text),
    public.get_umkm_statistics(),
    public.get_wilayah_geojson(),
    public.is_point_in_bogor(double precision, double precision),
    public.search_umkm_in_radius(double precision, double precision, double precision, text, text, text, text, integer, integer),
    public.get_umkm_map_geojson(double precision, double precision, double precision, double precision),
    public.get_umkm_map_filtered_geojson(double precision, double precision, double precision, double precision, text, text, text, text),
    public.get_umkm_map_radius_geojson(double precision, double precision, double precision, double precision, double precision, double precision, double precision, text, text, text, text)
TO anon, authenticated;

-- Catatan:
-- Fungsi SECURITY INVOKER tetap memerlukan hak akses tabel untuk role pemanggil.
-- Saat ini authenticated tidak dapat SELECT langsung pada tabel; ini memang
-- sesuai konfigurasi yang teramati dan kebutuhan aplikasi tanpa login.
-- File ini tidak memuat CREATE TABLE, data awal, atau instalasi PostGIS.
-- Izin USAGE schema extensions diatur pada bagian bawah file ini.

-- Izin menggunakan schema PostGIS untuk fungsi spasial
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_umkm_statistics_filtered(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_umkm_statistics_filtered(text, text, text) TO anon, authenticated, service_role;