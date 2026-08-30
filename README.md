# Remise en forme — PWA

Application mobile légère (HTML/CSS/JS vanille, zéro dépendance) installable sur l'écran d'accueil iPhone et Android.

## Structure du projet

```
remise-en-forme-app/
├── index.html              ← Écran d'accueil, grille des modules
├── manifest.json           ← Métadonnées PWA (icône, nom, couleurs)
├── service-worker.js       ← Cache offline, stratégie Cache First / Network First
├── css/
│   └── style.css           ← Feuille de style unique, variables CSS
├── data/
│   └── exercice.json       ← Données du programme du jour (éditable sans toucher au code)
├── icons/
│   ├── icon-192.png        ← Icône PWA 192×192
│   └── icon-512.png        ← Icône PWA 512×512
└── modules/
    └── exercice.html       ← Module Exercice avec timer HIIT
```

## Fonctionnement du module Exercice

1. `exercice.html` charge `../data/exercice.json` via `fetch`.
2. La liste des exercices est affichée avec badge numéroté et détail séries/reps.
3. "Commencer la séance" ouvre un **timer plein écran** :
   - **Exercices chronométrés** (échauffement, wall sit, planche, retour au calme) : compte à rebours SVG animé.
   - **Exercices en reps** (step-up, push-up, dips, mountain climbers) : affichage du nombre de reps + bouton "Série suivante".
   - **Repos inter-série** automatique avec countdown et bouton "Passer".
   - Barre de progression globale en haut.
   - Pause/Reprise disponible à tout moment.
4. À la fin, écran de félicitations. Les exercices terminés sont cochés dans la liste.

## Format de `exercice.json`

Chaque exercice suit ce schéma :

```jsonc
{
  "id": "identifiant-unique",          // string, sert d'ID CSS
  "nom": "Nom affiché",
  "type": "echauffement|retour_calme|temps|reps",
  "duree_sec": 30,                     // pour type "temps"/"echauffement"/"retour_calme"
  "reps": 12,                          // pour type "reps"
  "par_cote": true,                    // optionnel : "12 reps par jambe"
  "series": 3,
  "description": "Instructions courtes.",
  "conseil": "Astuce technique.",      // optionnel
  "repos_sec": 20                      // pause entre séries (défaut : 15 sec)
}
```

## Ajouter un nouveau module

### 1. Créer le fichier HTML du module

Copier `modules/exercice.html` comme point de départ :

```
modules/nutrition.html
modules/etirement.html
modules/eau.html
modules/cours-langue.html   ← exemple non-fitness
```

La structure attendue :
- Lien retour vers `../index.html`
- Chargement des données depuis `../data/[module].json`
- Logique propre au module (pas de couplage avec les autres)

### 2. Créer le fichier de données

```
data/nutrition.json
data/etirement.json
```

### 3. Activer la carte sur l'accueil

Dans `index.html`, trouver la carte du module et :
- Changer `<div class="module-card disabled">` en `<a href="modules/nutrition.html" class="module-card active">`
- Supprimer `<span class="soon-badge">Bientôt</span>`
- Supprimer l'attribut `aria-label "bientôt disponible"`

### 4. Mettre à jour le cache du Service Worker

Dans `service-worker.js`, ajouter les nouvelles URLs dans `PRECACHE_URLS` et **incrémenter** `CACHE_NAME` :

```js
const CACHE_NAME = 'remise-en-forme-v2'; // ← version suivante
const PRECACHE_URLS = [
  // ... existant ...
  '/modules/nutrition.html',
  '/data/nutrition.json',
];
```

> Le Service Worker utilise **Cache First** pour les assets HTML/CSS et **Network First** pour les JSON — les données du programme peuvent donc être mises à jour sans changer la version du cache.

## Installation sur mobile

### iPhone (Safari)
1. Ouvrir l'URL dans Safari.
2. Bouton Partager → "Sur l'écran d'accueil".
3. L'app s'installe avec l'icône et le nom "Remise en forme".

### Android (Chrome)
1. Ouvrir l'URL dans Chrome.
2. Bannière "Ajouter à l'écran d'accueil" (ou menu ⋮ → Installer l'application).

## Développement local

Serveur local requis pour le Service Worker (ne fonctionne pas en `file://`) :

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Puis ouvrir `http://localhost:8080` dans le navigateur.

## Génération des icônes

Les icônes `icons/icon-192.png` et `icons/icon-512.png` doivent être créées manuellement.  
Outils recommandés : [PWA Builder](https://www.pwabuilder.com/) (génère toutes les tailles à partir d'un SVG) ou Figma/Sketch export.

Format attendu : carré, fond plein, marge intérieure de ~10 % (pour le masque Android).
