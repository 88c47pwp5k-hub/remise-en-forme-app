# Remise en forme — PWA

Application mobile légère (HTML/CSS/JS vanille, zéro dépendance côté client) installable sur l'écran d'accueil iPhone et Android.

## Architecture

```
remise-en-forme-app/
├── index.html                ← Accueil, grille des modules + bouton "💾 Exporter" (export localStorage JSON)
├── manifest.json             ← PWA (icône, nom, couleurs, standalone)
├── service-worker.js         ← Cache offline (Cache First / Network First)
├── vercel.json               ← Config Vercel (headers SW, rewrites API)
├── css/
│   └── style.css             ← Feuille de style unique, variables CSS orange/blanc
├── data/
│   ├── exercice.json         ← Programme HIIT éditable sans toucher au code
│   ├── etirement.json        ← Routine d'étirement (6 mouvements, éditable)
│   └── portugais.json        ← 6 catégories (mots + phrases) pour le module Portugais
├── icons/
│   ├── icon-192-v2.png       ← Icône PWA 192×192 (orange, "50+")
│   └── icon-512-v2.png       ← Icône PWA 512×512
├── modules/
│   ├── exercice.html         ← Module HIIT avec timer plein écran
│   ├── etirement.html        ← Module Étirement — timer réutilisé, icônes Tabler
│   ├── hydratation.html      ← Module Hydratation — compteur ml, bouton Café (ti-coffee +355 ml hydratation +5 kcal nutrition, avec Sugartwin), objectif, historique localStorage
│   ├── nutrition.html        ← Module Nutrition (photo + IA + alcool + sommeil + pas + calories Mifflin-St Jeor)
│   ├── suivi.html            ← Module Suivi corporel — tour de taille/poids, graphique CSS, 1 mesure/semaine
│   └── portugais.html        ← Module Portugais — vocabulaire Brésil (SpeechSynthesis)
└── api/
    └── analyser-repas.js     ← Fonction serverless Vercel → Claude Vision
```

## Hébergement — Vercel

Le site est déployé sur Vercel. Le repo GitHub (`main`) est la source unique de vérité.

### Déploiement initial

```bash
# Depuis le dossier remise-en-forme-app/
vercel login          # authentification une fois
vercel --prod         # déploiement en production
```

### Déploiements suivants

