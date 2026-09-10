import { articles, type Article } from '../data/articles';

const MIN_URL_DEPTH = 4;

function urlDepth(url: string): number {
  return url.split('/').filter(Boolean).length;
}

function shuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Sélectionne `count` articles au hasard parmi ceux dont l'URL a au moins
// 4 niveaux de path, en excluant optionnellement l'URL courante.
// Réévalué à chaque build → chaque déploiement Netlify tire une combinaison
// différente.
export function pickRandomArticles(count: number, excludeUrl?: string): Article[] {
  const normalizedExclude = excludeUrl?.replace(/\/?$/, '/');
  const pool = articles.filter((a) => {
    if (urlDepth(a.url) < MIN_URL_DEPTH) return false;
    if (normalizedExclude && a.url === normalizedExclude) return false;
    return true;
  });
  return shuffle(pool).slice(0, count);
}
