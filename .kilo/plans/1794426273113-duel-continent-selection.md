# Duel 2 joueurs — Choix des continents

## Objectif
Permettre de filtrer les pays par continent dans le mode Duel 2 joueurs (quizz), comme sur l'accueil du mode solo. Aujourd'hui `buildPool()` (js/ui/duel.js:26) pioche dans tous les pays.

## Décisions
- **Multi-sélection** de continents, identique à l'accueil (`#continent-options`, js/ui/home.js:67-86) : « Tous » réinitialise, toggler des continents, sélection vide ⇒ retour à « Tous ».
- **État séparé** : variable module-level `continents` dans `duel.js` (comme `rounds`), indépendante de `FC.settings.continents` du mode solo — le choix duel ne modifie pas le mode solo.
- **Réutiliser le CSS existant** `.chip` / `.chip-row` (css/style.css:211-245) — aucun CSS à ajouter.
- Le filtre s'applique au pool du duel **et** à l'autocomplétion des suggestions (`updateSuggestions()` réutilise déjà `flagsCountries()`).

## Tâches

1. **index.html** (`#screen-duel-setup`, entre le panel « Nombre de manches » et « Comment jouer ? »)
   - Ajouter un panel :
     ```html
     <div class="panel">
       <h2 class="panel-title">🗺️ Continent</h2>
       <div class="chip-row" id="duel-continent-options">
         <button class="chip selected" data-continent="all">Tous</button>
         <button class="chip" data-continent="Afrique">Afrique</button>
         <button class="chip" data-continent="Amérique du Nord">Amérique du Nord</button>
         <button class="chip" data-continent="Amérique du Sud">Amérique du Sud</button>
         <button class="chip" data-continent="Asie">Asie</button>
         <button class="chip" data-continent="Europe">Europe</button>
         <button class="chip" data-continent="Océanie">Océanie</button>
       </div>
     </div>
     ```

2. **js/ui/duel.js**
   - Ajouter `let continents = ["all"];` près de `let rounds = 10;` (ligne 12).
   - Ajouter un filtre :
     ```js
     function continentOk(c) {
       return continents.length === 0 || continents.includes("all") || continents.includes(c.continent);
     }
     ```
   - Modifier `flagsCountries()` (ligne 21) pour ajouter `continentOk(c) &&` à la condition du filter.
   - Ajouter `wireContinentOptions()` reprenant la logique de home.js (`#duel-continent-options`, état `continents` local, toggle + retombe sur `["all"]` si vide, `syncContinentButtons()` pour les classes `selected`).
   - Appeler `wireContinentOptions()` dans `init()` (ligne 232).
   - `buildPool()` et `updateSuggestions()` n'ont pas besoin de changement : ils passent par `flagsCountries()`.

## Comportement attendu
- « Tous » par défaut au chargement ; la sélection persiste tant que la page n'est pas rechargée (état module).
- Duel avec « Océanie » ⇒ uniquement des drapeaux de pays d'Océanie, suggestions limitées à l'Océanie.
- Moins de pays que de manches ⇒ le duel s'adapte déjà (`Math.min(rounds, pool.length)`), la revanche conserve le filtre.

## Validation (manuelle, pas de suite de tests)
1. Ouvrir `index.html` dans un navigateur.
2. ⚔️ Duel 2 joueurs → sélectionner « Océanie » → lancer : vérifier que seuls des drapeaux d'Océanie apparaissent (Nauru, Tuvalu, Fidji…).
3. Vérifier que l'autocomplétion ne propose que des pays d'Océanie.
4. Cocher deux continents (ex. Afrique + Europe), vérifier le mélange.
5. Cliquer « Tous » ⇒ réinitialise ; décocher tous les continents ⇒ revient à « Tous ».
6. Vérifier que le choix duel n'affecte pas le sélecteur de l'accueil (et inversement).

## Risques / notes
- Duplication de ~25 lignes de logique de chips avec home.js ; un refactor en helper partagé est possible plus tard, non nécessaire ici.
