// ============================================================
// KDT RAG — Pipeline de retrieval : multi-query + embed + search + rerank
// ============================================================

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- Multi-query : Haiku génère 2 reformulations sous d'autres angles ---
async function expandQuery(originalQuery) {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system:
      "Tu es un assistant qui reformule une requête de recherche en éducation canine pour améliorer le rappel d'un moteur de recherche sémantique. Ta seule sortie doit être 2 reformulations, une par ligne, sans numérotation ni commentaire. Chaque reformulation doit explorer un angle différent (synonymes, sous-thème connexe, formulation grand public vs technique) tout en restant fidèle au sujet. Français uniquement.",
    messages: [
      { role: 'user', content: `Requête : "${originalQuery}"\n\nGénère 2 reformulations.` },
    ],
  });
  const text = res.content.find(b => b.type === 'text')?.text || '';
  const variants = text
    .split('\n')
    .map(l => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(l => l.length > 5);
  return [originalQuery, ...variants.slice(0, 2)];
}

// --- Voyage : embedding d'une ou plusieurs requêtes en une seule call ---
async function embedQueries(texts) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: 'voyage-3',
      input_type: 'query',
    }),
  });
  if (!res.ok) throw new Error(`Voyage embed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

// --- Voyage : rerank d'une liste de documents ---
async function rerankDocuments(query, documents, topK = 8) {
  const res = await fetch('https://api.voyageai.com/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      documents: documents.map(d => d.content),
      model: 'rerank-2',
      top_k: topK,
    }),
  });
  if (!res.ok) throw new Error(`Voyage rerank ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.map(r => ({
    ...documents[r.index],
    rerank_score: r.relevance_score,
  }));
}

// --- Recherche vectorielle brute dans Supabase ---
async function vectorSearch(embedding, matchCount = 20) {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_count: matchCount,
    min_similarity: 0.0,
    filter_source_types: null,
  });
  if (error) throw new Error(`Supabase RPC: ${error.message}`);
  return data;
}

/**
 * Pipeline complet : multi-query → embed → search parallèle → dédup → rerank → seuil.
 *
 * @param {string} query - requête initiale (reformulée par Claude en général)
 * @param {object} opts
 * @param {number} opts.candidateCount - nb de chunks candidats par variante (défaut 20)
 * @param {number} opts.topK - nb final de chunks après rerank (défaut 8)
 * @param {number} opts.minRerankScore - seuil minimum de pertinence rerank (défaut 0.35)
 * @returns {Promise<Array>} chunks les plus pertinents (filtrés)
 */
export async function retrieveChunks(query, opts = {}) {
  const {
    candidateCount = 20,
    topK = 8,
    minRerankScore = 0.35,
  } = opts;

  // 1. Multi-query : requête originale + 2 reformulations
  const queries = await expandQuery(query);

  // 2. Embed toutes les variantes en un seul call
  const embeddings = await embedQueries(queries);

  // 3. Recherche vectorielle en parallèle pour chaque variante
  const searchResults = await Promise.all(
    embeddings.map(e => vectorSearch(e, candidateCount))
  );

  // 4. Fusion + dédoublonnage par id
  const seenIds = new Set();
  const candidates = [];
  for (const results of searchResults) {
    for (const chunk of results) {
      if (seenIds.has(chunk.id)) continue;
      seenIds.add(chunk.id);
      candidates.push(chunk);
    }
  }
  if (candidates.length === 0) return [];

  // 5. Rerank final sur la requête originale (celle qui exprime le vrai besoin)
  const reranked = await rerankDocuments(query, candidates, topK);
  return reranked.filter(c => c.rerank_score >= minRerankScore);
}
