# Feature Spec: Organisation du Code et Guide de Maintenance

## Summary
- Document de référence technique expliquant le rôle de chaque répertoire du projet (`app/`, `components/`, `config/`, `e2e/`, `lib/`, `public/`, `scripts/`, `styles/`) et les conventions architecturales à respecter.
- Analyse des axes d'amélioration pour la maintenabilité : dette technique identifiée, composants candidats à la refactorisation, fichiers générés vs manuels, séparation des responsabilités.
- Guide à destination des nouveaux contributeurs et comme référence lors des revues de code ou des sessions de nettoyage.

## Motivation
- Le projet a évolué rapidement via du "vibe coding" ; certaines conventions ne sont pas documentées et risquent d'être violées par de futurs changements.
- Des composants comme `PanoramaClient.tsx` et `PanoramaViewer.tsx` existent dans `components/` alors que la fonctionnalité n'est pas activée dans les routes, ce qui crée de la confusion.
- La distinction entre les deux axes de theming (light/dark vs. route class) est non-intuitive et mérite une documentation claire pour éviter les régressions CSS.
- Faciliter l'onboarding et réduire le temps de compréhension pour toute personne touchant le code.

## Requirements

### Functional Requirements

#### Documentation de l'organisation des répertoires

**`app/`** — App Router Next.js 15
- Contient uniquement des Server Components (default) et des route handlers (`route.ts`).
- Chaque sous-répertoire correspond à un segment d'URL : `/`, `/map`, `/labtestmean/[externalId]`, `/health`, `/api/`.
- `layout.tsx` (racine) : injecte le script anti-FOUC theme, applique `theme-industrial-premium` sur `<body>`.
- `globals.css` : seul fichier CSS global — contient les tokens de couleur `[data-theme]` et les tokens structurels `:root`. Ne pas déplacer.
- `error.tsx` : boundary globale — détecte `AtomApiError` pour afficher un écran "backend indisponible".
- Règle : aucun `useState`/`useEffect` direct dans `app/` — déléguer à un `*Client.tsx` dans `components/`.

**`components/`** — Client Components React
- Tout composant qui utilise des hooks, des événements ou des APIs navigateur vit ici.
- Sous-répertoires actuels : `detail/` (sections de la page de détail), `icons/` (icônes SVG React), `pdf/` (rendu PDF via react-pdf).
- `MapView.tsx` : toujours importé via `dynamic(..., { ssr: false })` — ne jamais importer directement.
- `Avatar.tsx` : référence pour tout affichage de personne — ne pas créer d'alternative utilisant des services externes.
- Fichiers orphelins identifiés : `PanoramaClient.tsx`, `PanoramaViewer.tsx` — fonctionnalité non exposée dans les routes actives ; à décider : supprimer ou rattacher à une route.

**`lib/`** — Logique métier et utilitaires
- `atom-api.ts` : point d'entrée unique pour les appels HTTP vers le backend. Ne jamais `fetch` directement dans `app/` ou `components/`.
- `labtestmean-adapter.ts` : mapping DTO → modèle frontend et dérivation du statut. Toute règle métier sur les données LTM appartient ici.
- `types.ts` : interfaces TypeScript partagées. Source de vérité pour `LabTestMean`, `LabTestMeanDto`.
- `country-map-data.generated.ts` : **fichier généré** — ne pas éditer manuellement, relancer `scripts/extract-country-paths.mjs`.
- `useTheme.ts`, `usePageQuery.ts` : hooks custom réutilisables. Tout nouveau hook partagé va ici.

**`styles/themes/`** — Surcharges structurelles de thème
- `industrial-premium.css` : appliqué via classe `theme-industrial-premium` sur `<body>` (layout racine).
- `map-first.css` : appliqué via classe `theme-map-first` sur `<body>` (layout `/map`).
- Règle stricte : ces fichiers ne redéfinissent **jamais** les tokens couleur (`--color-*`). Uniquement des surcharges structurelles (spacing, glass effect, hover glow). Les couleurs viennent exclusivement des blocs `[data-theme="light/dark"]` dans `app/globals.css`.

