# Feature Spec: Photos des Lab Test Means depuis l'API

## Summary
- Récupérer les **vraies photos** des lab test means via l'API `atom-synchronizer-dev` au lieu des 4 SVG placeholder hardcodés dans `lib/labtestmean-adapter.ts`.
- Source : champ **`documentRefs`** déjà renvoyé par `GET /api/infos/labtestmeans`. Sont des photos les éléments dont **`documentType == "image"`**. Celui dont le **`name` contient `"SELECTED"`** est la **photo principale** (utilisée comme cover sur la grille `/`, le popup de la carte, et le hero de la fiche détail).
- Le binaire image n'est pas inclus dans le JSON : il faut un appel séparé à **`GET /api/infos/resource`** (paramètres : `id` du `documentRef` + son `url`) qui renvoie le contenu binaire de l'image.
- Pour ne pas exposer la base URL backend au navigateur ni dépendre de CORS, introduire un **proxy Next.js** `/api/photo/[id]` qui appelle `/api/infos/resource` côté serveur et streame le binaire avec un cache-control adapté.
- Garder un **fallback gracieux** sur un SVG placeholder local pour les LTM qui n'ont aucune image (ou aucune SELECTED).

## Motivation
- Les 4 SVG bundled (`public/covers/cover-1..4.svg`) avaient été acceptés comme fallback de la V1 d'intégration API, en attendant que les photos arrivent. Aujourd'hui le backend les expose et les fournir donne enfin une identité visuelle réelle à chaque banc — c'est la première chose que voient les utilisateurs sur la grille.
- La distinction `SELECTED` / autres est portée par le backend : il faut la respecter, sinon la "cover" deviendrait la première image trouvée, ce qui peut être un schéma technique ou un dossier d'archives, pas la photo représentative.
- L'endpoint `/api/infos/resource` impose un appel image par image : un proxy Next côté serveur évite (a) d'exposer `ATOM_API_BASE_URL` au client, (b) de gérer un éventuel besoin d'auth backend depuis le navigateur, (c) de devoir whitelister un nouveau hostname dans `next.config.mjs`.

## Décisions (arbitrées)
- **Cover** = la première image dont `name` contient `"SELECTED"` (insensible à la casse). Si plusieurs SELECTED, la première gagne. Si aucune SELECTED mais au moins une image → fallback sur la **première image** de `documentRefs` filtré. Si aucune image → SVG placeholder local actuel.
- **Galerie** détail = toutes les images (`documentType == "image"`), SELECTED en tête, les autres ensuite, dans l'ordre renvoyé par l'API. Pas de tri alphabétique sur le `name`.
- **Proxy Next** = nouveau handler `app/api/photo/[id]/route.ts`. Il accepte un `id` de `documentRef` et un `url` (query string `?u=…`) et appelle `${ATOM_API_BASE_URL}/api/infos/resource?id=…&url=…`. Streame le `Content-Type` et `Content-Length` du backend. `Cache-Control: public, max-age=86400, immutable` (les `documentRefs` sont identifiés par UUID donc stables — si une photo change, son id change).
- **Type frontend `Photo`** étendu avec un champ `kind: "selected" | "other"` pour permettre l'ordre dans la galerie sans repérer "SELECTED" deux fois. Le `url` du type `Photo` pointe désormais vers le **proxy** (`/api/photo/<id>?u=<encoded>`), pas vers le backend.
- **Volume** : on ne préfetche **pas** toutes les images au build. Chaque image est chargée au moment où le card / la fiche est rendu, avec `loading="lazy"` (déjà en place sur la card). La SELECTED apparaît au premier scroll, les autres images du gallery seulement à l'ouverture de la fiche.
- **Fallback en cas d'échec** : si le proxy renvoie une erreur 4xx/5xx ou si l'image ne peut pas être décodée, on affiche le SVG placeholder local (gestion via `onError` sur les `<img>` existants). Pas de retry automatique.
- **Pas de migration vers `next/image`** dans cette itération — on garde les `<img>` natifs déjà utilisés partout. La transition vers `next/image` est un refactor distinct.

## Requirements

### Functional Requirements

#### Récupération des refs photos
- Étendre le DTO `LabTestMeanDto` (`lib/atom-api.ts`) avec un champ optionnel `documentRefs: DocumentRef[] | null` où `DocumentRef = { id: string; name: string; documentType: string; url: string }`. Les autres types possibles (`pdf`, `link`, …) sont ignorés en V1.
- Adapter (`lib/labtestmean-adapter.ts`) :
  - Filtrer `documentRefs` sur `documentType.toLowerCase() === "image"`.
  - Repérer la SELECTED via `name.toUpperCase().includes("SELECTED")`.
  - Construire le tableau `photos: Photo[]` avec `{ url: "/api/photo/<id>?u=<encoded>", alt: name, kind: "selected" | "other" }`.
  - Construire `coverPhoto: string` = url de la SELECTED, sinon url de la première image, sinon `/covers/cover-1.svg` (fallback existant).

