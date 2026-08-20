# Feature Spec: Intégration de l'API LabTestMeans

## Summary
- Remplacer la source de données locale `bench-catalog/data/benches.json` par un appel à l'API **`GET /api/infos/labtestmeans`** exposée par le backend **`atom-synchronizer-dev`** (Spring Boot, Springdoc OpenAPI 3.1, base `http://localhost:8080/atom-synchronizer-dev`).
- L'API renvoie ~312 test means (≈ 600 Ko JSON) couvrant l'identité, la localisation, le cycle de vie, les rôles organisationnels, les programmes avion et le cadre de sécurité/accès de chaque banc.
- Introduire une **couche d'adaptation** qui projette le DTO `LabTestMean` vers le type UI, en **dérivant** les champs manquants (notamment `status`) et en **normalisant** ceux qui diffèrent (casse du type, codes pays/site).
- **Renommer le type UI `Bench` → `LabTestMean`** pour aligner le vocabulaire front sur le domaine backend.
- **Enrichir l'UI** avec les champs présents dans l'API et non exploités aujourd'hui : `complexity`, bloc sécurité/accès, rôles organisationnels étendus, timeline cycle de vie complet.
- **Retirer de l'UI** toutes les sections sans source dans l'API : `instrumentation`, `capabilities`, `applications installées`, `linkedBenches`, `sharedResources`, `ATA`. Elles pourront revenir dans une itération ultérieure une fois exposées côté backend.

## Motivation
- La donnée locale `benches.json` (20 entrées fictives) a été utile pour prototyper l'UI et valider la direction visuelle. Passer sur la vraie source est la prochaine étape naturelle pour que l'application soit exploitable.
- `atom-synchronizer-dev` est déjà en place et consolide les LabTestMeans dans ATOM à partir des référentiels upstream (Alfabet, ADAM, etc.). L'intégrer évite de dupliquer un référentiel côté frontend.
- La volumétrie réelle (312, potentiellement 400+) impose de valider dès maintenant les choix de rendu (filtrage, pagination/virtualisation, carte) sur des données réalistes.
- Aligner le nommage du type UI (`Bench` → `LabTestMean`) sur le domaine backend réduit la surface de traduction et facilitera les specs suivantes (applications, projets, etc.).

## Décisions (arbitrées)
Tous les arbitrages suivants sont **gelés** pour la V1. Ils remplacent les questions ouvertes précédentes.

