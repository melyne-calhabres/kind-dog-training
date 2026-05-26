/**
 * Audit SEO post-build — Kind Dog Training
 *
 * Erreurs (bloquent le déploiement Netlify) :
 *   - Title manquant ou vide
 *   - Meta description manquante ou vide
 *   - Image sans attribut alt
 *   - Aucune balise H1 sur la page
 *
 * Avertissements (affichés, n'empêchent pas le déploiement) :
 *   - Title trop court (< 30 cars) ou trop long (> 70 cars)
 *   - Description trop courte (< 70 cars) ou trop longue (> 160 cars)
 *   - Image avec alt vide (OK si image décorative, à vérifier)
 *   - Plusieurs H1 sur la même page
 *   - Balise canonical absente
 *   - Open Graph incomplet (og:title / og:description / og:image)
 *   - JSON-LD absent
 *   - Title ou description dupliqués entre plusieurs pages
 *   - Lien interne pointant vers une URL introuvable dans dist/
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

if (!existsSync(distDir)) {
  console.error('Dossier dist/ introuvable. Lancez d\'abord npm run build.');
  process.exit(1);
}

function getHtmlFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      getHtmlFiles(fullPath, files);
    } else if (entry.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveInternalLink(href) {
  const candidates = [
    join(distDir, href),
    join(distDir, href, 'index.html'),
    join(distDir, href.replace(/\/$/, '') + '.html'),
  ];
  return candidates.some(existsSync);
}

function checkPage(filePath) {
  const html = readFileSync(filePath, 'utf-8');
  const pagePath = '/' + relative(distDir, filePath).replace(/\\/g, '/').replace(/index\.html$/, '');

  const errors = [];
  const warnings = [];

  // --- Title ---
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!title) {
    errors.push('Title manquant ou vide');
  } else if (title.length < 30) {
    warnings.push(`Title trop court (${title.length} car.) : "${title}"`);
  } else if (title.length > 70) {
    warnings.push(`Title trop long (${title.length} car.) : "${title.substring(0, 60)}…"`);
  }

  // --- Meta description ---
  const descMatch =
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
    html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  const desc = descMatch ? descMatch[1].trim() : '';
  if (!desc) {
    errors.push('Meta description manquante ou vide');
  } else if (desc.length < 70) {
    warnings.push(`Description trop courte (${desc.length} car.)`);
  } else if (desc.length > 160) {
    warnings.push(`Description trop longue (${desc.length} car.)`);
  }

  // --- H1 ---
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) {
    errors.push('Aucune balise H1');
  } else if (h1Count > 1) {
    warnings.push(`${h1Count} balises H1 trouvées (une seule par page)`);
  }

  // --- Images sans alt ---
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  for (const img of imgTags) {
    if (!/\balt=/i.test(img)) {
      const src = (img.match(/src="([^"]*)"/) || [])[1] ?? '(src inconnu)';
      errors.push(`Image sans attribut alt : ${src}`);
    } else {
      const altVal = (img.match(/\balt="([^"]*)"/i) || [])[1];
      if (altVal === '') {
        const src = (img.match(/src="([^"]*)"/) || [])[1] ?? '(src inconnu)';
        warnings.push(`Image avec alt="" : ${src} (normal si décorative)`);
      }
    }
  }

  // --- Canonical ---
  if (!/<link[^>]+rel="canonical"/i.test(html)) {
    warnings.push('Balise canonical absente');
  }

  // --- Open Graph ---
  const missingOg = ['og:title', 'og:description', 'og:image'].filter(
    (prop) => !new RegExp(`property="${prop}"`, 'i').test(html)
  );
  if (missingOg.length > 0) {
    warnings.push(`Open Graph incomplet — manquant : ${missingOg.join(', ')}`);
  }

  // --- JSON-LD ---
  if (!/<script[^>]+type="application\/ld\+json"/i.test(html)) {
    warnings.push('Aucune donnée structurée JSON-LD');
  }

  // --- Liens internes cassés ---
  const internalLinks = [...html.matchAll(/href="(\/[^"#?]*)"/gi)]
    .map((m) => m[1])
    .filter((href) => !href.match(/\.\w{2,4}$/));
  for (const href of internalLinks) {
    if (!resolveInternalLink(href)) {
      warnings.push(`Lien interne introuvable : ${href}`);
    }
  }

  return { path: pagePath, title, description: desc, errors, warnings };
}

// --- Collecte ---
const htmlFiles = getHtmlFiles(distDir);
const results = htmlFiles.map(checkPage);

// --- Doublons titre / description ---
const titleIndex = {};
const descIndex = {};
for (const r of results) {
  if (r.title) (titleIndex[r.title] ??= []).push(r.path);
  if (r.description) (descIndex[r.description] ??= []).push(r.path);
}
for (const r of results) {
  const sharedTitle = titleIndex[r.title];
  if (sharedTitle && sharedTitle.length > 1 && sharedTitle[0] === r.path) {
    r.warnings.push(`Title identique sur plusieurs pages : ${sharedTitle.join(', ')}`);
  }
  const sharedDesc = descIndex[r.description];
  if (sharedDesc && sharedDesc.length > 1 && sharedDesc[0] === r.path) {
    r.warnings.push(`Description identique sur plusieurs pages : ${sharedDesc.join(', ')}`);
  }
}

// --- Affichage ---
let totalErrors = 0;
let totalWarnings = 0;

console.log('\n==============================');
console.log('  Audit SEO — Kind Dog Training');
console.log('==============================\n');

for (const r of results) {
  if (r.errors.length === 0 && r.warnings.length === 0) continue;

  console.log(`Page : ${r.path}`);
  for (const e of r.errors) {
    console.log(`  [ERREUR]    ${e}`);
    totalErrors++;
  }
  for (const w of r.warnings) {
    console.log(`  [attention] ${w}`);
    totalWarnings++;
  }
  console.log('');
}

const pagesOk = results.filter((r) => r.errors.length === 0 && r.warnings.length === 0).length;
console.log(`${results.length} page(s) analysee(s)  |  ${pagesOk} OK  |  ${totalErrors} erreur(s)  |  ${totalWarnings} avertissement(s)`);

if (totalErrors > 0) {
  console.log('\n[ECHEC] Corrigez les erreurs SEO avant de publier.\n');
  process.exit(1);
} else {
  console.log('\n[OK] Audit SEO passe avec succes.\n');
}
