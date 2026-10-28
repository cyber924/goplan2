
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/market', '/pricing', '/templates', '/ai-features', '/announcements', '/related-organizations'],
        disallow: ['/my-documents', '/my-profile', '/admin', '/login', '/signup', '/api'],
      },
    ],
    sitemap: 'https://goplanai.co.kr/sitemap.xml',
  }
}
