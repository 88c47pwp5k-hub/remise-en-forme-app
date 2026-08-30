// Vercel Serverless Function — /api/analyser-repas
// Reçoit une image en base64, interroge Claude claude-sonnet-4-6 vision,
// retourne un JSON structuré avec aliments, catégories et estimation calorique.

module.exports = async function handler(req, res) {
  // CORS permissif pour le front-end (même domaine en prod)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY manquante. Ajoute-la dans Vercel > Settings > Environment Variables.',
    });
  }

  const { imageBase64, mimeType } = req.body ?? {};
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Champs imageBase64 et mimeType requis.' });
  }

  const prompt = `Tu es un nutritionniste. Analyse cette photo de repas et réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, ayant exactement cette structure :
{
  "aliments": ["liste", "des", "aliments", "visibles"],
  "categories": {
    "legumes_fruits": true,
    "proteines": true,
    "grains_entiers": false
  },
  "calories_approx": 650,
  "commentaire": "Une phrase courte sur l'équilibre du repas."
}

Règles :
- aliments : liste des aliments identifiables (noms simples, en français)
- categories : true si la catégorie est clairement présente dans l'assiette
- calories_approx : estimation entière en kcal (ordre de grandeur, pas précision médicale)
- commentaire : max 80 caractères, ton bienveillant
- Si l'image n'est pas un repas, retourne { "erreur": "Image non reconnue comme repas" }`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Erreur API Anthropic (${response.status})`, detail: err });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '';

    // Parser le JSON retourné par Claude
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Réponse non parsable', raw });
    }
    const analyse = JSON.parse(jsonMatch[0]);
    return res.status(200).json(analyse);

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};