- **Statut dérivé `mothballed`** : label UI **"Mothballed"** (et non "Maintenance"). Valeur interne renommée `maintenance → mothballed` dans le type `LabTestMeanStatus`.
- **`testMeanType = "RT"`** : valeur interne `RT`, label UI **"Mean ResearchOnTest"**.
- **`testMeanType = null`** : valeur interne `NA`, label UI **"NA"**. Les bancs concernés restent affichés (pas d'exclusion).
- **Photos V1** (initial) : 4 SVG statiques bundled dans `public/covers/` partagés par tous les bancs. **Remplacé en V2** (voir spec `photos-labtestmeans-depuis-api.md`) : chaque banc utilise sa photo `SELECTED` issue de `documentRefs` via le proxy `/api/photo/[id]`. Les SVG `public/covers/cover-1.svg` restent en placeholder de fallback.
- **Applications installées / linked benches / capabilities / instrumentation / ATA / shared resources** : **retirées de l'UI**. Pas d'implémentation, pas de section masquée à la volée — les composants et les blocs correspondants sortent du code V1.
- **Type UI** : on **ajoute** les nouveaux champs (complexity, sécurité, rôles étendus, lifecycle) au type existant, et on le **renomme** `Bench → LabTestMean` pour cohérence de domaine. Cascade de renommages sur les fichiers, types, composants, props, slots de route.
- **Latence chaude** : V1 = `revalidate: 60` côté Next. À mesurer après intégration avant d'arbitrer une stratégie plus longue.

## Requirements

### Functional Requirements

#### Appel API
- Endpoint unique en V1 : **`GET {BASE}/api/infos/labtestmeans`** où `BASE=http://localhost:8080/atom-synchronizer-dev` en dev.
- Appel côté serveur Next.js (RSC ou Route Handler) pour éviter d'exposer la base URL côté client et bénéficier du cache Next.
- Réponse : tableau JSON d'objets `LabTestMean` (schéma ci-dessous).
- Volume : ~600 Ko, latence ~9 s à froid sur l'instance dev. Cache Next `revalidate: 60`.

#### Schéma `LabTestMean` (DTO, tel que reçu)
Champs **utilisés** en V1 :
- **Identité** : `id` (UUID), `externalId` (ex. `V_2CINS_01`), `name` (ex. `2CINS`), `testMeanType` (`sib` | `simu` | `fib` | `RT` | `null`), `complexity` (`simple` | `medium` | `complex` | `null`).
- **Localisation** : `country` (`Fr` | `Ge` | `UK`), `site` (code 3 lettres : `TLS`, `HMB`, `FIL`, `BRE`), `building` (ex. `C_51_3`), `room` (ex. `4m Level`).
- **Cycle de vie** : `kickoff`, `eisdateyear`, `mothballed`, `dismantled`.
- **Description** : `description` (texte court).
- **Personnes** (`FactsheetRef[]` : `{id, externalId, name, etags, userSubscriptions}`, `externalId` = email) : `managers`, `architects`, `projectManagers`, `workPakageLeaders`, `leadEngineers`, `deputies`, `depts`.
- **Sécurité et programmes** : `ecLevel`, `networkSegregated`, `accesscontrol`, `accesbadge`, `accreditation[]`, `financeAircraftPrograms[]` (codes : `SA`, `LR-A330`, `XWB-A350`, `DD-A380`, `MT-A400M`, `WB`, `CS-A220`, `RT`), `financeProjects[]`.

Champs **ignorés** en V1 :
- `shortDescription` (null dans l'échantillon).
- `aicraftPrograms[]` (typo d'API, vide partout).
- Tout autre champ non listé ci-dessus.

#### Distribution observée (signal pour le design)
- Type : `sib` 190, `fib` 70, `RT` 31, `simu` 16, `null` 5.
- Complexity : simple 129, medium 119, complex 57, `null` 7.
- Country : Fr 180, Ge 108, UK 23.
- Site : TLS 180, HMB 86, FIL 23, BRE 22.
- Rôles remplis : managers 306/312, leadEngineers 228/312, workPakageLeaders 182/312, architects 124/312.

#### Adaptation DTO → type UI `LabTestMean`
Couche `lib/labtestmean-adapter.ts` (fonction pure, testable). Règles :

- **Direct** : `id`, `externalId`, `name`, `description`, `complexity`, `ecLevel`, `networkSegregated`, `accesscontrol`, `accesbadge`.
- **Normalisation `type`** :
  - `sib` → `SIB`, `simu` → `SIMU`, `fib` → `FIB`, `RT` → `RT`, `null` → `NA`.
  - Type UI = `type LabTestMeanType = "SIB" | "SIMU" | "FIB" | "RT" | "NA"`.
  - Labels d'affichage : `SIB`, `SIMU`, `FIB`, `Mean ResearchOnTest`, `NA`.
- **Normalisation `location.country`** : `Fr → France`, `Ge → Germany`, `UK → United Kingdom`.
- **Normalisation `location.city`** : `TLS → Toulouse`, `HMB → Hamburg`, `FIL → Filton`, `BRE → Bremen`.
- **Géocoordonnées** (aucun champ source — dérivées d'une table frontend) :
  - `TLS → {lat: 43.63, lng: 1.37}`
  - `HMB → {lat: 53.55, lng: 9.99}`
  - `FIL → {lat: 51.51, lng: -2.58}`
  - `BRE → {lat: 53.07, lng: 8.80}`
  - Site inconnu → pas de marqueur sur `/map`, affiché avec "Unknown location" dans les listes.
- **`location.building`** : `building` direct ; `room` exposé comme champ séparé `location.room`.
- **Dérivation `status`** (ordre d'évaluation, premier match gagne) :
  1. `dismantled` renseigné → `out-of-service`.
  2. sinon `mothballed` renseigné → `mothballed`.
  3. sinon `eisdateyear` vide → `in-project`.
  4. sinon → `operational`.
  - Type UI = `type LabTestMeanStatus = "operational" | "mothballed" | "out-of-service" | "in-project"`.
- **`manager`** : premier élément de `managers[]`. Mapping :
  - `email` ← `externalId` (format email).
  - `name` ← `name`.
  - `title` ← **"Bench Manager"** (label générique, champ absent de l'API).
  - Pas de champ `avatar` côté domaine : `components/Avatar.tsx` rend des initiales déterministes (couleur dérivée du `email`) — aucun appel à un service tiers (pravatar, gravatar, …).
  - Si `managers[]` est vide (6/312) → manager `null`, bloc People masqué ou réduit.
- **`roles`** : objet exposant les listes `{name, email}` pour chaque rôle non vide : `architects`, `projectManagers`, `workPakageLeaders`, `leadEngineers`, `deputies`, `depts`. Les listes vides sont omises.
- **`lifecycle`** : objet `{kickoff?, inService?, mothballed?, dismantled?}` avec uniquement les dates renseignées (`inService ← eisdateyear`).
- **`programs[]`** : `financeAircraftPrograms[].name`.
- **`projects[]`** : `financeProjects[].name`.
- **`accreditation[]`** : liste directe depuis l'API.
- **Photos V2** : extraites de `documentRefs` (filtre `documentType.toLowerCase() === "image"`).
  - SELECTED = celle dont `name.toUpperCase().includes("SELECTED")`. SELECTED en tête de `photos[]`, le reste à la suite, dans l'ordre du backend.
  - `coverPhoto` ← URL de la SELECTED. À défaut, première image. À défaut, `/covers/cover-1.svg`.
  - Toutes les URLs pointent vers le proxy Next : `/api/photo/<documentRefId>?u=<encoded url>` — voir spec `photos-labtestmeans-depuis-api.md`.
  - **Panorama 360°** : `Photo.is360 = name.toUpperCase().includes("3D")`. Indépendant de SELECTED (les deux flags peuvent coexister). La galerie de la fiche détail bascule sur un viewer interactif quand `is360 === true` — voir spec `visionneuse-360-photos-3d.md`.

#### Type UI `LabTestMean` (après rename + ajouts + retraits)
```ts
type LabTestMeanType = "SIB" | "SIMU" | "FIB" | "RT" | "NA";
type LabTestMeanStatus = "operational" | "mothballed" | "out-of-service" | "in-project";
type Complexity = "simple" | "medium" | "complex" | null;

type Person = { name: string; email: string };
type Manager = Person & { title: string; avatar: string };

type Location = {
  country: string; city: string; site: string; building: string; room?: string;
  lat?: number; lng?: number;
};

type Security = {
  ecLevel: string | null;
  networkSegregated: boolean | null;
  accesscontrol: boolean | null;
  accesbadge: string | null;
  accreditation: string[];
};

type Roles = {
  architects?: Person[]; projectManagers?: Person[]; workPakageLeaders?: Person[];
  leadEngineers?: Person[]; deputies?: Person[]; depts?: Person[];
};

type Lifecycle = { kickoff?: string; inService?: string; mothballed?: string; dismantled?: string };

type Photo = { url: string; alt?: string };

type LabTestMean = {
  id: string;
  externalId: string;
  name: string;
  type: LabTestMeanType;
  complexity: Complexity;
  description: string;
  status: LabTestMeanStatus;
  location: Location;
  manager: Manager | null;
  roles: Roles;
  security: Security;
  lifecycle: Lifecycle;
  programs: string[];
  projects: string[];
  coverPhoto: string;
  photos: Photo[];
};
```

Champs **supprimés** par rapport à l'ancien `Bench` : `instrumentation`, `capabilities`, `applications`, `linkedBenches`, `sharedResources`, `ata`, `inServiceDate` (remplacé par `lifecycle.inService`), `externalRef` (renommé `externalId`). Le type `Application` sort de `lib/types.ts`.

#### Rafraîchissement et cache
- En dev : `fetch(..., { next: { revalidate: 60 } })`.
- À terme : invalidation sur demande (webhook ou bouton admin) quand une synchronisation côté `atom-synchronizer-dev` est terminée.
- Gestion d'erreur : API indisponible → écran d'erreur explicite ("API ATOM indisponible, contactez le support"). Pas de fallback silencieux vers `benches.json`.

#### Filtres et UI enrichis
- **Nouveau filtre `complexity`** (simple/medium/complex, `null` exclu du menu) dans `FilterBar` et `FilterSheet`.
- **Filtre `type`** : ajouter `Mean ResearchOnTest` et `NA` aux options existantes.
- **Nouveau bloc "Security & access"** dans la fiche détail : `ecLevel`, `networkSegregated`, `accesscontrol`, `accesbadge`, `accreditation[]`.
- **Nouveau bloc "People"** étendu : manager principal en tête, puis liste repliable des autres rôles non vides (architects, project managers, WP leaders, lead engineers, deputies, depts).
- **Timeline cycle de vie** : `kickoff → inService → mothballed → dismantled`, chaque étape affichée uniquement si la date existe.
- **Localisation enrichie** : `site` (code) + ville (label) + `building` + `room` optionnel.
- **Retirer de la fiche détail** les sections héritées du mock : `Instrumentation`, `Capabilities`, `Installed Applications`, `Linked Benches`, `Shared Resources`, `ATA`. Pas de section masquée dynamiquement — le JSX correspondant disparaît.

### Non-Functional Requirements
- Latence de la page catalogue : < 2 s en hit de cache, acceptable jusqu'à 10 s en miss (signaler via spinner).
- Bundle : la couche d'adaptation reste pure TypeScript, pas de dépendance runtime supplémentaire.
- Base URL configurable via variable d'environnement `ATOM_API_BASE_URL` (défaut : `http://localhost:8080/atom-synchronizer-dev`).
- Aucun POST/PUT/PATCH/DELETE en V1 (lecture seule).
- Rename complet `Bench → LabTestMean` : aucun identifiant `Bench` résiduel hors des chaînes de commit / historique git.

## Scope

### In Scope
- Couche d'adaptation `lib/labtestmean-adapter.ts` : fonction pure DTO → `LabTestMean` + tables de mapping (country, site, géocoords, type, status).
- Nouveau type `LabTestMean` et types associés dans `lib/types.ts` ; suppression de `Bench`, `BenchType`, `BenchStatus`, `Application`.
- Wrapper `lib/atom-api.ts` (fetch typé des endpoints ATOM utilisés).
- Remplacement de `lib/benches.ts` par `lib/labtestmeans.ts` : `getLabTestMeans()`, `getLabTestMean(id)`, `filterLabTestMeans()`, `uniqueTypes()`, `uniqueSites()`, etc.
- Nouveau filtre `complexity` dans `FilterBar` et `FilterSheet` ; ajout des options `Mean ResearchOnTest` et `NA` au filtre type.
- Nouveaux blocs fiche détail : `Security & access`, `People` étendu, `Lifecycle timeline`.
- 4 photos de couverture dans `public/covers/cover-1.jpg` … `cover-4.jpg` (à fournir / placeholder de départ accepté).
- Rename cascade : fichiers, types, composants, props, slots de route. Voir § Affected Areas.
- Configuration `.env.local` avec `ATOM_API_BASE_URL`.
- Suppression du JSON local `data/benches.json`.

### Out of Scope
- Écritures (création, modification, suppression de LabTestMeans).
- Synchronisation déclenchée depuis l'UI (endpoints `/api/sync/*` ignorés).
- Authentification (backend dev supposé ouvert).
- Pagination ou recherche serveur (filtrage client-side comme aujourd'hui).
- Galerie panorama 360° (supprimée en V1 faute de source, la dépendance `react-photo-sphere-viewer` reste pour itérations futures).
- Photos par banc via API (itération ultérieure).
- Cross-référencement applications installées via `/api/infos/applications` (itération ultérieure).
- Champs retirés et non-réintroduits en V1 : `instrumentation`, `capabilities`, `applications`, `linkedBenches`, `sharedResources`, `ata`.

## Affected Areas

### Créer
- `bench-catalog/lib/atom-api.ts` — wrapper `fetch` typé (endpoints ATOM utilisés).
- `bench-catalog/lib/labtestmean-adapter.ts` — fonction pure DTO → `LabTestMean` + tables de correspondance.
- `bench-catalog/lib/labtestmeans.ts` — API publique : `getLabTestMeans`, `getLabTestMean`, `filterLabTestMeans`, helpers.
- `bench-catalog/public/covers/cover-1.jpg`, `cover-2.jpg`, `cover-3.jpg`, `cover-4.jpg` — 4 photos partagées par tous les bancs.

### Modifier
- `bench-catalog/lib/types.ts` — remplacer `Bench`/`BenchType`/`BenchStatus`/`Application` par `LabTestMean`/`LabTestMeanType`/`LabTestMeanStatus`/`Complexity`/`Security`/`Roles`/`Lifecycle`. Retirer `Photo.isPanorama`.
- `bench-catalog/app/page.tsx` — passage en `async` + appel `getLabTestMeans()`.
- `bench-catalog/app/map/page.tsx` — idem, filtrage des bancs sans géocoords.
- `bench-catalog/app/bench/[id]/page.tsx` — passage en `async`, nouveaux blocs (Security, People étendu, Lifecycle), retrait des sections sans source.
- `bench-catalog/components/CatalogueClient.tsx` — prop `labTestMeans: LabTestMean[]`.
- `bench-catalog/components/MapClient.tsx`, `MapView.tsx` — prop `labTestMeans`, filtrage des entrées sans `lat/lng`.
- `bench-catalog/components/FilterBar.tsx`, `FilterSheet.tsx` — ajout `complexity`, options type étendues.
- `bench-catalog/components/BenchCard.tsx` → renommer `LabTestMeanCard.tsx` — prop `labTestMean`.
- `bench-catalog/components/BenchHeader.tsx` → renommer `LabTestMeanHeader.tsx`.
- `bench-catalog/components/Gallery.tsx` — retirer le support panorama, simplifier pour 4 photos fixes.
- `bench-catalog/components/ChipType.tsx` — ajouter libellé `Mean ResearchOnTest`, `NA`.
- `bench-catalog/components/BadgeStatus.tsx` — renommer le token `maintenance → mothballed`, mettre à jour le label.

### Supprimer
- `bench-catalog/data/benches.json`.
- Tout composant ou prop résiduel référant à `instrumentation`, `capabilities`, `applications`, `linkedBenches`, `sharedResources`, `ata`, `isPanorama`.

### Configuration
- `bench-catalog/.env.local` → `ATOM_API_BASE_URL=http://localhost:8080/atom-synchronizer-dev`.

## Gaps résolus (récapitulatif)

| Gap | Stratégie V1 |
|-----|--------------|
| Photos | V1: 4 SVG locaux. V2: `documentRefs` (image type) via proxy `/api/photo/[id]`, SELECTED en cover. |
| Géocoordonnées absentes | Table frontend `site → {lat, lng}` pour les 4 sites (TLS, HMB, FIL, BRE). |
| Statut opérationnel | Dérivé des dates de cycle de vie (règle 4 cas, `mothballed` préservé tel quel). |
| Manager enrichi (title, avatar) | Title = "Bench Manager". Pas d'image distante : composant `Avatar` à initiales locales, couleur déterministe (hash de l'email). |
| Sections sans source (instrumentation, capabilities, applications, linkedBenches, sharedResources, ata) | Retirées de l'UI — non masquées, supprimées du code. |
| Latence à froid ~9 s | `revalidate: 60` + spinner. Mesure chaude post-intégration. |
| Cohérence nommage | Rename `Bench → LabTestMean` sur tous les identifiants frontend. |

## Edge Cases
- `testMeanType = null` (5/312) : mappé sur `NA`, affiché dans le filtre et les chips.
- `country` ou `site` manquant : fallback "Unknown location" ; exclu de la vue `/map`.
- `managers[]` vide (6/312) : `manager = null`, bloc People affiche directement les autres rôles.
- `dismantled` ET `mothballed` renseignés : `dismantled` l'emporte (priorité dans la règle de dérivation).
- `eisdateyear` incomplet (année seule vs date ISO) : parser tolérant, afficher tel quel si non parsable.
- Backend HTTP != 200 : écran d'erreur explicite, pas de fallback silencieux.
- Table de sites incomplète (nouveau code apparaît côté backend) : log console + banc affiché sans géocoord, jamais de crash.
- `complexity = null` (7/312) : affiché "—" dans la carte, exclu du filtre.

## Open Questions

Une seule question reste ouverte. Elle **n'est pas bloquante** pour la V1 (la stratégie de table frontend est retenue par défaut), mais conditionne la dette à moyen terme.

- **Géocoords côté backend ou frontend ?** Envisageable d'ajouter `lat`/`lng` au schéma `LabTestMean` côté backend ATOM (et à quelle granularité : site, bâtiment, salle), ou doit-on maintenir la table de centroïdes côté frontend à long terme ? À clarifier avec l'équipe `atom-synchronizer-dev`.

## Acceptance Criteria
- [ ] La page `/` affiche les ~312 bancs réels récupérés via l'API (spinner pendant le miss de cache).
- [ ] Le filtre `complexity` (simple/medium/complex) est présent et fonctionnel.
- [ ] Le filtre `type` inclut les options `Mean ResearchOnTest` et `NA`.
- [ ] Les 4 statuts dérivés (`operational`, `mothballed`, `out-of-service`, `in-project`) sont correctement calculés, labellisés, et colorisés distinctement en mode clair et sombre.
- [ ] La vue `/map` place chaque banc sur un des 4 sites (TLS, HMB, FIL, BRE). Les bancs partageant un site sont clusterisés ou jittered pour rester cliquables.
- [ ] La fiche détail affiche les blocs `Security & access`, `People` étendu, `Lifecycle timeline`.
- [ ] La fiche détail **ne contient plus** de sections `Instrumentation`, `Capabilities`, `Installed Applications`, `Linked Benches`, `Shared Resources`, `ATA`.
- [ ] Tous les bancs partagent les mêmes 4 photos locales (`cover-1..4.jpg`). Aucun panorama 360° n'est rendu.
- [ ] Le type `Bench` n'existe plus dans le code ; tous les identifiants utilisent `LabTestMean`. `grep -ri "\bBench\b" bench-catalog/` ne renvoie que des occurrences attendues (ex. commentaires, `BenchManager` le cas échéant).
- [ ] Le backend indisponible produit un écran d'erreur explicite, pas une page blanche.
- [ ] `npm run build` passe sans erreur ; aucun appel non-GET n'est émis par l'UI.
- [ ] La base URL est lue depuis `ATOM_API_BASE_URL` ; aucune URL en dur dans le code.

## Validation de complétude pour une première implémentation

Checklist avant passage en Plan mode :
- [x] Tous les champs de l'API exploités en V1 sont listés et mappés.
- [x] Tous les champs non exploités en V1 sont listés explicitement (et justifiés).
- [x] Toutes les dérivations (status, géocoords, photos, manager) sont déterministes.
- [x] Le nouveau type UI `LabTestMean` est défini en TypeScript dans la spec.
- [x] La liste des fichiers à créer, modifier, supprimer est exhaustive.
- [x] Les 8 questions ouvertes initiales sont arbitrées (1 seule reste ouverte, non bloquante).
- [x] Les critères d'acceptation sont testables manuellement.
- [x] Les edge cases connus (null, vides, erreurs) ont une stratégie.

La spec est prête pour `/plan this specification`.
