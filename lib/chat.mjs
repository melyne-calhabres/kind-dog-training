// ============================================================
// KDT RAG — Boucle conversationnelle Claude + tool use
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt.mjs';
import { retrieveChunks } from './retrieval.mjs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 4; // sécurité contre les boucles infinies

const TOOLS = [
  {
    name: 'chercher_dans_la_base',
    description:
      "Interroge la base de connaissances Kind Dog Training (fiches internes, articles publiés, cas clients anonymisés) pour récupérer les extraits les plus pertinents. À n'utiliser QU'APRÈS avoir collecté suffisamment de contexte auprès du visiteur (âge du chien, race, contexte du problème). Peut être appelée plusieurs fois si de nouveaux éléments apparaissent dans la conversation.",
    input_schema: {
      type: 'object',
      properties: {
        requete: {
          type: 'string',
          description:
            "Requête de recherche reformulée par l'assistant à partir du contexte collecté. Doit inclure les mots-clés pertinents (comportement, âge, race si utile). Ex : 'chiot 3 mois destruction anxiété séparation berger australien'.",
        },
      },
      required: ['requete'],
    },
  },
];

// --- Blocage anti-recherche prématurée (levier structurel) ---
// L'outil n'est PAS proposé à Claude tant que la conversation n'a pas eu
// au moins N échanges. Ceinture + bretelles au system prompt.
const MIN_USER_TURNS_BEFORE_SEARCH = 2;

function countUserTurns(history) {
  return history.filter(m => m.role === 'user').length;
}

// --- Formatage des chunks pour Claude ---
function formatChunksForClaude(chunks) {
  if (chunks.length === 0) {
    return "AUCUN chunk pertinent trouvé dans la base. Le sujet n'est pas couvert par les ressources. Applique la règle : dire honnêtement que tu ne sais pas et rediriger vers Mélyne.";
  }
  return chunks
    .map((c, i) => {
      const meta = [
        `type: ${c.source_type}`,
        `titre: ${c.titre}`,
        c.section && `section: ${c.section}`,
        c.url && `url: ${c.url}`,
        `pertinence: ${c.rerank_score.toFixed(2)}`,
      ]
        .filter(Boolean)
        .join(' | ');
      return `--- Chunk ${i + 1} (${meta}) ---\n${c.content}`;
    })
    .join('\n\n');
}

/**
 * Traite un tour de conversation.
 *
 * @param {Array<{role, content}>} history - historique complet de la session (côté client)
 * @returns {Promise<{reply: string, debug: object}>}
 */
export async function chat(history) {
  const userTurns = countUserTurns(history);
  const toolsAvailable = userTurns >= MIN_USER_TURNS_BEFORE_SEARCH;

  const debug = { toolCalls: [], iterations: 0 };
  let messages = [...history];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    debug.iterations++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: toolsAvailable ? TOOLS : [],
      messages,
    });

    // Si Claude n'utilise pas d'outil, c'est la réponse finale
    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find(b => b.type === 'text');
      return {
        reply: textBlock?.text || '',
        debug,
      };
    }

    // Sinon : exécuter tous les tool_use présents
    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      if (block.name === 'chercher_dans_la_base') {
        const requete = block.input.requete;
        const chunks = await retrieveChunks(requete);
        debug.toolCalls.push({
          requete,
          chunkCount: chunks.length,
          topChunks: chunks.slice(0, 3).map(c => ({
            source: c.source_file,
            section: c.section,
            score: c.rerank_score,
          })),
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: formatChunksForClaude(chunks),
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply:
      "Désolée, quelque chose s'est mal passé de mon côté. Réessaie ta question, ou contacte Mélyne directement via le formulaire du site.",
    debug,
  };
}
