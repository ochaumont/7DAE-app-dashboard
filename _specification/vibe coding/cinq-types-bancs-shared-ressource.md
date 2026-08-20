# Feature Spec: Cinq Types de Bancs (ajout « SHARED RESSOURCE »)

## Summary
- Le type d'un lab test mean ne compte pas 3 mais **5 valeurs canoniques** :
  | clé backend | valeur affichée |
  |---|---|
  | `simu` | **SIMULATOR** |
  | `sib` | **SIB** |
  | `fib` | **FIB** |
  | `rt` | **RT** |
  | `share` | **SHARED RESSOURCE** |
- Ajouter le nouveau type **`share` → SHARED RESSOURCE**, corriger les libellés (`SIMU` → « SIMULATOR », `RT` → « RT »), et répercuter partout (adapter, type, libellés, icône, filtre, chips, export PDF).

## Motivation
Le code ne gère aujourd'hui que 4 valeurs réelles (`SIB`, `SIMU`, `FIB`, `RT`) + un repli `NA`, et certains libellés ne correspondent pas à l'attendu :
- `lib/types.ts` : `LabTestMeanType = "SIB" | "SIMU" | "FIB" | "RT" | "NA"` (pas de `SHARE`).
- `lib/atom-api.ts` : `category: "sib" | "simu" | "fib" | "RT" | null` (pas de `share`).
- `lib/labtestmean-adapter.ts` : `TYPE_MAP = { sib, simu, fib, RT }` (pas de `share` ; `rt` n'est mappé qu'en casse `RT`).
- `lib/labels.ts` : `TYPE_LABELS` affiche `SIMU` = « SIMU » (attendu « SIMULATOR ») et `RT` = « Mean ResearchOnTest » (attendu « RT »).

Conséquence : un banc de type `share` retombe sur `NA`, et les libellés `SIMU`/`RT` sont incorrects dans les chips, le filtre et l'export PDF.

## Requirements

### Functional Requirements

#### 1. Nouveau type canonique « SHARE »
- Ajouter une valeur de type frontend pour la ressource partagée (clé backend `share`).
- Toute donnée dont la catégorie backend vaut `share` doit être classée dans ce type (et non plus `NA`).

#### 2. Mapping backend → frontend
- L'adaptateur doit mapper les **5** clés : `simu`, `sib`, `fib`, `rt`, `share` vers leurs types frontend.
- Le mapping doit être **insensible à la casse** pour `rt`/`RT` (le backend peut renvoyer l'une ou l'autre forme), et idéalement pour toutes les clés.
- Une catégorie inconnue ou nulle reste rattachée au repli `NA` (catch-all interne, non listé comme type officiel).

#### 3. Libellés d'affichage
- `simu` → **SIMULATOR**
- `sib` → **SIB**
- `fib` → **FIB**
- `rt` → **RT**
- `share` → **SHARED RESSOURCE**
- Ces libellés s'appliquent partout via la source unique `lib/labels.ts` (`TYPE_LABELS`) : chips, barre de filtre, fiche détail, export PDF.

#### 4. Filtre par type
- Le filtre « Type » doit proposer le nouveau type lorsqu'il est présent dans les données (la liste est dérivée des données via `uniqueTypes`).
- L'affichage du filtre utilise les libellés ci-dessus.
- Vérifier l'ordre d'affichage des types (cohérent et stable, cf. Open Questions).

#### 5. Icône
- `components/icons/TypeIcon.tsx` mappe **chaque** type vers un glyphe (`Record<LabTestMeanType, …>`) : ajouter un glyphe pour le nouveau type `share` (sinon erreur de type / icône manquante).

### Non-Functional Requirements
- **Aucune régression** sur les 4 types existants, le filtrage, la pagination, la carte, l'export PDF.
- Source unique des libellés conservée (`lib/labels.ts`) — pas de re-duplication des mappings.
- Compatible export statique (`output: "export"`).

## Scope

### In Scope
- Ajout du type `share` / « SHARED RESSOURCE » de bout en bout (DTO → adapter → type → libellé → icône → filtre → chips → PDF).
- Correction des libellés `SIMU` → « SIMULATOR » et `RT` → « RT ».
- Robustesse de casse du mapping (`rt`/`RT`).

