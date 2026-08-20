# Feature Spec: Visionneuse 360° pour photos 3D

## Summary
- Sur la fiche détail `/labtestmean/[id]`, détecter automatiquement les **photos panorama 360°** parmi les `documentRefs` du LTM via la convention de nommage **`name contient "3D"`** (insensible à la casse), exactement comme la convention `SELECTED` existante.
- Quand l'utilisateur **sélectionne** une telle photo dans la galerie, ne plus la rendre comme un `<img>` plat (qui produirait une équirectangulaire étirée 2:1 illisible) mais comme un **viewer 360° interactif** : drag souris pour pivoter, molette pour zoomer, mode plein écran disponible.
- **Marquer les vignettes** panorama dans la grille des miniatures avec un petit badge "360°" pour signaler qu'elles sont interactives.
- Réutiliser **exactement la stack validée** dans `C:\projects\airbus\test\view 3D\panorama-app` : `react-photo-sphere-viewer` (v6.x) + `@photo-sphere-viewer/core` + `three`. Chargement via `next/dynamic({ ssr: false })` pour ne pas alourdir le bundle initial et parce que three.js exige WebGL côté navigateur.

## Motivation
- Les bancs s'étendent souvent sur plusieurs racks / pièces / niveaux. Une seule photo 2D ne couvre qu'un angle ; un panorama 360° permet de comprendre l'**environnement complet** sans déplacement physique. C'est la valeur ajoutée principale de la fiche pour des utilisateurs distants (ingénieurs, project managers, audits).
- Le backend ATOM distingue déjà ces images via une **convention de nommage** côté `documentRefs.name`. La feature `photos-labtestmeans-depuis-api` l'utilise déjà pour repérer la SELECTED ; on étend la logique sans toucher au DTO ni à l'API.
- Une PoC autonome existe (`panorama-app/`) qui prouve que la lib choisie fonctionne sous Next.js 15 + React 19. Pas besoin d'évaluer d'alternative.

## Décisions (arbitrées)
- **Convention de détection** : `name?.toUpperCase().includes("3D")`. Identique à la logique SELECTED. Un underscore, espace, ou tiret entourant "3D" n'a aucune incidence (substring match).
- **Stack** : `react-photo-sphere-viewer` (^6.2.3) + `@photo-sphere-viewer/core` + `three` ajoutés en `dependencies`. PAS de dépendance dev, ces packages sont au runtime.
- **Chargement** : `dynamic(() => import("./PanoramaViewer"), { ssr: false })` exactement comme la PoC. Le bundle initial reste léger (three.js ne pèse que sur les fiches qui rendent un panorama).
- **Composition du type `Photo`** : ajouter un flag indépendant `is360: boolean`. Indépendant de `kind: "selected" | "other"` — une photo peut être à la fois SELECTED et 360° (les deux conventions sont orthogonales). L'adapter calcule les deux flags séparément.
- **Rendu remplaçant l'image** : le viewer occupe la même boîte que l'image principale de la galerie (ratio `aspect-video`, mêmes coins arrondis). Pas d'overlay modal, pas de plein écran auto — l'utilisateur déclenche le plein écran via la barre du viewer s'il le souhaite.
- **Vignette** : badge "360°" en haut à droite, fond `bg-accent`, texte `text-accent-fg`, taille très compacte (`text-[10px] font-mono`). Tooltip natif `title="Image 360°"`.
- **Cover sur la grille / popup map** : reste un `<img>` plat même si la SELECTED est 3D. Limitation connue (équirectangulaire affichée stretched), tolérable en V1. Une amélioration consisterait à préférer une non-3D pour le cover quand la SELECTED est 3D — voir Open Questions.
- **Pas de fallback custom** sur erreur de chargement : `react-photo-sphere-viewer` affiche son message natif (`loadingTxt="Chargement…"`). Si le binaire n'est pas une équirectangulaire valide, on accepte le rendu cassé en V1.

## Requirements

### Functional Requirements

