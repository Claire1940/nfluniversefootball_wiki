"use client";

import { useState, Suspense, lazy } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  Coins,
  Copy,
  Football,
  Gift,
  Keyboard,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useMessages } from "next-intl";
import { VideoFeature } from "@/components/home/VideoFeature";
import { LatestGuidesAccordion } from "@/components/home/LatestGuidesAccordion";
import { NativeBannerAd, AdBanner } from "@/components/ads";
import { getPreferredMobileBannerSelection } from "@/components/ads/mobileAdConfigs";
import { scrollToSection } from "@/lib/scrollToSection";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import type { ContentItemWithType } from "@/lib/getLatestArticles";

// Lazy load heavy components
const HeroStats = lazy(() => import("@/components/home/HeroStats"));
const FAQSection = lazy(() => import("@/components/home/FAQSection"));
const CTASection = lazy(() => import("@/components/home/CTASection"));

// Loading placeholder
const LoadingPlaceholder = ({ height = "h-64" }: { height?: string }) => (
  <div
    className={`${height} bg-white/5 border border-border rounded-xl animate-pulse`}
  />
);

interface HomePageClientProps {
  latestArticles: ContentItemWithType[];
  locale: string;
}

// Tools Grid 卡片锚点 ↔ 模块 section id（8 张卡 ↔ 8 个模块）
const TOOL_SECTION_IDS = [
  "codes-and-rewards",
  "beginner-guide",
  "controls-and-gameplay-guide",
  "best-positions-tier-list",
  "teams-uniforms-and-stadiums",
  "ranked-park-and-matchmaking",
  "coins-ovr-and-progression",
  "updates-and-events-tracker",
];

// 模块标题装饰图标
const MODULE_EYEBROW_ICON = {
  "codes-and-rewards": Gift,
  "beginner-guide": BookOpen,
  "controls-and-gameplay-guide": Keyboard,
  "best-positions-tier-list": Trophy,
  "teams-uniforms-and-stadiums": Football,
  "ranked-park-and-matchmaking": Target,
  "coins-ovr-and-progression": Coins,
  "updates-and-events-tracker": CalendarClock,
} as const;

// Tier 徽章配色（全部走主题色变量，无硬编码色）
function tierBadgeClass(tier: string): string {
  switch (tier) {
    case "S":
      return "bg-[hsl(var(--nav-theme))] text-white border-transparent";
    case "A":
      return "bg-[hsl(var(--nav-theme)/0.25)] text-[hsl(var(--nav-theme-light))] border-[hsl(var(--nav-theme)/0.4)]";
    case "B":
      return "bg-[hsl(var(--nav-theme)/0.15)] text-[hsl(var(--nav-theme-light))] border-[hsl(var(--nav-theme)/0.3)]";
    default:
      return "bg-white/5 text-muted-foreground border-border";
  }
}

function statusBadgeClass(status: string): string {
  return status === "Active"
    ? "bg-[hsl(var(--nav-theme)/0.15)] text-[hsl(var(--nav-theme-light))] border-[hsl(var(--nav-theme)/0.4)]"
    : "bg-white/5 text-muted-foreground border-border";
}

// 模块标题块（eyebrow + 装饰图标 + 标题 + intro）
function ModuleHeader({
  sectionId,
  eyebrow,
  title,
  intro,
}: {
  sectionId: keyof typeof MODULE_EYEBROW_ICON;
  eyebrow: string;
  title: string;
  intro: string;
}) {
  const Icon = MODULE_EYEBROW_ICON[sectionId];
  return (
    <div className="mb-8 text-center scroll-reveal md:mb-12">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--nav-theme)/0.3)] bg-[hsl(var(--nav-theme)/0.1)] px-3 py-1.5 text-xs font-medium uppercase tracking-wider md:mb-4">
        <Icon className="h-4 w-4 text-[hsl(var(--nav-theme-light))]" />
        {eyebrow}
      </div>
      <h2 className="mb-3 text-3xl font-bold md:mb-4 md:text-5xl">{title}</h2>
      <p className="mx-auto max-w-3xl text-base text-muted-foreground md:text-lg">
        {intro}
      </p>
    </div>
  );
}