### Out of Scope
- Modification du backend / de l'API (on s'aligne sur ce qu'il renvoie : clés `simu|sib|fib|rt|share`).
- Refonte visuelle des chips/filtre au-delà de l'ajout du nouveau type.
- Changement de la logique de statut, complexité, etc.

## Affected Areas
- `lib/types.ts` : ajouter la valeur de type (`SHARE`) à `LabTestMeanType`.
- `lib/atom-api.ts` : ajouter `share` à l'union `LabTestMeanDto.category`.
- `lib/labtestmean-adapter.ts` : `TYPE_MAP` + `toType` (ajout `share`, casse insensible pour `rt`).
- `lib/labels.ts` : `TYPE_LABELS` (SIMU → « SIMULATOR », RT → « RT », ajout SHARE → « SHARED RESSOURCE »).
- `components/icons/TypeIcon.tsx` : glyphe pour le nouveau type.
- `components/FilterBar.tsx` / `components/FilterSheet.tsx` : prise en compte du nouveau type (ordre éventuel).
- `components/ChipType.tsx` : aucun changement de code (utilise déjà `TYPE_LABELS` + `TypeIcon`), mais à vérifier visuellement.
- `components/pdf/BenchDetailPage.tsx` : utilise `TYPE_LABELS` (source unique) → libellés mis à jour automatiquement.
- (`lib/labtestmeans.ts` `uniqueTypes` : dérive du data, pas de liste en dur à modifier — à confirmer.)

## Edge Cases
- **Casse de la clé backend** : `rt` vs `RT`, et `SHARE` vs `share` → le mapping doit accepter les variantes (sinon retombe en `NA`).
- **Catégorie nulle / inconnue** : reste `NA` (repli), ne casse pas le filtre.
- **Orthographe du libellé** : « SHARED RESSOURCE » (double S, orthographe française) vs « SHARED RESOURCE » — à confirmer (cf. Open Questions).
- **Données existantes** : des bancs actuellement classés `NA` parce que `share` n'était pas géré doivent désormais apparaître sous le bon type.
- **Filtre** : si aucun banc `share` n'est présent, l'option n'apparaît pas (comportement normal, dérivé des données).
- Vérifier qu'aucun `Record<LabTestMeanType, …>` exhaustif (libellés, glyphes) n'oublie le nouveau type (erreur TypeScript sinon — utile comme garde-fou).

## Open Questions
- **Orthographe** : garder « SHARED RESSOURCE » tel quel, ou corriger en « SHARED RESOURCE » ? =>  SHARED RESOURCE 
- **Valeur interne** du type frontend pour `share` : `SHARE` ou `SHARED` ? (n'impacte que le code, pas l'affichage) => SHARE
- **Ordre d'affichage** des types dans le filtre : ordre fixe souhaité (ex. SIMULATOR, SIB, FIB, RT, SHARED RESSOURCE) ou ordre dérivé des données ? => ordre fixe
- Faut-il une **couleur/icône** spécifique pour « SHARED RESSOURCE », ou un style neutre suffit-il ? => style neutre

## Acceptance Criteria
- [ ] Un banc de catégorie backend `share` s'affiche avec le type **SHARED RESSOURCE** (chip, filtre, fiche, PDF), plus jamais `NA`.
- [ ] Les libellés sont : SIMULATOR / SIB / FIB / RT / SHARED RESSOURCE.
- [ ] Le filtre « Type » propose les 5 types présents dans les données et filtre correctement, y compris le nouveau.
- [ ] Le mapping fonctionne quelle que soit la casse de `rt`/`RT` (et `share`/`SHARE`).
- [ ] Une icône s'affiche pour le nouveau type (pas de glyphe manquant).
- [ ] Aucune régression sur SIB / FIB / RT / SIMU(LATOR) ni sur le filtrage, la carte, l'export PDF.
- [ ] `npm run build` passe sans erreur (les `Record<LabTestMeanType, …>` exhaustifs compilent).
