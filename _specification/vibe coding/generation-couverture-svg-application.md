# Feature Spec: Génération de couverture SVG par application

## Summary
- Remplacer, sur le **board catalogue** (grille `/`, composant `ApplicationCard`), l'image de couverture générique actuellement affichée pour toute application sans photo réelle par une **couverture SVG générée** à partir du template `temp/airbus-flight-test-app.svg`.
- Le nom de l'application (`app.name`) remplace le texte "AERO TEST" du template.
- La couleur de l'avion (dégradé `wingGlow` + indicateurs latéraux) reçoit une **variante aléatoire mais déterministe** par application, tirée d'une palette de couleurs curatée.

## Motivation
- Toutes les Applications ont aujourd'hui `coverPhoto: null` (aucune source de photo réelle côté backend, cf. `_specification/vibe coding/integration-api-applications.md`), donc le board catalogue affiche pour les ~500 applications la **même** image placeholder générique (`public/covers/no-ltm-photo.png`), sans aucune distinction visuelle entre elles.
- Une image générée avec le nom de l'application affiché dessus rend chaque carte identifiable en un coup d'œil dans la grille, même sans vraie photo — un gain de lisibilité important sur un catalogue de cette taille.
- Faire varier la couleur de l'avion par application (au lieu d'une couleur fixe pour toutes) renforce encore cette distinction visuelle entre cartes voisines dans la grille, sans dépendre d'une donnée métier absente.
- Le template `temp/airbus-flight-test-app.svg` fournit déjà une identité visuelle aboutie (fond radar, avion stylisé, cartouche central pour le nom, palette CSS isolée dans des classes dédiées) directement réutilisable comme gabarit de génération plutôt que de partir d'un nouveau design.

## Décisions (arbitrées)