Chaque `git push` sur `main` déclenche automatiquement un redéploiement Vercel (si le repo est lié via `vercel link` ou l'intégration GitHub dans la console Vercel).

---

## Clé API Anthropic — OBLIGATOIRE pour le module Nutrition

La fonction `/api/analyser-repas.js` appelle l'API Anthropic (Claude Vision). Elle lit la clé depuis la variable d'environnement `ANTHROPIC_API_KEY`.

### Où créer la clé

1. Va sur [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → **Create Key**
3. Copie la clé (commence par `sk-ant-...`)

### Où la coller dans Vercel

1. Ouvre [vercel.com](https://vercel.com) → ton projet `remise-en-forme-app`
2. **Settings** → **Environment Variables**
3. Ajoute :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : `sk-ant-...` (ta clé)
   - **Environments** : Production + Preview
4. Clique **Save**
5. Redéploie : `vercel --prod` (ou pousse un commit vide)

> ⚠️ Ne mets JAMAIS cette clé dans le code ou dans un fichier commité. Le fichier `.gitignore` exclut déjà `.env`.

---

## Ajouter un nouveau module

### 1. Créer le fichier HTML

```
modules/nouveau-module.html
```

Reprendre l'en-tête standard :
```html
<link rel="stylesheet" href="../css/style.css" />
<header class="app-header">
  <a href="../index.html" class="back-btn">←</a>
  <div><h1>Nom du module</h1></div>
</header>
<main class="page-main"> … </main>
```

### 2. Créer les données si nécessaire

```
data/nouveau-module.json
```

### 3. Activer la carte sur l'accueil (`index.html`)

Remplacer :
```html
<div class="module-card disabled" …>
  <span class="soon-badge">Bientôt</span>
  …
</div>
```
Par :
```html
<a href="modules/nouveau-module.html" class="module-card active" …>
  …
</a>
```

### 4. Ajouter une fonction serverless si nécessaire

Créer `api/nouveau-module.js` :
```js
module.exports = async function handler(req, res) {
  // lecture de process.env.MA_CLE_API
  // logique…
  res.status(200).json({ … });
};
```

### 5. Mettre à jour le cache Service Worker

Dans `service-worker.js`, incrémenter `CACHE_NAME` et ajouter les nouveaux fichiers dans `PRECACHE_PATHS`.

### 6. Déployer

```bash
git add . && git commit -m "feat: module Nouveau" && git push
```
Vercel redéploie automatiquement.

---

---

## Rappels push hydratation — Configuration initiale

Le module Hydratation peut envoyer des notifications push toutes les 2h (8h–20h, fuseau Eastern). Voici les étapes manuelles à faire **une seule fois** avant de déployer.

### Étape 1 — Créer une base @vercel/kv

1. Va sur [vercel.com](https://vercel.com) → ton projet `remise-en-forme-app`
2. Onglet **Storage** → **Create Database** → choisis **KV (Redis)**
3. Nomme-la `remise-en-forme-kv` (ou autre)
4. Clique **Create** puis **Connect to Project**
5. Vercel injecte automatiquement `KV_REST_API_URL` et `KV_REST_API_TOKEN` dans les variables d'environnement

### Étape 2 — Ajouter les variables d'environnement dans Vercel

Dans **Settings → Environment Variables** de ton projet Vercel, ajoute ces 3 variables (Environments : Production + Preview) :

| Nom | Valeur |
|-----|--------|
| `VAPID_PUBLIC_KEY` | La clé publique générée par `node generate-vapid.js` |
| `VAPID_PRIVATE_KEY` | La clé privée générée par `node generate-vapid.js` |
| `REMINDER_SECRET` | Un mot de passe de ton choix (ex: une chaîne aléatoire) |

> Les clés VAPID sont déjà générées et affichées dans ton terminal lors de l'exécution du setup.

Pour régénérer les clés : `node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k);"`

### Étape 3 — Configurer cron-job.org pour les rappels automatiques

1. Crée un compte gratuit sur [cron-job.org](https://cron-job.org)
2. Crée un nouveau cron job :
   - **URL** : `https://remise-en-forme-app.vercel.app/api/send-reminder?secret=VOTRE_REMINDER_SECRET`
   - **Schedule** : `0 */2 * * *` (toutes les 2 heures)
   - **Method** : GET
3. Active le job

> L'endpoint vérifie l'heure en fuseau Eastern (America/Toronto) et n'envoie rien si hors plage 8h–20h.

### Étape 4 — Déployer

Une fois les étapes 1–3 complétées :
```bash
git add . && git commit -m "feat: rappels push hydratation" && git push
```

### Pour tirer les variables KV en local (développement)

```bash
vercel env pull .env.local
vercel dev   # → http://localhost:3000 avec toutes les fonctions + KV
```

---

## Installation sur mobile

### iPhone (Safari)
1. Ouvrir l'URL Vercel dans Safari
2. Bouton Partager → **"Sur l'écran d'accueil"**
3. L'app s'installe sous le nom "Remise en forme" avec l'icône orange "50+"

### Android (Chrome)
1. Ouvrir l'URL dans Chrome
2. Menu ⋮ → **Installer l'application**

---

## Développement local

```bash
python3 -m http.server 8099
# → http://localhost:8099
```

> Note : les appels à `/api/analyser-repas` ne fonctionneront pas en local sans un serveur Node (les fonctions Vercel nécessitent `vercel dev`).

```bash
# Avec Vercel CLI (nécessite vercel login)
vercel dev
# → http://localhost:3000 avec les fonctions serverless actives
```
