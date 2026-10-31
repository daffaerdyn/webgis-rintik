-- RINTIK - Struktur lima tabel utama dan indeks spasial
-- Disusun dari hasil pemeriksaan Supabase SQL Editor, 28 Oktober 2026.
-- Jalankan hanya pada DATABASE BARU / kosong, jangan pada database RINTIK aktif.
-- Belum termasuk: isi tabel, RLS, GRANT/REVOKE, dan 11 fungsi PostGIS.
-- id_wilayah: GENERATED ALWAYS AS IDENTITY, START WITH 1 INCREMENT BY 1
-- sesuai hasil pemeriksaan information_schema.columns.

-- Prasyarat: PostgreSQL dengan PostGIS pada schema extensions.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TABLE public.jalan (
    id_jalan character varying(30) NOT NULL,
    nama_jalan text,
    kelas_jalan text,
    source text,
    geom extensions.geometry(LineString, 4326),
    CONSTRAINT jalan_pkey PRIMARY KEY (id_jalan)
);

CREATE TABLE public.poi (
    id_poi character varying(30) NOT NULL,
    nama_poi text NOT NULL,
    kategori_poi text,
    sub_kategori text,
    alamat text,
    kecamatan text,
    kelurahan text,
    latitude double precision,
    longitude double precision,
    source text,
    geom extensions.geometry(Point, 4326),
    CONSTRAINT poi_pkey PRIMARY KEY (id_poi)
);

CREATE TABLE public.sekolah (
    id_sekolah character varying(30) NOT NULL,
    nama_sekolah text NOT NULL,
    jenis text,
    alamat text,
    kecamatan text,
    kelurahan text,
    latitude double precision,
    longitude double precision,
    source text,
    geom extensions.geometry(Point, 4326),
    CONSTRAINT sekolah_pkey PRIMARY KEY (id_sekolah)
);

CREATE TABLE public.umkm (
    id_umkm character varying(20) NOT NULL,
    nama_umkm text NOT NULL,
    kategori text,
    deskripsi_produk text,
    alamat text,
    kecamatan text,
    kelurahan text,
    latitude double precision,
    longitude double precision,
    range_harga text,
    rating numeric,
    source text,
    collected_at timestamp with time zone,
    geom extensions.geometry(Point, 4326),
    CONSTRAINT umkm_pkey PRIMARY KEY (id_umkm)
);

CREATE TABLE public.wilayah (
    id_wilayah bigint GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
    nama_kelurahan text NOT NULL,
    kecamatan text NOT NULL,
    kabkot text,
    provinsi text,
    source text,
    geom extensions.geometry(Polygon, 4326),
    CONSTRAINT wilayah_pkey PRIMARY KEY (id_wilayah)
);

-- Indeks GiST dari database RINTIK aktif.
-- Indeks btree untuk Primary Key sudah dibuat otomatis oleh setiap PRIMARY KEY.
CREATE INDEX idx_jalan_geom ON public.jalan USING gist (geom);
CREATE INDEX idx_poi_geom ON public.poi USING gist (geom);
CREATE INDEX idx_sekolah_geom ON public.sekolah USING gist (geom);
CREATE INDEX idx_umkm_geom ON public.umkm USING gist (geom);
CREATE INDEX idx_wilayah_geom ON public.wilayah USING gist (geom);
