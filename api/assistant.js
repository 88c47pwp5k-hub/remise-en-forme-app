// Vercel Serverless Function — /api/assistant
// Reçoit une question utilisateur + historique + contexte (nutrition, exercice),
// interroge Claude claude-sonnet-4-6, retourne une réponse texte courte.

module.exports = async function handler(req, res) {
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

  const { question, historique, nutritionBilan, exerciceJson } = req.body ?? {};
  if (!question?.trim()) {
    return res.status(400).json({ error: 'Champ question requis.' });
  }

  // Construire le contexte à partir des données envoyées par le front-end
  let exerciceContext = '';
  if (exerciceJson) {
    try {
      const data = JSON.parse(exerciceJson);
      const noms = (data.exercices ?? []).map(e => e.nom).join(', ');
      exerciceContext = `\nProgramme d'exercice du jour : ${data.titre ?? 'Circuit HIIT'}. Exercices : ${noms}.`;
    } catch {}
  }

  let nutritionContext = '';
  if (nutritionBilan?.trim()) {
    nutritionContext = `\nBilan nutrition du jour : ${nutritionBilan}`;
  }

  const systemPrompt = `Tu es un coach de remise en forme bienveillant intégré dans une application mobile. Tu aides un homme de 53 ans dans sa remise en forme quotidienne (exercice HIIT, nutrition, hydratation, étirements, suivi corporel).
${exerciceContext}${nutritionContext}

Règles absolues :
- Réponses concises : 2 à 4 phrases maximum, sauf si l'utilisateur demande explicitement plus de détails.
- Ton amical, direct et encourageant.
- Jamais de diagnostic médical, jamais de prescription ou conseil pharmaceutique.
- Pour tout symptôme sérieux, douleur physique persistante ou question médicale, redirige systématiquement vers un professionnel de santé.
- Réponds toujours en français.`;

  // Reconstituer l'historique au format Anthropic (alterné user/assistant)
  const messages = (historique ?? []).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));
  messages.push({ role: 'user', content: question });

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
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Erreur API Anthropic (${response.status})`, detail: err });
    }

    const data = await response.json();
    const reponse = data.content?.[0]?.text ?? '';
    return res.status(200).json({ reponse });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};
