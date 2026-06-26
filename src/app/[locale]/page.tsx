import { setRequestLocale } from 'next-intl/server'
import { getLatestArticles } from '@/lib/getLatestArticles'
import type { Language } from '@/lib/content'
import HomePageClient from './HomePageClient'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  // 启用静态渲染（配合 layout 的 setRequestLocale，让首页各 locale 预渲染为静态页）
  setRequestLocale(locale)

  // 服务器端获取最新文章数据
  const latestArticles = await getLatestArticles(locale as Language, 30)

  return <HomePageClient latestArticles={latestArticles} locale={locale} />
}
