# Feature Spec: Intégration de l'API Applications (remplacement de LabTestMean)

## Summary
- **Pivot du dashboard existant** : l'application `ltm-dashboard` n'affiche plus des `LabTestMean` mais des **`Application`**, récupérées via **`GET {BASE}/api/infos/applications`** (nouvel endpoint du même backend `atom-synchronizer-dev`). Il ne s'agit pas d'une app sœur séparée : c'est un remplacement du domaine affiché dans le code existant.
- Rename cascade complet `LabTestMean → Application` sur les types, l'adaptateur, le hook de données, les composants catalogue/détail et les routes, en conservant l'architecture éprouvée (triptyque `atom-api.ts` / `types.ts` / `*-adapter.ts`, SWR, filtres persistés, thème, Header/Avatar/ThemeToggle inchangés).
- Les champs affichés en V1 sont ceux listés par le métier (External Reference, Name, Application Category, Application Status, Description, Lifecycle, Version, Portfolio, Airbus Site, Operator, Provider type, Dept Provider, Application Manager, Completion, Solution Architect, Business Criticality) — **adaptés aux noms de champs réels de l'API** (voir § Décisions, plusieurs noms diffèrent de ceux fournis initialement, et un champ n'existe pas du tout côté API).
- Filtres V1 : Photo (inchangé), Application Category, Application Status, Portfolio, Operator, Business Criticality.
- La vue `/map` est mise en conformité pour **compiler** avec le nouveau type `Application`, sans logique de géolocalisation fonctionnelle (aucune donnée de site/coordonnées disponible côté API) — son câblage complet est une itération ultérieure explicitement hors scope.
- Les photos sont **vides pour toutes les applications en V1** (aucun champ image exploitable aujourd'hui) ; le pipeline de fallback "sans photo" déjà utilisé pour les LabTestMeans sans photo est réutilisé tel quel, en prévision d'une vraie source de photos plus tard.

## Motivation
- Le référentiel ATOM expose désormais `atom-synchronizer-dev` `/api/infos/applications`, avec ~500 applications réelles (échantillon analysé dans `temp/applications.json`).
- Réutiliser l'architecture du dashboard LTM (déjà alignée sur ce backend : fetch typé, adaptateur défensif, thème, filtres, pagination) est la voie la plus rapide pour livrer un catalogue d'applications exploitable, plutôt que reconstruire une app depuis zéro.
- L'analyse du JSON réel révèle des écarts avec le vocabulaire métier fourni initialement (noms de champs, cardinalités, absence de certains champs) — ces écarts doivent être **arbitrés maintenant** pour que l'implémentation soit non ambiguë.

## Décisions (arbitrées)

Tous les arbitrages suivants sont **gelés** pour la V1.

- **Portée du changement** : remplacement complet dans le code existant (pas de nouvelle app, pas de coexistence LabTestMean/Application). Tout identifiant `LabTestMean*` disparaît du code au profit de `Application*`.
- **Correspondance champs métier → champs API réels** (vérifiée sur les 500 enregistrements de `temp/applications.json`) :

  | Libellé métier fourni | Champ demandé | Champ réel dans l'API | Remarque |
  |---|---|---|---|
  | External Reference | `externalId` | `externalId` | ✅ identique |
  | Name | `name` | `name` | ✅ identique, jamais vide |
  | Application Category | `appCategory` | `appCategory` | ✅ identique. Valeurs observées : `ivbot`, `END_USER_TOOL`, `component`, `official`, `not1v`, `notDefined` |
  | Application Status | `appStatus` | `appStatus` | ✅ identique. Valeurs : `active`, `developmentPhase`, `inactive`, `planPhase`, `null` (44/500) |
  | Description | `description` | `description` | ✅ identique, `null` sur 22/500 |
  | Lifecycle | `lifecycle` | **`lifeCycle_phaseIn`, `lifeCycle_active`, `lifeCycle_phaseOut`, `lifeCycle_endOfLife`, `lifeCycle_plan`** | ⚠️ pas un champ unique : 5 dates ISO distinctes (même logique que le cycle de vie LabTestMean). Modélisées comme un objet `lifecycle` côté UI (voir type ci-dessous). |
  | Version | `release` | **`version`** | ⚠️ le champ s'appelle `version` (string libre, formats hétérogènes observés : `"1"`, `"1.0"`, `"v1.0"`, `"V1"`, `"2.0.1"`, `""`, ou des identifiants numériques longs type `"6741"`). Affiché tel quel, `""` → "—". |
  | Portfolio | `relApplicationToPortfolio` | **`portfolio`** | ⚠️ objet `{id, externalId, name}` (comme `FactsheetRef`), pas une relation nommée `relApplicationTo...`. `null` sur 55/500. 25 portefeuilles distincts observés. |
  | Airbus Site | `airbusSite` | **absent de l'API** | ❌ **Aucun champ de site/localisation n'existe** dans les 500 enregistrements analysés (recherche exhaustive des clés, aucune ne contient "site"). Le champ est donc **retiré de l'affichage en V1** — voir § Gaps résolus. C'est également la raison pour laquelle `/map` ne peut pas être câblée fonctionnellement dans cette itération. |
  | Operator | `operator` | `operator` | ✅ identique, mais c'est une **chaîne libre** (code département, ex. `1VVI`, `DPSA`), pas une relation. 94 valeurs distinctes, 32 enregistrements avec chaîne vide. |
  | Provider type | `providerType` | `providerType` | ✅ identique. Valeurs : `airbus`, `external`, `null` (277/500). |
  | Dept Provider | `deptProvider` | **`deptProviders`** | ⚠️ champ **pluriel**, tableau de chaînes (codes département, ex. `["IVVAR"]`), jamais un objet `Person`/`FactsheetRef`. 33 valeurs distinctes. |
  | Application Manager | `relApplicationToApplicationManagerUsers` | **`manager`** (+ `managerDelegates[]`) | ⚠️ `manager` est un objet `FactsheetRef` unique (`null` sur 27/500), pas une relation multi-utilisateurs nommée ainsi. `managerDelegates[]` (tableau, non vide sur 260/500) porte les managers additionnels/délégués et est repris en V1 comme liste secondaire. |
  | Completion | `completion` | `completion` | ✅ identique, entier 2–98 (pourcentage). |
  | Solution Architect | `relApplicationToSolutionArchitectUsers` | **`architectSolution`** | ⚠️ objet `FactsheetRef` unique (`null` sur 156/500, ~31% des cas). |
  | Business Criticality | `businessCriticality` | `businessCriticality` | ✅ identique. Valeurs : `missionCritical`, `businessCritical`, `businessOperational`, `administrativeService`, `null` (229/500, ~46% des cas). |

- **Champs API ignorés en V1** (présents dans `temp/applications.json` mais hors du périmètre demandé) : `dvcs`, `jenkins`, `binaryReferential`, `codeQualityTool`, `globalQualityLevel`, `compliantProcess`, `milestone`, `MDCStatus`, `PPStatus`, `RTCStatus`, `businessCapabilities`, `businessOwnerPerson`, `businessSecurityLevel`, `confidentLevel`, `cyberSecurityLevel`, `devType`, `etags`, `functionalSuitability`, `historyCompletion`, `historyQualityKPI`, `incidentNumber`, `incidentsLastYear`, `incidentsThisYear`, `kpi_*`, `metricLoadIsCorrect`, `obsoRiskStatus`, `processComplianceStatus`, `productId`, `productRef`, `pslRef`, `roleAccepted`, `securityAssesmtStatus`, `supportServices`, `technicalSuitability`, `userSubscriptions`. Ils pourront alimenter une itération ultérieure (ex. section "Quality & Compliance").
- **Photos V1** : aucune source exploitable (`documentRefs` existe mais son usage image n'est pas défini pour les applications). Toutes les applications sont traitées comme des LabTestMeans "sans photo" aujourd'hui : `coverPhoto = null`, `photos = []`, fallback visuel générique déjà en place dans `Gallery`/`LabTestMeanCard` (le composant renommé `ApplicationCard` réutilise le même chemin de fallback). Le viewer 360° reste dans le code mais n'est jamais déclenché (aucun `is360`).
- **`/map`** : conservée dans les routes pour que le build compile (`app/map/page.tsx`, `MapClient`, `MapView` adaptés au type `Application`), mais **sans logique de placement géographique** — aucune application n'a de `lat`/`lng` en V1 puisque le site n'existe pas côté API. Affichage V1 : état vide ("No location data available yet") plutôt qu'une carte trompeuse. Le câblage réel (une fois une source de site/geo disponible côté backend) est explicitement **hors scope**.
- **Statut dérivé** : contrairement à `LabTestMean.status` (dérivé de dates), `Application.status` est **directement fourni par l'API** (`appStatus`). `null` → valeur UI `"NA"`.
- **Rôles multiples (`managerDelegates`)** : affichés en V1 comme une liste secondaire sous le manager principal dans la fiche détail (pattern similaire au bloc "People" existant), pas de nouveau filtre dessus.
- **Sections héritées sans équivalent côté Application** : `Security & access`, `People` (rôles étendus architects/projectManagers/etc.), `Lifecycle timeline` détaillée telle quelle, `AircraftProgramTile`, `AtaTile`, `TechnicalCapability` chips — **retirées du code**, pas masquées dynamiquement (aucun champ source côté `Application`).
- **Export PDF** : **hors scope V1**. Le template PDF actuel (`components/pdf/*`) est spécifique au vocabulaire et aux champs LabTestMean (mini-carte, pictogrammes ATA/programme). Il n'est pas adapté dans cette itération — soit désactivé (bouton export masqué), soit laissé non fonctionnel avec un avertissement, à trancher en Plan mode selon l'effort restant.

## Requirements

### Functional Requirements

#### Appel API
- Nouvel endpoint : **`GET {BASE}/api/infos/applications`**, `BASE = NEXT_PUBLIC_ATOM_API_BASE_URL` (inchangé, même backend `atom-synchronizer-dev`).
- Détail unitaire : **`GET {BASE}/api/infos/applications/{externalId}`** (mêmes conventions que `fetchLabTestMean` : 404 → `null`, sinon `httpError`).
- Fetch typé ajouté dans `lib/atom-api.ts` (même fichier, même pattern `atomFetch`/`AtomApiError`/`httpError` — pas de nouveau wrapper HTTP) : `fetchApplications(): Promise<ApplicationDto[]>`, `fetchApplication(externalId): Promise<ApplicationDto | null>`.
- `fetchLabTestMeans`, `fetchLabTestMean`, `fetchAircraftStructureTree` et le DTO `LabTestMeanDto` sont **supprimés** de `atom-api.ts` (plus de source LabTestMean).

#### Schéma `ApplicationDto` (DTO, champs exploités en V1)
```ts
type ApplicationDto = {
  id: string;
  externalId: string;
  name: string;
  appCategory: "ivbot" | "END_USER_TOOL" | "component" | "official" | "not1v" | "notDefined" | null;
  appStatus: "active" | "developmentPhase" | "inactive" | "planPhase" | null;
  description: string | null;
  version: string | null;
  completion: number;
  businessCriticality: "missionCritical" | "businessCritical" | "businessOperational" | "administrativeService" | null;
  providerType: "airbus" | "external" | null;
  operator: string | null;
  deptProviders: string[];
  portfolio: FactsheetRef | null;
  manager: FactsheetRef | null;
  managerDelegates: FactsheetRef[];
  architectSolution: FactsheetRef | null;
  lifeCycle_phaseIn: string | null;
  lifeCycle_active: string | null;
  lifeCycle_phaseOut: string | null;
  lifeCycle_endOfLife: string | null;
  lifeCycle_plan: string | null;
  documentRefs: DocumentRef[] | null;
};
```
`FactsheetRef` et `DocumentRef` sont réutilisés tels quels depuis `atom-api.ts` (même forme que pour LabTestMean).

#### Distribution observée (signal pour le design, sur 500 applications)
- `appCategory` : `END_USER_TOOL` 200, `ivbot` 198, `official` 54, `not1v` 23, `component` 21, `notDefined` 4.
- `appStatus` : `active` 440, `null` 44, `developmentPhase` 11, `inactive` 4, `planPhase` 1.
- `businessCriticality` : `null` 229 (~46%), `businessOperational` 128, `missionCritical` 72, `businessCritical` 45, `administrativeService` 26.
- `providerType` : `null` 277 (~55%), `airbus` 190, `external` 33.
- `portfolio` : 25 valeurs distinctes, `null` sur 55/500.
- `operator` : 94 valeurs distinctes, chaîne vide sur 32/500.
- `manager` : `null` sur 27/500. `architectSolution` : `null` sur 156/500 (~31%).
- `completion` : entier, min 2, max 98.
- `description` : `null` sur 22/500.

Ces taux de nullité élevés (`businessCriticality`, `providerType`, `architectSolution`, `portfolio`) imposent un affichage "—" / "Not set" cohérent plutôt que de masquer les champs, pour que la fiche garde une structure stable.

#### Adaptation DTO → type UI `Application`
Nouveau fichier `lib/application-adapter.ts` (remplace `lib/labtestmean-adapter.ts`), fonction pure `toApplication(dto: ApplicationDto): Application` :

- **Direct** : `id`, `externalId`, `name`, `completion`.
- **`description`** : `dto.description ?? ""`.
- **`category`** : `dto.appCategory ?? "notDefined"`.
- **`status`** : `dto.appStatus ?? "NA"`.
- **`businessCriticality`** : `dto.businessCriticality ?? "NA"`.
- **`providerType`** : `dto.providerType ?? "NA"`.
- **`version`** : `dto.version?.trim() || null` (affiché "—" si `null`).
- **`operator`** : `dto.operator?.trim() || null`.
- **`deptProviders`** : `dto.deptProviders ?? []`.
- **`portfolio`** : `dto.portfolio ? { id: dto.portfolio.id, name: dto.portfolio.name } : null`.
- **`manager`** : `dto.manager ? { name: dto.manager.name, email: dto.manager.externalId } : null` (mêmes conventions que `Person` LabTestMean : `email ← externalId`).
- **`managerDelegates`** : `dto.managerDelegates.map(toPerson)`.
- **`solutionArchitect`** : `dto.architectSolution ? toPerson(dto.architectSolution) : null`.
- **`lifecycle`** : objet `{phaseIn?, active?, phaseOut?, endOfLife?, plan?}`, uniquement les dates renseignées (`dto.lifeCycle_phaseIn` etc., `null`/vide omis).
- **Photos** : `coverPhoto = null`, `photos = []` en V1, quel que soit `documentRefs` (non exploité — voir § Décisions).
- Champs sans source (`location`, `security`, `roles` étendus, `programs`, `atas`, `technicalCapabilities`, `softwares`, `dependsOn`, `projects`) : **absents du type**, pas de valeur factice.

#### Type UI `Application` (remplace `LabTestMean`)
```ts
type ApplicationCategory = "ivbot" | "END_USER_TOOL" | "component" | "official" | "not1v" | "notDefined";
type ApplicationStatus = "active" | "developmentPhase" | "inactive" | "planPhase" | "NA";
type BusinessCriticality = "missionCritical" | "businessCritical" | "businessOperational" | "administrativeService" | "NA";
type ProviderType = "airbus" | "external" | "NA";

type ApplicationLifecycle = {
  phaseIn?: string;
  active?: string;
  phaseOut?: string;
  endOfLife?: string;
  plan?: string;
};

type Application = {
  id: string;
  externalId: string;
  name: string;
  category: ApplicationCategory;
  status: ApplicationStatus;
  description: string;
  lifecycle: ApplicationLifecycle;
  version: string | null;
  portfolio: { id: string; name: string } | null;
  operator: string | null;
  providerType: ProviderType;
  deptProviders: string[];
  manager: Person | null;
  managerDelegates: Person[];
  solutionArchitect: Person | null;
  completion: number;
  businessCriticality: BusinessCriticality;
  coverPhoto: CoverPhoto | null;
  photos: Photo[];
};
```
`Person`, `CoverPhoto`, `Photo`, `PhotoFilter` sont conservés tels quels depuis `lib/types.ts`. Types **supprimés** : `LabTestMean`, `LabTestMeanType`, `LabTestMeanStatus`, `Complexity`, `TechnicalCapability`, `Location`, `Security`, `Roles`, `Lifecycle` (remplacé par `ApplicationLifecycle`), `AircraftStructureCategory`, `AircraftStructureNode`, `Manager` (remplacé par usage direct de `Person`).

#### Rafraîchissement et cache
- Même stratégie que LabTestMean : SWR côté client, cache par session, pas de revalidation automatique, bouton refresh manuel dans le Header.
- Gestion d'erreur inchangée : `AtomApiError`/`app/error.tsx` réutilisés tels quels (wording générique, pas de mention "LabTestMean").

#### Filtres et UI
- **Filtre Photo** : inchangé (`PhotoFilter` = "all"/"with"/"without"), toutes les applications tombant en V1 dans "without" puisque `photos = []` partout.
- **Filtre Application Category** : basé sur `category` (6 valeurs, voir distribution).
- **Filtre Application Status** : basé sur `status` (5 valeurs dont `NA`).
- **Filtre Portfolio** : basé sur `portfolio.name`, sentinelle "None"/"__none__" pour les 55 sans portfolio (même pattern que `filtre-par-portfolio.md`).
- **Filtre Operator** : basé sur `operator` (chaîne libre), sentinelle "None" pour les 32 vides. 94 valeurs → prévoir un filtre recherchable/scrollable plutôt qu'une simple liste de checkboxes plates (à trancher en Plan mode selon le composant `FilterBar`/`FilterSheet` existant).
- **Filtre Business Criticality** : basé sur `businessCriticality` (5 valeurs dont `NA`).
- **Filtres retirés** : `complexity` (aucun équivalent côté Application), le filtre hiérarchique "Program" (`TreeFilter` + `fetchAircraftStructureTree`, aucune donnée programme avion côté Application).
- **Carte catalogue (`ApplicationCard`, ex-`LabTestMeanCard`)** : affiche name, externalId, category, status, portfolio, completion (barre ou pourcentage), businessCriticality — la densité exacte de la carte est affinée en Plan mode.
- **Fiche détail (`ApplicationDetailClient`, ex-`LabTestMeanDetailClient`)** : header avec name/externalId/category/status/businessCriticality en chips, puis blocs : Description, Lifecycle (timeline des 5 dates renseignées), Portfolio, Operator/Provider type/Dept Provider, Application Manager (+ delegates), Solution Architect, Completion. Pas de mini-carte (pas de site), pas de blocs Security/People étendu/Programs/ATA/Capabilities.

### Non-Functional Requirements
- Base URL inchangée, toujours lue depuis `NEXT_PUBLIC_ATOM_API_BASE_URL`, aucune URL en dur.
- Aucun appel non-GET (lecture seule), cohérent avec la règle CLAUDE.md "confirmation avant tout appel HTTP" déjà respectée pour l'analyse (`temp/applications.json` fourni hors-session, aucun appel réseau effectué pour produire ce spec).
- `npm run build` doit passer, y compris pour `/map`, même sans logique géographique fonctionnelle.
- Rename complet `LabTestMean → Application` : aucun identifiant `LabTestMean`/`Bench` résiduel hors historique git.
- Le fichier `temp/applications.json` est un artefact d'analyse ponctuel, **pas une source de données de l'app** (pas de mock committé, conforme à la règle "no mock JSON" de CLAUDE.md) — à supprimer ou déplacer hors du repo après l'implémentation si non versionné.

## Scope

### In Scope
- `lib/atom-api.ts` : ajout `ApplicationDto`, `fetchApplications()`, `fetchApplication(externalId)` ; suppression des fonctions/DTO LabTestMean.
- `lib/types.ts` : nouveau type `Application` + types associés ; suppression des types LabTestMean-only.
- `lib/application-adapter.ts` (nouveau, remplace `lib/labtestmean-adapter.ts`).
- `lib/applications.ts` (remplace `lib/labtestmeans.ts`) : `getApplications()`, `getApplicationByExternalId()`, `filterApplications()`, `uniqueCategories()`, `uniqueStatuses()`, `uniquePortfolios()`, `uniqueOperators()`, `uniqueBusinessCriticalities()`.
- `lib/useApplications.ts` (remplace `lib/useLabTestMeans.ts`) : hook SWR équivalent.
- `lib/catalogueFilters.ts` : clés de filtre mises à jour (category/status/portfolio/operator/businessCriticality/photo).
- `lib/labels.ts` : nouveaux libellés (catégories, statuts, criticité, provider type).
- Composants renommés/adaptés : `CatalogueClient`, `ApplicationCard` (ex-`LabTestMeanCard`), `ApplicationHeader`/`ApplicationDetailClient` (ex-`LabTestMean*`), `FilterBar`, `FilterSheet`, `BadgeStatus`, `ChipType` (ou équivalent catégorie), `ManagerCard`, `detail/Section`.
- Routes : `app/labtestmean/page.tsx` → `app/application/page.tsx` (même pattern `?id=<externalId>`), `app/page.tsx` (catalogue), `app/map/page.tsx` (compile, sans câblage géo).
- `Header.tsx` : wording (nav, titre) mis à jour pour "Applications" au lieu de "Lab Test Means", structure et slot droit inchangés.

### Out of Scope
- Câblage fonctionnel de `/map` (géolocalisation, clustering par site) — aucune donnée source disponible.
- Export PDF adapté au domaine Application (template actuel non repris en V1).
- Vraies photos d'applications (source à définir ultérieurement).
- Toute section sans source dans l'API applications : Security & access, People étendu, Programs/ATA, Technical Capabilities, filtre hiérarchique Program.
- Écritures (POST/PUT/PATCH/DELETE) sur `/api/infos/applications`.
- Authentification (inchangée, JWT dev existant réutilisé tel quel).
- Ajout du champ "Airbus Site" — n'existe pas côté API, réintroduction hors scope tant que le backend ne l'expose pas.

## Affected Areas

### Créer
- `lib/application-adapter.ts`
- `lib/applications.ts`
- `lib/useApplications.ts`
- `app/application/page.tsx`

### Modifier
- `lib/atom-api.ts`, `lib/types.ts`, `lib/labels.ts`, `lib/catalogueFilters.ts`, `lib/filterDescription.ts` (si référence des labels LabTestMean)
- `app/page.tsx`, `app/map/page.tsx`
- `components/CatalogueClient.tsx`, `components/MapClient.tsx`, `components/MapView.tsx`
- `components/FilterBar.tsx`, `components/FilterSheet.tsx`
- `components/LabTestMeanCard.tsx` → `components/ApplicationCard.tsx`
- `components/LabTestMeanHeader.tsx` → `components/ApplicationHeader.tsx`
- `components/LabTestMeanDetailClient.tsx` → `components/ApplicationDetailClient.tsx`
- `components/BadgeStatus.tsx`, `components/ChipType.tsx` (ou renommage en `ChipCategory.tsx`), `components/ManagerCard.tsx`
- `components/detail/Section.tsx`, `components/detail/LifecycleSection.tsx`
- `components/Header.tsx` (wording uniquement)

### Supprimer
- `lib/labtestmean-adapter.ts`, `lib/labtestmeans.ts`, `lib/useLabTestMeans.ts`, `lib/aircraftStructure.ts`
- `app/labtestmean/page.tsx`
- `components/ChipComplexity.tsx`, `components/ChipAccessControl.tsx`, `components/ChipCapability(ies).tsx`, `components/AircraftProgramTile.tsx`, `components/AtaTile.tsx`, `components/TreeFilter.tsx`
- `components/icons/Aircraft*.tsx`, `components/icons/Ata.tsx`, `components/icons/Capability.tsx`, `components/icons/Complexity.tsx`, `components/icons/AccessControl.tsx`, `components/icons/CountryMap.tsx` (sauf si réutilisées ailleurs)
- Tout composant/prop résiduel référant à `complexity`, `security`, `roles` étendus, `programs`, `atas`, `technicalCapabilities`, `location`.

### Configuration
- Aucun changement de variable d'environnement (même `NEXT_PUBLIC_ATOM_API_BASE_URL`, même backend).

## Gaps résolus (récapitulatif)

| Gap | Stratégie V1 |
|-----|--------------|
| `airbusSite` absent de l'API | Champ retiré de l'affichage. `/map` reste présente pour compiler mais sans logique géographique (état vide). |
| `lifecycle` = 5 champs distincts, pas 1 | Modélisé en objet `ApplicationLifecycle {phaseIn, active, phaseOut, endOfLife, plan}`, affiché en timeline (dates renseignées uniquement). |
| `release` renommé `version`, formats hétérogènes | Affiché tel quel (string libre), `""`/`null` → "—". |
| `relApplicationToPortfolio` = objet `portfolio` (FactsheetRef) | Mappé directement, sentinelle "None" si `null` (55/500). |
| `deptProvider` singulier demandé, `deptProviders` pluriel réel | Modélisé en tableau de chaînes, affiché en liste/chips. |
| `relApplicationToApplicationManagerUsers` = `manager` unique + `managerDelegates[]` | `manager` en principal, `managerDelegates` en liste secondaire dans la fiche détail. |
| `relApplicationToSolutionArchitectUsers` = `architectSolution` unique | Mappé en `solutionArchitect: Person | null`, "—" si absent (31% des cas). |
| Taux de nullité élevés (businessCriticality 46%, providerType 55%, architectSolution 31%, portfolio 11%) | Valeur UI `"NA"`/`null` affichée explicitement ("Not set"/"—"), jamais de champ masqué dynamiquement. |
| Photos absentes | `photos = []`, `coverPhoto = null` partout, fallback visuel générique déjà existant réutilisé. |

## Edge Cases
- `appStatus = null` (44/500) → statut UI `"NA"`, affiché dans le filtre et les chips (pas d'exclusion).
- `businessCriticality = null` (229/500) → `"NA"`, visible comme option de filtre distincte ("Not set").
- `portfolio = null` (55/500) → regroupé sous "None" dans le filtre Portfolio.
- `operator = ""` (32/500) → regroupé sous "None" dans le filtre Operator ; distinct de `operator = null` s'il apparaît (traiter chaîne vide comme absence).
- `manager = null` (27/500) → bloc "Application Manager" affiche "Not set", `managerDelegates` (s'il existe) reste affiché indépendamment.
- `architectSolution = null` (156/500) → "Solution Architect: Not set".
- `version = ""` ou `null` → "—".
- Toutes les 5 dates `lifeCycle_*` absentes → bloc Lifecycle affiche "No lifecycle data available" plutôt qu'une timeline vide.
- Backend HTTP ≠ 200 sur `/api/infos/applications` → écran d'erreur explicite existant (`app/error.tsx`), pas de fallback silencieux.
- `/map` sans aucune application géolocalisable → état vide explicite, pas de carte blanche ni de crash.

## Open Questions

- **Photos futures** : quel champ/API portera les photos d'application le jour venu (`documentRefs` avec un `documentType` dédié, ou un nouvel endpoint) ? Non bloquant pour la V1 (fallback générique), à clarifier avec l'équipe backend avant l'itération photos. => la même que l'actuelle qui sera générique.
- **Airbus Site** : le backend prévoit-il d'exposer un site/localisation pour les applications (condition pour rendre `/map` fonctionnelle) ? Non bloquant pour la V1, mais bloque toute itération carte tant que non résolu.=> oui c'est prévu
- **Export PDF** : faut-il masquer le bouton d'export en V1, ou livrer une version minimale (sans mini-carte/pictogrammes programme) ? Décision reportée en Plan mode. => version minimale
- **Filtre Operator à 94 valeurs** : liste plate, recherche texte, ou regroupement par préfixe (ex. `1VV*`) ? À trancher en Plan mode selon l'ergonomie du composant `FilterBar` existant.=> rceherche texte dans cette version

## Acceptance Criteria
- [ ] La page `/` affiche les ~500 applications réelles récupérées via `GET /api/infos/applications` (spinner pendant le chargement, cache SWR par session).
- [ ] Les filtres Photo, Application Category, Application Status, Portfolio, Operator, Business Criticality sont présents et fonctionnels, avec une option "None"/"NA" explicite pour les valeurs absentes.
- [ ] La fiche détail (`/application?id=<externalId>`) affiche : External Reference, Name, Application Category, Application Status, Description, Lifecycle (timeline), Version, Portfolio, Operator, Provider type, Dept Provider, Application Manager (+ delegates), Completion, Solution Architect, Business Criticality.
- [ ] La fiche détail ne contient plus aucune section héritée sans source (Security & access, People étendu, Programs, ATA, Technical Capabilities, mini-carte).
- [ ] `/map` compile et se charge sans erreur, affichant un état vide explicite (pas de carte trompeuse, pas de crash).
- [ ] Toutes les applications affichent le fallback visuel "sans photo" existant (aucune photo en V1).
- [ ] Le type `LabTestMean` et tout identifiant `LabTestMean`/`Bench` n'existent plus dans le code (`grep -ri "labtestmean|bench"` ne renvoie que des occurrences attendues dans l'historique git ou les specs archivées).
- [ ] Le backend indisponible produit l'écran d'erreur explicite existant, pas une page blanche.
- [ ] `npm run build` passe sans erreur.
- [ ] Aucun appel non-GET n'est émis par l'UI ; la base URL reste lue depuis `NEXT_PUBLIC_ATOM_API_BASE_URL`.

## Validation de complétude pour une première implémentation

Checklist avant passage en Plan mode :
- [x] Tous les champs métier demandés sont mappés à un champ API réel, ou explicitement signalés comme absents (`airbusSite`).
- [x] Tous les écarts de nommage entre la demande initiale et l'API réelle sont documentés (table de correspondance).
- [x] Le nouveau type UI `Application` est défini en TypeScript dans la spec.
- [x] La liste des fichiers à créer, modifier, supprimer est exhaustive.
- [x] Les filtres demandés sont tous couverts, avec stratégie pour les valeurs nulles/absentes.
- [x] Le comportement de `/map` (compile mais non fonctionnelle) est explicite.
- [x] Le traitement des photos (vides en V1) est explicite.
- [x] Les questions ouvertes restantes sont non bloquantes pour la V1.
- [x] Les critères d'acceptation sont testables manuellement.

La spec est prête pour `/plan this specification`.
