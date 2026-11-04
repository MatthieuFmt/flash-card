# Plan — Écran « Statistiques » (GéoFlash)

## Contexte

App vanilla JS sans framework ni build (`index.html` + `js/` + `css/`). Persistance 100 % `localStorage` :

- `flashcards.stats.v1` → `{ attempts, correct, sessions }` (compteurs globaux uniquement)
- `flashcards.srs.v2` → par deck → iso pays → direction → `{ due, interval, ease, reps }`

**Aucun historique par jour n'existe aujourd'hui** : la progression dans le temps ne peut être affichée que de façon prospective (le journal démarre à la mise en ligne de la fonctionnalité). Les données SRS actuelles servent de base immédiate pour les stats instantanées.

## Décisions validées avec l'utilisateur

1. **Journal quotidien prospectif** + stats instantanées calculées depuis l'état SRS (visibles dès le 1er jour).
2. **Écran dédié** plein écran avec bouton retour, accessible depuis l'accueil.
3. **Graphiques SVG maison** (zéro dépendance, hors-ligne, style assorti).
4. **Indicateurs retenus** : taux de réussite par jour (courbe), activité quotidienne (barres), cartes apprises (courbe cumulative), série de jours / streak, répartition par intervalle SRS (donut).
5. **Filtres** : deck (Tout / Capitales / Drapeaux / Carte du monde) + période (7 j / 30 j / Tout).

## Modèle de données

Nouvelle clé `flashcards.history.v1` (JSON) :

```json
{
  "2026-11-04": {
    "totals": { "attempts": 42, "correct": 33, "sessions": 3, "learned": 7 },
    "decks": {
      "capitals": { "attempts": 20, "correct": 15, "sessions": 1, "learned": 4 },
      "flags": { "attempts": 22, "correct": 18, "sessions": 2, "learned": 3 }
    }
  }
}
```

- Date = jour **local** au format `YYYY-MM-DD` (`new Date()` → composants locaux, pas de `toISOString`).
- Écriture **incrémentale à chaque réponse** (dans `answerCurrent`), pour ne rien perdre si l'utilisateur quitte en cours de session (le bouton ✕ jette la session sans récapitulatif).
- `sessions` incrémenté au `startSession` (même moment que `stats.sessions`).
- `learned` incrémenté quand une carte passe de `reps < 1` à `reps >= 1` (comparer `state.reps` avant/après `FC.srs.schedule`).
- `reset()` (bouton réinitialisation existant, cf. `js/core/storage.js:72`) supprime aussi cette clé.
- Plafond de rétention : garder au maximum les 400 derniers jours par clé (nettoyage silencieux à chaque sauvegarde).

## Décisions de conception

- **Courbe « cartes apprises »** : la 1ʳᵉ entrée du journal reçoit en base le nombre de cartes déjà apprises calculé depuis le SRS actuel (même logique que `renderHomeStats` dans `js/ui/home.js:82-91`), puis la courbe additionne les `learned` quotidiens.
- **Streak** : nombre de jours consécutifs se terminant aujourd'hui (ou hier si rien aujourd'hui) avec `totals.attempts > 0`. Afficher aussi le record de série.
- **Buckets donut SRS** (par intervalle) : « Nouvelles » (interval 0), « Court » (1–3 j), « Moyen » (4–14 j), « Long » (15 j+). Filtré par deck sélectionné. Couleurs : `--yellow`, `--cyan`, `--accent`, `--green`.
- **État vide** : panneau amical « Joue ta première session pour voir tes statistiques ! 📈 » si aucune donnée de journal.
- **Période « 7 j / 30 j »** : fenêtres glissantes se terminant aujourd'hui (jours sans activité inclus dans l'axe).

## Modifications de fichiers

### 1. `js/core/storage.js`
- Ajouter `HISTORY_KEY = "flashcards.history.v1"`, charger `history` dans l'IIFE, exposer `history` et `saveHistory()`.
- Fonctions : `recordAnswer(deckId, wasLearned)` (increments jour courant, totaux + deck), `recordSession(deckId)`.
- `reset()` : supprimer aussi la clé history.

### 2. `js/ui/game.js` (`answerCurrent` et `startSession`)
- `startSession` : après `stats.sessions++`, appeler `FC.storage.recordSession(deck().id)`.
- `answerCurrent` : capturer `wasLearned = state.reps === 0 && grade >= 1` avant `schedule`, puis `FC.storage.recordAnswer(deck().id, wasLearned)` à côté du `stats.attempts++`.

