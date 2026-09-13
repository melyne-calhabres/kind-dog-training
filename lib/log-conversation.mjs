// ============================================================
// KDT RAG — Log de conversation dans Supabase
// ============================================================
// Upsert par session_id à chaque tour : on garde toujours la version
// la plus récente de l'échange complet pour cette session.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Format basique valide (UUID v4) : évite d'insérer n'importe quoi
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Upsert la conversation courante. Non bloquant côté endpoint : les
 * erreurs sont loggées mais jamais renvoyées au user.
 *
 * @param {object} params
 * @param {string} params.sessionId - UUID généré côté client à l'ouverture de la page
 * @param {Array<{role,content}>} params.messages - historique complet (user + assistant + réponse la plus récente)
 * @param {string} [params.userAgent] - user-agent (tronqué à 500 chars)
 */
export async function logConversation({ sessionId, messages, userAgent }) {
  if (!sessionId || !UUID_RE.test(sessionId)) return;
  if (!Array.isArray(messages) || messages.length === 0) return;

  const ua = typeof userAgent === 'string' ? userAgent.slice(0, 500) : null;

  const { error } = await supabase
    .from('conversations')
    .upsert(
      {
        session_id: sessionId,
        messages,
        message_count: messages.length,
        user_agent: ua,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );

  if (error) {
    console.error('logConversation error:', error.message);
  }
}
