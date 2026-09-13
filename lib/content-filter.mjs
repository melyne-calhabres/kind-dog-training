// ============================================================
// KDT RAG — Filtre de contenu : détection prompt injection
// ============================================================
// Rejette AVANT d'appeler Claude les messages qui portent des
// marqueurs sans ambiguïté d'une tentative d'attaque du system prompt.
// Volontairement restrictif : mieux vaut laisser passer 10 attaques
// mal formulées que bloquer 1 vraie question sur un chien.
// ============================================================

// Patterns d'injection classiques. Chaque regex doit :
//   - matcher une intention claire de manipulation d'instructions
//   - être insensible à la casse (flag i)
//   - éviter les mots polysémiques (ex : "ignore" seul → NON,
//     "ignore les instructions" → OUI).
const INJECTION_PATTERNS = [
  // Français
  /\bignor(?:e|er|ez|ons)\s+(?:les?\s+|toutes?\s+les?\s+|toute\s+)?(?:instructions?|consignes?|r[èe]gles?|directives?|pr[ée]c[ée]dent|ce\s+qui\s+pr[ée]c[ée]de)/i,
  /\boubli(?:e|er|ez|ons)\s+(?:les?\s+|toutes?\s+les?\s+)?(?:instructions?|consignes?|r[èe]gles?|ton\s+r[ôo]le|ce\s+qu[ei]?)/i,
  /\btu\s+es\s+(?:maintenant|d[ée]sormais|à\s+pr[ée]sent)\s+(?:un|une)\b/i,
  /\bfais\s+semblant\s+d[e']\s*[êe]tre\b/i,
  /\bjoue\s+le\s+r[ôo]le\s+d[e']/i,
  /\bagis\s+comme\s+(?:si\s+tu\s+[ée]tais|un|une)\b/i,
  /\bmode\s+(?:d[ée]veloppeur|admin|debug|jailbreak|sans\s+restriction)\b/i,
  /\br[ée]v[èe]le?\s+(?:ton|le)\s+(?:system\s*prompt|prompt\s+syst[èe]me|instructions?\s+syst[èe]me)/i,
  /\baffiche\s+(?:ton|le)\s+(?:system\s*prompt|prompt\s+syst[èe]me)/i,
  /\bquelles?\s+sont\s+tes\s+instructions?\s+(?:syst[èe]me|initiales?|de\s+d[ée]part)/i,
  /\brecrache?\s+(?:ton|le)\s+(?:system\s*prompt|prompt\s+syst[èe]me)/i,

  // Anglais (même utilisateurs français font copier-coller de payloads EN)
  /\bignore\s+(?:all\s+)?(?:previous|prior|above|the)\s+(?:instructions?|prompts?|rules?)/i,
  /\bforget\s+(?:all\s+)?(?:previous|prior|your)\s+(?:instructions?|rules?|role)/i,
  /\byou\s+are\s+(?:now|from\s+now\s+on)\s+(?:a|an)\b/i,
  /\bpretend\s+(?:to\s+be|you\s+are)\b/i,
  /\bact\s+as\s+(?:if\s+you\s+were|a|an)\b/i,
  /\bdeveloper\s+mode\b/i,
  /\b(?:jailbreak|DAN\s+mode|do\s+anything\s+now)\b/i,
  /\breveal\s+(?:your|the)\s+(?:system\s*prompt|instructions|initial\s+prompt)/i,
  /\bprint\s+(?:your|the)\s+(?:system\s*prompt|instructions)/i,
  /\bwhat\s+(?:are|were)\s+your\s+(?:initial|original|system)\s+(?:instructions?|prompt)/i,
  /\brepeat\s+(?:the\s+)?(?:words?\s+)?above/i,

  // Tentatives d'inversion de rôle
  /\[?\s*(?:INST|SYSTEM|ASSISTANT)\s*\]?\s*:/,
  /<\|?(?:system|user|assistant|im_start|im_end)\|?>/i,
];

/**
 * Analyse un message utilisateur. Renvoie { ok: true } si accepté,
 * sinon { ok: false, reason: string } avec le motif (pour logs).
 */
export function screenUserMessage(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'not-a-string' };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: `injection-pattern:${pattern.source.slice(0, 40)}` };
    }
  }

  return { ok: true };
}

/**
 * Message user-facing renvoyé quand un message est filtré.
 * Volontairement neutre — ne pas dire "tentative d'injection détectée"
 * (ça donne des infos utiles à l'attaquant pour affiner).
 */
export const FILTER_REJECT_MESSAGE =
  "Je ne peux pas traiter ce message. Reformule ta question sur l'éducation de ton chien et je ferai de mon mieux pour t'aider.";
