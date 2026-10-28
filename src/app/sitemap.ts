import { MetadataRoute } from 'next'
import { getMarketItems } from '@/lib/firebase/server-fetch'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://goplanai.co.kr'
  
  // 정적 경로 설정
  const staticRoutes = [
    '',
    '/market',
    '/pricing',
    '/templates',
    '/ai-features',
    '/announcements',
    '/related-organizations',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // 마켓 아이템 동적 경로 생성 (최신 100개)
  let marketRoutes: any[] = []
  try {
    const items = await getMarketItems(100)
    marketRoutes = items.map((item) => ({
      url: `${baseUrl}/market/${item.id}`,
      lastModified: item.createdAt instanceof Date ? item.createdAt : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (e) {
    console.error('Sitemap fetch error:', e)
  }

  return [...staticRoutes, ...marketRoutes]
}
