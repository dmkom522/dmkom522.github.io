import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config';

export const GET: APIRoute = async () => {
	const posts = await getCollection('writing', ({ data }) => !data.draft);
	const paths = ['/', '/writing/', '/projects/', '/about/', ...posts.map((post) => `/writing/${post.id}/`)];
	const urls = paths.map((path) => `<url><loc>${new URL(path, siteConfig.url)}</loc></url>`).join('');
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
