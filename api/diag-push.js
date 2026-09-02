// Diagnostic TEMPORAIRE — à supprimer après usage
// Teste le flux send-reminder complet sans envoyer de vraie notification
const webpush = require('web-push');
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  const secret = req.headers['x-reminder-secret'] || req.query.secret;
  if (!secret || secret !== process.env.REMINDER_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const rapport = {};

  // 1. Vérifier VAPID_PUBLIC_KEY
  const rawPub = process.env.VAPID_PUBLIC_KEY || '';
  const sanPub = rawPub.replace(/[^A-Za-z0-9\-_]/g, '');
  rapport.vapid_public = {
    longueur_brute: rawPub.length,
    longueur_sanitisee: sanPub.length,
    valide: sanPub.length >= 80 && sanPub.length <= 90 && sanPub.startsWith('BA'),
    commence_par: rawPub.slice(0, 2),
    commence_sanitisee_par: sanPub.slice(0, 2),
  };

  // 2. Vérifier VAPID_PRIVATE_KEY
  const rawPriv = process.env.VAPID_PRIVATE_KEY || '';
  const sanPriv = rawPriv.replace(/[^A-Za-z0-9\-_]/g, '');
  rapport.vapid_private = {
    longueur_brute: rawPriv.length,
    longueur_sanitisee: sanPriv.length,
    valide: sanPriv.length >= 40 && sanPriv.length <= 46,
  };

  // 3. Tester webpush.setVapidDetails()
  try {
    webpush.setVapidDetails(
      'mailto:admin@remise-en-forme-app.vercel.app',
      sanPub,
      sanPriv
    );
    rapport.setVapidDetails = 'OK';
  } catch (e) {
    rapport.setVapidDetails = `ERREUR: ${e.message}`;
  }

  // 4. Vérifier l'abonnement KV
  try {
    const sub = await kv.get('push-subscription');
    if (!sub) {
      rapport.kv_subscription = 'ABSENT';
    } else {
      const s = typeof sub === 'string' ? JSON.parse(sub) : sub;
      rapport.kv_subscription = {
        type: typeof sub,
        a_endpoint: !!s.endpoint,
        endpoint_prefix: typeof s.endpoint === 'string' ? s.endpoint.slice(0, 30) + '…' : null,
        a_keys: !!(s.keys || s.expirationTime !== undefined),
        a_auth: !!(s.keys && s.keys.auth),
        a_p256dh: !!(s.keys && s.keys.p256dh),
      };
    }
  } catch (e) {
    rapport.kv_subscription = `ERREUR KV: ${e.message}`;
  }

  // 5. Tenter sendNotification avec un faux endpoint pour voir le type d'erreur webpush
  if (rapport.setVapidDetails === 'OK') {
    const fakeSub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/DIAGNOSTIC_TEST',
      keys: { auth: 'dGVzdA==', p256dh: 'dGVzdA==' },
    };
    try {
      await webpush.sendNotification(fakeSub, JSON.stringify({ title: 'test' }));
      rapport.webpush_envoi_test = 'OK (inattendu)';
    } catch (e) {
      // On s'attend à une erreur (faux endpoint) — ce qui compte c'est le TYPE d'erreur
      rapport.webpush_envoi_test = {
        statusCode: e.statusCode,
        message: e.message,
        // Si c'est 404/410 → endpoint invalide (normal pour un faux endpoint)
        // Si c'est autre chose → problème de config VAPID
        interpretation: e.statusCode === 404 || e.statusCode === 410
          ? 'Erreur endpoint (normal pour test) — VAPID OK'
          : `ERREUR INATTENDUE — probablement VAPID invalide`,
      };
    }
  }

  res.status(200).json(rapport);
};
