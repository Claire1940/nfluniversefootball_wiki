import type { LucideIcon } from 'lucide-react'
import { Gift, BookOpen, Trophy, Users, Gamepad2, Package } from 'lucide-react'

export interface NavigationItem {
	key: string // 用于翻译键，如 'codes' -> t('nav.codes')
	path: string // URL 路径，如 '/codes'
	icon: LucideIcon // Lucide 图标组件
	isContentType: boolean // 是否对应 content/ 目录
}

// NFL Universe Football 内容分类配置（6 个分类）
export const NAVIGATION_CONFIG: NavigationItem[] = [
	{ key: 'codes', path: '/codes', icon: Gift, isContentType: true },
	{ key: 'guide', path: '/guide', icon: BookOpen, isContentType: true },
	{ key: 'ranked', path: '/ranked', icon: Trophy, isContentType: true },
	{ key: 'positions', path: '/positions', icon: Users, isContentType: true },
	{ key: 'controls', path: '/controls', icon: Gamepad2, isContentType: true },
	{ key: 'items', path: '/items', icon: Package, isContentType: true },
]

// 从配置派生内容类型列表（用于路由和内容加载）
export const CONTENT_TYPES = NAVIGATION_CONFIG.filter((item) => item.isContentType).map(
	(item) => item.path.slice(1),
) // 移除开头的 '/' -> ['codes', 'guide', 'ranked', 'positions', 'controls', 'items']

export type ContentType = (typeof CONTENT_TYPES)[number]

// 辅助函数：验证内容类型
export function isValidContentType(type: string): type is ContentType {
	return CONTENT_TYPES.includes(type as ContentType)
}
