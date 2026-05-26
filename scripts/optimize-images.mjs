/**
 * optimize-images.mjs
 * 1. Converts all PNG/JPG in public/images to WebP (with resize for large files)
 * 2. Extracts embedded base64 photos from SVG hero files → WebP
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

// Max width in pixels for raster images (mobile-first, retina 2x)
const MAX_WIDTH = 1600;

// Quality settings
const WEBP_QUALITY = 82;
const WEBP_QUALITY_PHOTO = 78;

// Files to skip (OG image needs to stay JPG for social sharing compatibility)
const SKIP = new Set(['og-default.jpg']);

// SVG hero files that contain base64 photos
const SVG_HEROES = [
  'hero-banner-mobile.svg',
  'hero-banner-desktop.svg',
  'hero-rdv-mobile.svg',
  'hero-rdv-desktop.svg',
  'hero-tarifs-mobile.svg',
  'hero-tarifs-desktop.svg',
];

async function convertRasterImages() {
  const files = fs.readdirSync(IMAGES_DIR);
  const rasters = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f) && !SKIP.has(f));

  console.log(`\n=== Conversion PNG/JPG → WebP (${rasters.length} fichiers) ===`);

  for (const file of rasters) {
    const src = path.join(IMAGES_DIR, file);
    const dest = path.join(IMAGES_DIR, file.replace(/\.(png|jpg|jpeg)$/i, '.webp'));

    if (fs.existsSync(dest)) {
      console.log(`  ⏭  ${file} → déjà converti, ignoré`);
      continue;
    }

    const before = fs.statSync(src).size;
    const isPhoto = /\.(jpg|jpeg)$/i.test(file);
    const quality = isPhoto ? WEBP_QUALITY_PHOTO : WEBP_QUALITY;

    try {
      const meta = await sharp(src).metadata();
      const needsResize = (meta.width ?? 0) > MAX_WIDTH;

      let pipeline = sharp(src);
      if (needsResize) {
        pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }
      await pipeline.webp({ quality }).toFile(dest);

      const after = fs.statSync(dest).size;
      const saving = Math.round((1 - after / before) * 100);
      const resizeNote = needsResize ? ` (redimensionné depuis ${meta.width}px)` : '';
      console.log(`  ✓  ${file} → ${path.basename(dest)} | ${kb(before)} → ${kb(after)} (-${saving}%)${resizeNote}`);
    } catch (err) {
      console.error(`  ✗  ${file}: ${err.message}`);
    }
  }
}

async function extractSvgHeroPhotos() {
  console.log(`\n=== Extraction photos des SVG hero (${SVG_HEROES.length} fichiers) ===`);

  for (const svgFile of SVG_HEROES) {
    const svgPath = path.join(IMAGES_DIR, svgFile);
    if (!fs.existsSync(svgPath)) {
      console.log(`  ⏭  ${svgFile}: introuvable, ignoré`);
      continue;
    }

    const content = fs.readFileSync(svgPath, 'utf8');
    const matches = [...content.matchAll(/data:image\/(\w+);base64,([A-Za-z0-9+/=]+)/g)];

    if (matches.length === 0) {
      console.log(`  ⏭  ${svgFile}: aucune image base64 trouvée`);
      continue;
    }

    // Pick the largest blob (= the main hero photo)
    const largest = matches.reduce((a, b) => (b[2].length > a[2].length ? b : a));
    const imgType = largest[1];
    const b64data = largest[2];

    const destName = svgFile.replace('.svg', '-photo.webp');
    const destPath = path.join(IMAGES_DIR, destName);

    if (fs.existsSync(destPath)) {
      console.log(`  ⏭  ${svgFile} → photo déjà extraite, ignorée`);
      continue;
    }

    try {
      const buffer = Buffer.from(b64data, 'base64');
      const before = buffer.length;

      const meta = await sharp(buffer).metadata();
      const needsResize = (meta.width ?? 0) > MAX_WIDTH;

      let pipeline = sharp(buffer);
      if (needsResize) {
        pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }
      await pipeline.webp({ quality: WEBP_QUALITY_PHOTO }).toFile(destPath);

      const after = fs.statSync(destPath).size;
      const saving = Math.round((1 - after / before) * 100);
      const resizeNote = needsResize ? ` (redimensionné depuis ${meta.width}px)` : '';
      console.log(`  ✓  ${svgFile} [${imgType}, ${kb(before)}] → ${destName} [${kb(after)}, -${saving}%]${resizeNote}`);
    } catch (err) {
      console.error(`  ✗  ${svgFile}: ${err.message}`);
    }
  }
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function main() {
  console.log('🚀 Optimisation des images Kind Dog Training');
  await convertRasterImages();
  await extractSvgHeroPhotos();
  console.log('\n✅ Terminé. Prochaine étape : mettre à jour les références dans le code.');
}

main().catch(console.error);
