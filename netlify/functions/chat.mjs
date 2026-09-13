// ============================================================
// KDT RAG — Netlify Function : endpoint /api/chat
// ============================================================
// POST { history: [{role, content}, ...], turnstileToken?: string }
// →   { reply: string }
// ============================================================

import { chat } from '../../lib/chat.mjs';
import { getStore } from '@netlify/blobs';
import { screenUserMessage, FILTER_REJECT_MESSAGE } from '../../lib/content-filter.mjs';
import { logConversation } from '../../lib/log-conversation.mjs';

// --- Config sécurité ---
const ALLOWED_ORIGIN = 'https://kind-dog-training.fr';
const IS_DEV = process.env.NETLIFY_DEV === 'true' || process.env.NETLIFY_LOCAL === 'true';
const DAILY_LIMIT_PER_IP = 50;
const THROTTLE_MIN_INTERVAL_MS = 1000; // délai mini entre 2 requêtes d'une même IP
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';

function buildCorsHeaders(origin) {
  const allowOrigin = IS_DEV && origin && origin.startsWith('http://localhost') ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non supportée' }, 405, corsHeaders);
  }

  // --- 1. Vérification Origin / Referer ---
  const isLocalhostDev =
    IS_DEV &&
    (origin.startsWith('http://localhost') || referer.startsWith('http://localhost'));
  const originOk =
    isLocalhostDev ||
    origin === ALLOWED_ORIGIN ||
    referer.startsWith(ALLOWED_ORIGIN + '/');
  if (!originOk) {
    return json({ error: 'Origine non autorisée' }, 403, corsHeaders);
  }

  // --- 2. Rate limit quotidien + throttle courte durée par IP ---
  const ip = getClientIp(req);
  const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const rlKey = `${dayKey}:${ip}`;
  const throttleKey = `throttle:${ip}`;
  let rateStore;
  try {
    rateStore = getStore('rate-limit');

    // 2a. Throttle : refuse si dernière requête < THROTTLE_MIN_INTERVAL_MS
    const lastTs = Number((await rateStore.get(throttleKey)) || 0);
    const now = Date.now();
    if (lastTs && now - lastTs < THROTTLE_MIN_INTERVAL_MS) {
      return json(
        { error: 'Un instant, tu envoies tes messages trop vite. Attends une seconde et réessaie.' },
        429
      );
    }
    // marque l'horodatage immédiatement pour couper les rafales parallèles
    await rateStore.set(throttleKey, String(now));

    // 2b. Rate limit quotidien
    const current = Number((await rateStore.get(rlKey)) || 0);
    if (current >= DAILY_LIMIT_PER_IP) {
      return json(
        {
          error:
            'Tu as atteint la limite quotidienne de 50 messages. Réessaie demain, ou contacte Mélyne directement via le formulaire du site.',
        },
        429
      );
    }
    // Incrément avant traitement (fail-closed contre parallélisme)
    await rateStore.set(rlKey, String(current + 1));
  } catch (err) {
    // Si Blobs est indisponible, on log mais on ne bloque pas le user
    console.error('rate-limit store error:', err);
  }

  // --- 3. Parse body ---
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON invalide' }, 400);
  }

  const history = Array.isArray(body?.history) ? body.history : null;
  if (!history || history.length === 0) {
    return json({ error: 'history[] requis' }, 400);
  }

  // --- 4. Validation format ---
  for (const m of history) {
    if (!m || typeof m !== 'object') return json({ error: 'message invalide' }, 400);
    if (m.role !== 'user' && m.role !== 'assistant') {
      return json({ error: 'role invalide' }, 400);
    }
    if (typeof m.content !== 'string' || m.content.length > 4000) {
      return json({ error: 'content invalide (max 4000 caractères)' }, 400);
    }
  }
  if (history.length > 40) {
    return json({ error: 'conversation trop longue' }, 400);
  }

  // --- 4b. Filtre de contenu sur le dernier message user ---
  // (on ne re-scanne pas l'historique complet à chaque tour : le dernier
  // message user est le seul nouveau depuis la requête précédente)
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const screen = screenUserMessage(lastUserMsg.content);
    if (!screen.ok) {
      console.warn('content-filter reject:', { ip, reason: screen.reason });
      return json({ error: FILTER_REJECT_MESSAGE }, 400);
    }
  }

  // --- 5. Turnstile : vérifier au 1er message user de la conversation ---
  const userTurns = history.filter(m => m.role === 'user').length;
  if (userTurns === 1 && TURNSTILE_SECRET) {
    const token = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';
    const ok = await verifyTurnstile(token, ip);
    if (!ok) {
      return json(
        { error: 'Vérification anti-bot échouée. Recharge la page et réessaie.' },
        403
      );
    }
  }

  // --- 6. Appel Claude ---
  try {
    const { reply } = await chat(history);

    // --- 7. Log de la conversation (non bloquant, best-effort) ---
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
    const fullHistory = [...history, { role: 'assistant', content: reply }];
    logConversation({
      sessionId,
      messages: fullHistory,
      userAgent: req.headers.get('user-agent'),
    }).catch(err => console.error('log fire-and-forget:', err));

    return json({ reply });
  } catch (err) {
    console.error('chat error:', err);
    return json({ error: 'Erreur interne' }, 500);
  }
};

function getClientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

async function verifyTurnstile(token, ip) {
  if (!token) return false;
  try {
    const params = new URLSearchParams();
    params.append('secret', TURNSTILE_SECRET);
    params.append('response', token);
    if (ip && ip !== 'unknown') params.append('remoteip', ip);
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: params }
    );
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.error('turnstile verify error:', e);
    return false;
  }
}

function json(payload, status = 200, corsHeaders = buildCorsHeaders('')) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export const config = {
  path: '/api/chat',
};
