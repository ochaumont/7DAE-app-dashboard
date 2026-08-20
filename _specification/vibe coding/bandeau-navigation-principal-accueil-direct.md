# Feature Spec: Bandeau de Navigation Principal et Accueil Direct

## Summary
- Supprimer la page d'accueil actuelle (landing avec le `DirectionPicker` qui demande de choisir une direction visuelle).
- Refondre le routage pour **enterrer complètement le segment `/d/[direction]`** : l'URL racine `/` devient la vue catalogue (ex-Industrial Premium) et `/map` devient la vue carte (ex-Map-First). Les fiches banc passent sous `/bench/[id]`.
- Ajouter un **bandeau global** présent sur toutes les pages, avec le **logo Airbus** en haut à gauche et un **menu de navigation** contenant deux items :
  - **Catalogue** → `/`.
  - **Map** → `/map`.
- L'item actif est mis en évidence visuellement en fonction de la route courante.
- Le bandeau prévoit dès sa structure l'emplacement pour de futurs éléments (avatar, recherche globale, notifications), sans les implémenter en V1.

## Motivation
- La page intermédiaire de sélection de direction visuelle n'a plus lieu d'être : une direction (Industrial Premium) est retenue comme expérience par défaut, la notion de "direction" doit disparaître de l'URL.
- L'utilisateur métier doit accéder au catalogue en un minimum de clics, sans friction décisionnelle, avec des URLs parlantes (`/`, `/map`, `/bench/<id>`) faciles à partager et à bookmarker.
- Le bandeau persistant sert d'ancrage visuel Airbus (branding) et remplace la navigation actuelle spécifique à `d/[direction]` par une navigation globale cohérente entre le catalogue et la carte.

## Requirements

### Functional Requirements

#### Routage et page d'accueil
- **`/`** : vue catalogue Industrial Premium (grille de bancs, filtres, recherche). Aucun écran intermédiaire.
- **`/map`** : vue Map-First (carte plein écran, panneau de filtres glass).
- **`/bench/[id]`** : fiche détail banc, accessible depuis le catalogue et la carte.
- L'ancien segment `/d/[direction]` et l'ancienne page de sélection (`DirectionPicker`) sont entièrement supprimés (pas de route de compatibilité, pas d'accès caché).
- Refresh sur n'importe laquelle de ces URLs reste sur la même URL.

#### Bandeau global (header)
- Présent en haut de toutes les pages de l'application (`/`, `/map`, `/bench/[id]`).
- Sticky en haut : reste visible lors du scroll.
- Contenu (V1) :
  - **À gauche** : logo Airbus cliquable qui ramène à `/` (catalogue).
  - **Au centre ou à droite** : menu horizontal avec deux items :
    - **Catalogue** : navigue vers `/`.
    - **Map** : navigue vers `/map`.
- **Emplacements réservés à droite** : la structure du bandeau prévoit dès maintenant un espace (slot / zone flex) destiné à accueillir ultérieurement avatar utilisateur, champ de recherche globale, cloche de notifications. En V1 cet espace est vide mais dimensionné pour éviter tout reflow futur.
- L'item courant (selon l'URL active) est visuellement distingué. **Choix retenu** : fond plein accent (couleur `--color-accent`) + texte `--color-accent-fg` pour l'item actif ; texte muted avec hover sur `--color-fg` pour les items inactifs. Cohérent avec le bouton actif déjà utilisé dans l'application.
- Le bandeau applique le thème en cours (cohérence couleurs et typographie avec Industrial Premium ou Map-First selon la page).

#### Navigation
- Les liens sont de vrais liens (`<Link>` Next.js) pour permettre ouverture en nouvel onglet / bookmark / partage d'URL.
- La navigation ne provoque pas de flash blanc ni de rechargement complet de la page.
- Depuis la fiche banc, un lien "retour catalogue" renvoie vers `/` (ou vers `/map` si c'est de là que l'utilisateur venait — à traiter comme amélioration optionnelle si simple).

#### Thème
- Le thème Industrial Premium est appliqué par défaut au niveau du layout racine (classe `theme-industrial-premium` sur le conteneur principal).
- La route `/map` applique en plus la classe `theme-map-first` pour bénéficier du glassmorphism spécifique.
- Les variables CSS et les styles des deux thèmes restent disponibles dans `styles/themes/`.

## Scope

### In Scope
- Refactor du routage : déplacement du contenu catalogue vers `app/page.tsx` et de la vue map vers `app/map/page.tsx`, fiche banc vers `app/bench/[id]/page.tsx`.
- Suppression du dossier `app/d/[direction]/` et de ses layouts/pages.
- Suppression du composant `DirectionPicker` et des références (`lib/directions.ts` peut être conservé si les thèmes restent paramétrables, ou simplifié).
- Création d'un composant `Header` global (logo Airbus + menu 2 items + slot droit réservé) intégré au layout racine.
- Récupération et intégration d'un logo Airbus depuis le web (SVG monochrome blanc de préférence, placé dans `public/airbus-logo.svg`).
- Application du thème Industrial Premium par défaut dans le layout racine, thème Map-First ajouté sur la route `/map`.
- Gestion de l'état actif du menu en fonction de la route (`usePathname`).
- Mise à jour des liens internes (`BenchCard`, `MapView` popup, lien retour fiche) vers les nouvelles URLs.