#### Détection
- Adapter (`lib/labtestmean-adapter.ts`) marque `is360 = true` pour chaque `Photo` issue d'un `DocumentRef` dont `name` (case-insensitive) contient `"3D"`.
- Un même `DocumentRef` peut être SELECTED **et** 360° : les deux flags coexistent.

#### Galerie détail
- Le composant `Gallery` rend, pour la photo active :
  - **Image plate** (`<img>` actuel) si `current.is360 === false`.
  - **Viewer 360°** si `current.is360 === true`. Le viewer reçoit la même `current.url` que l'`<img>` aurait reçue (= URL du proxy `/api/photo/<id>?u=...` — pas de différence).
- Les vignettes panorama portent un **badge "360°"** visible. Cliquer dessus active la photo et bascule l'image principale en mode viewer.

#### Performance / UX
- Première ouverture d'une fiche **sans** photo 3D sélectionnée → 0 KB de three.js téléchargé. Le bundle viewer ne charge que quand l'utilisateur clique sur une vignette 3D.
- Quand l'utilisateur revient sur une photo 2D après avoir vu une 360°, le viewer est démonté proprement (pas de fuite de canvas WebGL).
- Le viewer occupe le même espace que l'image plate (pas de saut de layout au switch).

### Non-Functional Requirements
- **Compatibilité** : navigateurs modernes avec WebGL (Chrome, Edge, Firefox, Safari récents). Pas de fallback IE.
- **Accessibilité** : le viewer fournit ses propres contrôles clavier (flèches + +/- pour zoom). Le badge `360°` a un `aria-label="Image 360°"`. Pas de support spécifique au-delà du natif de la lib.
- **Bundle** : three.js + photo-sphere-viewer ≈ 200-250 KB gzip. Acceptable car chargement à la demande.
- **Aucun changement back / API** : la convention `name contient "3D"` est interprétée côté front uniquement. Le proxy `/api/photo/[id]` ne change pas, il sert toujours du binaire opaque.

## Scope

### In Scope
- Ajout des dépendances `react-photo-sphere-viewer`, `@photo-sphere-viewer/core`, `three` (+ `@types/three` en devDependencies).
- Extension du type `Photo` avec `is360?: boolean`.
- Adaptation de `lib/labtestmean-adapter.ts` pour calculer `is360`.
- Création de `components/PanoramaViewer.tsx` (client + SSR off) reprenant la signature et la config de la PoC.
- Création de `components/PanoramaClient.tsx` (wrapper `dynamic(...)`).
- Modification de `components/Gallery.tsx` :
  - Branchement conditionnel `<img>` vs `<PanoramaClient>`.
  - Badge "360°" sur les vignettes correspondantes.

### Out of Scope
- Migration de toutes les `<img>` vers `next/image` — refactor distinct.
- Lightbox / overlay plein écran custom (le bouton plein écran natif du viewer suffit).
- Hotspots / annotations interactives sur le panorama (pins de positionnement, étiquettes machines).
- Pré-chargement / pré-cache des binaires panorama au build.
- Choix d'un autre viewer (e.g. Marzipano, Pannellum) — décision verrouillée sur `react-photo-sphere-viewer` en V1.
- Cover du catalogue qui choisirait une non-3D si la SELECTED est 3D — voir Open Questions.
- Visualisation 360° dans le popup de la carte `/map` — hors scope.

## Affected Areas
- **Créer** :
  - `components/PanoramaViewer.tsx` — wrap direct de `<ReactPhotoSphereViewer>` avec config héritée de la PoC.
  - `components/PanoramaClient.tsx` — `dynamic(() => import("./PanoramaViewer"), { ssr: false })`.
- **Modifier** :
  - `package.json` — ajouter les 3 (ou 4 avec les types) packages.
  - `lib/types.ts` — `Photo.is360?: boolean`.
  - `lib/labtestmean-adapter.ts` — calcul du flag dans `toPhotos()`.
  - `components/Gallery.tsx` — rendu conditionnel + badge sur les vignettes.
  - `_specification/vibe coding/integration-api-labtestmeans.md` — note sur la convention "3D" en complément de "SELECTED".
