const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Abonnement invalide' });
  }

  try {
    await kv.set('push-subscription', subscription);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[save-subscription] Erreur KV :', err.message);
    res.status(500).json({ error: 'Impossible de sauvegarder l\'abonnement' });
  }
};
