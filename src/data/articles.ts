// ─────────────────────────────────────────────────────────────────────────────
// Registre central des articles éligibles à la rotation aléatoire
// (home + section "Articles qui peuvent vous intéresser" en bas des articles).
//
// Pour ajouter un nouvel article : ajoute simplement une entrée ci-dessous.
// L'article sera pris automatiquement dans la rotation aléatoire au prochain
// build Netlify, sur la home et en bas de tous les autres articles.
//
// Règle : seuls les articles dont l'URL a AU MOINS 4 niveaux de path sont
// pris en compte (filtre appliqué dans src/utils/pickRandomArticles.ts).
// Exemple : /education-canine/comportement/problemes/fugue/ = 4 niveaux ✓
// ─────────────────────────────────────────────────────────────────────────────

export interface Article {
  title: string;
  readTime: string;
  img: string;
  imgAlt: string;
  url: string;
}

export const articles: Article[] = [
  {
    title:    'Chien qui fugue : comprendre pourquoi et l\'aider à rester',
    readTime: '14 min',
    img:      '/images/article-chien-qui-fugue.webp',
    imgAlt:   'Chien en extérieur près d\'une clôture, illustrant la problématique de la fugue chez le chien',
    url:      '/education-canine/comportement/problemes/fugue/',
  },
  {
    title:    'Chien qui tire en laisse : que faire',
    readTime: '14 min',
    img:      '/images/article-chien-qui-tire-en-laisse.webp',
    imgAlt:   'Chien en laisse qui tire lors d\'une promenade, illustrant la problématique de la traction en laisse',
    url:      '/education-canine/comportement/problemes/tirage-laisse/',
  },
  {
    title:    'Anxiété de séparation chez le chien : que faire concrètement ?',
    readTime: '16 min',
    img:      '/images/article-anxiete-separation-chien.webp',
    imgAlt:   'Chien couché seul près de la porte d\'entrée, en attente du retour de ses propriétaires',
    url:      '/education-canine/comportement/problemes/anxiete/separation/',
  },
  {
    title:    'Gérer ses émotions en balade : que faire',
    readTime: '8 min',
    img:      '/images/article-gestion-emotions-balade-solutions.webp',
    imgAlt:   'Chien en balade qui apprend à se canaliser et à rester attentif à son maître en extérieur',
    url:      '/education-canine/comportement/problemes/gestion-emotions/balade/',
  },
  {
    title:    'Mauvaise gestion des émotions en balade : les causes',
    readTime: '13 min',
    img:      '/images/article-gestion-emotions-balade.webp',
    imgAlt:   'Chien en balade en extérieur, en pleine montée émotionnelle face à un stimulus',
    url:      '/education-canine/comportement/comprendre/gestion-emotions/balade/',
  },
  {
    title:    'Mon chien est réactif aux autres chiens en balade',
    readTime: '13 min',
    img:      '/images/article-reactivite-chiens.webp',
    imgAlt:   'Chien réactif tenu en laisse face à un autre chien pendant une promenade',
    url:      '/education-canine/comportement/problemes/reactivite/chiens/',
  },
  {
    title:    'Mon chien a été attaqué, que faire pour éviter qu\'il ne devienne réactif ?',
    readTime: '12 min',
    img:      '/images/article-attaque-chien-que-faire-apres.webp',
    imgAlt:   'Chien après une altercation, illustrant les démarches à suivre après une attaque',
    url:      '/education-canine/comportement/problemes/reactivite/attaque-chien-que-faire-apres/',
  },
  {
    title:    'Mon chien attaque les autres chiens : comment réagir',
    readTime: '16 min',
    img:      '/images/article-chien-attaque-autre-chien.webp',
    imgAlt:   'Deux chiens se font face en extérieur, un propriétaire tient son chien en laisse à distance',
    url:      '/education-canine/comportement/problemes/agressivite/comment-reagir-chien-attaque-autre-chien/',
  },
  {
    title:    'Adolescence du chien : les fausses croyances',
    readTime: '15 min',
    img:      '/images/article-adolescence-chien.webp',
    imgAlt:   'Jeune chien adolescent en extérieur, attentif, à la sortie de sa phase chiot',
    url:      '/education-canine/comportement/comprendre/adolescence-chien/',
  },
  {
    title:    'Chien anxieux : reconnaître les signes et agir',
    readTime: '9 min',
    img:      '/images/article-anxiete-chien.webp',
    imgAlt:   'Chien anxieux couché au sol, oreilles en arrière et regard inquiet, illustrant les signes physiques de l\'anxiété',
    url:      '/education-canine/comportement/problemes/anxiete/',
  },
];
