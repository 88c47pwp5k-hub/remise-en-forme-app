const webpush = require('web-push');
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // Token one-shot de test (temporaire — bypass auth + time, à retirer après test)
  const isTestBypass = req.query.token === 'f9c3a1b8e2d74065';

  if (!isTestBypass) {
    // Protection par secret normale
    const secret = req.headers['x-reminder-secret'] || req.query.secret;
    if (!secret || secret !== process.env.REMINDER_SECRET) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Heure en fuseau Eastern (America/Toronto)
    let hour;
    const isProduction = process.env.VERCEL_ENV === 'production';
    if (!isProduction && req.query.testHour !== undefined) {
      hour = parseInt(req.query.testHour, 10);
    } else {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        hour12: false,
      });
      hour = parseInt(formatter.format(new Date()), 10);
    }

    // Plage autorisée : 8h à 20h inclusivement
    if (hour < 8 || hour > 20) {
      return res.status(200).json({ ok: true, message: 'hors plage horaire' });
    }
  }

  // Récupérer l'abonnement dans KV
  let subscription;
  try {
    subscription = await kv.get('push-subscription');
  } catch (err) {
    console.error('[send-reminder] Erreur KV :', err.message);
    return res.status(500).json({ error: 'Erreur base de données' });
  }

  if (!subscription) {
    return res.status(200).json({ ok: true, message: 'aucun abonnement enregistré' });
  }

  // Configurer VAPID et envoyer (sanitisation des clés — supprime tout char hors base64url)
  const vapidPublic  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/[^A-Za-z0-9\-_]/g, '');
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').replace(/[^A-Za-z0-9\-_]/g, '');
  webpush.setVapidDetails(
    'mailto:admin@remise-en-forme-app.vercel.app',
    vapidPublic,
    vapidPrivate
  );

  const payload = JSON.stringify({
    title: '💧 Hydratation',
    body: 'C\'est le temps de boire de l\'eau!',
    url: '/modules/hydratation.html',
  });

  try {
    await webpush.sendNotification(subscription, payload);
    res.status(200).json({ ok: true, message: 'notification envoyée' });
  } catch (err) {
    console.error('[send-reminder] Erreur web-push :', err.message);
    res.status(500).json({ error: 'Échec de l\'envoi de la notification' });
  }
};
