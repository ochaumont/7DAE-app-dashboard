# Feature Spec: Programmes avion en pictogrammes

## Summary
- Remplacer la **liste à puces texte** des aircraft programs (actuellement rendue dans `<ProgramsSection>`, ligne `Programs`) par un **bloc de tuiles** : chaque tuile = un **pictogramme avion** + le **code du programme** en label en dessous.
- Repositionner ce bloc dans le header de la fiche, **à droite de la mini-carte de localisation**, sur la même rangée horizontale.
- Layout des tuiles : grille de **3 maximum par ligne**, débord vers la ligne suivante si plus.
- Les **projets** (`m.projects`) ne sont **pas** concernés — ils restent dans `<ProgramsSection>` qui devient de fait "Projects only" (à renommer).

## Motivation
- L'affichage actuel est purement textuel (`SA`, `LR-A330`, `XWB-A350`) en bas de page, dans une grid serrée. Pas reconnaissable au scan, pas mémorable.
- Les codes programmes correspondent **tous à des familles avion Airbus** (SA = Single Aisle / A320 family, LR-A330, XWB-A350, DD-A380, MT-A400M, WB = Wide Body, CS-A220, RT = Research/Test). Un pictogramme avion uniformise visuellement et donne au scan une identité métier claire ("ce banc sert l'A350 et l'A380").
- En **remontant** ce bloc dans la zone d'identité (à côté de la mini-carte), on rapproche les **deux dimensions clé** d'un banc : *où il est* et *pour quoi il sert*. C'est ce qui structure la lecture rapide d'une fiche.

