import { getAllContent, CONTENT_TYPES } from '@/lib/content'
import type { Language, ContentItem } from '@/lib/content'

export interface ArticleLink {
  url: string
  title: string
}

export type ModuleLinkMap = Record<string, ArticleLink | null>

interface ArticleWithType extends ContentItem {
  contentType: string
}

// Module sub-field mapping: moduleKey -> { field, nameKey }
const MODULE_FIELDS: Record<string, { field: string; nameKey: string }> = {
  nflCodesAndRewards: { field: 'items', nameKey: 'code' },
  nflBeginnerGuide: { field: 'steps', nameKey: 'title' },
  nflControlsAndGameplay: { field: 'controls', nameKey: 'action' },
  nflBestPositions: { field: 'positions', nameKey: 'position' },
  nflTeamsUniformsAndStadiums: { field: 'features', nameKey: 'title' },
  nflRankedParkAndMatchmaking: { field: 'strategies', nameKey: 'title' },
  nflCoinsOvrAndProgression: { field: 'progression', nameKey: 'title' },
  nflUpdatesAndEventsTracker: { field: 'timeline', nameKey: 'title' },
}

// Extra semantic keywords per module to boost matching for h2 titles
// These supplement the module title text when matching against articles
const MODULE_EXTRA_KEYWORDS: Record<string, string[]> = {
  nflCodesAndRewards: ['codes', 'rewards', 'redeem', 'active codes', 'pack'],
  nflBeginnerGuide: ['beginner', 'how to play', 'tutorial', 'starter', 'tips'],
  nflControlsAndGameplay: ['controls', 'keyboard', 'mobile', 'catch', 'tackle', 'block'],
  nflBestPositions: ['positions', 'position priority', 'qb', 'wr', 'rb', 'build'],
  nflTeamsUniformsAndStadiums: ['teams', 'uniforms', 'stadiums', 'nfl teams', 'merch'],
  nflRankedParkAndMatchmaking: ['ranked', 'park', 'comp park', 'leaderboard', 'win streak', 'legend'],
  nflCoinsOvrAndProgression: ['coins', 'ovr', 'progression', 'packs', 'shop', 'gamepasses'],
  nflUpdatesAndEventsTracker: ['updates', 'events', 'patch', 'season', 'tracker'],
}

const GAME_TITLE_PATTERN = /nfl universe football\s*/g
const GAME_TITLE_TOKENS = ['nfl', 'universe', 'football']
const FILLER_WORDS = ['nfl', 'universe', 'football', '2026', '2025', 'complete', 'the', 'and', 'for', 'how', 'with', 'our', 'this', 'your', 'all', 'from', 'learn', 'master']

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSignificantTokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(w => w.length > 2 && !FILLER_WORDS.includes(w))
}

function hasGameTitleTokens(text: string): boolean {
  const normalized = normalize(text)
  return GAME_TITLE_TOKENS.some(token => normalized.includes(token))
}

function matchScore(queryText: string, article: ArticleWithType, extraKeywords?: string[]): number {
  const normalizedQuery = normalize(queryText)
  const normalizedTitle = normalize(article.frontmatter.title)
  const normalizedDesc = normalize(article.frontmatter.description || '')
  const normalizedSlug = normalize(article.slug.replace(/[/-]/g, ' '))

  if (hasGameTitleTokens(queryText) && !hasGameTitleTokens(`${normalizedTitle} ${normalizedDesc} ${normalizedSlug}`)) {
    return 0
  }

  let score = 0

  // Exact phrase match in title (stripped of "NFL Universe Football")
  const strippedQuery = normalizedQuery.replace(GAME_TITLE_PATTERN, '').trim()
  const strippedTitle = normalizedTitle.replace(GAME_TITLE_PATTERN, '').trim()
  if (strippedQuery.length > 3 && strippedTitle.includes(strippedQuery)) {
    score += 100
  }

  // Token overlap from query text
  const queryTokens = getSignificantTokens(queryText)
  for (const token of queryTokens) {
    if (normalizedTitle.includes(token)) score += 20
    if (normalizedDesc.includes(token)) score += 5
    if (normalizedSlug.includes(token)) score += 15
  }

  // Extra keywords scoring (for module h2 titles)
  if (extraKeywords) {
    for (const kw of extraKeywords) {
      const normalizedKw = normalize(kw)
      if (normalizedTitle.includes(normalizedKw)) score += 15
      if (normalizedDesc.includes(normalizedKw)) score += 5
      if (normalizedSlug.includes(normalizedKw)) score += 10
    }
  }

  return score
}

function findBestMatch(
  queryText: string,
  articles: ArticleWithType[],
  extraKeywords?: string[],
  threshold = 20,
): ArticleLink | null {
  let bestScore = 0
  let bestArticle: ArticleWithType | null = null

  for (const article of articles) {
    const score = matchScore(queryText, article, extraKeywords)
    if (score > bestScore) {
      bestScore = score
      bestArticle = article
    }
  }

  if (bestScore >= threshold && bestArticle) {
    return {
      url: `/${bestArticle.contentType}/${bestArticle.slug}`,
      title: bestArticle.frontmatter.title,
    }
  }

  return null
}

export async function buildModuleLinkMap(locale: Language): Promise<ModuleLinkMap> {
  // 1. Load all articles across all content types
  const allArticles: ArticleWithType[] = []
  for (const contentType of CONTENT_TYPES) {
    const items = await getAllContent(contentType, locale)
    for (const item of items) {
      allArticles.push({ ...item, contentType })
    }
  }

  // 2. Load module data from en.json (use English for keyword matching)
  const enMessages = (await import('../locales/en.json')).default as any

  const linkMap: ModuleLinkMap = {}

  // 3. For each module, match h2 title and sub-items
  for (const [moduleKey, fieldConfig] of Object.entries(MODULE_FIELDS)) {
    const moduleData = enMessages.modules?.[moduleKey]
    if (!moduleData) continue

    // Match module h2 title (use extra keywords; threshold 25 keeps real matches
    // while filtering out weak cross-category hits for modules with no dedicated article)
    const moduleTitle = moduleData.title as string
    if (moduleTitle) {
      const extraKw = MODULE_EXTRA_KEYWORDS[moduleKey] || []
      linkMap[moduleKey] = findBestMatch(moduleTitle, allArticles, extraKw, 25)
    }

    // Match sub-items
    const subItems = moduleData[fieldConfig.field] as any[]
    if (Array.isArray(subItems)) {
      for (let i = 0; i < subItems.length; i++) {
        const itemName = subItems[i]?.[fieldConfig.nameKey] as string
        if (itemName) {
          const key = `${moduleKey}::${fieldConfig.field}::${i}`
          linkMap[key] = findBestMatch(itemName, allArticles)
        }
      }
    }
  }

  return linkMap
}
