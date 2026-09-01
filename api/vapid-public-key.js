module.exports = async function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(500).json({ error: 'VAPID_PUBLIC_KEY non configurée' });
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ publicKey: key });
};
