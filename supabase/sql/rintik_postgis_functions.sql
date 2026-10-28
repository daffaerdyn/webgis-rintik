-- RINTIK - Backup definisi 15 fungsi PostGIS dari Supabase
-- Sumber: hasil pg_get_functiondef yang diekspor dari database aktif.
-- File ini hanya berisi fungsi, BUKAN skema tabel, data, RLS, GRANT,
-- maupun instalasi extension PostGIS.
-- Jangan jalankan pada database baru sebelum semua dependensi tersedia.

CREATE OR REPLACE FUNCTION public.generate_buffer(p_latitude double precision, p_longitude double precision, p_radius_m double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    buffer_geom extensions.geometry;
BEGIN

    -- 1. Validasi koordinat
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180
    THEN
        RAISE EXCEPTION 'Koordinat tidak valid';
    END IF;

    -- 2. Validasi radius
    IF p_radius_m IS NULL
       OR p_radius_m <= 0
       OR p_radius_m > 5000
    THEN
        RAISE EXCEPTION
            'Radius harus lebih dari 0 dan maksimal 5000 meter';
    END IF;

    -- 3. Validasi wilayah Kota Bogor
    IF NOT public.is_point_in_bogor(
        p_latitude,
        p_longitude
    )
    THEN
        RAISE EXCEPTION
            'Lokasi berada di luar wilayah Kota Bogor';
    END IF;

    -- 4. Membentuk buffer dalam satuan meter
    buffer_geom := extensions.ST_Buffer(
        extensions.ST_SetSRID(
            extensions.ST_MakePoint(
                p_longitude,
                p_latitude
            ),
            4326
        )::extensions.geography,
        p_radius_m
    )::extensions.geometry;

    -- 5. Mengembalikan GeoJSON untuk frontend
    RETURN jsonb_build_object(
        'type', 'Feature',
        'geometry',
            extensions.ST_AsGeoJSON(buffer_geom)::jsonb,
        'properties',
            jsonb_build_object(
                'latitude', p_latitude,
                'longitude', p_longitude,
                'radius_meter', p_radius_m,
                'luas_km2',
                    ROUND(
                        (
                            extensions.ST_Area(
                                buffer_geom::extensions.geography
                            ) / 1000000
                        )::numeric,
                        3
                    )
            )
    );

END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_jalan_geojson(p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    area_peta extensions.geometry;
    hasil jsonb;
BEGIN
    -- 1. Validasi koordinat Bounding Box
    IF p_min_lng IS NULL
       OR p_min_lat IS NULL
       OR p_max_lng IS NULL
       OR p_max_lat IS NULL
       OR NOT (
           p_min_lng BETWEEN -180 AND 180
           AND p_max_lng BETWEEN -180 AND 180
           AND p_min_lat BETWEEN -90 AND 90
           AND p_max_lat BETWEEN -90 AND 90
       )
       OR p_min_lng >= p_max_lng
       OR p_min_lat >= p_max_lat
    THEN
        RAISE EXCEPTION 'Bounding Box tidak valid';
    END IF;

    -- 2. Membatasi ukuran area peta
    IF p_max_lng - p_min_lng > 0.5
       OR p_max_lat - p_min_lat > 0.5
    THEN
        RAISE EXCEPTION 'Area peta terlalu luas';
    END IF;

    -- 3. Membentuk area peta
    area_peta := extensions.ST_MakeEnvelope(
        p_min_lng,
        p_min_lat,
        p_max_lng,
        p_max_lat,
        4326
    );

    -- 4. Mengambil data jalan dalam area peta
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(j.geom, 6)::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_jalan', j.id_jalan,
                        'nama_jalan', j.nama_jalan,
                        'kelas_jalan', j.kelas_jalan
                    )
                )
                ORDER BY j.id_jalan
            ),
            '[]'::jsonb
        )
    )
    INTO hasil
    FROM public.jalan AS j
    WHERE j.geom IS NOT NULL
      AND extensions.ST_Intersects(
          j.geom,
          area_peta
      );

    RETURN hasil;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearby_facilities(p_latitude double precision, p_longitude double precision, p_radius_m double precision)
 RETURNS TABLE(jenis_objek text, jumlah bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    titik extensions.geography;
BEGIN

    -- 1. Validasi koordinat
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR NOT (p_latitude BETWEEN -90 AND 90)
       OR NOT (p_longitude BETWEEN -180 AND 180)
    THEN
        RAISE EXCEPTION 'Koordinat tidak valid';
    END IF;

    -- 2. Validasi radius
    IF p_radius_m IS NULL
       OR NOT (p_radius_m > 0 AND p_radius_m <= 5000)
    THEN
        RAISE EXCEPTION
            'Radius harus lebih dari 0 dan maksimal 5000 meter';
    END IF;

    -- 3. Validasi wilayah Kota Bogor
    IF public.is_point_in_bogor(
        p_latitude,
        p_longitude
    ) IS DISTINCT FROM TRUE
    THEN
        RAISE EXCEPTION
            'Lokasi berada di luar wilayah Kota Bogor';
    END IF;

    -- 4. Membuat titik kandidat
    titik := extensions.ST_SetSRID(
        extensions.ST_MakePoint(
            p_longitude,
            p_latitude
        ),
        4326
    )::extensions.geography;

    -- 5. Menghitung sekolah dalam radius
    RETURN QUERY
    SELECT
        'Sekolah'::TEXT,
        COUNT(*)
    FROM public.sekolah s
    WHERE extensions.ST_DWithin(
        s.geom::extensions.geography,
        titik,
        p_radius_m
    )

    UNION ALL

    -- 6. Menghitung POI dalam radius
    SELECT
        'POI'::TEXT,
        COUNT(*)
    FROM public.poi p
    WHERE extensions.ST_DWithin(
        p.geom::extensions.geography,
        titik,
        p_radius_m
    );

END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearest_facilities(p_latitude double precision, p_longitude double precision)
 RETURNS TABLE(sekolah_terdekat text, jarak_sekolah_meter numeric, jalan_terdekat text, jarak_jalan_meter numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    titik extensions.geography;
BEGIN

    -- 1. Validasi koordinat
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR NOT (p_latitude BETWEEN -90 AND 90)
       OR NOT (p_longitude BETWEEN -180 AND 180)
    THEN
        RAISE EXCEPTION 'Koordinat tidak valid';
    END IF;

    -- 2. Validasi wilayah Kota Bogor
    IF public.is_point_in_bogor(
        p_latitude,
        p_longitude
    ) IS DISTINCT FROM TRUE
    THEN
        RAISE EXCEPTION
            'Lokasi berada di luar wilayah Kota Bogor';
    END IF;

    -- 3. Membuat titik kandidat
    titik := extensions.ST_SetSRID(
        extensions.ST_MakePoint(
            p_longitude,
            p_latitude
        ),
        4326
    )::extensions.geography;

    -- 4. Mengambil sekolah dan jalan terdekat
    RETURN QUERY
    SELECT
        s.nama_sekolah,
        s.jarak_meter,
        j.nama_jalan,
        j.jarak_meter

    FROM (SELECT 1) AS dummy

    -- Mencari sekolah terdekat
    LEFT JOIN LATERAL (
        SELECT
            sk.nama_sekolah,
            ROUND(
                extensions.ST_Distance(
                    sk.geom::extensions.geography,
                    titik
                )::NUMERIC,
                2
            ) AS jarak_meter

        FROM public.sekolah sk

        WHERE sk.geom IS NOT NULL

        ORDER BY extensions.ST_Distance(
            sk.geom::extensions.geography,
            titik
        )

        LIMIT 1
    ) s ON TRUE

    -- Mencari jalan terdekat
    LEFT JOIN LATERAL (
        SELECT
            jl.nama_jalan,
            ROUND(
                extensions.ST_Distance(
                    jl.geom::extensions.geography,
                    titik
                )::NUMERIC,
                2
            ) AS jarak_meter

        FROM public.jalan jl

        WHERE jl.geom IS NOT NULL

        ORDER BY extensions.ST_Distance(
            jl.geom::extensions.geography,
            titik
        )

        LIMIT 1
    ) j ON TRUE;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearest_umkm(p_latitude double precision, p_longitude double precision, p_limit integer DEFAULT 10, p_kategori text DEFAULT NULL::text)
 RETURNS TABLE(id_umkm character varying, nama_umkm text, kategori text, latitude double precision, longitude double precision, jarak_meter numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    titik extensions.geography;
BEGIN
    -- Validasi koordinat
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180
    THEN
        RAISE EXCEPTION 'Koordinat tidak valid';
    END IF;

    -- Validasi jumlah hasil
    IF p_limit IS NULL
       OR p_limit < 1
       OR p_limit > 20
    THEN
        RAISE EXCEPTION 'Limit harus antara 1 sampai 20';
    END IF;

    -- Membuat titik lokasi pengguna
    titik := extensions.ST_SetSRID(
        extensions.ST_MakePoint(
            p_longitude,
            p_latitude
        ),
        4326
    )::extensions.geography;

    -- Mengambil UMKM terdekat
    RETURN QUERY
    SELECT
        u.id_umkm,
        u.nama_umkm,
        u.kategori,
        u.latitude,
        u.longitude,
        ROUND(
            extensions.ST_Distance(
                u.geom::extensions.geography,
                titik
            )::NUMERIC,
            2
        ) AS jarak_meter
    FROM public.umkm AS u
    WHERE u.geom IS NOT NULL
      AND (
          p_kategori IS NULL
          OR u.kategori = p_kategori
      )
    ORDER BY
        extensions.ST_Distance(
            u.geom::extensions.geography,
            titik
        ) ASC,
        u.id_umkm ASC
    LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_poi_geojson(p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    area_peta extensions.geometry;
    hasil jsonb;
BEGIN
    -- 1. Validasi Bounding Box
    IF p_min_lng IS NULL
       OR p_min_lat IS NULL
       OR p_max_lng IS NULL
       OR p_max_lat IS NULL
       OR NOT (
           p_min_lng BETWEEN -180 AND 180
           AND p_max_lng BETWEEN -180 AND 180
           AND p_min_lat BETWEEN -90 AND 90
           AND p_max_lat BETWEEN -90 AND 90
       )
       OR p_min_lng >= p_max_lng
       OR p_min_lat >= p_max_lat
    THEN
        RAISE EXCEPTION 'Bounding Box tidak valid';
    END IF;

    -- 2. Membatasi ukuran area
    IF p_max_lng - p_min_lng > 0.5
       OR p_max_lat - p_min_lat > 0.5
    THEN
        RAISE EXCEPTION 'Area peta terlalu luas';
    END IF;

    -- 3. Membentuk area peta
    area_peta := extensions.ST_MakeEnvelope(
        p_min_lng,
        p_min_lat,
        p_max_lng,
        p_max_lat,
        4326
    );

    -- 4. Membentuk GeoJSON POI
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(
                        p.geom,
                        6
                    )::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_poi', p.id_poi,
                        'nama_poi', p.nama_poi,
                        'kategori_poi', p.kategori_poi,
                        'sub_kategori', p.sub_kategori,
                        'kecamatan', p.kecamatan,
                        'kelurahan', p.kelurahan
                    )
                )
                ORDER BY p.id_poi
            ),
            '[]'::jsonb
        )
    )
    INTO hasil
    FROM public.poi AS p
    WHERE p.geom IS NOT NULL
      AND extensions.ST_Intersects(
          p.geom,
          area_peta
      );

    RETURN hasil;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_sekolah_geojson(p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    area_peta extensions.geometry;
    hasil jsonb;
BEGIN
    -- 1. Validasi Bounding Box
    IF p_min_lng IS NULL
       OR p_min_lat IS NULL
       OR p_max_lng IS NULL
       OR p_max_lat IS NULL
       OR NOT (
           p_min_lng BETWEEN -180 AND 180
           AND p_max_lng BETWEEN -180 AND 180
           AND p_min_lat BETWEEN -90 AND 90
           AND p_max_lat BETWEEN -90 AND 90
       )
       OR p_min_lng >= p_max_lng
       OR p_min_lat >= p_max_lat
    THEN
        RAISE EXCEPTION 'Bounding Box tidak valid';
    END IF;

    -- 2. Batasi ukuran area
    IF p_max_lng - p_min_lng > 0.5
       OR p_max_lat - p_min_lat > 0.5
    THEN
        RAISE EXCEPTION 'Area peta terlalu luas';
    END IF;

    -- 3. Membentuk area peta
    area_peta := extensions.ST_MakeEnvelope(
        p_min_lng,
        p_min_lat,
        p_max_lng,
        p_max_lat,
        4326
    );

    -- 4. Mengambil sekolah dalam area
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(
                        s.geom,
                        6
                    )::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_sekolah', s.id_sekolah,
                        'nama_sekolah', s.nama_sekolah,
                        'jenis', s.jenis,
                        'kecamatan', s.kecamatan,
                        'kelurahan', s.kelurahan
                    )
                )
                ORDER BY s.id_sekolah
            ),
            '[]'::jsonb
        )
    )
    INTO hasil
    FROM public.sekolah AS s
    WHERE s.geom IS NOT NULL
      AND extensions.ST_Intersects(
          s.geom,
          area_peta
      );

    RETURN hasil;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_umkm_in_radius(p_latitude double precision, p_longitude double precision, p_radius_m double precision, p_kategori text DEFAULT NULL::text)
 RETURNS TABLE(id_umkm character varying, nama_umkm text, kategori text, latitude double precision, longitude double precision, jarak_meter numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    titik extensions.geography;
BEGIN

    -- 1. Validasi koordinat
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180
    THEN
        RAISE EXCEPTION 'Koordinat tidak valid';
    END IF;

    -- 2. Validasi radius
    IF p_radius_m IS NULL
       OR p_radius_m <= 0
       OR p_radius_m > 5000
    THEN
        RAISE EXCEPTION 'Radius harus antara 0 dan 5000 meter';
    END IF;

    -- 3. Validasi wilayah Kota Bogor
    IF NOT public.is_point_in_bogor(
        p_latitude,
        p_longitude
    )
    THEN
        RAISE EXCEPTION
            'Lokasi berada di luar wilayah Kota Bogor';
    END IF;

    -- 4. Membuat titik geografis
    titik := extensions.ST_SetSRID(
        extensions.ST_MakePoint(
            p_longitude,
            p_latitude
        ),
        4326
    )::extensions.geography;

    -- 5. Mengambil UMKM dalam radius
    RETURN QUERY
    SELECT
        u.id_umkm,
        u.nama_umkm,
        u.kategori,
        u.latitude,
        u.longitude,

        ROUND(
            extensions.ST_Distance(
                u.geom::extensions.geography,
                titik
            )::NUMERIC,
            2
        ) AS jarak_meter

    FROM public.umkm u

    WHERE extensions.ST_DWithin(
        u.geom::extensions.geography,
        titik,
        p_radius_m
    )

    AND (
        p_kategori IS NULL
        OR u.kategori = p_kategori
    )

    ORDER BY jarak_meter ASC;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_umkm_statistics()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
    SELECT jsonb_build_object(
        'total_umkm',
        (
            SELECT COUNT(*)
            FROM public.umkm
        ),

        'per_kategori',
        (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'kategori', kategori,
                        'jumlah', jumlah
                    )
                    ORDER BY jumlah DESC, kategori
                ),
                '[]'::jsonb
            )
            FROM (
                SELECT
                    kategori,
                    COUNT(*) AS jumlah
                FROM public.umkm
                GROUP BY kategori
            ) AS hasil_kategori
        ),

        'per_kecamatan',
        (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'kecamatan', kecamatan,
                        'jumlah', jumlah
                    )
                    ORDER BY jumlah DESC, kecamatan
                ),
                '[]'::jsonb
            )
            FROM (
                SELECT
                    kecamatan,
                    COUNT(*) AS jumlah
                FROM public.umkm
                GROUP BY kecamatan
            ) AS hasil_kecamatan
        )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.get_wilayah_geojson()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(
                        w.geom,
                        6
                    )::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_wilayah', w.id_wilayah,
                        'nama_kelurahan', w.nama_kelurahan,
                        'kecamatan', w.kecamatan
                    )
                )
                ORDER BY w.id_wilayah
            ),
            '[]'::jsonb
        )
    )
    FROM public.wilayah AS w
    WHERE w.geom IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.is_point_in_bogor(p_latitude double precision, p_longitude double precision)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.wilayah AS w
        WHERE extensions.ST_Covers(
            w.geom,
            extensions.ST_SetSRID(
                extensions.ST_MakePoint(
                    p_longitude,
                    p_latitude
                ),
                4326
            )
        )
    );
