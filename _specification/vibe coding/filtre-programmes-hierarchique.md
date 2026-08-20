# Feature Spec: Filtre Programmes hiérarchique (arbre Aircraft Structure)

## Summary
- **Remplacer** le filtre plat « Program » de la `FilterBar` (catalogue + carte) par une **vue hiérarchique** (arbre) basée sur la structure aéronef officielle exposée par `GET /api/infos/aircraftStructures/tree`.
- La hiérarchie comporte plusieurs niveaux (`programFamily` → `aircraftType` → `aircraftSeries` / `aircraftModel` → `aircraftModel` → `aircraftProject`) et doit être affichable / repliable.
- **Multi-select** : l'utilisateur peut cocher plusieurs nœuds, à n'importe quel niveau de l'arbre.
- **Sélection d'un parent ⇒ match implicite sur tous les descendants** : si l'utilisateur coche `A380`, tous les LTMs rattachés à `A380-700`, `A380-800`, `380-841`, etc. sont retenus, sans avoir à cocher explicitement chaque feuille.

## Motivation
- Le filtre Programmes actuel (`components/FilterBar.tsx` → bloc « Program ») est **plat** : il dérive simplement les noms uniques de `dto.financeAircraftPrograms` (`lib/labtestmean-adapter.ts:256`, `lib/labtestmeans.ts:83-84`). Pour ~314 LTMs, cela produit une longue liste de pills sans regroupement, où l'utilisateur doit savoir que `A380-841` est un sous-modèle de `A380-800` qui appartient à la famille `DD-A380`.
- L'API `atom-synchronizer-dev` expose déjà la **taxonomie officielle Airbus** via `GET /api/infos/aircraftStructures/tree` (cf. `temp/AircraftStructure.json`). Cinq catégories de nœuds (`programFamily`, `aircraftType`, `aircraftSeries`, `aircraftModel`, `aircraftProject`) couvrent toute la flotte (CS-A220, DD-A380, LR-A330, etc.) plus deux racines spéciales `ENVIRONMENT` et `EXTERNAL` (ATR42 / ATR72).
- Le besoin métier : pouvoir cliquer **« A380 »** et voir l'ensemble des bancs rattachés à n'importe quel sous-modèle, sans énumérer manuellement les ~10 sous-versions. Le filtre plat oblige aujourd'hui à présélectionner toutes les pills enfants une à une.