### 3. Nouveau `js/core/charts.js`
- `FC.charts = { line(), bars(), donut(), sparkline? }` : générateurs SVG purs (`createElementNS`), sans lib externe.
- API générique : `line(data, {width, height, color})`, `bars(...)`, `donut(segments, {colors})`.
- Tooltips : `<title>` natif dans le SVG (simple, accessible) — pas de JS de survol.

### 4. Nouveau `js/ui/stats.js`
- `FC.ui.stats = { init, show, render }`.
- `show()` : `U.showScreen("#screen-stats")` + `render()`.
- `render()` lit `FC.storage.history`, applique filtres deck/période, calcule :
  - série quotidienne de taux de réussite → courbe ;
  - série quotidienne d'activité (tentatives) → barres ;
  - cumulative « cartes apprises » → courbe ;
  - streak actuel + record → carte chiffre ;
  - distribution SRS (deck sélectionné) → donut + légende.
- Affiche aussi 3 cartes récap : % réussite sur la période, tentatives, cartes apprises actuelles.
- Filtres : rangées de `.chip` réutilisant le pattern `wireOptions` de `js/ui/home.js` (deck : `all` + `FC.decks.list` ; période : `7|30|all`). Déclencher `render()` au clic.

### 5. `index.html`
- Nouveau `<section id="screen-stats" class="screen" hidden>` après `#screen-end` : bouton retour (`#stats-back-btn`), titre, chips filtres (`#stats-deck-filter`, `#stats-period-filter`), cartes chiffres, conteneurs de graphiques (`#chart-success`, `#chart-activity`, `#chart-learned`, `#chart-streak`, `#chart-srs`).
- Bouton d'accès : chip/bouton « 📊 Statistiques » (`#stats-btn`) sur `#screen-home` (sous les `stats-pills`).
- Ajouter `<script src="js/core/charts.js">` avant `js/ui/stats.js` (ordre : après `js/ui/end.js`, avant `js/app.js`).

### 6. `js/app.js`
- `FC.ui.stats.init()` dans `init()` ; `#stats-btn` → `FC.ui.stats.show()` ; `#stats-back-btn` → `FC.ui.end.goHome()`.

### 7. `css/style.css`
- Styles `.stat-chart-card`, `.stat-big-number`, légende donut, layout en grille responsive (1 colonne mobile, 2 desktop), réutiliser `--surface`, `--border`, `--card-radius`, couleurs racine existantes. Pas de nouvelle police ni de nouveau dégradé.

## Cas limites

- **Quitter en cours de partie** : compteurs déjà écrits au fil des réponses → pas de perte.
- **1ʳᵉ visite (aucun historique)** : état vide + courbe apprise démarrant à la base SRS calculée.
- **Réponses « Pas du tout » (grade 0)** : comptée en tentative, jamais en `correct` ni `learned`.
- **Sens « mix »** : comptabilisé dans le deck sans distinction de direction (le journal ne stocke pas la direction — assumé, cohérent avec les filtres choisis).
- **`reset()`** : vider history en même temps que stats/srs pour garder la cohérence.
- **Journée sans session** : axe x continue (trous à zéro) pour ne pas fausser la lecture temporelle.

## Validation (manuelle — pas de framework de test dans le projet)

1. Ouvrir `index.html` (serveur statique ou fichier direct), jouer 2-3 sessions sur des decks différents, vérifier :
   - les courbes/barres apparaissent et sont cohérentes avec les scores ;
   - le streak passe à 1 puis s'incrémente (simuler en modifiant une date dans `localStorage`) ;
   - le donut reflète les intervalles du SRS après quelques réponses.
2. Tester les filtres deck × période, y compris « Tout ».
3. Quitter en cours de session puis rouvrir : les tentatives déjà données sont comptées.
4. Vérifier `localStorage["flashcards.history.v1"]` : structure par jour, totaux + decks.
5. Vérifier l'état vide sur un profil localStorage vierge.
6. Vérifier le bouton réinitialisation : history supprimé avec le reste.
7. Vérifier la mise en page mobile (fenêtre étroite) et l'absence de console d'erreur.

## Hors périmètre (assumé, non demandé)

- Export/import des données, multi-profils, backend, synchro.
- Filtres par sens (direction) ou par continent.
- Prédiction « révisions à venir ».
- Rétro-remplissage de l'historique antérieur (impossible, données absentes).

## Risques

- **localStorage plein** : journal compact (4 compteurs/jour/deck) ; rétention 400 jours ≈ quelques Ko. Risque négligeable.
- **Compatibilité** : SVG pur, `Intl` non requis, aucune lib — compatible avec le niveau de support actuel de l'app.
- **Perf** : rendu de 2-3 SVG légers par ouverture d'écran, recalcul uniquement au `render()` — aucun impact.