$function$
;

-- Fungsi ke-12: filter UMKM berdasarkan radius, kategori, wilayah, dan kata kunci.
CREATE OR REPLACE FUNCTION public.search_umkm_in_radius(p_latitude double precision, p_longitude double precision, p_radius_m double precision, p_kategori text DEFAULT NULL::text, p_kecamatan text DEFAULT NULL::text, p_kelurahan text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS TABLE(id_umkm character varying, nama_umkm text, kategori text, kecamatan text, kelurahan text, latitude double precision, longitude double precision, jarak_meter numeric, total_data bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    titik extensions.geography;
BEGIN
    -- Validasi koordinat
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180
    THEN
        RAISE EXCEPTION 'Koordinat tidak valid';
    END IF;

    -- Validasi radius maksimal 5 km
    IF p_radius_m IS NULL
       OR p_radius_m <= 0
       OR p_radius_m > 5000
    THEN
        RAISE EXCEPTION
            'Radius harus lebih dari 0 dan maksimal 5000 meter';
    END IF;

    -- Validasi pagination
    IF p_page IS NULL
       OR p_page < 1
       OR p_page_size IS NULL
       OR p_page_size NOT BETWEEN 1 AND 100
       OR (p_page::BIGINT - 1) * p_page_size > 2147483647
    THEN
        RAISE EXCEPTION 'Parameter pagination tidak valid';
    END IF;

    -- Validasi panjang filter
    IF LENGTH(COALESCE(p_search, '')) > 100
       OR LENGTH(COALESCE(p_kategori, '')) > 100
       OR LENGTH(COALESCE(p_kecamatan, '')) > 100
       OR LENGTH(COALESCE(p_kelurahan, '')) > 100
    THEN
        RAISE EXCEPTION 'Parameter filter terlalu panjang';
    END IF;

    -- Validasi kategori RINTIK
    IF NULLIF(TRIM(p_kategori), '') IS NOT NULL
       AND TRIM(p_kategori) NOT IN (
           'Kuliner',
           'Jasa',
           'Teknologi',
           'Kerajinan',
           'Fashion'
       )
    THEN
        RAISE EXCEPTION 'Kategori UMKM tidak valid';
    END IF;

    -- Membuat titik lokasi pengguna
    titik := extensions.ST_SetSRID(
        extensions.ST_MakePoint(
            p_longitude,
            p_latitude
        ),
        4326
    )::extensions.geography;

    -- Mengambil UMKM sesuai radius dan filter
    RETURN QUERY
    SELECT
        u.id_umkm,
        u.nama_umkm,
        u.kategori,
        u.kecamatan,
        u.kelurahan,
        u.latitude,
        u.longitude,

        ROUND(
            extensions.ST_Distance(
                u.geom::extensions.geography,
                titik
            )::NUMERIC,
            2
        ) AS jarak_meter,

        COUNT(*) OVER() AS total_data

    FROM public.umkm AS u

    WHERE u.geom IS NOT NULL

      AND extensions.ST_DWithin(
          u.geom::extensions.geography,
          titik,
          p_radius_m
      )

      AND (
          NULLIF(TRIM(p_kategori), '') IS NULL
          OR u.kategori = TRIM(p_kategori)
      )

      AND (
          NULLIF(TRIM(p_kecamatan), '') IS NULL
          OR u.kecamatan = TRIM(p_kecamatan)
      )

      AND (
          NULLIF(TRIM(p_kelurahan), '') IS NULL
          OR u.kelurahan = TRIM(p_kelurahan)
      )

      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR STRPOS(
              LOWER(u.nama_umkm),
              LOWER(TRIM(p_search))
          ) > 0
      )

    ORDER BY jarak_meter ASC, u.id_umkm ASC

    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_umkm_map_filtered_geojson(p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision, p_kategori text DEFAULT NULL::text, p_kecamatan text DEFAULT NULL::text, p_kelurahan text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    area_peta extensions.geometry;
    hasil JSONB;
BEGIN
    -- Validasi koordinat Bounding Box
    IF p_min_lng IS NULL
       OR p_min_lat IS NULL
       OR p_max_lng IS NULL
       OR p_max_lat IS NULL
       OR p_min_lng NOT BETWEEN -180 AND 180
       OR p_max_lng NOT BETWEEN -180 AND 180
       OR p_min_lat NOT BETWEEN -90 AND 90
       OR p_max_lat NOT BETWEEN -90 AND 90
       OR p_min_lng >= p_max_lng
       OR p_min_lat >= p_max_lat
    THEN
        RAISE EXCEPTION 'Bounding Box tidak valid';
    END IF;

    -- Membatasi ukuran area peta
    IF p_max_lng - p_min_lng > 0.5
       OR p_max_lat - p_min_lat > 0.5
    THEN
        RAISE EXCEPTION 'Area peta terlalu luas';
    END IF;

    -- Validasi panjang parameter filter
    IF LENGTH(COALESCE(p_kategori, '')) > 100
       OR LENGTH(COALESCE(p_kecamatan, '')) > 100
       OR LENGTH(COALESCE(p_kelurahan, '')) > 100
       OR LENGTH(COALESCE(p_search, '')) > 100
    THEN
        RAISE EXCEPTION 'Parameter filter terlalu panjang';
    END IF;

    -- Validasi kategori UMKM
    IF NULLIF(TRIM(p_kategori), '') IS NOT NULL
       AND TRIM(p_kategori) NOT IN (
           'Kuliner',
           'Jasa',
           'Teknologi',
           'Kerajinan',
           'Fashion'
       )
    THEN
        RAISE EXCEPTION 'Kategori UMKM tidak valid';
    END IF;

    -- Membuat area yang terlihat di peta
    area_peta := extensions.ST_MakeEnvelope(
        p_min_lng,
        p_min_lat,
        p_max_lng,
        p_max_lat,
        4326
    );

    -- Mengambil marker sesuai area dan filter
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(u.geom, 6)::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_umkm', u.id_umkm,
                        'nama_umkm', u.nama_umkm,
                        'kategori', u.kategori,
                        'kecamatan', u.kecamatan,
                        'kelurahan', u.kelurahan
                    )
                )
                ORDER BY u.id_umkm
            ),
            '[]'::jsonb
        )
    )
    INTO hasil
    FROM public.umkm AS u
    WHERE u.geom IS NOT NULL

      AND extensions.ST_Intersects(
          u.geom,
          area_peta
      )

      AND (
          NULLIF(TRIM(p_kategori), '') IS NULL
          OR u.kategori = TRIM(p_kategori)
      )

      AND (
          NULLIF(TRIM(p_kecamatan), '') IS NULL
          OR u.kecamatan = TRIM(p_kecamatan)
      )

      AND (
          NULLIF(TRIM(p_kelurahan), '') IS NULL
          OR u.kelurahan = TRIM(p_kelurahan)
      )

      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR STRPOS(
              LOWER(u.nama_umkm),
              LOWER(TRIM(p_search))
          ) > 0
      );

    RETURN hasil;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_umkm_map_geojson(p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    area_peta extensions.geometry;
    hasil JSONB;
BEGIN
    -- Validasi Bounding Box
    IF p_min_lng IS NULL
       OR p_min_lat IS NULL
       OR p_max_lng IS NULL
       OR p_max_lat IS NULL
       OR p_min_lng NOT BETWEEN -180 AND 180
       OR p_max_lng NOT BETWEEN -180 AND 180
       OR p_min_lat NOT BETWEEN -90 AND 90
       OR p_max_lat NOT BETWEEN -90 AND 90
       OR p_min_lng >= p_max_lng
       OR p_min_lat >= p_max_lat
    THEN
        RAISE EXCEPTION 'Bounding Box tidak valid';
    END IF;

    -- Batasi area permintaan
    IF p_max_lng - p_min_lng > 0.5
       OR p_max_lat - p_min_lat > 0.5
    THEN
        RAISE EXCEPTION 'Area peta terlalu luas';
    END IF;

    -- Membentuk area yang sedang dilihat pengguna
    area_peta := extensions.ST_MakeEnvelope(
        p_min_lng,
        p_min_lat,
        p_max_lng,
        p_max_lat,
        4326
    );

    -- Mengambil seluruh marker UMKM dalam area
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(
                        u.geom, 6
                    )::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_umkm', u.id_umkm,
                        'nama_umkm', u.nama_umkm,
                        'kategori', u.kategori,
                        'kecamatan', u.kecamatan,
                        'kelurahan', u.kelurahan
                    )
                )
                ORDER BY u.id_umkm
            ),
            '[]'::jsonb
        )
    )
    INTO hasil
    FROM public.umkm AS u
    WHERE u.geom IS NOT NULL
      AND extensions.ST_Intersects(
          u.geom,
          area_peta
      );

    RETURN hasil;