## Décisions (arbitrées)
- **Pictogramme avion** : SVG inline dans `components/icons/AircraftIcon.tsx`. Style cohérent avec les autres icônes (`TypeIcon`, `StatusIcon`, etc.) — viewBox 24×24, `stroke="currentColor"`, `fill="none"`, trait 1.8 px. Même glyphe pour **tous** les programmes (pas de différenciation A320 vs A350 — l'icône est un avion générique vu de dessus, le label en dessous porte la spécificité).
- **Tuile** : nouveau composant `components/AircraftProgramTile.tsx`. Visuel : pictogramme avion centré (~32 px), label code programme en dessous en `font-mono text-xs text-fg`, padding `p-2`, fond `bg-surface`, bordure fine `border border-border`, coin arrondi `rounded`. Pas d'interactivité (pas de tooltip, pas de clic — V1).
- **Grille** : `grid grid-cols-3 gap-2`. 3 tuiles par ligne maximum. Plus de 3 → ligne suivante. Aucun masquage / troncage / "+N more" pour V1.
- **Emplacement** : à droite de la mini-carte `CountryMapIcon`, sur la même rangée horizontale. Layout : `flex items-start gap-4` autour de `[<CountryMapIcon />, <AircraftPrograms programs={…} />]`.
- **`<ProgramsSection>` du bas de page** : la rangée "Programs" (chips text accent-colored) est **retirée** ; la section est renommée **"Projects"** et n'affiche plus que `m.projects`. Si un jour les projets méritent leur propre traitement visuel, ce sera une nouvelle itération.
- **Liste vide** (`m.programs.length === 0`) : aucun bloc rendu — pas de placeholder vide, pas de label "None". La mini-carte conserve sa place sans voisin à droite.

## Requirements

### Functional Requirements

#### Composant pictogramme
- Nouveau `components/icons/AircraftIcon.tsx` : SVG 24×24, glyphe avion vu de dessus (corps + ailes + empennage), trait 1.8 px en `currentColor`. `aria-hidden="true"`.

#### Tuile programme
- Nouveau `components/AircraftProgramTile.tsx` : reçoit `{ code: string }`. Rendu : carré ~64 × 64 px (ou flex w/ taille auto), avec :
  - Icône avion centrée en haut (~24 px de hauteur effective).
  - Label `code` en dessous, centré, `font-mono text-xs text-fg`, tronqué si très long (max-width via classe).
  - Bordure `border-border`, fond `bg-surface`, padding `p-2`, `rounded`.

#### Grille de tuiles
- Wrapper qui prend `programs: string[]` et rend la grille `grid grid-cols-3 gap-2`. Une tuile par programme, dans l'ordre du tableau d'origine.
- Si `programs.length === 0` → retourne `null`.

#### Intégration header
- Dans `LabTestMeanHeader.tsx`, restructurer la zone autour de la mini-carte :
  - Avant : `<CountryMapIcon>` seul, en bloc.
  - Après : `<div className="flex items-start gap-4">` contenant `<CountryMapIcon>` à gauche et la grille de tuiles à droite.
- La hauteur naturelle de la mini-carte (140 px) sert de référence — la grille de tuiles s'aligne en haut (`items-start`), donc si plus de tuiles que la carte ne fait haut, la grille déborde sous la carte mais pas sur le bloc `CODE` (qui suit en flex normal).

#### Section Projects
- `<ProgramsSection>` retiré (renommé `<ProjectsSection>`) ; le rendu interne devient une seule rangée projets, sans rangée programs. Le titre passe de `Programs · Projects` à `Projects`.

### Non-Functional Requirements
- **Pas de nouvelle dépendance npm** (icône SVG inline, comme tous les autres).
- **Theme** : héritage `currentColor` → mode clair/sombre OK sans config.
- **Accessibilité** : icône `aria-hidden`, label texte porte le sens. Pas de rôle particulier sur la grille (présentation pure).
- **Responsive** : la grille reste à 3 colonnes maximum sur tous les breakpoints. Sur mobile, le `flex items-start gap-4` du parent passe naturellement en colonne (à confirmer en `flex-col lg:flex-row` selon le résultat visuel).

## Scope

### In Scope
- Créer `components/icons/AircraftIcon.tsx`.
- Créer `components/AircraftProgramTile.tsx` (la tuile unitaire).
- Créer `components/AircraftPrograms.tsx` (la grille — wrap de N `<AircraftProgramTile>`).
- Modifier `components/LabTestMeanHeader.tsx` pour mettre `<CountryMapIcon>` et `<AircraftPrograms>` côte à côte.
- Modifier `components/detail/ProgramsSection.tsx` : devient `ProjectsSection` (même fichier renommé), affiche uniquement `m.projects`.
- Mettre à jour l'import + le render dans `app/labtestmean/[externalId]/page.tsx`.

### Out of Scope
- Différencier les pictos par famille avion (A320 silhouette différente de l'A380, etc.) — V2 si besoin métier.
- Tooltip / hover state sur les tuiles (info plein nom du programme : "Single Aisle", "Long Range A330", etc.) — recommandé pour V2.
- Click-through depuis une tuile vers une vue filtrée du catalogue par programme — V2.
- Affichage des programmes sur la grille catalogue / popup map — hors scope (la fiche reste l'endroit dédié).
- Couleur par programme (rouge pour DD-A380, etc.) — pas en V1, l'uniformité du visuel est intentionnelle.
- Changement de layout sur la grille du bas (autres sections inchangées).

## Affected Areas
- **Créer** :
  - `components/icons/AircraftIcon.tsx`
  - `components/AircraftProgramTile.tsx`
  - `components/AircraftPrograms.tsx`
- **Modifier** :
  - `components/LabTestMeanHeader.tsx` — restructuration mini-carte + tuiles côte à côte.
  - `components/detail/ProgramsSection.tsx` → renommer en `ProjectsSection.tsx`, retirer la rangée programs, renommer le titre.
  - `app/labtestmean/[externalId]/page.tsx` — import + usage de `<ProjectsSection>`.
- **Non touché** :
  - `lib/types.ts`, `lib/atom-api.ts`, `lib/labtestmean-adapter.ts` — aucun changement domaine. `m.programs` reste un `string[]`.
  - Catalogue `/`, map `/map`, fiche pour la partie autre que header / programs section.

## Edge Cases
- **`m.programs` vide** → bloc `<AircraftPrograms>` retourne `null`. La mini-carte occupe sa place naturelle, pas de zone vide à droite.
- **1 seul programme** → 1 tuile dans la grille `grid-cols-3` ; les 2 colonnes droites restent vides. Acceptable visuellement.
- **2 programmes** → 2 tuiles, troisième colonne vide.
- **3 programmes** → grille pleine sur 1 ligne.
- **4-6 programmes** → 2 lignes, 3 + 3 ou 3 + N. Hauteur du bloc dépasse celle de la mini-carte (140 px) → débord vers le bas, le bloc `CODE` se décale d'autant. Acceptable.
- **Plus de 6 programmes** → 3+ lignes. Aucun banc connu ne dépasse 4 programmes aujourd'hui mais la grille gère.
- **Code programme vide ou null** dans le tableau → tuile rendue avec label vide. Hypothèse : l'adapter ne produit jamais de codes vides ; si ça arrive, c'est une bug à investiguer côté backend, pas à masquer côté UI.
- **Code très long** (ex: hypothétique `XWB-A350-NEO-2030`) → tronqué via `truncate` Tailwind sur le label, le code complet reste lisible via le DOM (pas de `title` natif en V1, à ajouter si on veut un tooltip).
- **Mobile** : la mini-carte (200 px de large) + la grille de tuiles (~3 × 64 = 192 px + gaps) totalise ~410 px → ne tient pas en colonne mobile typique. Le parent doit basculer en `flex-col` sous `lg`. Mini-carte en haut, tuiles en dessous.

## Open Questions
- **Faut-il un titre / label** au-dessus de la grille de tuiles (genre `PROGRAMS` en mono uppercase comme les autres labels) ? Recommandation : oui, pour cohérence avec `LOCATION` / `CODE`. Le label rend le bloc auto-explicatif, surtout pour un user qui ne devine pas que ces tuiles sont des programmes avion. => oui
- **Tooltip avec le nom complet** ("SA" → "Single Aisle / A320 family") au survol ? Recommandation : V2. Acceptable en V1 d'avoir le code seul, le contexte métier est implicite pour l'audience cible. => mettre le tooltip
- **Quoi faire si tous les pictos avion identiques ne sont pas distinctifs** ? Si l'utilisateur ressent que tout se ressemble, on basculera en V2 vers une palette (couleur par programme, ou silhouettes différenciées). À mesurer en usage. => identique pour l'instant
- **`<ProgramsSection>` renommé `<ProjectsSection>` ou supprimé** si `m.projects` est aussi vide la plupart du temps ? Recommandation : renommer (pas supprimer) — la section continue d'avoir un sens même vide via "None".=> supprimé la section

## Acceptance Criteria
- [ ] Sur une fiche avec ≥ 1 programme avion, une grille de tuiles apparaît **à droite de la mini-carte** dans le header.
- [ ] Chaque tuile contient un **pictogramme avion** au-dessus et le **code du programme** en label en-dessous.
- [ ] La grille a **3 tuiles par ligne maximum**, déborde sur ligne suivante si plus.
- [ ] Sur une fiche **sans programme**, aucun bloc à droite de la mini-carte, header reste compact.
- [ ] La rangée "Programs" disparaît de l'ancienne section bas-de-page ; cette section ne montre plus que les Projects et est titrée `Projects`.
- [ ] Mode clair / sombre : tuiles lisibles des deux côtés, icône s'adapte via `currentColor`.
- [ ] Aucune nouvelle dépendance npm. Build OK, types stricts OK, pas de régression sur la grille catalogue ni la map.
- [ ] Responsive : sur mobile (sous `lg`), la mini-carte et les tuiles s'empilent verticalement plutôt que de déborder horizontalement.