### Out of Scope
- Implémentation réelle des éléments futurs du bandeau (avatar, recherche globale, notifications) — uniquement l'emplacement est prévu.
- Retrait du code des thèmes Map-First ou Industrial Premium (les deux vues restent).
- Redesign global des vues catalogue ou map (l'intérieur des pages reste identique, seules les URLs et la navigation changent).
- Menu utilisateur, authentification, préférences.
- Traduction multilingue du bandeau (EN uniquement).
- Redirections de l'ancien `/d/[direction]` vers les nouvelles URLs (les anciennes routes sont supprimées sans fallback, aucun lien externe n'existe aujourd'hui).
- Version mobile dédiée du menu (un simple affichage responsive suffit pour la V1).
- Conservation d'un accès caché à l'ancien `DirectionPicker` (supprimé totalement).

## Affected Areas
- **Routes créées** :
  - `app/page.tsx` : devient la page catalogue Industrial Premium (reprend le contenu de l'actuel `app/d/[direction]/catalogue-client.tsx` avec thème figé).
  - `app/map/page.tsx` : vue Map-First (reprend le comportement `directionId === "map-first"`).
  - `app/bench/[id]/page.tsx` : fiche détail banc (reprend l'actuel `app/d/[direction]/bench/[id]/page.tsx` sans param `direction`).
- **Routes supprimées** : tout le dossier `app/d/[direction]/` (layout, page, catalogue-client, bench).
- `app/layout.tsx` : applique la classe `theme-industrial-premium` sur le body/wrapper et intègre le nouveau `Header`.
- **Nouveau composant** `components/Header.tsx` (logo + menu + slot droit réservé).
- **Asset** : `public/airbus-logo.svg` ajouté.
- Composant `DirectionPicker` : supprimé.
- `lib/directions.ts` et `DirectionId` : à simplifier ou supprimer selon besoin (garder uniquement les classes de thème si elles restent utiles).
- `components/BenchCard.tsx` : le lien passe de `/d/${directionId}/bench/${bench.id}` à `/bench/${bench.id}`, la prop `directionId` peut disparaître.
- `components/MapView.tsx` : idem pour le lien popup.
- Page fiche banc : lien retour vers `/` au lieu de `/d/${direction}`.

## Edge Cases
- L'utilisateur arrive sur `/bench/<id>` directement : le bandeau s'affiche et l'item **Catalogue** est marqué actif par défaut.
- L'utilisateur est sur `/map` et clique sur **Map** : pas de rechargement inutile, état carte (zoom / sélection) préservé si possible.
- L'utilisateur est sur `/` et clique sur **Catalogue** : filtres actifs préservés, pas de reset.
- Logo Airbus absent ou cassé : fallback textuel "Airbus" pour ne pas casser le bandeau.
- Résolution mobile : le menu reste utilisable (affichage compact si nécessaire, pas de débordement). Le slot droit réservé ne doit pas prendre de place visible s'il est vide.
- Ancienne URL `/d/industrial-premium` ou `/d/map-first` tapée manuellement : 404 standard (aucune redirection en V1).
- Thème Map-First (glassmorphism) : le bandeau doit rester lisible sur fond carte sombre (fond du bandeau légèrement opaque + blur).
- Banc inexistant sur `/bench/<id>` : comportement `notFound()` existant conservé, bandeau toujours affiché.

## Open Question
- Aucune ouverte pour l'instant. (Points tranchés : routage propre sans `/d/`, logo trouvé sur le web en SVG monochrome, item actif en fond accent, slot droit prévu pour futurs éléments, pas de fallback vers l'ancien `DirectionPicker`.)

## Acceptance Criteria
- [ ] Ouvrir `/` affiche immédiatement le catalogue Industrial Premium (aucun écran de sélection, aucune redirection).
- [ ] Ouvrir `/map` affiche la vue Map-First.
- [ ] Ouvrir `/bench/<id>` affiche la fiche d'un banc existant et 404 sinon.
- [ ] Les anciennes URLs `/d/...` retournent 404 (supprimées).
- [ ] Le bandeau global est visible et sticky sur `/`, `/map`, `/bench/<id>`.
- [ ] Le logo Airbus est présent en haut à gauche du bandeau et ramène à `/` au clic (fallback texte "Airbus" si l'image échoue).
- [ ] Le menu contient exactement deux items : **Catalogue** et **Map**.
- [ ] Cliquer sur **Catalogue** mène à `/` ; l'item est marqué actif (fond accent) sur `/` et sur `/bench/<id>`.
- [ ] Cliquer sur **Map** mène à `/map` ; l'item est marqué actif sur `/map`.
- [ ] Un emplacement (slot) à droite du bandeau est réservé pour les futurs éléments (avatar, recherche, notifications) — vide mais présent dans le DOM.
- [ ] Aucun lien visible ne mène encore à l'ancienne page de sélection de direction.
- [ ] Le composant `DirectionPicker` est supprimé du repo.
- [ ] Le bandeau reste lisible sur les deux thèmes (Industrial Premium et Map-First).
- [ ] Navigation fluide, sans flash blanc ni rechargement complet.