## Décisions (arbitrées)
- **Source de l'arbre** : nouvel appel HTTP côté server `GET ${ATOM_API_BASE_URL}/api/infos/aircraftStructures/tree`, encapsulé dans `lib/atom-api.ts` (nouvelle fonction `getAircraftStructureTree()` modelée sur `getLabTestMeans()`) puis caché via `lib/labtestmeans.ts`-style React `cache(...)` dans un nouveau module `lib/aircraftStructure.ts`.
- **Clé de jointure LTM ↔ arbre** : on conserve **le `name`** (cf. `programs: string[]` actuel, alimenté par `financeAircraftPrograms.name`). C'est cohérent avec les filtres existants (Country, Portfolio) et n'impose aucune migration côté DTO. Ouverture en open question si jamais le DTO LTM expose un `id` matchant les `id` de l'arbre — non vérifié à ce stade.
- **Rendu UI** : nouveau composant `<TreeFilter>` (interne au dossier `components/`), checkbox + chevron par nœud, indentation par profondeur, **un seul axe** dans la `FilterBar` à la place du bloc Program actuel. Pas de réutilisation du `Toggle` plat existant.
- **Sélection multi-niveau** : l'utilisateur stocke un **Set d'IDs de nœud** (`programNodeIds: string[]`). Cocher un parent **n'auto-coche pas visuellement** les enfants — l'expansion à tous les descendants se fait **au moment du filtrage** côté `filterLabTestMeans` (helper qui applatit chaque ID sélectionné en l'union de ses descendants + lui-même, puis matche par nom).
- **État d'ouverture / fermeture** : tous les `programFamily` (racines) sont **repliés par défaut**. L'utilisateur les déplie via un chevron. L'état d'ouverture est local au composant (`useState`), non persisté.
- **Affichage du compteur** : à droite de chaque libellé de nœud, afficher entre parenthèses le **nombre de LTMs rattachés à ce nœud ou à un descendant** (ex. `A380 (32)`). Optionnel mais fortement utile pour décider quoi cocher.
- **Position dans la barre** : à la même place que l'actuel bloc Program (ordre actuel : Type → Status → Country → Portfolio → Complexity → **Program** → ...). Le nouveau filtre prend le label « Aircraft programs » (libellé plus précis que « Program »).
- **Mode mobile** (`FilterSheet`) : même composant, même comportement. La sheet doit pouvoir scroller verticalement : l'arbre déplié peut être long.
- **Échec de l'appel** : si `getAircraftStructureTree()` échoue (réseau, 500), la `FilterBar` **omet le filtre Programmes** plutôt que de planter (défensif comme `app/error.tsx`). Aucune dégradation des autres axes. Un log côté serveur suffit.
- **Suppression du filtre plat** : on **retire** complètement `programs: string[]` de `FilterValue` et la logique `f.programs` de `filterLabTestMeans`. Le champ `programs` reste sur `LabTestMean` (utilisé par les `programs` flatMap dans la recherche `m.programs` cf. `lib/labtestmeans.ts:69`) — seul le filtre dédié change.

## Requirements

### Functional Requirements

#### Modèle / type
- Nouveau type `AircraftStructureNode` dans `lib/types.ts` :
  ```
  {
    id: string;
    name: string;
    category: "programFamily" | "aircraftType" | "aircraftSeries" | "aircraftModel" | "aircraftProject";
    code: string;
    parentId?: string;
    parentName?: string;
    children?: AircraftStructureNode[];
  }
  ```
- L'arbre est un `AircraftStructureNode[]` (racines).

#### Fetch
- `lib/atom-api.ts` : ajouter `getAircraftStructureTree(): Promise<AircraftStructureNode[]>` qui appelle `GET ${ATOM_API_BASE_URL}/api/infos/aircraftStructures/tree`. Mêmes conventions d'erreur (`AtomApiError`, `status: 0` pour panne réseau) que `getLabTestMeans()`.
- `lib/aircraftStructure.ts` (nouveau module) :
  - `getAircraftTreeCached()` — wrap `cache(...)` autour du fetch.
  - `flattenDescendantNames(node: AircraftStructureNode): Set<string>` — retourne l'ensemble des `name` du nœud + tous ses descendants.
  - `expandSelection(tree: AircraftStructureNode[], selectedIds: string[]): Set<string>` — pour une sélection d'IDs, retourne l'ensemble unifié des `name` correspondant à tous les descendants des nœuds cochés (incluant les nœuds eux-mêmes).
  - `countLabTestMeansForNode(node: AircraftStructureNode, ltms: LabTestMean[]): number` — utilisé pour le badge compteur.

#### Helper / filtrage
- `lib/labtestmeans.ts` :
  - **Supprimer** le champ `programs?: string[]` de `Filters` et le bloc correspondant dans `filterLabTestMeans` (`labtestmeans.ts:46-48`).
  - **Ajouter** `programNodeNames?: Set<string>` à `Filters` (déjà résolu en noms par le client, pour découpler `filterLabTestMeans` de l'arbre).
  - Étendre `filterLabTestMeans` :
    ```
    if (f.programNodeNames && f.programNodeNames.size > 0) {
      if (!m.programs.some((p) => f.programNodeNames!.has(p))) return false;
    }
    ```
  - **Conserver** `uniquePrograms` pour l'instant (encore consommé par la barre de recherche `lib/labtestmeans.ts:69`) **ou** le supprimer si plus aucun consommateur ne l'utilise une fois la `FilterBar` migrée — à valider à l'implémentation.

#### UI — `<TreeFilter>` (nouveau)
- Composant client (`components/TreeFilter.tsx`).
- Props :
  - `tree: AircraftStructureNode[]`
  - `selectedIds: string[]`
  - `onChange: (ids: string[]) => void`
  - `counts?: Map<string, number>` (compteur par nœud, optionnel)
- Rendu : pour chaque nœud, une ligne avec :
  - chevron `▸ / ▾` (cliquable, déplie/replie) — visible uniquement si `children?.length`.
  - checkbox.
  - libellé `node.name` puis ` (count)` si fourni.
  - indentation `paddingLeft = depth * 12px`.
- Tous les `programFamily` repliés par défaut. Tri alphabétique des frères à chaque niveau.
- Cocher un nœud n'auto-coche pas visuellement les enfants — l'expansion logique est faite par `expandSelection` côté `CatalogueClient` / `MapClient`.

#### UI — `FilterBar` (modifié)
- Retirer le bloc `<div>Program</div>` actuel (`FilterBar.tsx:152-159`).
- Le remplacer par un bloc « Aircraft programs » qui affiche `<TreeFilter>` quand `tree?.length > 0`. Si `tree` est vide / non fourni (échec serveur), ne rien afficher.
- Modifier `FilterValue` : retirer `programs: string[]`, ajouter `programNodeIds: string[]`.
- Modifier `Props` de `FilterBar` : retirer `programs: string[]`, ajouter `tree: AircraftStructureNode[]` et `programCounts?: Map<string, number>`.

#### UI — `FilterSheet` (mobile)
- Symétrique : forwarder `tree` et `programCounts` à la `FilterBar` interne. Mettre à jour `count` pour inclure `value.programNodeIds.length` à la place de `value.programs.length`.

#### Câblage clients
- `components/CatalogueClient.tsx` et `components/MapClient.tsx` :
  - Étendre `Props` : retirer `programs: string[]`, ajouter `tree: AircraftStructureNode[]` et `programCounts?: Map<string, number>`.
  - Initialiser `filters.programNodeIds: []` (à la place de `filters.programs: []`).
  - Au moment du filtrage (dans le `useMemo` qui appelle `filterLabTestMeans`), calculer `programNodeNames = expandSelection(tree, filters.programNodeIds)` et passer dans `filterLabTestMeans`.
  - Forwarder `tree` et `programCounts` à `<FilterBar>` et `<FilterSheet>`.

#### Câblage server-side (`app/page.tsx`, `app/map/page.tsx`)
- Fetcher l'arbre **en parallèle** des LTMs : `const [all, tree] = await Promise.all([getLabTestMeans(), getAircraftTreeCached().catch(() => [])]);`.
- Calculer `programCounts` une fois côté serveur (Map<id, number>) en parcourant l'arbre + les LTMs.
- Passer `tree` et `programCounts` à `CatalogueClient` / `MapClient`.
- **Ne plus** passer `programs={uniquePrograms(all)}`.

#### Sérialisation `lib/filterDescription.ts`
- Le bloc PDF/serializer doit refléter la sélection. Passer du libellé `Programs: a, b, c` à `Aircraft programs: <nom du nœud sélectionné> [+ N descendants]` ou simplement la liste des noms de nœuds cochés (à arbitrer, valeur défaut : liste des noms cochés).
- Nécessite que `serializeFilters` reçoive aussi `tree` ou un mapping `id → name`. À traiter à l'implémentation.

### Non-Functional Requirements
- **Un seul nouvel appel HTTP** (le tree). Caché côté serveur via `cache()` pour rester request-scoped.
- **0 nouvelle dépendance** : pas de lib de tree-view. Implémentation maison ~80 lignes.
- **Performance** : l'arbre fait ~250 nœuds. Le `flattenDescendantNames` se fait à la sélection (≤ quelques fois par render mémoïsé). Filtrage O(n_LTM × n_selected_names) reste sous la milliseconde.
- **Theming** : checkbox et chevron utilisent les tokens existants (`--color-fg`, `--color-accent`, `--color-border`). Indentation hiérarchique = padding-left, pas de bordures latérales.
- **Accessibilité** : checkbox = `<input type="checkbox">` natif (gère `aria-checked`, focus visible). Chevron = `<button aria-expanded>`.
- **Compatibilité** : si l'API `aircraftStructures/tree` n'existe pas encore en environnement local, le client doit dégrader silencieusement (filtre absent, pas de crash).
- **Server-side first** : le tree est passé via props depuis le composant serveur — pas de fetch dans le client.

## Scope

### In Scope
- Nouvel endpoint client (`getAircraftStructureTree`) + module `lib/aircraftStructure.ts`.
- Nouveau composant `<TreeFilter>` (rendu hiérarchique, multi-select, expand/collapse).
- Migration de `FilterValue.programs` → `FilterValue.programNodeIds` dans `FilterBar`, `FilterSheet`, `CatalogueClient`, `MapClient`.
- Adaptation de `filterLabTestMeans` (nouveau champ `programNodeNames: Set<string>`).
- Mise à jour de `app/page.tsx`, `app/map/page.tsx` (fetch parallèle + calcul de `programCounts`).
- Mise à jour de `lib/filterDescription.ts` pour refléter la nouvelle sélection.
- Suppression du bloc plat « Program » et de `uniquePrograms` côté `FilterBar` (le helper peut être conservé s'il est encore consommé).

### Out of Scope
- **Persistance dans l'URL** des nœuds sélectionnés (`?programs=…`) — non scopé tant que les autres filtres ne sont pas non plus persistés.
- **Affichage de l'arbre sur la fiche LTM** ou dans la card du catalogue.
- **Recherche libre dans l'arbre** (filtrer les nœuds à mesure que l'utilisateur tape) — utile si l'arbre devient très grand, à demander en spec dédiée.
- **Sélection partielle visualisée sur le parent** (état "indeterminate" lorsque seuls certains enfants sont cochés explicitement) — non, on ne coche pas explicitement les enfants individuellement par défaut, donc l'état "indeterminate" n'a pas de sens dans ce modèle.
- **Auto-coche des enfants** quand on coche un parent : volontairement non, on garde la sélection minimale et on étend au moment du filtrage. Si un jour l'utilisateur souhaite décocher un enfant spécifique sous un parent coché (« A380 sauf A380-841 »), il faudra spécifier la sémantique d'exclusion — non couvert ici.
- **Migration du DTO LabTestMean** pour exposer les `id` Aircraft Structure (matching par id au lieu de name) — non requis pour cette spec.
- **Cache long-terme de l'arbre** entre requêtes (Redis / fichier) : on s'appuie sur le `revalidate: 60` natif de `fetch` Next.js comme pour les LTMs.

## Affected Areas
- **Modifier** :
  - `lib/atom-api.ts` — ajouter `getAircraftStructureTree()`.
  - `lib/types.ts` — ajouter `AircraftStructureNode`.
  - `lib/labtestmeans.ts` — retirer `Filters.programs`, ajouter `Filters.programNodeNames: Set<string>`, adapter `filterLabTestMeans`. `uniquePrograms` peut être conservé ou supprimé.
  - `lib/filterDescription.ts` — adapter la sortie aux IDs résolus.
  - `components/FilterBar.tsx` — retirer bloc Program plat, ajouter bloc « Aircraft programs » avec `<TreeFilter>`. Mettre à jour `FilterValue` et `Props`.
  - `components/FilterSheet.tsx` — symétrique mobile.
  - `components/CatalogueClient.tsx` — état, expansion, props, forwarding.
  - `components/MapClient.tsx` — idem.
  - `app/page.tsx` — `Promise.all([getLabTestMeans(), getAircraftTreeCached().catch(() => [])])` + `programCounts`.
  - `app/map/page.tsx` — idem.
- **Ajouter** :
  - `components/TreeFilter.tsx` — nouveau composant client.
  - `lib/aircraftStructure.ts` — fetch caché + helpers `flattenDescendantNames`, `expandSelection`, `countLabTestMeansForNode`.
- **Non touché** :
  - `lib/labtestmean-adapter.ts` — pas de changement DTO LTM, on continue de mapper `programs` à partir de `financeAircraftPrograms.name`.
  - `components/MapView.tsx` — la chaîne reçoit toujours la liste filtrée.
  - Composants détail / fiche.

## Edge Cases
- **Échec du fetch tree** : la `FilterBar` n'affiche tout simplement pas le bloc Programmes. Les autres filtres restent fonctionnels.
- **Arbre vide** (`[]`) : idem, bloc absent.
- **Sélection d'un parent dont aucun descendant n'a de LTM rattaché** : matche zéro LTM → état vide affiché normalement.
- **LTM avec `programs: []`** (aucun programme rattaché) : un tel LTM **n'apparaît jamais** quand le filtre Programmes est actif. Cohérent avec le filtre plat actuel. Pas de sentinelle « Unassigned » dans cette spec (cf. open question).
- **Programme côté LTM dont le nom n'existe pas dans l'arbre** : invisible dans le filtre, mais reste accessible via les autres axes. À surveiller : si l'écart est récurrent, ouvrir un ticket data quality.
- **Doublons de nom dans l'arbre** (ex. deux nœuds nommés `A330-200` à des emplacements différents) : très improbable, mais le matching par `name` peut sur-matcher. Acceptable pour l'instant ; en cas de problème, basculer la jointure sur `id` (suppose une migration DTO côté backend).
- **Nœuds sans enfants** (feuilles) : pas de chevron, juste la checkbox.
- **Compteurs** : un LTM rattaché à plusieurs descendants d'un même parent ne doit être compté qu'**une seule fois** dans le compteur du parent (déduplication sur l'ID LTM).
- **Catégorie inconnue** apparaissant dans l'arbre : tolérée, le composant ne dépend pas de la catégorie pour le rendu (juste pour l'éventuelle stylisation du parent racine, optionnelle).
- **Mode sombre / clair** : pas de particularité, hérite des tokens.

## Open Questions
- **Faut-il afficher un compteur `(N)` à côté de chaque nœud** ? **Recommandation : oui**, l'utilité est forte pour la prise de décision et le coût d'implémentation est faible. À confirmer. => oui
- **Faut-il auto-cocher les enfants** quand on coche un parent ? **Recommandation : non**, la sélection reste sur le nœud coché et l'expansion se fait au filtrage. Plus simple, plus prévisible, et permet la future fonction « décoche un enfant » sans ambiguïté. => suivre recommendation
- **Faut-il représenter les LTMs sans programme** par une sentinelle « Aucun programme » dans l'arbre ? **Recommandation : non** dans cette spec, mais à valider — est-ce un cas métier réel ? => oui il faut pouvoir les distinguer
- **Faut-il garder le matching par `name`** ou basculer sur `id` ? Dépend de ce que `dto.financeAircraftPrograms` expose. **Recommandation : `name` pour cette spec** (zéro impact backend), avec un suivi côté équipe synchronizer pour exposer aussi l'`id` plus tard. => reste sur le name
- **Le label du bloc** doit-il être « Aircraft programs », « Programs », ou rester « Program » ? **Recommandation : « Aircraft programs »** (plus précis, désambiguë des « portfolios »). À confirmer avec l'équipe métier. => suivre recommendation
- **L'état d'ouverture / fermeture des nœuds doit-il persister** dans `localStorage` (par utilisateur) ? **Recommandation : non pour V1**, état local. Si gêne ergonomique, à itérer. => non
- **Faut-il une recherche / filtre libre** dans l'arbre (« Filtrer les nœuds … ») ? **Recommandation : non pour V1**. Si l'arbre devient long, à reprendre.=> si il le faut, l'arbre est trop grand
- **Faut-il tracer les expansions / sélections** (analytics) ? Hors scope. => non

## Acceptance Criteria
- [ ] Sur `/` (catalogue) et `/map`, le bloc « Program » plat actuel est **remplacé** par un bloc « Aircraft programs » présentant un arbre.
- [ ] Les racines (`programFamily` / `ENVIRONMENT` / `EXTERNAL`) sont **repliées par défaut**. Cliquer sur le chevron déplie le nœud.
- [ ] Cocher la case d'un nœud **parent** filtre la liste / les cercles aux LTMs rattachés à **au moins un descendant** (ou au nœud lui-même).
- [ ] **Multi-select** : plusieurs nœuds, à des niveaux différents, peuvent être cochés simultanément. Union sur cet axe.
- [ ] L'arbre est **trié alphabétiquement** par niveau (frères entre eux).
- [ ] Si l'API `aircraftStructures/tree` échoue, le bloc Programmes n'est **pas affiché** ; les autres filtres restent fonctionnels.
- [ ] Le compteur `(N)` à côté de chaque nœud reflète le **nombre de LTMs uniques** rattachés à ce nœud ou à un descendant. (Si l'open question ci-dessus est tranchée « non », retirer ce critère.)
- [ ] Sur mobile, la `FilterSheet` propose le même arbre, scroll vertical inclus si nécessaire.
- [ ] La barre de recherche libre continue de matcher sur `programs` (texte libre dans `m.programs`) — comportement inchangé.
- [ ] Le PDF/serializer (`lib/filterDescription.ts`) reflète la sélection des nœuds (par leur nom).
- [ ] Types TypeScript stricts : `AircraftStructureNode`, `FilterValue.programNodeIds: string[]`, `Filters.programNodeNames: Set<string>`.
- [ ] Pas de nouvelle dépendance npm. Build OK (`npm run build`), `tsc --noEmit` clean.
- [ ] Aucune régression sur la fiche détail, le `/health`, le bouton de thème.