#### Proxy Next côté serveur
- Nouveau handler `app/api/photo/[id]/route.ts`, runtime `nodejs` (pas edge — on streame du binaire, et on veut le même `ATOM_API_BASE_URL` que l'API LabTestMeans).
- Méthode `GET`, paramètres : `id` (path param) + `u` (query, l'`url` du `documentRef` URL-encodée).
- Appelle `fetch(${ATOM_API_BASE_URL}/api/infos/resource?id=<id>&url=<u>)` avec `next: { revalidate: 86400 }`.
- Renvoie la réponse en streaming avec `Content-Type` et, si fourni, `Content-Length` recopiés du backend. `Cache-Control: public, max-age=86400, immutable`.
- En cas d'erreur backend, renvoie **`404`** (pas 500) avec un body court — le client utilisera `onError` pour basculer sur le placeholder.
- Validation : `id` doit matcher un UUID (regex stricte) ; `u` doit commencer par `http://` ou `https://`. Sinon → `400`. Pas de risque d'open-redirect : on ne fait que `fetch`, on ne redirige pas.

#### Affichages affectés
- **Carte catalogue** (`components/LabTestMeanCard.tsx`) : `m.coverPhoto` reste l'API consommée — change de contenu, pas d'API. Ajouter `onError` qui bascule vers `/covers/cover-1.svg` si l'image ne charge pas.
- **Popup carte** (`components/MapView.tsx`) : idem — `selected.coverPhoto` rendu en `<img>`. Même fallback `onError`.
- **Galerie détail** (`components/Gallery.tsx`) : reçoit `m.photos` ; SELECTED automatiquement en première position (rendue en grand par défaut). Garder le rendu actuel (vignettes en grille en dessous). `onError` sur les vignettes.
- **Hero détail** (`components/LabTestMeanHeader.tsx`) : pas concerné (n'affiche pas d'image).

### Non-Functional Requirements
- **Performance grille** : sur la page `/` paginée 6/page, on charge au plus **6 covers SELECTED** par vue. Avec `loading="lazy"` déjà en place et le cache navigateur sur le proxy (24 h), la deuxième visite est instantanée.
- **Performance carte** : `/map` affiche les markers, pas les covers — pas d'impact réseau direct. Le popup charge la cover quand l'utilisateur clique sur un marker (1 image / clic).
- **Confidentialité** : le client ne voit jamais `ATOM_API_BASE_URL` ni l'`url` brute du `documentRef` exposée par le backend (elle reste portée en query param mais le hostname résolu est celui du proxy, pas du backend).
- **Accessibilité** : `alt` recopié depuis `name` du `documentRef` (souvent `SELECTED_<bench>.jpg`). Si vide, fallback sur `name` du LTM. Pas d'`alt=""` sauf cas explicite décoratif.

## Scope

### In Scope
- Extension du DTO `LabTestMeanDto` avec `documentRefs`.
- Logique adapter pour photos + cover.
- Nouveau handler `app/api/photo/[id]/route.ts`.
- Mise à jour des composants `LabTestMeanCard`, `MapView`, `Gallery` pour le `onError` fallback.
- Mise à jour du fichier `_specification/vibe coding/integration-api-labtestmeans.md` pour refléter que les photos viennent maintenant de l'API (et plus du dossier `public/covers/`).

### Out of Scope
- Migration `<img>` → `next/image` (refactor séparé).
- Préfetch des photos au build, génération de versions resized, format `webp`/`avif` automatique.
- Upload / édition de photos depuis le frontend (pas d'endpoint backend en `POST` aujourd'hui).
- Lightbox / zoom / fullscreen sur la galerie (la galerie reste son comportement actuel : grande image + vignettes).
- Tri / filtrage sur les images PDF, schémas, plans (`documentType != "image"`) — totalement ignorés en V1.
- Authentification backend pour `/api/infos/resource` — on suppose la même posture que `/api/infos/labtestmeans` (pas d'auth en dev).

## Affected Areas
- **Créer** :
  - `app/api/photo/[id]/route.ts` — proxy serveur vers `/api/infos/resource`.
- **Modifier** :
  - `lib/atom-api.ts` — ajouter `DocumentRef` et `documentRefs` au DTO.
  - `lib/labtestmean-adapter.ts` — extraction images, repérage SELECTED, construction `photos[]` et `coverPhoto`. Le bloc `COVERS` hardcodé n'est gardé que comme constante de fallback (`PLACEHOLDER_COVER = "/covers/cover-1.svg"`).
  - `lib/types.ts` — `Photo` peut prendre un champ optionnel `kind?: "selected" | "other"`.
  - `components/LabTestMeanCard.tsx` — `onError` → swap vers placeholder.
  - `components/MapView.tsx` — `onError` sur la cover du popup.
  - `components/Gallery.tsx` — `onError` sur la grande image et les vignettes.
  - `_specification/vibe coding/integration-api-labtestmeans.md` — section "Photos V1" : remplacer par "Photos V2 = `documentRefs.SELECTED` via proxy `/api/photo/[id]`".
- **Non touché** :
  - `next.config.mjs` — pas de nouveau hostname à whitelister (le proxy reste sur le même origin que l'app).
  - `app/labtestmean/[id]/page.tsx` — la fiche reçoit déjà `m.photos`, le contenu change mais pas le rendu.
  - Carte / filtre / pagination — totalement orthogonaux.
  - `Dockerfile` / `Jenkinsfile` / Helm — l'image runtime sert déjà `app/api/*`, rien à ajouter.

## Edge Cases
- LTM avec `documentRefs == null` ou tableau vide → cover = placeholder, `photos[]` vide → galerie affiche le placeholder texte "No photos" actuel.
- LTM avec uniquement des `documentRefs` non-image (PDF, lien) → idem, traités comme s'il n'y avait pas d'image.
- LTM avec plusieurs `name` contenant "SELECTED" → prendre la première dans l'ordre du tableau ; ne pas dédupliquer ni warner (le backend gère son nommage).
- LTM dont la SELECTED échoue à charger côté navigateur → `onError` swap vers placeholder. Les autres vignettes restent intactes.
- `/api/infos/resource` répond 404 / 500 / timeout → le proxy renvoie 404, le `onError` fait son job côté navigateur. Pas de log côté serveur en V1 (à ajouter quand on aura un canal de logs centralisé).
- `name` vide ou `null` sur un `documentRef` image → le détecter pour SELECTED retourne `false` ; la photo bascule en `kind: "other"`. `alt` retombe sur le `name` du LTM.
- `id` du `documentRef` non UUID (improbable mais possible) → on construit quand même l'URL du proxy ; côté proxy, validation regex → 400 → `onError` → placeholder.
- `url` du `documentRef` avec caractères spéciaux non encodés → on `encodeURIComponent` côté adapter avant de la coller dans `?u=`.

## Open Questions
- **Faut-il un sentinel "no image" différent du fallback "image cassée"** ? Aujourd'hui les deux mènent au même placeholder. Recommandation : non, garder simple en V1 ; un état dégradé visuellement distinct n'apporte rien tant qu'on n'a pas de copy "Image manquante". => suivre recommendation
- **Cache `Cache-Control: immutable` est-il safe** ? Dépend du backend : si l'`id` d'un `documentRef` peut être réutilisé pour un contenu différent, cassé. Hypothèse en V1 : un `id` UUID = une ressource immuable. À valider auprès de l'équipe backend ATOM. =>  un `id` UUID = une ressource immuable
- **Le proxy doit-il forwarder les headers d'auth** quand l'auth backend sera en place ? Pas de réponse aujourd'hui — à reprendre quand l'auth atterrit (sans doute via `next-auth` côté server component, et le proxy lit le token de la session). => pas maintenant
- **`alt` à partir du `name` du `documentRef`** est-il assez explicite pour l'accessibilité ? Probablement `SELECTED_2CINS_overview.jpg` est moins parlant que "Vue principale du banc 2CINS". Acceptable en V1, à reprendre si on a un champ `description` côté `documentRef`. =>  suivre recommendation

## Acceptance Criteria
- [ ] La grille `/` affiche, pour chaque card, **la photo SELECTED** du backend si elle existe, sinon une image fallback.
- [ ] Le popup `/map` affiche la même photo SELECTED que la card.
- [ ] La fiche `/labtestmean/[id]` affiche **toutes les images** (`documentType == "image"`), SELECTED en première position dans la galerie.
- [ ] Aucune `<img>` du frontend ne pointe directement vers `localhost:8080/atom-synchronizer-dev` — toutes passent par `/api/photo/[id]`.
- [ ] `ATOM_API_BASE_URL` n'apparaît pas dans le HTML rendu côté navigateur.
- [ ] Une LTM sans `documentRefs` ou sans image → fallback placeholder, pas de page cassée.
- [ ] Une image qui échoue à charger côté backend → fallback placeholder via `onError`, pas d'image cassée affichée.
- [ ] Les images sont mises en cache navigateur (Cache-Control 24 h immutable).
- [ ] Build Next OK, types stricts OK, pas de régression sur les filtres / pagination / map.
- [ ] La spec `integration-api-labtestmeans.md` est mise à jour pour refléter la nouvelle source de photos.