**`public/`** — Assets statiques servis directement
- `airbus-logo.svg` : utilise `fill="currentColor"` — s'adapte automatiquement aux deux thèmes. Ne pas créer de variante light/dark.
- `covers/` : placeholders SVG pour les photos LTM (le DTO n'a pas encore de champ photo). À remplacer quand l'API exposera des URLs de photos.
- Ne pas stocker de données JSON ou de fixtures ici.

**`scripts/`** — Scripts de build / génération
- `extract-country-paths.mjs` : génère `lib/country-map-data.generated.ts` à partir des données SVG de pays.
- À exécuter manuellement si les données géographiques changent.
- Convention : tout script de génération one-shot va ici, jamais dans `lib/`.

**`config/`**
- Contient `.npmrc`. Très léger, ne pas y mettre de configuration applicative.

**`e2e/`** — Tests end-to-end Playwright
- `smoke.spec.ts` : test de fumée couvrant les routes principales.
- Config Playwright à la racine : `playwright.config.ts`.
- À étoffer progressivement pour couvrir les filtrages, la pagination, et la page de détail.

#### Axes d'amélioration identifiés

**Dette technique**
- `PanoramaClient.tsx` / `PanoramaViewer.tsx` : présents mais non référencés par aucune route active. Décision requise : supprimer ou rattacher.
- `app/api/photo/[id]/route.ts` : handler photo existant mais l'API backend ne retourne pas encore de photos. Documenter son état "en attente".
- `covers/` dans `public/` : placeholders à remplacer dès que le backend expose des URLs photos.

**Séparation des responsabilités**
- Certains composants dans `components/` sont très larges (ex. `CatalogueClient.tsx`) ; candidats à être découpés en sous-composants dans `components/catalogue/`.
- Les composants `pdf/` forment un sous-domaine cohérent — déjà bien isolés.

**Conventions à documenter explicitement**
- Règle "pas de mock JSON" : toutes les données viennent de l'API live.
- Règle "pas de services tiers pour les avatars" : uniquement `Avatar.tsx` avec initiales locales.
- Règle "routing URL-clean" : pas de paramètre `direction`, pas de segment `/bench/`, pas de segment `/d/`.
- Règle "confirmation avant tout appel HTTP" : s'applique à `curl`, `WebFetch`, et toute requête vers `atom-synchronizer-dev`.

## Scope

### In Scope
- Document de référence listant le rôle et les règles de chaque répertoire.
- Inventaire de la dette technique (fichiers orphelins, placeholders).
- Recommandations de refactorisation sans changement de comportement.
- Guide des deux axes de theming (light/dark vs. route class).
- Checklist d'onboarding pour un nouveau contributeur.

### Out of Scope
- Refactorisation effective du code (objet de tickets séparés).
- Ajout de nouvelles fonctionnalités.
- Changement de framework ou de structure de routage.

## Affected Areas
- `components/` : réorganisation potentielle en sous-répertoires thématiques.
- `components/PanoramaClient.tsx`, `components/PanoramaViewer.tsx` : décision de suppression ou activation.
- `app/globals.css` : clarification des responsabilités des sections CSS.
- `CLAUDE.md` : mise à jour avec les conventions validées issues de cette analyse.

## Edge Cases
- Fichiers générés (`*.generated.ts`) : bien identifier et protéger contre les éditions manuelles accidentelles.
- Stale chunks `.next/` : rappeler la procédure `rm -rf .next` après refactorisation de routes.
- Imports circulaires potentiels entre `lib/` et `components/` : les détecter via `tsc --noEmit`.

## Open Questions
- Faut-il supprimer `PanoramaClient.tsx` / `PanoramaViewer.tsx` ou les déplacer dans une branche feature inactive ?
- Le répertoire `config/` (actuellement vide hormis `.npmrc`) a-t-il vocation à accueillir d'autres fichiers de configuration applicative ?
- Les `covers/` SVG placeholder ont-ils un remplacement prévu à court terme, ou faut-il les conserver indéfiniment ?
- Faut-il introduire un fichier `components/index.ts` barrel pour centraliser les exports, ou maintenir les imports directs ?

## Acceptance Criteria
- [ ] Chaque répertoire principal est documenté avec son rôle, ses règles et un exemple de fichier typique.
- [ ] La distinction entre les deux axes de theming est expliquée clairement avec des exemples CSS.
- [ ] La liste des fichiers orphelins / placeholders est exhaustive et inclut une recommandation (supprimer / conserver / activer).
- [ ] La checklist d'onboarding permet à un nouveau contributeur de comprendre le projet en moins de 15 minutes.
- [ ] Les conventions critiques (routing, pas de mock, pas de services tiers, confirmation HTTP) sont formalisées et accessibles.
- [ ] Le document est validé et fusionné dans `CLAUDE.md` ou référencé depuis celui-ci.
