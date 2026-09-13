// ============================================================
// KDT RAG — Purge automatique des conversations > 365 jours
// ============================================================
// Netlify scheduled function : tourne 1×/semaine (dimanche 03:00 UTC).
// Appelle la fonction SQL purge_old_conversations() qui supprime tout
// enregistrement dont created_at est plus vieux que la rétention voulue.
// ============================================================

import { createClient } from '@supabase/supabase-js';

export default async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.rpc('purge_old_conversations', {
    retention_days: 365,
  });

  if (error) {
    console.error('purge error:', error.message);
    return new Response(`Purge failed: ${error.message}`, { status: 500 });
  }

  console.log(`purge OK — ${data} conversations supprimées`);
  return new Response(`Deleted ${data} rows`, { status: 200 });
};

export const config = {
  schedule: '0 3 * * 0', // dimanche 03:00 UTC
};
