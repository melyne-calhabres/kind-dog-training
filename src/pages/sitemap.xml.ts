import type { APIRoute } from 'astro';

const pages = [
  '/',
  '/educateur-canin-bruges/',
  '/educateur-canin-le-haillan/',
  '/educateur-canin-talence/',
  '/educateur-canin-begles/',
  '/educateur-canin-blanquefort/',
  '/educateur-canin-le-bouscat/',
  '/educateur-canin-eysines/',
  '/educateur-canin-merignac/',
  '/educateur-canin-pessac/',
  '/qui-suis-je/',
  '/tarif-educateur-canin-bordeaux/',
  '/prendre-rdv/',
  '/partenaires/',
  '/services/',
  '/services/cours-individuel-education-canine-bordeaux/',
  '/services/bilan-comportemental/',
  '/services/cours-collectifs/',
  '/services/stage-intensif/',
  '/education-canine/comportement/',
  '/education-canine/comportement/comprendre/',
  '/education-canine/comportement/problemes/',
  '/education-canine/comportement/problemes/reactivite/chiens/',
  '/education-canine/comportement/problemes/reactivite/attaque-chien-que-faire-apres/',
  '/education-canine/comportement/comprendre/gestion-emotions/balade/',
  '/education-canine/comportement/comprendre/adolescence-chien/',
  '/education-canine/comportement/problemes/gestion-emotions/balade/',
  '/education-canine/comportement/problemes/anxiete/separation/',
  '/education-canine/comportement/problemes/fugue/',
  '/education-canine/comportement/problemes/agressivite/comment-reagir-chien-attaque-autre-chien/',
];

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? '';

  const urls = pages
    .map(
      path =>
        `  <url>\n    <loc>${base}${path}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  );
};
