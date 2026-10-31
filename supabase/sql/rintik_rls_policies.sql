-- Backup konfigurasi RLS RINTIK dari Supabase SQL Editor.
-- Jalankan setelah tabel dibuat, pada database baru.
-- CREATE POLICY akan gagal jika policy dengan nama sama sudah ada.

ALTER TABLE public.jalan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wilayah ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read jalan" ON public.jalan AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Public read poi" ON public.poi AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Public read sekolah" ON public.sekolah AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read UMKM" ON public.umkm AS PERMISSIVE FOR SELECT TO anon USING (true);