END;
$function$
;

-- Marker UMKM berdasarkan area peta, radius, dan filter.
CREATE OR REPLACE FUNCTION public.get_umkm_map_radius_geojson(p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision, p_latitude double precision, p_longitude double precision, p_radius double precision, p_kategori text DEFAULT NULL::text, p_kecamatan text DEFAULT NULL::text, p_kelurahan text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
    area_peta extensions.geometry;
    titik_pusat extensions.geography;
    hasil JSONB;
BEGIN
    -- Validasi area peta
    IF p_min_lng IS NULL
       OR p_min_lat IS NULL
       OR p_max_lng IS NULL
       OR p_max_lat IS NULL
       OR p_min_lng NOT BETWEEN -180 AND 180
       OR p_max_lng NOT BETWEEN -180 AND 180
       OR p_min_lat NOT BETWEEN -90 AND 90
       OR p_max_lat NOT BETWEEN -90 AND 90
       OR p_min_lng >= p_max_lng
       OR p_min_lat >= p_max_lat
    THEN
        RAISE EXCEPTION 'Bounding Box tidak valid';
    END IF;

    -- Batasi ukuran area peta
    IF p_max_lng - p_min_lng > 0.5
       OR p_max_lat - p_min_lat > 0.5
    THEN
        RAISE EXCEPTION 'Area peta terlalu luas';
    END IF;

    -- Validasi titik pusat pencarian
    IF p_latitude IS NULL
       OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180
    THEN
        RAISE EXCEPTION 'Koordinat pusat tidak valid';
    END IF;

    -- Validasi radius dalam meter
    IF p_radius IS NULL
       OR p_radius <= 0
       OR p_radius > 5000
    THEN
        RAISE EXCEPTION 'Radius harus antara 0 sampai 5000 meter';
    END IF;

    -- Validasi filter
    IF LENGTH(COALESCE(p_kategori, '')) > 100
       OR LENGTH(COALESCE(p_kecamatan, '')) > 100
       OR LENGTH(COALESCE(p_kelurahan, '')) > 100
       OR LENGTH(COALESCE(p_search, '')) > 100
    THEN
        RAISE EXCEPTION 'Parameter filter terlalu panjang';
    END IF;

    IF NULLIF(TRIM(p_kategori), '') IS NOT NULL
       AND TRIM(p_kategori) NOT IN (
           'Kuliner',
           'Jasa',
           'Teknologi',
           'Kerajinan',
           'Fashion'
       )
    THEN
        RAISE EXCEPTION 'Kategori UMKM tidak valid';
    END IF;

    -- Area peta yang sedang terlihat
    area_peta := extensions.ST_MakeEnvelope(
        p_min_lng,
        p_min_lat,
        p_max_lng,
        p_max_lat,
        4326
    );

    -- Titik pusat radius
    titik_pusat := extensions.ST_SetSRID(
        extensions.ST_MakePoint(
            p_longitude,
            p_latitude
        ),
        4326
    )::extensions.geography;

    -- Ambil UMKM yang berada dalam area peta DAN radius
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features',
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry',
                    extensions.ST_AsGeoJSON(u.geom, 6)::jsonb,
                    'properties',
                    jsonb_build_object(
                        'id_umkm', u.id_umkm,
                        'nama_umkm', u.nama_umkm,
                        'kategori', u.kategori,
                        'kecamatan', u.kecamatan,
                        'kelurahan', u.kelurahan
                    )
                )
                ORDER BY u.id_umkm
            ),
            '[]'::jsonb
        )
    )
    INTO hasil
    FROM public.umkm AS u
    WHERE u.geom IS NOT NULL

      -- Harus berada dalam area peta
      AND extensions.ST_Intersects(
          u.geom,
          area_peta
      )

      -- Harus berada dalam radius yang dipilih
      AND extensions.ST_DWithin(
          u.geom::extensions.geography,
          titik_pusat,
          p_radius
      )

      -- Filter kategori
      AND (
          NULLIF(TRIM(p_kategori), '') IS NULL
          OR u.kategori = TRIM(p_kategori)
      )

      -- Filter kecamatan
      AND (
          NULLIF(TRIM(p_kecamatan), '') IS NULL
          OR u.kecamatan = TRIM(p_kecamatan)
      )

      -- Filter kelurahan
      AND (
          NULLIF(TRIM(p_kelurahan), '') IS NULL
          OR u.kelurahan = TRIM(p_kelurahan)
      )

      -- Pencarian nama
      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR STRPOS(
              LOWER(u.nama_umkm),
              LOWER(TRIM(p_search))
          ) > 0
      );

    RETURN hasil;
END;
$function$;
