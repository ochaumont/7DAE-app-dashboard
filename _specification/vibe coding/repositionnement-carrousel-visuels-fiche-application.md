# Feature Spec: Repositionnement de la fiche Application + carrousel de visuels simulés

## Summary
- Réorganiser la fiche détail `/application?id=<externalId>` pour se rapprocher de la maquette cible (`temp/targetView.jpg`) :
  - La **Description** quitte la colonne de droite et vient se placer **sous le carrousel d'images**, dans la colonne de gauche.
  - Les cartes **Application Manager / Manager Delegate(s) / Solution Architect** quittent l'en-tête (`ApplicationHeader`) et sont regroupées dans une **rangée pleine largeur en bas de page**, sous les deux colonnes (image+description à gauche, identité+lifecycle+portfolio+operator à droite), au lieu d'être empilées verticalement dans la colonne de droite.
  - La colonne de droite ne contient plus, dans l'ordre, que : titre + externalId + statut, chips Category/Business Criticality, Lifecycle, Portfolio, Operator & Provider.
- Introduire un **carrousel de visuels simulés** sous l'image principale : puisqu'aucune Application n'a de photos réelles aujourd'hui (`photos: []` toujours, cf. `_specification/vibe coding/integration-api-applications.md`), `Gallery` doit afficher plusieurs vignettes de substitution (au lieu du placeholder unique actuel) pour préfigurer la feature réelle à venir.

## Motivation
- La maquette cible place l'information "à lire en un coup d'œil" (identité, cycle de vie, portfolio, opérateur) dans la colonne de droite, condensée et sans les cartes manager qui l'alourdissaient — ces dernières sont plus confortables à parcourir dans une **rangée horizontale pleine largeur**, cohérente avec le fait qu'il peut y avoir 1 à N+2 personnes (manager, delegates, solution architect) à afficher côte à côte plutôt qu'empilées.
- La Description, actuellement noyée en bas de la colonne de droite après le bloc identité, est un texte long ; la maquette la remonte sous les visuels, dans la colonne de gauche, ce qui équilibre mieux les deux colonnes (gauche = visuel + narratif, droite = données structurées).
- `Gallery` a été conçu à l'origine pour Lab Test Mean où l'absence de photo était un cas normal (placeholder unique, pas de carrousel). Pour Application, l'équipe veut **anticiper visuellement** la feature "photos d'application" à venir en simulant un carrousel dès maintenant, plutôt que de montrer un unique placeholder statique.

## Décisions (arbitrées)

### Nouvel agencement de la fiche
Grille principale inchangée dans sa structure (`lg:grid-cols-[1.4fr_1fr]`), mais son contenu se réorganise :

**Colonne gauche (1.4fr)**
1. Carrousel (image principale + vignettes, voir section dédiée).
2. Section "Description" (déplacée depuis la colonne de droite) — même règle d'affichage conditionnel qu'aujourd'hui (masquée si `app.description` est vide).

**Colonne droite (1fr)**
1. `ApplicationHeader` allégé : titre, `[externalId]`, `BadgeStatus`, chips `ChipCategory` + `ChipBusinessCriticality`, `LifecycleSection`. **Le bloc managers est retiré de ce composant.**
2. Section "Portfolio" (inchangée).
3. Section "Operator & Provider" (inchangée).

**Pleine largeur, sous la grille à deux colonnes**
- Nouvelle rangée "People" (nom de section à trancher, voir Open Questions) affichant côte à côte : Application Manager, chaque Manager Delegate, Solution Architect — même style de carte que l'actuel `ManagerCard` (avatar initiales + nom + rôle + email), disposés en grille responsive (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` ou équivalent flex-wrap) plutôt qu'empilés verticalement.
- Règle d'affichage : la rangée entière n'apparaît que si au moins une des 3 informations (manager, delegates, solution architect) existe ; sinon aucun bloc vide n'est rendu (même règle que l'actuel bloc managers de `ApplicationHeader`).
- Le manager "Application Manager" continue d'afficher "Not set" comme fallback quand `app.manager` est `null` (comportement actuel conservé), pour rester cohérent avec le reste de la fiche qui ne masque jamais silencieusement un champ attendu.

