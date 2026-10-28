-- RINTIK - Persiapan ekstensi database Supabase
-- Jalankan pada database baru sebelum membuat tabel dan fungsi PostGIS.
-- Konfigurasi asal: PostGIS 3.3.7 pada schema extensions.
-- Versi yang terpasang mengikuti versi tersedia di database tujuan.

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- plpgsql adalah bahasa prosedural bawaan PostgreSQL yang telah terpasang
-- pada database Supabase asal di schema pg_catalog (versi 1.0).
-- Tidak perlu membuat ulang ekstensi plpgsql secara manual.