- **Non touché** :
  - DTO `LabTestMeanDto`, route `app/api/photo/[id]/route.ts`, page `app/labtestmean/[id]/page.tsx`, header `LabTestMeanHeader`.
  - `LabTestMeanCard`, `MapView`, `MapClient`, `CatalogueClient`, `FilterBar` : pas concernés.

## Edge Cases
- **Photo 3D non sélectionnée** : reste vignette avec badge, pas de viewer chargé.
- **LTM avec uniquement des photos 3D** : la photo active à l'arrivée sur la fiche est par construction une SELECTED — si elle est aussi 3D, le viewer charge dès l'ouverture de la fiche. Acceptable.
- **`name` qui contient `"3D"` par accident** (ex. `BUILDING_3D_PRINTING.jpg`) → traitée comme panorama. Faux positif rare, accepté.
- **`name` null** → `is360 = false` (pas de match).
- **Photo 3D dont le binaire n'est pas équirectangulaire** → la lib affiche son rendu cassé. À corriger côté backend, pas côté front.
- **Resize de la fenêtre / changement d'orientation** : la lib gère le resize automatiquement.
- **Démontage du viewer** au switch de photo 2D → la lib expose une cleanup ; le `useEffect` de React-photo-sphere-viewer s'en charge. À vérifier qu'il n'y a pas de canvas zombie en DOM via DevTools.
- **Mode sombre / clair** : le viewer a son propre fond (rendu de la sphère) qui n'est pas affecté par le thème. Les contrôles natifs sont en blanc — lisibilité OK des deux côtés.

## Open Questions
- **Cover catalogue quand la SELECTED est 3D** : faut-il préférer la première non-3D pour le rendu de carte / popup ? Coût : enrichir la logique de `coverPhoto` dans l'adapter. Recommandation : V1 = on garde la SELECTED telle quelle ; à reprendre seulement si plusieurs LTM réels sont concernés et l'effet visuel est dérangeant. => non gardé SELECTED
- **Plein écran par défaut** : le viewer démarre-t-il en plein écran quand l'utilisateur clique sur une vignette 360° ? Recommandation : non, garder la même boîte que l'image plate ; l'utilisateur déclenche le plein écran via le bouton du viewer. Moins surprenant. => non garder la même boite
- **Indicateur visuel pendant le chargement de three.js** au premier clic 360° : skeleton ou loadingTxt natif ? Recommandation : `loadingTxt="Chargement…"` natif, suffisant. => suivre recommendation
- **Préférer une miniature 2D** comme thumbnail d'une photo 3D (au lieu d'utiliser l'équirectangulaire stretched dans la grille des vignettes) ? Recommandation : V1 = vignette équirectangulaire stretched + badge ; ça reste lisible et uniformise la grille.  => suivre recommendation

## Acceptance Criteria
- [ ] Sur une fiche `/labtestmean/[id]` qui a au moins une photo dont `name` contient `"3D"` : la vignette correspondante porte un badge `360°` clairement visible.
- [ ] Cliquer sur cette vignette remplace l'image principale par un viewer 360° interactif (drag, zoom, plein écran).
- [ ] Le viewer ne se charge pas tant qu'aucune photo 360° n'est active (vérifier dans DevTools Network qu'aucun chunk `react-photo-sphere-viewer` ou `three` n'est téléchargé sur une fiche sans 3D ouverte).
- [ ] Revenir sur une photo 2D après une 3D affiche bien l'`<img>` plat ; aucun canvas WebGL résiduel dans le DOM.
- [ ] Le ratio de la zone d'affichage (image plate ou viewer) est constant : aucun saut de layout entre les deux modes.
- [ ] Mode clair et mode sombre : viewer et badge restent lisibles ; contrôles du viewer fonctionnels.
- [ ] `npm run build` OK, types stricts OK, bundle initial inchangé pour les fiches sans 3D.
- [ ] Aucune modification du backend, de l'API frontend `/api/photo/[id]`, du popup carte ni de la grille catalogue.
