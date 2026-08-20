# Feature Spec: Technical Capabilities en pictogrammes

## Summary
- Représenter les **technical capabilities** d'un banc sous forme de **chips icône-seule + tooltip**, exactement dans la lignée de `ChipComplexity` et `ChipAccessControl`.
- Quatre valeurs canoniques (selon `temp/technicalCapabilities.jpg`) : **Aircraft Simulation Package**, **Automatic Testing**, **Remote Access**, **No Remote Access**.
- Affichage à côté de `ChipType`, `ChipComplexity`, `ChipAccessControl` dans la rangée de chips du header (`LabTestMeanHeader.tsx`, ligne 41-45).
- Une chip par capability **présente** sur le banc — pas de chip muted pour les capabilities absentes (cohérent avec `ChipAccessControl` qui ne s'affiche que si applicable, et avec le principe d'un header dense mais lisible).

## Motivation
- Les technical capabilities décrivent **ce que sait faire le banc** au-delà de son type (`SIB` / `SIMU` / `FIB` / `RT`) : peut-il simuler un avion ? exécuter des tests automatisés ? être piloté à distance ? Information critique au scan pour un ingénieur qui cherche un banc adapté à un test précis.
- Aujourd'hui ces capabilities sont **absentes de l'UI** (retirées en V1 par `integration-api-labtestmeans.md` faute d'exposition backend, comme les ATA).
- En **chips picto-only avec tooltip**, on enrichit la rangée d'identité du header sans ajouter de texte : la lecture reste rapide, le détail est accessible au survol.
- Le couple **(complexité × type × capabilities × access control)** donne au scan une carte d'identité technique complète du banc.

## Décisions (arbitrées)
- **Pictogrammes** : SVG inline dans `components/icons/CapabilityIcon.tsx`, un seul fichier exposant 4 composants nommés (cohérent avec `LifecycleStepIcon.tsx`). ViewBox 24×24, `stroke="currentColor"`, `strokeWidth={1.8}`, style Lucide. Glyphes proposés :
  - **Aircraft Simulation Package** → **cube 3D avec point central** (évoque un environnement virtuel / digital twin). Alternatives : monitor + petit avion à l'intérieur, ou box avec lignes de flux. Recommandation V1 : cube 3D simple, neutre et reconnaissable.
  - **Automatic Testing** → **flèche circulaire (refresh) avec coche** au centre. Évoque l'exécution répétée et automatisée. Alternative : engrenage + coche (mais collision visuelle avec ATA → engrenage). Recommandation V1 : refresh + check.
  - **Remote Access** → **antenne WiFi (3 arcs)** classique. Universellement compris.
  - **No Remote Access** → **WiFi barré** (3 arcs avec trait diagonal `\`), pictogramme miroir du Remote Access pour lecture immédiate. Alternative : cadenas seul (mais sémantique plus proche de "access control"). Recommandation V1 : WiFi barré.
- **Chip** : nouveau `components/ChipCapability.tsx`, calqué sur `ChipComplexity` :
  - Reçoit `{ capability: TechnicalCapability }` (enum domaine).
  - Rendu : `<span title={fullLabel} aria-label={fullLabel} className="inline-flex items-center">` + icône 24 px.
  - Pas de label texte, pas de bordure, pas de fond — l'icône parle, le tooltip complète.
  - Tooltip : libellé complet (`"Aircraft Simulation Package"`, `"Automatic Testing"`, `"Remote Access"`, `"No Remote Access"`) — pas de description longue en V1, juste le nom canonique.
- **Liste** : nouveau `components/ChipCapabilities.tsx` (wrapper) qui mappe `capabilities: TechnicalCapability[]` → suite de `<ChipCapability>` séparées par le `gap-2` du conteneur parent (la rangée du header). Si liste vide → retourne `null`.
- **Position dans le header** : à droite de `ChipAccessControl`, dans la même `<div className="flex flex-wrap items-center gap-2">` ligne 41 de `LabTestMeanHeader.tsx`. Ordre final de la rangée : `[Type] [Complexity] [AccessControl] [Capabilities…]`.
- **Mutual exclusion `Remote Access` / `No Remote Access`** : pas appliquée côté UI. Si le backend renvoie les deux, on affiche les deux chips (cas absurde mais lisible). C'est au backend de garantir la cohérence métier.
- **Source de données** : nouveau champ `m.technicalCapabilities: TechnicalCapability[]` côté domaine. Forward-compatible : tant que le backend ne livre rien, l'adapter renvoie `[]` et aucune chip ne s'affiche.

## Requirements

### Functional Requirements

#### Composants pictogrammes
- Nouveau `components/icons/CapabilityIcon.tsx` exposant 4 composants nommés :
  - `AircraftSimulationIcon` (cube 3D)
  - `AutomaticTestingIcon` (refresh + check)
  - `RemoteAccessIcon` (WiFi)
  - `NoRemoteAccessIcon` (WiFi barré)
- Signature commune `{ size?: number; className?: string }`.
- ViewBox 24×24, `stroke="currentColor"`, `strokeWidth={1.8}`, `aria-hidden="true"`.

#### Type domaine
- Étendre `lib/types.ts` avec :
  ```ts
  export type TechnicalCapability =
    | "aircraft-simulation-package"
    | "automatic-testing"
    | "remote-access"
    | "no-remote-access";
  ```
- Ajouter `technicalCapabilities: TechnicalCapability[]` sur `LabTestMean` (après `atas`, avant `projects`).

#### DTO backend
- Étendre `lib/atom-api.ts` avec `technicalCapabilities: string[] | null` sur `LabTestMeanDto`.

#### Adapter
- Étendre `lib/labtestmean-adapter.ts` avec un mapping qui :
  - Filtre les `null` / chaînes vides.
  - Normalise vers les valeurs canoniques (kebab-case) — accepte les variantes courantes (`"Aircraft Simulation Package"`, `"AIRCRAFT_SIMULATION_PACKAGE"`, `"aircraft-simulation-package"` → tous → `"aircraft-simulation-package"`).
  - Ignore silencieusement les valeurs inconnues (avec un `console.warn` cohérent avec `toBool`).

#### Chip individuelle
- Nouveau `components/ChipCapability.tsx` : reçoit `{ capability: TechnicalCapability }`, rend `<span>` avec tooltip natif `title=` + `aria-label=`. L'icône à l'intérieur est sélectionnée par un mapping `capability → Icon`.

#### Conteneur de chips
- Nouveau `components/ChipCapabilities.tsx` : reçoit `{ capabilities: TechnicalCapability[] }`. Si vide → `null`. Sinon → fragment React de `<ChipCapability>` (pas de wrapper supplémentaire, pour que le `gap-2` de la rangée parente s'applique uniformément).

#### Intégration header
- Dans `LabTestMeanHeader.tsx`, ajouter `<ChipCapabilities capabilities={m.technicalCapabilities} />` à la fin de la rangée de chips, après `<ChipAccessControl>`.

### Non-Functional Requirements
- **Pas de nouvelle dépendance npm** (icônes SVG inline).
- **Theme** : héritage `currentColor` → mode clair/sombre OK sans config.
- **Accessibilité** : icône `aria-hidden`, `aria-label` sur le wrapper porte le sens. Tooltip natif via `title=` (cohérent avec `ChipComplexity`).
- **Responsive** : la rangée est déjà en `flex-wrap` → si la largeur manque, les nouvelles chips passent à la ligne suivante. Aucune contrainte additionnelle.
- **Performance** : aucune nouvelle requête, le champ vient avec le payload existant.

## Scope

### In Scope
- Créer `components/icons/CapabilityIcon.tsx` (4 icônes nommées).
- Créer `components/ChipCapability.tsx` (chip unitaire).
- Créer `components/ChipCapabilities.tsx` (conteneur de chips).
- Modifier `components/LabTestMeanHeader.tsx` pour insérer `<ChipCapabilities>` après `<ChipAccessControl>`.
- Modifier `lib/types.ts` : ajout de `TechnicalCapability` (enum union) + `technicalCapabilities: TechnicalCapability[]` sur `LabTestMean`.
- Modifier `lib/atom-api.ts` : ajout du champ DTO miroir.
- Modifier `lib/labtestmean-adapter.ts` : mapping + normalisation + warn sur valeurs inconnues.

### Out of Scope
- **Description longue** au survol (la phrase complète du screenshot, ex. "Suite of high-fidelity mathematical models...") — tooltip natif limité, V2 mérite un composant tooltip riche dédié.
- **Filtrage du catalogue / map** par capability — V2.
- **Édition** des capabilities depuis l'UI — read-only.
- **Couleur sémantique par capability** (vert pour Auto Testing, etc.) — V1 reste uniforme `currentColor`.
- **Mutual exclusion** Remote Access / No Remote Access côté UI — délégué au backend.
- **Affichage sur la grille catalogue** — la fiche détail reste l'endroit dédié.

## Affected Areas
- **Créer** :
  - `components/icons/CapabilityIcon.tsx`
  - `components/ChipCapability.tsx`
  - `components/ChipCapabilities.tsx`
- **Modifier** :
  - `components/LabTestMeanHeader.tsx` — insertion `<ChipCapabilities>` dans la rangée chips (ligne 41-45).
  - `lib/types.ts` — type `TechnicalCapability` + champ `technicalCapabilities` sur `LabTestMean`.
  - `lib/atom-api.ts` — champ `technicalCapabilities: string[] | null` sur `LabTestMeanDto`.
  - `lib/labtestmean-adapter.ts` — mapping avec normalisation + filtre + `console.warn`.
- **Non touché** :
  - Catalogue `/`, map `/map` — pas d'usage en V1.
  - Composants existants (chips, lifecycle, programmes avion, ATA…).

## Edge Cases
- **`m.technicalCapabilities` vide** → `<ChipCapabilities>` retourne `null`. Rangée chips inchangée.
- **1 seule capability** → 1 chip ajoutée à la fin de la rangée. Acceptable.
- **4 capabilities** → 4 chips supplémentaires. Total avec Type+Complexity+AccessControl = 7 chips. Le `flex-wrap` gère le débord à l'écran étroit.
- **Remote Access + No Remote Access ensemble** (incohérence backend) → les 2 chips affichées, le tooltip distingue. Pas de masquage UI.
- **Valeur inconnue côté backend** (ex: `"Manual Testing"`) → ignorée par l'adapter, `console.warn` émis avec `dto.externalId`.
- **Casse / format hétérogène** côté backend (`"Remote Access"`, `"REMOTE_ACCESS"`, `"remote-access"`) → tous normalisés en `"remote-access"` par l'adapter.
- **Champ DTO totalement absent** → adapter renvoie `[]`. Aucune régression.
- **Tooltip sur mobile** : tooltip natif `title=` ne s'affiche pas au tap. Acceptable en V1, l'icône reste lisible. Tooltip riche au tap = V2.

## Open Questions
- **Forme finale des icônes** : les 4 propositions (cube, refresh+check, WiFi, WiFi barré) sont des recommandations. À valider visuellement après première implémentation, surtout pour `Aircraft Simulation Package` qui n'a pas de glyphe canonique évident. => *attente du retour user après rendu* => ok
- **Couleur sémantique** : neutre `currentColor` en V1 ou couleurs distinctes (ex: bleu pour Sim, vert pour Auto Testing, gris pour Remote, rouge pour No Remote) ? Recommandation V1 : neutre, pour ne pas surcharger une rangée déjà chargée. À reconsidérer si l'utilisateur a du mal à distinguer les chips d'un coup d'œil. => suivre recommendation
- **Format backend exact** : on parie sur `string[]` libre (avec normalisation côté adapter). Si le backend livre des objets `{ code, label }`, ajustement trivial dans le DTO + `.map()`. => suivre recommendation car retourne bien "technicalCapabilities": [
            "acSimuPackage",
            "remoteAccess",
            "autoTesting"
        ],
- **Inclure la description longue dans le tooltip** : V1 = libellé court (`"Aircraft Simulation Package"`). V2 = phrase complète issue du screenshot, sur tooltip riche custom. => V1

## Acceptance Criteria
- [ ] Sur une fiche avec ≥ 1 capability, des chips icône-seule apparaissent à droite de `ChipAccessControl`, dans la même rangée.
- [ ] Chaque chip a un **tooltip natif** (au survol) affichant le libellé complet (`"Aircraft Simulation Package"`, etc.) et un `aria-label` identique pour les lecteurs d'écran.
- [ ] Les 4 capabilities ont chacune un pictogramme distinct, clairement différenciable au scan.
- [ ] Sur une fiche **sans capability** (champ vide ou absent côté backend), aucune chip ne s'ajoute → pas de régression visuelle.
- [ ] L'adapter normalise les variantes de casse et ignore les valeurs inconnues (avec `console.warn`).
- [ ] Mode clair / sombre : icônes lisibles via `currentColor`.
- [ ] Aucune nouvelle dépendance npm. `npm run build` OK, types stricts OK.
