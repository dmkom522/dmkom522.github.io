import type { APIRoute } from 'astro';
import { siteConfig } from '../config';

export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\nSitemap: ${siteConfig.url}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain' } });
