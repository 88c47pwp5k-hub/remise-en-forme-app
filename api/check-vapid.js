// Endpoint de diagnostic TEMPORAIRE — à supprimer après usage
// Analyse VAPID_PUBLIC_KEY sans jamais retourner sa valeur
module.exports = async function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY || '';

  const length = key.length;
  const trimmed = key.trim();
  const trimmedLength = trimmed.length;

  // Trouver les caractères invalides pour base64url (A-Z a-z 0-9 - _)
  const invalidChars = [];
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    const code = trimmed.charCodeAt(i);
    if (!/[A-Za-z0-9\-_]/.test(c)) {
      invalidChars.push({ position: i, charCode: code, char: JSON.stringify(c) });
    }
  }

  // Tenter la conversion pour voir si elle plante
  let conversionOk = false;
  let conversionError = null;
  try {
    const padding = '='.repeat((4 - trimmed.length % 4) % 4);
    const b64 = (trimmed + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const arr = Uint8Array.from(raw, c => c.charCodeAt(0));
    conversionOk = arr.length === 65; // P-256 key = 65 bytes
    if (!conversionOk) conversionError = `Longueur inattendue : ${arr.length} bytes (attendu 65)`;
  } catch (e) {
    conversionError = e.message;
  }

  // Caractères de tête et queue (sans révéler la clé complète)
  const prefix3 = trimmed.slice(0, 3);
  const suffix3 = trimmed.slice(-3);

  res.status(200).json({
    longueur_brute: length,
    longueur_trimmed: trimmedLength,
    espaces_ou_retours_supprimes: length !== trimmedLength,
    contient_caracteres_invalides: invalidChars.length > 0,
    nb_caracteres_invalides: invalidChars.length,
    detail_invalides: invalidChars,
    prefix_3: prefix3,   // 3 premiers chars (ne révèle pas la clé)
    suffix_3: suffix3,   // 3 derniers chars
    conversion_uint8array_ok: conversionOk,
    conversion_erreur: conversionError,
    commence_par_BA: trimmed.startsWith('BA'), // une clé P-256 valide commence par "BA" en base64url
  });
};