### Carrousel de visuels simulés
- Puisque `app.photos` est toujours `[]` en V1 (aucune source de données réelle), `Gallery` doit être adapté pour ne plus se limiter à afficher le placeholder unique quand `photos` est vide, mais simuler un jeu de plusieurs visuels de substitution pour l'Application affichée.
- Recommandation : réutiliser les 4 SVG déjà présents dans `public/covers/` (`cover-1.svg` à `cover-4.svg`, déjà utilisés comme couvertures de secours ailleurs dans l'app) comme les 4 vignettes simulées du carrousel, plutôt que d'introduire de nouveaux assets. Le visuel principal affiché au chargement est la première vignette (`cover-1.svg`).
- Le comportement de navigation (clic sur une vignette → mise à jour de l'image principale, vignette active surlignée) reprend exactement le pattern déjà implémenté dans `Gallery`/`Thumbnail` pour les vraies photos (bordure accentuée, opacité réduite sur les vignettes inactives).
- Ce carrousel simulé est **générique** (même 4 visuels pour toutes les Applications tant qu'aucune vraie photo n'existe) — il ne prétend pas représenter le contenu réel de l'application, c'est un espace réservé volontairement identifiable comme tel.
- Le composant 360° (`PanoramaClient`, `photo.is360`) n'est pas concerné : les visuels simulés ne sont jamais 360°.

## Requirements

### Functional Requirements

#### Réagencement de la fiche (`ApplicationDetailClient`)
- La colonne gauche contient, dans l'ordre : `Gallery`, puis `Section title="Description"`.
- La colonne droite contient, dans l'ordre : `ApplicationHeader` (allégé, sans managers), `Section title="Portfolio"`, `Section title="Operator & Provider"`.
- Une nouvelle rangée pleine largeur est ajoutée sous la grille à deux colonnes, affichant les cartes manager côte à côte.

#### `ApplicationHeader` allégé
- Ne rend plus le bloc managers (Application Manager / Manager Delegate / Solution Architect) — ce contenu est déplacé dans `ApplicationDetailClient` (ou un nouveau sous-composant dédié, ex. `ApplicationPeopleRow`).
- Conserve : titre, externalId, `BadgeStatus`, chips Category/Business Criticality, `LifecycleSection`.

#### Carrousel simulé (`Gallery`)
- Quand `photos.length === 0`, afficher un jeu de vignettes simulées (4 visuels `public/covers/cover-1.svg` … `cover-4.svg`) avec la même mécanique image principale + vignettes cliquables que le cas `photos.length > 0`, au lieu du placeholder statique unique actuel.
- Quand `photos.length > 0` (cas futur, une fois la vraie feature photo branchée), le comportement actuel (vraies photos, support 360°) reste inchangé et prioritaire sur la simulation.

### Non-Functional Requirements
- **Aucun changement de données/API** : `lib/types.ts`, `lib/atom-api.ts`, `lib/application-adapter.ts` ne sont pas modifiés. Le carrousel simulé est un pur artefact d'affichage front, `app.photos` reste `[]` en base.
- **Cohérence visuelle** : les cartes manager en rangée pleine largeur réutilisent le même composant `ManagerCard` (pas de nouveau style de carte).
- **Mode clair / sombre** : aucune nouvelle couleur en dur ; tout dérive des tokens existants.
- **Pas de nouvelle dépendance npm.**

## Scope

### In Scope
- Réécriture de `components/ApplicationDetailClient.tsx` pour le nouvel agencement (Description déplacée, rangée managers pleine largeur ajoutée).
- Réécriture de `components/ApplicationHeader.tsx` pour retirer le bloc managers.
- Éventuelle création d'un petit composant `components/ApplicationPeopleRow.tsx` (ou nom équivalent) pour factoriser la rangée managers pleine largeur — à trancher en implémentation selon la taille du JSX résultant.
- Modification de `components/Gallery.tsx` pour simuler un carrousel de 4 vignettes (`public/covers/cover-1.svg` … `cover-4.svg`) quand `photos` est vide.

### Out of Scope
- Toute modification du catalogue (`/`), de la carte (`/map`), du filtrage, de l'export PDF.
- Intégration de vraies photos d'Application (endpoint, upload, stockage) — reste une feature future distincte, seule la simulation visuelle est traitée ici.
- Modification du composant `PanoramaClient` / support 360° réel.
- Changement des libellés ou du contenu des sections Portfolio / Operator & Provider (repositionnées telles quelles).

## Affected Areas
- **Modifier** :
  - `components/ApplicationDetailClient.tsx` — nouvel agencement 2 colonnes + rangée managers pleine largeur.
  - `components/ApplicationHeader.tsx` — retrait du bloc managers.
  - `components/Gallery.tsx` — carrousel simulé (4 vignettes `public/covers/cover-*.svg`) quand `photos` est vide.
- **Créer (éventuellement)** :
  - `components/ApplicationPeopleRow.tsx` — si le JSX de la rangée managers est jugé trop volumineux pour rester inline dans `ApplicationDetailClient`.
- **Non touché** :
  - `lib/types.ts`, `lib/atom-api.ts`, `lib/application-adapter.ts`, `lib/applications.ts`, `lib/useApplications.ts` — aucun changement domaine/data.
  - `components/ManagerCard.tsx` — réutilisé tel quel.
  - `components/CatalogueClient.tsx`, `ApplicationCard.tsx`, `MapView.tsx`, `MapClient.tsx`, `FilterBar.tsx`, `FilterSheet.tsx`, `components/pdf/*` — non concernés (la refonte est isolée à la fiche détail web).

## Edge Cases
- `app.description` vide ou null → le bloc Description (label + texte) reste masqué, comme aujourd'hui, mais désormais dans la colonne de gauche.
- `app.manager == null`, `app.managerDelegates == []`, `app.solutionArchitect == null` (les 3 à la fois) → la rangée managers pleine largeur entière n'est pas rendue (pas de rangée vide).
- `app.manager == null` mais delegates/solutionArchitect présents → seule la carte "Not set" pour Application Manager est masquée ou affichée avec fallback "Not set" (à trancher, voir Open Questions) — recommandation : garder le fallback "Not set" comme aujourd'hui, pour cohérence avec la règle "jamais de champ silencieusement masqué" déjà appliquée au reste de la fiche.
- Plusieurs `managerDelegates` → chacun a sa propre carte dans la rangée, elle peut donc dépasser 3 cartes et passer sur plusieurs lignes (grid responsive).
- `photos.length > 0` un jour (vraie feature photo branchée) → le carrousel simulé disparaît automatiquement au profit des vraies photos, aucune logique supplémentaire nécessaire au-delà de la condition déjà existante `photos.length === 0`.

## Open Questions
- **Nom de la nouvelle rangée managers pleine largeur** : faut-il un label de section visible (ex. "People", "Team") au-dessus de la rangée de cartes, ou la rangée s'affiche-t-elle sans titre (comme sur la maquette cible, où aucun label n'est visible au-dessus des 3 cartes) ? Recommandation : pas de label, cohérent avec la maquette. => ? => suivre recommendation
- **Position exacte de la rangée managers** : uniquement en bas de la fiche pleine largeur (comme décrit ci-dessus, conforme à la maquette), ou doit-elle rester dans les limites de la colonne de droite mais en horizontal ? Recommandation : pleine largeur en bas, conforme à la maquette (`temp/targetView.jpg` montre les 3 cartes s'étendre sur toute la largeur de la page, au-delà de la colonne de droite).  => suivre recommendation
- **Vignettes simulées** : réutiliser `cover-1..4.svg` existants (déjà utilisés comme placeholders de couverture ailleurs) ou générer 4 nouveaux visuels dédiés au carrousel de la fiche ? Recommandation : réutiliser les 4 existants pour zéro nouvel asset et cohérence visuelle avec le reste de l'app. => suivre recommendation
- **Mention explicite "visuel simulé"** : faut-il un badge/texte discret (ex. "Preview") indiquant que ces visuels ne sont pas les vraies photos de l'application, pour éviter toute confusion utilisateur ? Recommandation : oui, un petit badge discret en coin de l'image principale, réversible facilement le jour où les vraies photos arrivent.  => suivre recommendation

## Acceptance Criteria
- [ ] Sur `/application?id=<externalId>`, la colonne de gauche affiche dans l'ordre : carrousel d'images, puis la section Description (si non vide).
- [ ] La colonne de droite affiche dans l'ordre : en-tête (titre/externalId/statut/chips/lifecycle), Portfolio, Operator & Provider — sans bloc managers.
- [ ] Une rangée pleine largeur sous les deux colonnes affiche les cartes Application Manager / Manager Delegate(s) / Solution Architect côte à côte, uniquement si au moins une existe.
- [ ] Quand `app.photos` est vide, `Gallery` affiche un carrousel de 4 vignettes simulées (image principale + miniatures cliquables), au lieu d'un placeholder statique unique.
- [ ] Le clic sur une vignette simulée change l'image principale et met à jour la vignette active (même mécanique que les vraies photos).
- [ ] Aucun changement de types, DTO, adapter ou logique de filtrage/PDF/carte.
- [ ] Build Next OK, pas de régression visuelle sur `/`, `/map`.
