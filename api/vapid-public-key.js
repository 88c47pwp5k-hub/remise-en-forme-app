module.exports = async function handler(req, res) {
  const raw = process.env.VAPID_PUBLIC_KEY;
  if (!raw) {
    return res.status(500).json({ error: 'VAPID_PUBLIC_KEY non configurée' });
  }

  // Sanitisation défensive : ne conserver que les caractères base64url valides
  const key = raw.replace(/[^A-Za-z0-9\-_]/g, '');

  if (key.length < 80 || key.length > 90) {
    return res.status(500).json({
      error: `VAPID_PUBLIC_KEY invalide (longueur sanitisée : ${key.length}, attendu ~87)`,
    });
  }

  res.setHeader('Cache-Control', 'no-store'); // ne pas cacher — relit l'env à chaque fois
  res.status(200).json({ publicKey: key });
};
