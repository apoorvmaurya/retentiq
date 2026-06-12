import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://retentiq.com';

  const routes = ['', '/privacy', '/terms', '/security', '/blog'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '/blog' ? 'weekly' : route === '' ? 'daily' : 'monthly',
    priority: route === '' ? 1.0 : route === '/blog' ? 0.8 : 0.3,
  }));
}
