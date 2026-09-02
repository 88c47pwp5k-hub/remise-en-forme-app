// Diagnostic TEMPORAIRE — à supprimer immédiatement après usage
const webpush = require('web-push');
module.exports = async function handler(req, res) {
  if (req.query.token !== 'a3f8d1c029e74b56') return res.status(401).end();
  const sanPub  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/[^A-Za-z0-9\-_]/g, '');
  const sanPriv = (process.env.VAPID_PRIVATE_KEY || '').replace(/[^A-Za-z0-9\-_]/g, '');
  let vapidOk = false, errMsg = null;
  try {
    webpush.setVapidDetails('mailto:test@test.com', sanPub, sanPriv);
    vapidOk = true;
  } catch (e) { errMsg = e.message; }
  res.status(200).json({
    pub_len: sanPub.length, pub_valide: sanPub.length >= 80 && sanPub.length <= 90,
    priv_len: sanPriv.length, priv_valide: sanPriv.length >= 40 && sanPriv.length <= 46,
    setVapidDetails: vapidOk ? 'OK' : `ERREUR: ${errMsg}`,
  });
};