### Source du template
- Le SVG `temp/airbus-flight-test-app.svg` sert de **gabarit unique**. Sa structure (fond, radar, silhouette d'avion, cartouche, indicateurs latéraux) reste inchangée ; seuls deux éléments varient par application :
  1. Le texte du cartouche central (`<text class="name">`), actuellement "AERO TEST" → remplacé par `app.name`.
  2. La couleur de l'avion, portée par le dégradé `wingGlow` (stops `.stop-primary` / `.stop-secondary`) et reprise sur les deux points des indicateurs latéraux (`.primary` / `.secondary`) → remplacée par une paire de couleurs tirée d'une palette prédéfinie.
- Le sous-titre "FLIGHT TEST SOFTWARE" et tous les autres éléments (repères de télémétrie "FLT/001", "M 0.82", "FL 350", cercles radar, grille de fond) restent identiques pour toutes les applications — ils font partie de l'identité visuelle commune, pas une donnée par application.

### Détermination de la couleur
- Le choix de la paire de couleurs (primary/secondary) est **déterministe par application**, dérivé d'une empreinte de `app.externalId` (même principe que la palette d'avatars déterministe déjà utilisée ailleurs dans l'app pour les initiales de personnes) — une même application affiche donc toujours la même couleur d'avion d'un chargement à l'autre, sans stockage supplémentaire côté backend.
- La palette de paires de couleurs est curatée à la main (un petit nombre de combinaisons visuellement cohérentes avec le fond sombre du template), pas un tirage RGB arbitraire, pour éviter des combinaisons illisibles ou trop proches du fond.

### Adaptation du nom au gabarit
- Le cartouche central a une largeur fixe et le texte utilise une taille de police fixe (68px) dans le template d'origine, dimensionné pour "AERO TEST" (9 caractères). Les noms d'application réels étant potentiellement plus longs, le texte affiché doit s'adapter pour rester lisible et ne pas déborder du cartouche : soit par réduction progressive de la taille de police selon la longueur du nom, soit par troncature avec indicateur (ex. "…") au-delà d'une longueur seuil. Le choix entre les deux approches est une question ouverte (voir plus bas).

### Portée : board catalogue uniquement
- Cette spécification couvre uniquement le **remplacement de la couverture affichée sur le board catalogue** (`ApplicationCard`, grille `/`). Le carrousel de visuels simulés de la fiche détail (`Gallery`, cf. `_specification/vibe coding/repositionnement-carrousel-visuels-fiche-application.md`, déjà implémenté avec les 4 SVG `public/covers/cover-1..4.svg`) n'est pas modifié par cette spec — la question de l'harmonisation entre les deux est laissée en question ouverte.

## Requirements

### Functional Requirements
- Pour chaque application affichée sur le board catalogue sans photo réelle (cas actuel : systématiquement, puisque `coverPhoto` est toujours `null`), la couverture affichée est une image SVG générée à partir du gabarit, avec :
  - Le nom de l'application inséré dans le cartouche central, adapté pour rester lisible quelle que soit sa longueur.
  - Une couleur d'avion choisie de façon déterministe (toujours la même pour une même application) dans une palette prédéfinie.
- Le reste du visuel (fond radar, télémétrie, cartouche, indicateurs) reste identique au gabarit d'origine pour toutes les applications.
- Le jour où une vraie photo d'application devient disponible (feature future, hors périmètre ici), elle doit reprendre la priorité sur la couverture générée, sans changement de logique supplémentaire au-delà de la condition déjà existante "photo présente vs absente".

### Non-Functional Requirements
- **Aucun appel réseau supplémentaire** : la génération est un calcul purement local (nom + couleur dérivée d'un identifiant déjà connu côté client), pas un appel à un service de génération d'image externe.
- **Cohérence de performance sur la grille** : le board catalogue affiche potentiellement ~500 cartes (paginées 6 par page, cf. CLAUDE.md) — la génération doit rester légère (pas de calcul coûteux répété inutilement par re-render).
- **Mode clair / sombre** : le gabarit a son propre fond sombre fixe intégré (`.bg`), indépendant du thème `data-theme` de l'application — à confirmer que cela reste acceptable visuellement dans les deux modes (voir Open Questions).
- **Aucun changement de données/API** : `lib/types.ts`, `lib/atom-api.ts`, `lib/application-adapter.ts` ne sont pas modifiés ; `app.coverPhoto` reste `null` en base, la génération est un artefact d'affichage pur.

## Scope

### In Scope
- Génération d'une couverture SVG par application (nom + couleur d'avion variable) à partir du gabarit `temp/airbus-flight-test-app.svg`, utilisée comme image de couverture sur le board catalogue (`ApplicationCard`).
- Adaptation du texte du nom au cartouche pour les noms longs.
- Détermination déterministe de la couleur d'avion par application.

### Out of Scope
- Modification du carrousel de la fiche détail (`Gallery`, déjà couvert par une spec distincte).
- Intégration de vraies photos d'application (feature future distincte).
- Génération d'images raster (PNG) — le gabarit reste en SVG (cf. discussion préalable : SVG retenu pour la composition texte + fond sans étape de rasterization).
- Personnalisation du fond radar, de la télémétrie ou du sous-titre par application — seuls le nom et la couleur de l'avion varient.

## Affected Areas
- **À déplacer/adapter** : `temp/airbus-flight-test-app.svg` — actuellement un fichier de travail hors du dossier `public/`, à intégrer dans le projet comme gabarit source de la génération (emplacement exact à trancher en implémentation, ex. `public/covers/` ou un nouveau dossier dédié).
- **Probablement concerné** : `components/ApplicationCard.tsx` (consommateur actuel de la couverture placeholder via `usePhoto`/`lib/photo.ts`), `lib/photo.ts` (actuellement source de `PHOTO_PLACEHOLDER` unique).
- **Non touché** : `lib/types.ts`, `lib/atom-api.ts`, `lib/application-adapter.ts`, `lib/applications.ts`, `lib/useApplications.ts`, `components/Gallery.tsx` (fiche détail, hors périmètre), `components/pdf/*`, `/map`.

## Edge Cases
- Nom d'application très long (au-delà de la largeur du cartouche à taille de police normale) → le texte doit rester lisible sans déborder du cadre (réduction de taille ou troncature, à trancher).
- Nom d'application très court (1-2 caractères) → aucun problème attendu, le gabarit gère déjà des noms courts ("AERO TEST" fait 9 caractères).
- Caractères spéciaux ou accents dans le nom (ex. "Portfolio d'été") → doivent s'afficher correctement dans le SVG (encodage texte standard, pas de transformation destructrice).
- Application sans `externalId` exploitable pour dériver la couleur (cas théorique, en pratique toujours présent) → repli sur une couleur par défaut de la palette plutôt qu'une erreur de rendu.

## Open Questions
- **Adaptation du nom trop long** : réduction progressive de la taille de police, ou troncature avec "…" au-delà d'un seuil de caractères ? Recommandation : réduction progressive de la taille de police jusqu'à un plancher lisible, puis troncature seulement si le plancher est atteint et que le nom déborde encore. => suivre recommendation
- **Taille de la palette de couleurs** : combien de paires de couleurs curatées (ex. 4, 6, 8) pour un bon équilibre entre diversité visuelle sur la grille et cohérence du design ? Recommandation : 6 paires, cohérent avec la palette déjà utilisée pour les avatars (8 couleurs) sans être excessif.  => suivre recommendation
- **Emplacement du gabarit et du code de génération** : où déplacer `temp/airbus-flight-test-app.svg` dans le projet, et où vivra la logique de génération (nouveau fichier `lib/` dédié) ? Recommandation : gabarit dans `public/covers/`, logique de génération dans un nouveau `lib/generated-cover.ts`.  => suivre recommendation
- **Fond sombre fixe du gabarit vs mode clair** : le fond radar sombre (`.bg`) est-il acceptable tel quel même quand l'utilisateur est en thème clair, ou faut-il une variante claire du gabarit ? Recommandation : garder le fond sombre fixe dans les deux thèmes — l'image est une illustration autonome (comme une photo), pas un élément d'UI qui doit suivre le thème.  => suivre recommendation
- **Harmonisation avec le carrousel de la fiche détail** : la couverture générée doit-elle aussi devenir l'image principale du carrousel simulé sur la fiche détail (remplaçant les 4 SVG génériques `cover-1..4.svg`), pour une cohérence board ↔ fiche ? Recommandation : hors périmètre de cette spec, à traiter séparément si souhaité une fois cette version validée sur le board.  => oui

## Acceptance Criteria
- [ ] Sur le board catalogue (`/`), chaque carte d'application sans photo réelle affiche une couverture SVG générée portant le nom de l'application.
- [ ] La couleur de l'avion varie selon l'application, mais reste identique pour une même application d'un chargement à l'autre (déterministe).
- [ ] Les noms d'application longs restent lisibles dans le cartouche, sans débordement visuel.
- [ ] Aucun appel réseau supplémentaire n'est déclenché par la génération de couverture.
- [ ] Aucun changement de types, DTO, adapter, ou logique de filtrage/carte/PDF.
- [ ] Build Next OK, pas de régression visuelle sur `/map` et la fiche détail `/application`.
