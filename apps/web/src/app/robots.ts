import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://retentiq.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/onboarding/', '/auth/', '/login/', '/signup/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
