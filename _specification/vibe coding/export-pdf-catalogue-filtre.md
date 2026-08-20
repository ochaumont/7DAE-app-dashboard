# Feature Spec: Export PDF Catalogue Filtré

## Summary
- Ajouter un bouton **"Export PDF"** dans la barre d'outils du catalogue (`/`) qui génère un PDF de tous les bancs **actuellement sélectionnés par les filtres** appliqués (peu importe la pagination).
- Structure du PDF :
  1. **Page de garde** : titre, logo Airbus, date d'export, nombre de bancs inclus, résumé des filtres actifs.
  2. **Sommaire** (1-N pages selon le volume) : liste de tous les bancs par `name` + `externalId`, chaque ligne étant un **lien cliquable interne** au PDF qui amène à la page détail correspondante. Chaque ligne propose aussi un **lien externe** vers `/labtestmean/[externalId]` du dashboard pour rebondir vers la fiche en ligne.
  3. **Une page par banc** : carte d'identité du banc (photo de couverture, nom, code, statut, type, complexité, localisation, programmes avion, ATA, technical capabilities, dates de cycle de vie, manager).
- 100 bancs filtrés → PDF de ~104 pages (1 garde + 2-3 sommaire + 100 détails).

## Motivation
- Les ingénieurs et managers ont besoin de **partager** ou d'**archiver** une vue figée du catalogue après filtrage (ex. "tous les bancs A350 mothballés en Toulouse au 1er mai 2026").
- L'UI web est l'outil de consultation interactive ; le PDF est l'outil **offline / offline-friendly / signable / versionnable**.
- Le sommaire cliquable transforme le PDF en mini-catalogue navigable (anchors internes) et conserve un pont vers le dashboard live (URL absolues vers les fiches).
- Reuse maximum de la donnée déjà fetchée et adaptée pour le catalogue web — l'export PDF doit consommer le même domaine `LabTestMean`, pas reconstruire un autre modèle.

## Conseils d'implémentation (synthèse)

### Quelle librairie / quel template engine ?

Quatre options ont été comparées, recommandation forte sur la première :

1. **`@react-pdf/renderer`** ← **recommandation V1**
   - PDF construit en **React components** (`<Document>`, `<Page>`, `<Text>`, `<Image>`, `<Link>`, `<View>`) — approche déclarative type "template par composant", parfaitement alignée avec le style du projet.
   - **Liens internes** (anchor) supportés nativement via `id="banc-XYZ"` + `<Link src="#banc-XYZ">…</Link>` → besoin pivot du sommaire.
   - **Liens externes** via `<Link src="https://…/labtestmean/XYZ">` → besoin pivot des fiches en ligne.
   - Pure JS, **pas de dépendance native** (pas de Chromium, pas de poppler) → tient dans le Dockerfile actuel sans étape build supplémentaire.
   - Tourne **côté serveur** (Node) ou **côté client** (bundle ~500 KB) — V1 = serveur (route handler) pour ne pas alourdir le bundle catalogue.
   - Supporte la pagination automatique : un même `<Page>` qui déborde se découpe sur plusieurs pages physiques sans config.
   - Composants réutilisables : on peut écrire un `<BancDetailPage banc={…} />` qui rend une page complète, et le mapper sur le tableau de bancs filtrés.

2. **`pdfmake`** — déclaratif via objet JSON (`{content: [{text:…}, …]}`). Moins idiomatique en React, debug pénible, mais plus léger en bundle. Refusé : moins template-friendly.

