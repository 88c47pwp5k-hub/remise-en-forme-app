/* ── Assistant global — bouton flottant + chat ────────────────────────
   Inclure ce fichier dans toutes les pages (index.html + modules/*.html).
   Dépend de : css/assistant.css + Tabler Icons webfont.
   L'API /api/assistant est appelée en absolu (fonctionne depuis toutes les pages).
─────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ── Inject HTML ────────────────────────────────────────────────────
  const tmpl = `
  <button class="assist-fab" id="assist-fab" aria-label="Ouvrir l'assistant">
    <i class="ti ti-sparkles" aria-hidden="true"></i>
  </button>

  <div class="assist-overlay" id="assist-overlay" role="dialog" aria-modal="true" aria-label="Assistant coach">
    <div class="assist-panel" id="assist-panel">
      <div class="assist-header">
        <div class="assist-title">
          <i class="ti ti-sparkles" aria-hidden="true" style="color:var(--accent,#ea580c)"></i>
          Coach IA
        </div>
        <button class="assist-close" id="assist-close" aria-label="Fermer">✕</button>
      </div>
      <div class="assist-messages" id="assist-messages">
        <div class="assist-empty" id="assist-empty">
          Pose-moi une question sur ton entraînement,<br>ta nutrition ou ton hydratation.
        </div>
      </div>
      <div class="assist-input-row">
        <textarea class="assist-input" id="assist-input"
          rows="1" placeholder="Écris ta question…" aria-label="Question"></textarea>
        <button class="assist-send" id="assist-send" aria-label="Envoyer" disabled>
          <i class="ti ti-send" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>`;

  const host = document.createElement('div');
  host.innerHTML = tmpl;
  document.body.appendChild(host);

  // ── Références DOM ─────────────────────────────────────────────────
  const fab      = document.getElementById('assist-fab');
  const overlay  = document.getElementById('assist-overlay');
  const closeBtn = document.getElementById('assist-close');
  const msgs     = document.getElementById('assist-messages');
  const empty    = document.getElementById('assist-empty');
  const input    = document.getElementById('assist-input');
  const sendBtn  = document.getElementById('assist-send');

  // ── État ───────────────────────────────────────────────────────────
  let historique = []; // { role: 'user'|'assistant', content: string }
  let loading    = false;
  let exerciceCache = null;

  // ── Ouvrir / fermer ────────────────────────────────────────────────
  fab.addEventListener('click', () => {
    overlay.classList.add('open');
    input.focus();
  });

  function fermer() { overlay.classList.remove('open'); }
  closeBtn.addEventListener('click', fermer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });

  // ── Activation bouton envoi ────────────────────────────────────────
  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim() || loading;
    // auto-resize textarea
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) envoyer();
    }
  });

  sendBtn.addEventListener('click', envoyer);

  // ── Ajouter un message dans l'UI ───────────────────────────────────
  function ajouterMsg(role, contenu, isLoading = false) {
    empty.style.display = 'none';
    const div = document.createElement('div');
    div.className = `assist-msg ${role}${isLoading ? ' loading' : ''}`;
    if (isLoading) {
      div.innerHTML = '<div class="assist-spinner"></div> En train de réfléchir…';
    } else {
      div.textContent = contenu;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  // ── Lire le contexte du jour ───────────────────────────────────────
  async function getExerciceJson() {
    if (exerciceCache) return exerciceCache;
    try {
      const r = await fetch('/data/exercice.json');
      if (r.ok) exerciceCache = await r.text();
    } catch {}
    return exerciceCache ?? null;
  }

  function getNutritionBilan() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw   = localStorage.getItem(`nutrition-${today}`);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const parties = [];
      const repasConfirmes = Object.entries(s.repas ?? {})
        .filter(([, v]) => v !== null)
        .map(([k]) => k);
      if (repasConfirmes.length) parties.push(`Repas saisis : ${repasConfirmes.join(', ')}`);
      if (s.alcool != null) parties.push(`Alcool : ${s.alcool} verre(s)`);
      if (s.sommeil != null) parties.push(`Sommeil : ${s.sommeil} h`);
      if (s.pas != null) parties.push(`Pas : ${s.pas.toLocaleString('fr-FR')}`);
      return parties.length ? parties.join('. ') : null;
    } catch { return null; }
  }

  // ── Envoyer ────────────────────────────────────────────────────────
  async function envoyer() {
    const question = input.value.trim();
    if (!question || loading) return;

    loading = true;
    sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    ajouterMsg('user', question);
    historique.push({ role: 'user', content: question });

    const loader = ajouterMsg('assistant', '', true);

    try {
      const [exerciceJson, nutritionBilan] = await Promise.all([
        getExerciceJson(),
        Promise.resolve(getNutritionBilan()),
      ]);

      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          historique: historique.slice(0, -1), // sans la dernière (déjà dans question)
          ...(exerciceJson  ? { exerciceJson }  : {}),
          ...(nutritionBilan ? { nutritionBilan } : {}),
        }),
      });

      loader.remove();

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error ?? 'Erreur serveur');
      }

      const data = await resp.json();
      const reponse = data.reponse ?? '(Réponse vide)';
      ajouterMsg('assistant', reponse);
      historique.push({ role: 'assistant', content: reponse });

    } catch (err) {
      loader.remove();
      ajouterMsg('assistant', `⚠️ ${err.message}`);
    }

    loading = false;
    sendBtn.disabled = !input.value.trim();
  }
})();
