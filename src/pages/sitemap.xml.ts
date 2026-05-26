import type { APIRoute } from 'astro';

const pages = [
  '/',
  '/qui-suis-je/',
  '/tarif-educateur-canin-bordeaux',
  '/prendre-rdv/',
  '/guides/',
];

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? '';

  const urls = pages
    .map(
      path =>
        `  <url>\n    <loc>${base}${path}</loc>\n    <changefreq>quarterly</changefreq>\n  </url>`
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  );
};