// 代码卡片（带复制反馈）
function CodeCard({ item }: { item: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败，用户仍可手动选中
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <code className="rounded-md bg-[hsl(var(--nav-theme)/0.1)] px-2.5 py-1 font-mono text-sm font-semibold tracking-wide text-[hsl(var(--nav-theme-light))]">
          {item.code}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy code ${item.code}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          {copied ? (
            <Check className="h-4 w-4 text-[hsl(var(--nav-theme-light))]" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
            item.status,
          )}`}
        >
          {item.status}
        </span>
        <span className="text-sm font-semibold">{item.reward}</span>
      </div>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
        {item.rewardType}
      </p>
      <p className="mb-3 text-sm text-muted-foreground">{item.redeemNote}</p>

      <p className="mt-auto text-xs text-muted-foreground/80">
        Source: {item.source}
      </p>
    </div>
  );
}

export default function HomePageClient({
  latestArticles,
  locale,
}: HomePageClientProps) {
  const t = useMessages() as any;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.nfluniversefootball.wiki";

  const mobileBannerAd = getPreferredMobileBannerSelection();

  // 结构化数据
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "NFL Universe Football Wiki",
        description:
          "Complete NFL Universe Football Wiki covering Roblox codes, controls, teams, stadiums, builds, ranked park, updates, and beginner tips for the official NFL experience.",
        image: {
          "@type": "ImageObject",
          url: `${siteUrl}/images/hero.webp`,
          width: 1920,
          height: 1080,
          caption:
            "NFL Universe Football - Official NFL Roblox Football Experience",
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NFL Universe Football Wiki",
        alternateName: "NFL Universe Football",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/android-chrome-512x512.png`,
          width: 512,
          height: 512,
        },
        image: {
          "@type": "ImageObject",
          url: `${siteUrl}/images/hero.webp`,
          width: 1920,
          height: 1080,
          caption:
            "NFL Universe Football Wiki - Official NFL Roblox Football Experience",
        },
        sameAs: [
          "https://www.roblox.com/games/2338325648/NFL-Universe-Football",
          "https://discord.com/invite/ufb",
          "https://x.com/NFLUniverseRBLX",
          "https://www.youtube.com/@NFLUniverseRBLX",
        ],
      },
      {
        "@type": "VideoGame",
        name: "NFL Universe Football",
        gamePlatform: ["Roblox"],
        applicationCategory: "Game",
        genre: ["Sports", "Football", "Multiplayer"],
        numberOfPlayers: { minValue: 1 },
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: "https://www.roblox.com/games/2338325648/NFL-Universe-Football",
        },
      },
      {
        "@type": "VideoObject",
        name: "HOW To Play NFL Universe Football! (Noob To Pro Tutorial)",
        description:
          "Beginner-friendly Noob to Pro tutorial for NFL Universe Football, covering passing, catching, running, tackling, defending, and core Roblox football gameplay.",
        uploadDate: "2024-08-12",
        thumbnailUrl: `${siteUrl}/images/hero.webp`,
        embedUrl: "https://www.youtube.com/embed/qJ4RTcF35bU",
        url: "https://www.youtube.com/watch?v=qJ4RTcF35bU",
      },
    ],
  };

  // 位置按 tier 分组（S/A/B/C）
  const positionTiers = ["S", "A", "B", "C"]
    .map((tier) => ({
      tier,
      items: t.modules.nflBestPositions.positions.filter(
        (p: any) => p.tier === tier,
      ),
    }))
    .filter((g: any) => g.items.length > 0);

  return (
    <div className="home-shell min-h-screen bg-background text-foreground">
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* 广告位 1: 顶部固定横幅 */}
      <div className="sticky top-20 z-20 border-b border-border py-2">
        <AdBanner
          type="banner-320x50"
          adKey={process.env.NEXT_PUBLIC_AD_MOBILE_320X50}
        />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-24 pb-14 md:pt-32 md:pb-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center scroll-reveal">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--nav-theme)/0.3)] bg-[hsl(var(--nav-theme)/0.1)] px-3 py-1.5 md:mb-6 md:px-4 md:py-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--nav-theme-light))]" />
              <span className="text-xs font-medium md:text-sm">
                {t.hero.badge}
              </span>
            </div>

            <h1 className="mb-4 text-4xl font-bold leading-[1.05] sm:text-5xl md:mb-6 md:text-7xl">
              {t.hero.title}
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg md:mb-10 md:max-w-3xl md:text-2xl">
              {t.hero.description}
            </p>

            <div className="mb-10 flex flex-col justify-center gap-3 sm:flex-row md:mb-12 md:gap-4">
              <button
                type="button"
                onClick={() => scrollToSection("codes-and-rewards")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--nav-theme))] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[hsl(var(--nav-theme)/0.9)] md:px-8 md:py-4 md:text-lg"
              >
                <Gift className="h-5 w-5" />
                {t.hero.getFreeCodesCTA}
              </button>
              <a
                href="https://www.roblox.com/games/2338325648/NFL-Universe-Football"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3.5 text-base font-semibold transition-colors hover:bg-white/10 md:px-8 md:py-4 md:text-lg"
              >
                {t.hero.playOnSteamCTA}
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          <Suspense fallback={<LoadingPlaceholder height="h-32" />}>
            <HeroStats stats={Object.values(t.hero.stats)} />
          </Suspense>
        </div>
      </section>

      {/* Video Section（紧跟 Hero） */}
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-5xl scroll-reveal">
          <div className="relative overflow-hidden rounded-2xl">
            <VideoFeature
              videoId="qJ4RTcF35bU"
              title="HOW To Play NFL Universe Football! (Noob To Pro Tutorial)"
            />
          </div>
        </div>
      </section>

      {/* Tools Grid（Video 之后、Latest Updates 之前） */}
      <section className="bg-white/[0.02] px-4 py-14 md:py-20">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8 text-center scroll-reveal md:mb-12">
            <h2 className="mb-3 text-3xl font-bold md:mb-4 md:text-5xl">
              {t.tools.title}{" "}
              <span className="text-[hsl(var(--nav-theme-light))]">
                {t.tools.titleHighlight}
              </span>
            </h2>
            <p className="text-base text-muted-foreground md:text-lg">
              {t.tools.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {t.tools.cards.map((card: any, index: number) => {
              const sectionId = TOOL_SECTION_IDS[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToSection(sectionId)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="group cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-all duration-300 hover:border-[hsl(var(--nav-theme)/0.5)] hover:shadow-lg hover:shadow-[hsl(var(--nav-theme)/0.1)] scroll-reveal md:p-6"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--nav-theme)/0.1)] transition-colors group-hover:bg-[hsl(var(--nav-theme)/0.2)] md:mb-4 md:h-12 md:w-12">
                    <DynamicIcon
                      name={card.icon}
                      className="h-5 w-5 text-[hsl(var(--nav-theme-light))] md:h-6 md:w-6"
                    />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold md:text-base">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest Updates Section */}
      <LatestGuidesAccordion articles={latestArticles} locale={locale} max={12} />

      {/* 广告位 2: 首屏内容之后 */}
      <NativeBannerAd adKey={process.env.NEXT_PUBLIC_AD_NATIVE_BANNER || ""} />

      {/* 广告位 3: 移动端方形 / 桌面横幅 */}
      <AdBanner
        type="banner-300x250"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_300X250}
        className="md:hidden"
      />
      <AdBanner
        type="banner-728x90"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_728X90}
        className="hidden md:flex"
      />

      {/* Module 1: Codes and Rewards */}
      <section
        id="codes-and-rewards"
        className="scroll-mt-24 px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="codes-and-rewards"
            eyebrow={t.modules.nflCodesAndRewards.eyebrow}
            title={t.modules.nflCodesAndRewards.title}
            intro={t.modules.nflCodesAndRewards.intro}
          />
          <div className="grid grid-cols-1 gap-4 scroll-reveal md:grid-cols-2 lg:grid-cols-3">
            {t.modules.nflCodesAndRewards.items.map((item: any, i: number) => (
              <CodeCard key={i} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* 广告位 4: 第一模块之后的阅读停顿位 */}
      <AdBanner
        type="banner-300x250"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_300X250}
        className="md:hidden"
      />
      <AdBanner
        type="banner-468x60"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_468X60}
        className="hidden md:flex"
      />

      {/* Module 2: Beginner Guide */}
      <section
        id="beginner-guide"
        className="scroll-mt-24 bg-white/[0.02] px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="beginner-guide"
            eyebrow={t.modules.nflBeginnerGuide.eyebrow}
            title={t.modules.nflBeginnerGuide.title}
            intro={t.modules.nflBeginnerGuide.intro}
          />
          <div className="space-y-3 scroll-reveal md:space-y-4">
            {t.modules.nflBeginnerGuide.steps.map((step: any, index: number) => (
              <div
                key={index}
                className="flex gap-3 rounded-xl border border-border bg-white/5 p-4 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)] md:gap-4 md:p-6"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[hsl(var(--nav-theme)/0.5)] bg-[hsl(var(--nav-theme)/0.2)] md:h-12 md:w-12">
                  <span className="text-base font-bold text-[hsl(var(--nav-theme-light))] md:text-xl">
                    {step.step}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-bold md:mb-1.5 md:text-xl">
                    {step.title}
                  </h3>
                  <p className="mb-2 text-sm font-medium text-[hsl(var(--nav-theme-light))]">
                    Goal: {step.goal}
                  </p>
                  <p className="mb-3 text-sm text-muted-foreground md:text-base">
                    {step.details}
                  </p>
                  <p className="flex items-start gap-2 rounded-lg bg-[hsl(var(--nav-theme)/0.05)] p-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--nav-theme-light))]" />
                    {step.beginnerTip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module 3: Controls and Gameplay */}
      <section
        id="controls-and-gameplay-guide"
        className="scroll-mt-24 px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="controls-and-gameplay-guide"
            eyebrow={t.modules.nflControlsAndGameplay.eyebrow}
            title={t.modules.nflControlsAndGameplay.title}
            intro={t.modules.nflControlsAndGameplay.intro}
          />
          <div className="space-y-8 scroll-reveal">
            {Object.entries(
              t.modules.nflControlsAndGameplay.controls.reduce(
                (groups: Record<string, any[]>, c: any) => {
                  (groups[c.category] ||= []).push(c);
                  return groups;
                },
                {},
              ),
            ).map(([category, controls]) => (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-[hsl(var(--nav-theme-light))]" />
                  <h3 className="text-lg font-bold">{category}</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {controls.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-white/5 p-4 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)] md:p-5"
                    >
                      <h4 className="mb-3 font-bold">{c.action}</h4>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            PC
                          </p>
                          <kbd className="inline-block rounded-md border border-border bg-[hsl(var(--nav-theme)/0.1)] px-2 py-0.5 text-xs text-[hsl(var(--nav-theme-light))]">
                            {c.pcInput}
                          </kbd>
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            Mobile
                          </p>
                          <kbd className="inline-block rounded-md border border-border bg-[hsl(var(--nav-theme)/0.1)] px-2 py-0.5 text-xs text-[hsl(var(--nav-theme-light))]">
                            {c.mobileInput}
                          </kbd>
                        </div>
                      </div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        {c.useCase}
                      </p>
                      <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--nav-theme-light))]" />
                        {c.beginnerTip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 广告位 5: 移动端横幅 */}
      {mobileBannerAd && (
        <AdBanner
          type={mobileBannerAd.type}
          adKey={mobileBannerAd.adKey}
          className="md:hidden"
        />
      )}

      {/* Module 4: Best Positions Tier List */}
      <section
        id="best-positions-tier-list"
        className="scroll-mt-24 bg-white/[0.02] px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="best-positions-tier-list"
            eyebrow={t.modules.nflBestPositions.eyebrow}
            title={t.modules.nflBestPositions.title}
            intro={t.modules.nflBestPositions.intro}
          />
          <div className="space-y-6 scroll-reveal">
            {positionTiers.map((group: any) => (
              <div
                key={group.tier}
                className="rounded-2xl border border-border bg-white/[0.03] p-4 md:p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg font-bold ${tierBadgeClass(
                      group.tier,
                    )}`}
                  >
                    {group.tier}
                  </span>
                  <h3 className="text-lg font-bold">Tier {group.tier}</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)]"
                    >
                      <h4 className="mb-1 text-lg font-bold">{p.position}</h4>
                      <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                        {p.roleType}
                      </p>

                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                        <Stat label="Difficulty" value={p.beginnerDifficulty} />
                        <Stat label="Match Impact" value={p.matchImpact} />
                        <Stat label="Scoring" value={p.scoringValue} />
                        <Stat label="Team Value" value={p.teamUsefulness} />
                      </div>

                      <p className="mb-3 text-sm text-muted-foreground">
                        {p.whyItRanksHere}
                      </p>
                      <p className="mb-2 text-sm">
                        <span className="font-semibold">Best for:</span>{" "}
                        <span className="text-muted-foreground">
                          {p.bestFor}
                        </span>
                      </p>
                      <p className="mt-auto flex items-start gap-2 rounded-lg bg-[hsl(var(--nav-theme)/0.05)] p-3 text-xs text-muted-foreground">
                        <Trophy className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--nav-theme-light))]" />
                        {p.starterTip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module 5: Teams, Uniforms, Stadiums, and Merch */}
      <section
        id="teams-uniforms-and-stadiums"
        className="scroll-mt-24 px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="teams-uniforms-and-stadiums"
            eyebrow={t.modules.nflTeamsUniformsAndStadiums.eyebrow}
            title={t.modules.nflTeamsUniformsAndStadiums.title}
            intro={t.modules.nflTeamsUniformsAndStadiums.intro}
          />
          <div className="space-y-6 scroll-reveal">
            {/* All 32 NFL Teams wide card */}
            <div className="rounded-2xl border border-border bg-card p-5 md:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--nav-theme)/0.1)] md:h-12 md:w-12">
                  <Football className="h-5 w-5 text-[hsl(var(--nav-theme-light))] md:h-6 md:w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold md:text-xl">
                    {t.modules.nflTeamsUniformsAndStadiums.teamsCard.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.modules.nflTeamsUniformsAndStadiums.teamsCard.description}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--nav-theme-light))]">
                    {t.modules.nflTeamsUniformsAndStadiums.teamsCard.afcLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {t.modules.nflTeamsUniformsAndStadiums.teamsCard.afc.map(
                      (team: string, i: number) => (
                        <span
                          key={i}
                          className="rounded-md border border-border bg-white/5 px-2.5 py-1 text-xs"
                        >
                          {team}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--nav-theme-light))]">
                    {t.modules.nflTeamsUniformsAndStadiums.teamsCard.nfcLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {t.modules.nflTeamsUniformsAndStadiums.teamsCard.nfc.map(
                      (team: string, i: number) => (
                        <span
                          key={i}
                          className="rounded-md border border-border bg-white/5 px-2.5 py-1 text-xs"
                        >
                          {team}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {t.modules.nflTeamsUniformsAndStadiums.features.map(
                (f: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)]"
                  >
                    <h4 className="mb-2 text-base font-bold">{f.title}</h4>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {f.description}
                    </p>
                    <p className="mt-auto flex items-start gap-2 rounded-lg bg-[hsl(var(--nav-theme)/0.05)] p-3 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--nav-theme-light))]" />
                      {f.playerValue}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Module 6: Ranked Park and Matchmaking */}
      <section
        id="ranked-park-and-matchmaking"
        className="scroll-mt-24 bg-white/[0.02] px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="ranked-park-and-matchmaking"
            eyebrow={t.modules.nflRankedParkAndMatchmaking.eyebrow}
            title={t.modules.nflRankedParkAndMatchmaking.title}
            intro={t.modules.nflRankedParkAndMatchmaking.intro}
          />
          <div className="grid grid-cols-1 gap-4 scroll-reveal md:grid-cols-2">
            {t.modules.nflRankedParkAndMatchmaking.strategies.map(
              (s: any, i: number) => (
                <div
                  key={i}
                  className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)] md:p-6"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold md:text-lg">{s.title}</h3>
                    <span className="flex-shrink-0 rounded-full border border-[hsl(var(--nav-theme)/0.4)] bg-[hsl(var(--nav-theme)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--nav-theme-light))]">
                      {s.priority}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {s.whatItMeans}
                  </p>
                  <p className="mt-auto flex items-start gap-2 rounded-lg bg-[hsl(var(--nav-theme)/0.05)] p-3 text-sm text-muted-foreground">
                    <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-[hsl(var(--nav-theme-light))]" />
                    <span>
                      <span className="font-semibold text-foreground">
                        Best use:
                      </span>{" "}
                      {s.bestUse}
                    </span>
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* 广告位 7: 新模块组中段阅读停顿位 */}
      <AdBanner
        type="banner-300x250"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_300X250}
        className="md:hidden"
      />
      <AdBanner
        type="banner-468x60"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_468X60}
        className="hidden md:flex"
      />

      {/* Module 7: Coins, OVR, and Progression */}
      <section
        id="coins-ovr-and-progression"
        className="scroll-mt-24 px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="coins-ovr-and-progression"
            eyebrow={t.modules.nflCoinsOvrAndProgression.eyebrow}
            title={t.modules.nflCoinsOvrAndProgression.title}
            intro={t.modules.nflCoinsOvrAndProgression.intro}
          />
          <div className="grid grid-cols-1 gap-4 scroll-reveal md:grid-cols-2 lg:grid-cols-3">
            {t.modules.nflCoinsOvrAndProgression.progression.map(
              (p: any, i: number) => (
                <div
                  key={i}
                  className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)]"
                >
                  <h3 className="mb-2 text-base font-bold">{p.title}</h3>
                  <span className="mb-3 inline-block w-fit rounded-md bg-[hsl(var(--nav-theme)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--nav-theme-light))]">
                    {p.mechanic}
                  </span>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {p.playerAction}
                  </p>
                  <p className="mt-auto flex items-start gap-2 rounded-lg bg-[hsl(var(--nav-theme)/0.05)] p-3 text-xs text-muted-foreground">
                    <Coins className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--nav-theme-light))]" />
                    {p.rewardImpact}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Module 8: Updates and Events Tracker */}
      <section
        id="updates-and-events-tracker"
        className="scroll-mt-24 bg-white/[0.02] px-4 py-14 md:py-20"
      >
        <div className="container mx-auto max-w-5xl">
          <ModuleHeader
            sectionId="updates-and-events-tracker"
            eyebrow={t.modules.nflUpdatesAndEventsTracker.eyebrow}
            title={t.modules.nflUpdatesAndEventsTracker.title}
            intro={t.modules.nflUpdatesAndEventsTracker.intro}
          />
          <div className="relative space-y-4 scroll-reveal before:absolute before:content-[''] before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border md:before:left-[23px]">
            {t.modules.nflUpdatesAndEventsTracker.timeline.map(
              (ev: any, i: number) => (
                <div key={i} className="relative flex gap-4 md:gap-5">
                  <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[hsl(var(--nav-theme)/0.5)] bg-[hsl(var(--nav-theme)/0.15)] md:h-12 md:w-12">
                    <CalendarClock className="h-4 w-4 text-[hsl(var(--nav-theme-light))] md:h-5 md:w-5" />
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-[hsl(var(--nav-theme)/0.5)] md:p-5">
                    <span className="mb-1.5 inline-block rounded-md bg-[hsl(var(--nav-theme)/0.1)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--nav-theme-light))]">
                      {ev.date}
                    </span>
                    <h3 className="mb-1.5 text-base font-bold md:text-lg">
                      {ev.title}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {ev.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ev.highlights.map((h: string, j: number) => (
                        <span
                          key={j}
                          className="rounded-full border border-border bg-white/5 px-2.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <Suspense fallback={<LoadingPlaceholder />}>
        <FAQSection
          title={t.faq.title}
          titleHighlight={t.faq.titleHighlight}
          subtitle={t.faq.subtitle}
          questions={t.faq.questions}
        />
      </Suspense>

      {/* CTA Section */}
      <Suspense fallback={<LoadingPlaceholder />}>
        <CTASection
          title={t.cta.title}
          description={t.cta.description}
          joinCommunity={t.cta.joinCommunity}
          joinGame={t.cta.joinGame}
        />
      </Suspense>

      {/* 广告位 6: 页脚前 */}
      <AdBanner
        type="banner-300x250"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_300X250}
        className="md:hidden"
      />
      <AdBanner
        type="banner-728x90"
        adKey={process.env.NEXT_PUBLIC_AD_BANNER_728X90}
        className="hidden md:flex"
      />

      {/* Footer */}
      <footer className="border-t border-border bg-white/[0.02]">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div>
              <h3 className="mb-4 text-xl font-bold text-[hsl(var(--nav-theme-light))]">
                {t.footer.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.footer.description}
              </p>
            </div>

            {/* Community - External Links Only */}
            <div>
              <h4 className="mb-4 font-semibold">{t.footer.community}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://discord.com/invite/ufb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.discord}
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/NFLUniverseRBLX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.twitter}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/@NFLUniverseRBLX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.youtube}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.roblox.com/games/2338325648/NFL-Universe-Football"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.roblox}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal - Internal Routes Only */}
            <div>
              <h4 className="mb-4 font-semibold">{t.footer.legal}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/about"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.about}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.privacy}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-service"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.terms}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/copyright"
                    className="text-muted-foreground transition hover:text-[hsl(var(--nav-theme-light))]"
                  >
                    {t.footer.copyrightNotice}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Copyright */}
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                {t.footer.copyright}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.footer.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 位置卡片统计小格
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/5 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xs font-semibold text-[hsl(var(--nav-theme-light))]">
        {value}
      </p>
    </div>
  );
}
