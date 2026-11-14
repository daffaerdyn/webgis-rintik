"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function InitialLoader() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  // Default audio aktif (bersuara)
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const userExplicitlyMutedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);

  const dismissLoader = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFadingOut(true);

    const timer = window.setTimeout(() => {
      setIsDismissed(true);
      document.body.style.overflow = "";
    }, 450);

    return () => window.clearTimeout(timer);
  }, []);

  const toggleAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isAudioMuted) {
      // Pengguna mengaktifkan kembali suara
      userExplicitlyMutedRef.current = false;
      setIsAudioMuted(false);
      video.muted = false;
      video.volume = 1;
      video.play().catch(() => {});
    } else {
      // Pengguna menonaktifkan suara (mute)
      userExplicitlyMutedRef.current = true;
      setIsAudioMuted(true);
      video.muted = true;
    }
    // CATATAN: video.currentTime sengaja TIDAK disentuh agar pemutaran video tidak terulang / tetap lanjut
  }, [isAudioMuted]);

  useEffect(() => {
    // Kunci scroll halaman saat loader sedang aktif
    document.body.style.overflow = "hidden";

    const video = videoRef.current;
    if (video) {
      // Prioritaskan default bersuara
      video.muted = false;
      video.volume = 1;
      video.currentTime = 0;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Autoplay dengan suara diizinkan oleh browser
            if (!userExplicitlyMutedRef.current) {
              video.muted = false;
            }
          })
          .catch(() => {
            // Jika browser membatasi autoplay bersuara sebelum interaksi pengguna (Autoplay Policy),
            // putar visual secara muted terlebih dahulu agar animasi tidak tertahan,
            // TETAP biarkan status UI bersuara (isAudioMuted = false),
            // dan buka suara otomatis saat pengguna pertama kali menyentuh/berinteraksi dengan layar.
            if (!userExplicitlyMutedRef.current) {
              video.muted = true;
              video.play().catch(() => {});
            }
          });
      }
    }

    // Listener interaksi pertama untuk membuka audio jika sempat dibatasi browser
    const handleFirstInteraction = () => {
      const vid = videoRef.current;
      if (!vid) return;

      if (!userExplicitlyMutedRef.current && vid.muted) {
        vid.muted = false;
        vid.volume = 1;
        vid.play().catch(() => {});
      }
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { passive: true });
    window.addEventListener("touchstart", handleFirstInteraction, { passive: true });
    window.addEventListener("keydown", handleFirstInteraction, { passive: true });

    // Safety fallback: tutup loader jika video macet total
    const fallbackTimer = window.setTimeout(() => {
      dismissLoader();
    }, 8500);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      document.body.style.overflow = "";
    };
  }, [dismissLoader]);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman RINTIK"
      className={`rintik-initial-loader fixed inset-0 z-[9999] flex items-center justify-center bg-bg-cream overflow-hidden transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Frame video dengan penskalaan proporsional optimal (besar & proporsional di mobile) */}
      <div
        className={`flex items-center justify-center w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl px-2 sm:px-4 transition-all duration-500 ease-out motion-reduce:transition-none ${
          isFadingOut ? "scale-100 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <video
          ref={videoRef}
          src="/img/loader.webm"
          autoPlay
          playsInline
          preload="auto"
          onEnded={dismissLoader}
          onError={dismissLoader}
          className="w-full h-auto aspect-video object-contain pointer-events-none select-none scale-[2.7] sm:scale-130 md:scale-125 lg:scale-115 transition-transform duration-500 ease-out"
        />
      </div>

      {/* Kontrol Audio & Tombol Lewatkan di sudut kanan bawah */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-center gap-2">
        {/* Tombol Ikon Speaker Kecil untuk toggle suara */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleAudio();
          }}
          aria-label={isAudioMuted ? "Aktifkan suara latar" : "Nonaktifkan suara latar"}
          title={isAudioMuted ? "Aktifkan suara" : "Nonaktifkan suara"}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-700 bg-white/90 hover:bg-white hover:text-stone-950 border border-stone-200/90 shadow-md backdrop-blur-md transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
        >
          {isAudioMuted ? (
            <VolumeX className="w-4 h-4 text-stone-400" aria-hidden="true" />
          ) : (
            <Volume2 className="w-4 h-4 text-stone-800" aria-hidden="true" />
          )}
        </button>

        {/* Tombol Lewatkan */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissLoader();
          }}
          aria-label="Lewatkan animasi pengenalan RINTIK"
          className="px-4 py-1.5 rounded-full text-xs font-medium text-stone-600 bg-white/80 hover:bg-white hover:text-stone-900 border border-stone-200 shadow-sm backdrop-blur-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
        >
          Lewatkan
        </button>
      </div>
    </div>
  );
}
