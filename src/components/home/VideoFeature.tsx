"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Play, Volume2 } from "lucide-react";

type PlayState = "idle" | "auto" | "manual";

interface VideoFeatureProps {
  videoId: string;
  title: string;
}

/**
 * 三态 YouTube 播放器
 * - idle：进入视口前显示缩略图 + 播放按钮（不加载 iframe，节省带宽）
 * - auto：IntersectionObserver 检测到视频进入视口 → 自动静音循环播放
 *         （autoplay=1&mute=1&loop=1&playlist=<id>）
 * - manual：用户点击播放/喇叭 → 带声音播放（autoplay=1&mute=0）
 */
export function VideoFeature({ videoId, title }: VideoFeatureProps) {
  const [state, setState] = useState<PlayState>("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  const watchUrl = useMemo(
    () => `https://www.youtube.com/watch?v=${videoId}`,
    [videoId],
  );

  // 自动静音循环：loop=1 需配合 playlist=<id> 才能对单视频生效
  const autoEmbed = useMemo(
    () =>
      `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&rel=0`,
    [videoId],
  );

  // 手动带声播放（点击后的后备）
  const manualEmbed = useMemo(
    () =>
      `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&playsinline=1&rel=0`,
    [videoId],
  );

  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  useEffect(() => {
    if (state !== "idle") return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setState("auto");
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [state]);

  const handleManual = () => setState("manual");

  const embedSrc = state === "manual" ? manualEmbed : autoEmbed;

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-black"
        style={{ paddingBottom: "56.25%" }}
      >
        {/* idle：缩略图 + 播放按钮 */}
        {state === "idle" && (
          <button
            type="button"
            onClick={handleManual}
            aria-label={`Play ${title}`}
            className="group absolute inset-0 h-full w-full"
          >
            <img
              src={thumbnail}
              alt={title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--nav-theme)/0.9)] text-white shadow-lg md:h-16 md:w-16">
                <Play className="ml-0.5 h-6 w-6 fill-current md:h-7 md:w-7" />
              </span>
            </span>
          </button>
        )}

        {/* auto / manual：iframe */}
        {state !== "idle" && (
          <iframe
            key={embedSrc}
            className="absolute inset-0 h-full w-full"
            src={embedSrc}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}

        {/* auto：点击取消静音提示 */}
        {state === "auto" && (
          <button
            type="button"
            onClick={handleManual}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            <Volume2 className="h-4 w-4" />
            Tap for sound
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          Watch on YouTube
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <noscript>
        <a href={watchUrl} target="_blank" rel="noopener noreferrer">
          Watch {title} on YouTube
        </a>
      </noscript>
    </div>
  );
}