3. **Puppeteer / `playwright` + `page.pdf()`** — rend une URL HTML existante en PDF. Fidélité visuelle parfaite (réutilise le CSS du dashboard tel quel), MAIS **impose Chromium** dans le runtime (binaire 200 MB+, étape build supplémentaire dans le Dockerfile, surface d'attaque élargie). Refusé pour V1, à reconsidérer si on a besoin de "WYSIWYG exact".

4. **`window.print()` + CSS `@page`** — natif navigateur, zéro dépendance. Refusé car : pas de liens internes anchored, mise en page fragile, l'utilisateur doit valider la boîte de dialogue système, pas de contrôle programmatique.

### Architecture serveur

- Nouvelle route handler `app/api/export/pdf/route.ts` (POST).
- Body de la requête : `{ externalIds: string[], filters?: FilterSnapshot }` — le client envoie la liste des IDs déjà filtrés (calculée dans `CatalogueClient`) plus un snapshot des filtres pour l'afficher en page de garde.
- Côté serveur : `await Promise.all(externalIds.map(getLabTestMeanByExternalId))` → tableau de `LabTestMean`. Réutilise la fonction existante (lib/labtestmeans.ts), bénéficie du `cache()` React si la même requête tourne plusieurs fois.
- Render : `import { renderToStream } from "@react-pdf/renderer"` + `<CatalogueExport benches={…} filters={…} />` → `Response` en streaming `application/pdf`.
- Filename via `Content-Disposition: attachment; filename="ltm-catalogue-2026-05-01.pdf"`.

### Architecture client

- Bouton "Export PDF" dans `CatalogueClient.tsx` (à droite de la barre de filtres ou en header).
- Au clic : POST vers `/api/export/pdf` avec les `externalIds` issus de `filteredItems` (avant pagination), download via `<a href={blobUrl} download="…">`.
- Pendant la génération : indicateur de chargement (peut prendre 5-15 s pour 100 bancs).

### Template PDF (architecture des composants)

Hiérarchie de composants React (chacun rendu en SVG-like par `@react-pdf/renderer`) :

- `<CatalogueExport benches filters>` (root `<Document>`)
  - `<CoverPage filters benchCount date />`
  - `<TableOfContentsPage benches />` (un par bloc de N entrées si plus d'une page)
  - `benches.map(b => <BenchDetailPage banc={b} key={b.externalId} />)`

Chaque sous-composant définit ses propres `StyleSheet.create({...})`. Aucun CSS Tailwind utilisable → **traduction nécessaire** des tokens couleur (`--color-fg`, `--color-accent`, etc.) dans une feuille de style PDF dédiée, alignée visuellement sur le dashboard mais réécrite pour `react-pdf`.

## Décisions (arbitrées)
- **Librairie** : `@react-pdf/renderer` (rendu serveur, template par composants React, liens internes/externes natifs).
- **Déclenchement** : bouton dans le header de `CatalogueClient`, à côté du compteur de résultats. Désactivé si `filteredItems.length === 0`.
- **Périmètre** : tous les bancs filtrés (pas seulement la page courante). Si l'utilisateur n'a pas de filtre actif → tous les bancs du catalogue (~318), avec confirmation modale "318 bancs vont être inclus, continuer ?".
- **Page de garde** : logo Airbus (réutilise `public/airbus-logo.svg`), titre `Lab Test Means — Catalogue Export`, date du jour, nombre de bancs, et un bloc "Filtres actifs" résumant les critères (ex. `Status: operational, mothballed · Country: France · Programs: SA, LR-A330`). Si aucun filtre → "Tous les bancs".
- **Sommaire** : tableau 3 colonnes — `[Name] [externalId] [→]`. Chaque ligne est un `<Link src="#bench-{externalId}">` (lien interne ancré sur l'ID de la page détail). Une 4ème colonne discrète propose `<Link src="{baseUrl}/labtestmean/{externalId}">⤴</Link>` (lien externe vers le dashboard live).
- **Page détail** : 1 page par banc, format A4 portrait. Layout fixe : photo de couverture (~30% hauteur), bloc identité (nom, externalId, status, type, complexité), bloc location (texte simple, pas la mini-carte SVG en V1), bloc programmes avion + ATA + capabilities (texte / liste de chips simples), bloc lifecycle (dates), bloc manager. **Pas** de description longue, pas de gallery, pas de panorama 360 — la fiche en ligne reste la source riche, le PDF est un résumé.
- **Photo** : une seule photo (cover, déjà calculée dans l'adapter via `coverPhoto`). Téléchargée via le proxy `/api/photo/[id]`. Si absente → `public/covers/no-ltm-photo.png`.
- **Liens externes** : URL absolue construite avec `process.env.NEXT_PUBLIC_APP_URL` (à ajouter), fallback `http://localhost:3001` en dev.
- **Mode clair uniquement** : le PDF utilise une palette claire fixe (blanc fond, noir texte, accents bleus pour les titres). Pas d'export en mode sombre — un PDF imprimé doit toujours être lisible sur papier.
- **Localisation textuelle** : les libellés ("Status", "Operational", "Bench Manager", etc.) en anglais (cohérent avec l'UI actuelle).

## Requirements

### Functional Requirements

#### Bouton d'export
- Bouton "Export PDF" dans `components/CatalogueClient.tsx`, visible quand au moins 1 banc filtré.
- Disabled state quand 0 résultat filtré.
- État loading pendant la génération (icône spinner, label "Generating PDF…", bouton non-cliquable).
- Sur succès : déclenche le téléchargement via Blob URL + `<a download>`.
- Sur erreur : toast/alert avec message d'erreur.

#### Endpoint serveur
- Route handler `app/api/export/pdf/route.ts` exposant un `POST`.
- Body JSON `{ externalIds: string[], filtersDescription?: string }`.
- Validation : `externalIds.length > 0`, `≤ 500` (garde-fou). Si invalide → 400.
- Récupère les bancs via `getLabTestMeanByExternalId(...)` en parallèle.
- Render le `<Document>` via `renderToStream` ou `renderToBuffer`.
- Réponse : stream `application/pdf` avec `Content-Disposition: attachment; filename="ltm-export-{YYYY-MM-DD}.pdf"`.

#### Composants PDF
- `components/pdf/CatalogueExport.tsx` : root `<Document>`, prend `benches: LabTestMean[]` et `filters: FilterSnapshot`.
- `components/pdf/CoverPage.tsx` : page 1 avec logo + titre + date + résumé filtres.
- `components/pdf/TableOfContents.tsx` : itère sur `benches`, rend un tableau de liens (interne + externe).
- `components/pdf/BenchDetailPage.tsx` : 1 banc → 1 page A4. `<Page id={`bench-${b.externalId}`}>` pour permettre l'ancrage du sommaire.
- `components/pdf/styles.ts` : `StyleSheet.create({...})` partagé (couleurs, fonts, tailles), aligné visuellement avec le dashboard mais réécrit en API `react-pdf`.

#### Filtres serializés
- Le client doit pouvoir transmettre une **description textuelle des filtres actifs** (ou un objet structuré) pour affichage en page de garde. V1 : description textuelle simple générée côté client (`"Country: France · Status: operational"`). V2 : objet structuré + rendu structuré côté serveur.

### Non-Functional Requirements
- **Nouvelle dépendance** : `@react-pdf/renderer` (~1 MB, bundle serveur uniquement). Acceptable étant donné le besoin et l'absence d'alternative équivalente.
- **Performance** : 100 bancs → < 15 s de génération côté serveur (tolerable). 500 bancs → < 60 s. Au-delà, refuser et demander un filtre.
- **Taille du PDF** : avec 1 photo par banc redimensionnée à ~600 px → ~50-80 KB par page → 100 bancs ≈ 6-10 MB. Acceptable pour download.
- **Streaming** : préférer `renderToStream` à `renderToBuffer` pour ne pas tenir tout le PDF en RAM.
- **Theme** : le PDF reste en palette claire fixe (pas de héritage `data-theme`).
- **Accessibilité** : PDF taggué accessibilité (texte sélectionnable, pas d'image de texte). `react-pdf` produit déjà un PDF avec texte vectoriel.
- **Sécurité** : la route serveur ne doit pas accepter d'URL d'image arbitraire. Réutilise le proxy `/api/photo/[id]` (mais côté serveur, on peut directement fetch la photo depuis l'URL backend connue, sans repasser par le proxy interne — gain de latence).

## Scope

### In Scope
- Ajouter `@react-pdf/renderer` à `package.json`.
- Créer `app/api/export/pdf/route.ts` (POST handler).
- Créer `components/pdf/` avec `CatalogueExport.tsx`, `CoverPage.tsx`, `TableOfContents.tsx`, `BenchDetailPage.tsx`, `styles.ts`.
- Modifier `components/CatalogueClient.tsx` pour ajouter le bouton "Export PDF" + logique de POST/download.
- Ajouter `NEXT_PUBLIC_APP_URL` à `.env.example` (et documenter dans `CLAUDE.md`).

### Out of Scope
- **Export d'une seule fiche** depuis la page détail (`/labtestmean/[externalId]`) — pourrait être V2 (réutiliserait le même `<BenchDetailPage>` solo).
- **Personnalisation du template** (choix des sections à inclure, branding alternatif) — V2.
- **Export Excel / CSV** — V2.
- **Préview du PDF avant download** — V2.
- **Signature numérique du PDF** — hors périmètre fonctionnel.
- **Internationalisation** (FR / EN bilingue) — V1 = anglais uniquement.
- **Mini-carte SVG du pays** dans la page détail PDF — la complexité du composant `CountryMapIcon` (SVG inline + paths générés) ne se transpose pas trivialement à `react-pdf` ; on affiche le nom du pays en texte. V2 si besoin.
- **Photos multiples** dans la page détail — V1 = cover seule.
- **Panorama 360°** — non transposable en PDF.
- **Email du PDF** — V2 (intégration mail dépendante de l'infra Airbus).

## Affected Areas
- **Créer** :
  - `app/api/export/pdf/route.ts`
  - `components/pdf/CatalogueExport.tsx`
  - `components/pdf/CoverPage.tsx`
  - `components/pdf/TableOfContents.tsx`
  - `components/pdf/BenchDetailPage.tsx`
  - `components/pdf/styles.ts`
- **Modifier** :
  - `components/CatalogueClient.tsx` — bouton + handler.
  - `package.json` — ajout `@react-pdf/renderer`.
  - `.env.example` (créer si absent) + `CLAUDE.md` — doc `NEXT_PUBLIC_APP_URL`.
- **Non touché** :
  - `lib/types.ts`, `lib/atom-api.ts`, `lib/labtestmean-adapter.ts` — l'export consomme le domaine existant.
  - Pages détail, map, header, autres composants UI.

## Edge Cases
- **0 banc filtré** → bouton désactivé, pas de tentative d'export.
- **Filtres sans aucune restriction** (= tous les bancs) → modale de confirmation "318 bancs, continuer ?". Permet d'éviter un export massif involontaire.
- **Banc sans photo** → utiliser `/covers/no-ltm-photo.png` (placeholder déjà géré par l'adapter).
- **Banc avec données manquantes** (pas de manager, pas de programmes, etc.) → afficher `—` ou masquer la sous-section au lieu de planter.
- **Photos non chargeables** (404, timeout) → fallback placeholder + log warn serveur. Ne pas bloquer le PDF entier.
- **Génération qui dépasse le timeout HTTP** (Vercel default 10s, AFTER potentiellement plus) → s'assurer que le runtime serveur a un timeout suffisant. V1 = on parie sur ≤ 60 s pour 500 bancs ; au-delà = refusé en amont.
- **Utilisateur change de page pendant la génération** → fetch annulé, blob jamais téléchargé, pas de fuite mémoire. Utiliser `AbortController`.
- **Caractères spéciaux dans les noms** (accents, kanji…) → `react-pdf` supporte mais la police par défaut (Helvetica) n'a pas tout le glyphe set. V1 = embarquer une font Unicode complète (ex. Noto Sans) si besoin.
- **Liens vers le dashboard cassés** (env var manquante) → fallback `http://localhost:3001` mais log warn pour signaler la mauvaise config en prod.

## Open Questions
- **Périmètre des informations affichées par fiche** : le user a évoqué "un certain nombre d'informations" sans préciser. Recommandation V1 : photo cover + identité (nom, code, status, type, complexité) + localisation + programmes + ATA + capabilities + lifecycle + manager. À valider visuellement après prototype. => oui pour la V1
- **Format de page** : A4 portrait recommandé. A4 paysage si on souhaite faire tenir une grille de mini-cartes par page (mais alors plus de pages). À trancher selon le rendu visuel. => A4 portrait
- **Inclusion du logo Airbus en page de garde** : OK techniquement (réutilise `public/airbus-logo.svg`). Vérifier les contraintes d'usage du logo Airbus pour un export externe.=> oui
- **Bilingue (FR/EN)** : V1 = anglais. Si demande FR ultérieure, prévoir un `lang` parameter. => anglais uniquement
- **Mise en cache des PDF** : pour une même combinaison de filtres demandée plusieurs fois, intéressant de mettre en cache 5-15 min. V1 = pas de cache (simplicité), V2 = cache LRU si charge le justifie. => pas de cache pour V1

## Acceptance Criteria
- [ ] Sur le catalogue, après application de filtres, un bouton "Export PDF" apparaît et indique le nombre de bancs qui seront inclus.
- [ ] Au clic, après une attente affichée, le navigateur télécharge un fichier `ltm-export-{date}.pdf`.
- [ ] Le PDF s'ouvre sur une **page de garde** avec titre, date, nombre de bancs, résumé des filtres.
- [ ] La (les) page(s) suivantes sont un **sommaire** listant tous les bancs (`name` + `externalId`).
- [ ] Cliquer sur une ligne du sommaire **navigue dans le PDF** vers la page détail correspondante.
- [ ] Cliquer sur le lien externe d'une ligne **ouvre la fiche du dashboard** (`/labtestmean/[externalId]`) dans un onglet.
- [ ] Chaque banc filtré a sa propre page détail avec son contenu identité.
- [ ] Sur un export sans filtre (tous les bancs) → modale de confirmation préalable.
- [ ] Mode clair imposé (palette fixe), aucune ambiguïté de lecture.
- [ ] Aucune régression sur la grille catalogue, la map, les fiches détail.
- [ ] `npm run build` OK, taille du bundle client inchangée (la lib PDF ne tombe que côté serveur).
