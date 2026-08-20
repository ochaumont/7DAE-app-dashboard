# Feature Spec: Filtre par portfolio

## Summary
- Ajouter un **nouveau filtre Portfolio** dans le panneau `FilterBar` (catalogue + carte), à côté des filtres Type / Status / Complexity / Country / Program.
- Le filtre est **multi-select** (toggle pills), même UX que les autres filtres.
- Les valeurs proposées sont la **liste des portfolios** auxquels au moins un LTM est rattaché, plus une valeur explicite **« None »** pour les LTMs **sans portfolio**.
- L'utilisateur peut combiner ce filtre avec les autres : la grille catalogue **et** les cercles de la carte se mettent à jour en conséquence.

## Motivation
- Le DTO d'un LTM contient un champ `portfolio: { id, externalId, name } | null` (cf. `temp/requestExample.json:266-273` → `LTM_TOULOUSE`). Côté backend, les portfolios représentent une **organisation transverse aux sites** (LTM_BREMEN, LTM_FILTON, LTM_HAMBOURG, LTM_TOULOUSE, LTM_DEVELOPMENT — cf. `temp/examplePortfolio.json`). C'est un axe de découpe métier que les responsables LTM utilisent au quotidien et que la dashboard ne propose pas encore.
- Aujourd'hui, l'utilisateur peut filtrer par site (via `country` indirectement, ou en lisant la liste), mais **pas par portfolio**. Or les portfolios ne sont pas équivalents aux sites : `LTM_DEVELOPMENT` est un portfolio non-géographique qui rassemble les bancs encore en projet.
- Certains LTMs n'ont **aucun portfolio** rattaché (`portfolio: null` dans le DTO). Aujourd'hui ils sont noyés dans la masse — un filtre `None` permet de les isoler explicitement, ce qui est utile pour l'équipe data quality (lister les bancs orphelins à compléter).

## Décisions (arbitrées)
- **Source des valeurs du filtre** : on **dérive la liste à partir des LTMs déjà fetchés** (`getLabTestMeans()`), à l'image de `uniquePrograms` / `uniqueCountries`. **Pas d'appel séparé** à `/api/infos/portfolios/LTM` — un portfolio sans aucun LTM rattaché n'apporte rien dans un filtre (cliquer dessus donnerait zéro résultat). On reste cohérent avec le pattern existant.
- **Granularité de l'identifiant** : on utilise le **nom** du portfolio (`portfolio.name`, ex. `LTM_TOULOUSE`) comme clé de filtre, comme pour `country` et `program`. Pas de table de mapping vers un libellé prettifié — les noms sont déjà lisibles.
- **Valeur « None »** : représentée côté front par une **constante sentinelle** `"__none__"` dans la liste des options, libellée `"None"` dans la pill, qui matche les LTMs où `portfolio === null`.
- **Sélection** : multi-select, même composant `Toggle` générique que `FilterBar` utilise déjà pour les autres axes.
- **Sémantique de filtrage** : si **aucune** valeur n'est sélectionnée, le filtre est inactif (tous passent). Sinon, un LTM passe si son portfolio (ou l'absence de portfolio) est dans la sélection. Comme pour les autres filtres, l'union au sein d'un même axe et l'intersection entre axes.
- **Position du filtre dans la barre** : juste **après Program** — c'est l'axe sémantiquement le plus proche (taxonomie organisationnelle), et ça ne pousse rien d'autre vers le haut.
- **Tri des options** : alphabétique sur les noms de portfolio, et **« None » en dernier** (comportement classique pour la valeur sentinelle, qui n'est pas une vraie valeur métier).
- **Côté mobile** (`FilterSheet`) : même filtre, même position.
- **Chaîne d'API** : déjà couverte. `lib/atom-api.ts:LabTestMeanDto` a déjà `portfolio?: FactsheetRef | null` à confirmer (à vérifier dans le DTO existant ; sinon, ajouter le champ). L'adapter `lib/labtestmean-adapter.ts:toLabTestMean` ajoute `portfolio: { id, name } | null` au type `LabTestMean`.

## Requirements

### Functional Requirements

#### Modèle / type
- Le type `LabTestMean` (`lib/types.ts`) gagne un champ `portfolio: { id: string; name: string } | null`.
- Le DTO côté `lib/atom-api.ts` déclare `portfolio: FactsheetRef | null` (ré-utiliser le type existant).
- L'adapter `lib/labtestmean-adapter.ts` mappe `dto.portfolio` → `{ id, name }` en filtrant sur la présence de `id` et `name` non-vides ; sinon `null`.

#### Helper
- Ajouter `uniquePortfolios(list: LabTestMean[]): string[]` dans `lib/labtestmeans.ts` qui :
  - Itère sur `list`.
  - Insère `m.portfolio.name` dans un Set quand `m.portfolio !== null`.
  - Insère la sentinelle `"__none__"` dans le Set s'il existe au moins un LTM avec `portfolio === null`.
  - Retourne le Set sous forme de tableau, **trié alphabétiquement** sur les noms réels, avec `"__none__"` **toujours en dernier**.
- Ajouter un champ `portfolios?: string[]` à `Filters` et étendre `filterLabTestMeans` :
  - Si `f.portfolios?.length`, un LTM passe si `(m.portfolio == null && f.portfolios.includes("__none__")) || (m.portfolio != null && f.portfolios.includes(m.portfolio.name))`.

#### UI — `FilterBar`
- Ajouter dans `Props` : `portfolios: string[]` (liste des options) et étendre `FilterValue.portfolios: string[]`.
- Ajouter un bloc « Portfolio » entre « Program » et la fin de la barre (mêmes classes / mêmes Toggle).
- Pour le rendu d'une pill, prévoir un `renderLabel` qui affiche `"None"` quand la valeur est `"__none__"` et la valeur brute sinon.
- Le composant `Toggle` est générique sur `T extends string` → la sentinelle est compatible.

#### UI — `FilterSheet` (mobile)
- Mêmes ajouts en miroir : props `portfolios: string[]`, état `value.portfolios`, bloc « Portfolio », `renderLabel` identique.

#### Câblage server-side
- `app/page.tsx` (catalogue) : passer `portfolios={uniquePortfolios(all)}` à `CatalogueClient`.
- `app/map/page.tsx` (carte) : passer la même prop à `MapClient`.
- `CatalogueClient` et `MapClient` : étendre leur état `filters` pour inclure `portfolios: string[]` (initialement `[]`), passer la liste à `FilterBar` / `FilterSheet`, et inclure `portfolios` dans l'appel à `filterLabTestMeans`.

#### URL state (si applicable)
- Si l'application sérialise déjà des filtres dans l'URL (à confirmer ; aujourd'hui seulement `?page=` est géré), ne pas étendre la sérialisation tant que ce n'est pas demandé. **Hors scope** ici.

### Non-Functional Requirements
- **0 nouvelle dépendance**. Pas de nouvel appel HTTP.
- **Performance** : `uniquePortfolios` est O(n) sur ~314 LTMs, négligeable.
- **Theming** : aucune nouvelle couleur — réutilise les classes Toggle existantes (`bg-accent` / `bg-surface` selon état).
- **Accessibilité** : la pill « None » porte le libellé `"None"` lisible, le bouton garde l'`aria-pressed` natif des autres pills (s'il existe — sinon comportement identique).
- **Compatibilité** : si le DTO ne contient pas encore le champ `portfolio` côté `atom-api.ts`, ajout transparent (champ optionnel + `?? null` dans l'adapter). Pas de migration de données front.

## Scope

### In Scope
- Modèle : ajout du champ `portfolio` côté DTO + adapter + type frontend.
- Logique : `uniquePortfolios`, extension de `Filters` et `filterLabTestMeans`.
- UI : nouveau bloc « Portfolio » dans `FilterBar` et `FilterSheet`, sentinelle `"__none__"` rendue comme `"None"`.
- Câblage : `app/page.tsx`, `app/map/page.tsx`, `CatalogueClient`, `MapClient`.

### Out of Scope
- **Affichage du portfolio sur la fiche LTM** ou sur la carte de catalogue : pas demandé, à spécifier séparément si besoin.
- **Appel à `/api/infos/portfolios/LTM`** pour récupérer la liste exhaustive des portfolios (y compris vides) : retenu en option de repli si plus tard on veut afficher un filtre figé indépendant des résultats. Pour l'instant la liste est **dérivée** de la donnée déjà fetchée.
- **Hiérarchie de portfolios** ou portfolios parents/enfants : non couvert par le DTO actuel (le champ est plat).
- **Persistance des filtres dans l'URL** : non scopé tant que ce n'est pas demandé pour les autres axes non plus.
- **Color-coding ou icône par portfolio** : non.
- **Filtrer côté backend** (paramètre de requête sur `/api/infos/labtestmeans`) : tout reste client-side, comme les autres filtres.

## Affected Areas
- **Modifier** :
  - `lib/atom-api.ts` — déclarer `portfolio: FactsheetRef | null` dans `LabTestMeanDto` si manquant.
  - `lib/labtestmean-adapter.ts` — mapper `portfolio` du DTO vers `LabTestMean.portfolio`.
  - `lib/types.ts` — ajouter `portfolio: { id: string; name: string } | null` à `LabTestMean`.
  - `lib/labtestmeans.ts` — ajouter `uniquePortfolios` + étendre `Filters` / `filterLabTestMeans`.
  - `components/FilterBar.tsx` — bloc Portfolio + extension de `FilterValue` et `Props`.
  - `components/FilterSheet.tsx` — symétrique mobile.
  - `components/CatalogueClient.tsx` — étendre l'état `filters`, passer `portfolios`, passer la liste à la FilterBar.
  - `components/MapClient.tsx` — idem côté carte.
  - `app/page.tsx` — calcul de `uniquePortfolios(all)` et passage en props.
  - `app/map/page.tsx` — idem.
- **Non touché** :
  - `components/MapView.tsx` — la chaîne d'agrégation par site reçoit toujours la liste filtrée, rien ne change pour elle.
  - Composants de fiche détail (`app/labtestmean/[externalId]/page.tsx`).
  - Composants de tuile (`AtaTile`, `AircraftProgramTile`, etc.).

## Edge Cases
- **Aucun LTM sans portfolio** dans la donnée : la pill `"None"` n'est **pas** affichée (le helper ne l'ajoute que si nécessaire).
- **Aucun LTM avec portfolio** (improbable) : seule la pill `"None"` s'affiche, ou aucune pill si la liste est strictement vide.
- **Portfolio avec un nom dupliqué entre deux objets** (theoretique — le backend renvoie le même `name` pour deux `id`) : on dédupliqué par `name` ; un seul bouton, qui filtre les deux.
- **Sentinelle confondue avec un nom réel** : la chaîne `"__none__"` est suffisamment improbable comme nom de portfolio ; au pire, le filtre se déclencherait pour les deux. Acceptable.
- **Combinaison avec les autres filtres** : intersection — un LTM doit satisfaire tous les axes. Ex. `Country: France` + `Portfolio: LTM_TOULOUSE` → seuls les bancs Toulouse (cohérent attendu).
- **Sélection d'un portfolio puis filtre par programme qui vide tout** : aucun résultat, message overlay (sur la carte) ou état vide (sur le catalogue), comme aujourd'hui.
- **Bascule clair / sombre** : aucune particularité, hérite des tokens.
- **Mobile (FilterSheet)** : même comportement, le bloc Portfolio prend une ligne supplémentaire dans la sheet — pas de surcharge visuelle attendue (5 portfolios connus + None = 6 pills, tient sur 1 à 2 lignes).

## Open Questions
- **Faut-il fetcher l'API dédiée `/api/infos/portfolios/LTM`** pour exposer aussi les portfolios sans LTM rattaché ? **Recommandation : non**, on dérive de la donnée existante. Un portfolio vide dans un filtre ne sert à rien (clic = 0 résultat). Si plus tard on veut un onglet « gestion des portfolios » qui montre les vides, on appellera l'API à ce moment-là. => si on fetche l'api dédiée pour des raisons de communication, on veut voir apparapitre les portfolios même vide
- **Faut-il prettifier le nom** (`LTM_TOULOUSE` → `Toulouse`) ? **Recommandation : non**, garder le nom brut. C'est ainsi que l'équipe métier les nomme dans le backend, et un mapping ajouterait une dette de maintenance pour les futurs portfolios. => non pas pour l'instant
- **« None » doit-il apparaître en premier ou en dernier** dans la liste des pills ? **Recommandation : en dernier**, car c'est une valeur sentinelle, pas un portfolio « principal ». Cohérent avec les conventions de tri sur les valeurs nulles. => en dernier
- **Faut-il afficher le portfolio sur la card du catalogue ou sur la fiche détail** pour donner du feedback visuel ? **Hors scope ici**, à spécifier séparément si demandé. => hosrs scope
- **L'utilisation de l'identifiant `id` au lieu du `name`** comme clé de filtre serait-elle plus robuste ? **Recommandation : non** — cohérent avec `country`/`program` qui utilisent les noms et n'ont jamais posé problème. Si un jour deux portfolios partagent le même `name`, on pourra basculer sur `id` côté filtre uniquement. => suivre recommendation
- **Persistance dans l'URL** (`?portfolios=LTM_TOULOUSE`) : non aujourd'hui, mais à considérer si jamais l'équipe veut partager des liens filtrés. À traiter en spec dédiée pour l'ensemble des filtres. => non

## Acceptance Criteria
- [ ] Sur `/` (catalogue) et `/map`, un nouveau bloc « Portfolio » apparaît dans la `FilterBar`, juste après « Program ».
- [ ] La liste des pills correspond aux portfolios effectivement rattachés à au moins un LTM, **triés alphabétiquement**.
- [ ] Si au moins un LTM n'a pas de portfolio, une pill **« None »** apparaît **en dernière position**.
- [ ] Cliquer une pill l'active (style accent) et restreint la liste / les cercles aux LTMs correspondants.
- [ ] Cliquer **« None »** restreint à la liste des LTMs sans portfolio (`portfolio: null`).
- [ ] Sélection multiple : plusieurs portfolios peuvent être actifs simultanément (union sur cet axe).
- [ ] Combinaison avec les autres filtres : intersection respectée (un LTM doit passer **tous** les axes actifs).
- [ ] Sur mobile, la `FilterSheet` propose le même bloc Portfolio avec le même comportement.
- [ ] Désactiver toutes les pills du Portfolio rétablit l'affichage initial (filtre inactif).
- [ ] Les types TypeScript sont stricts : `LabTestMean.portfolio: { id: string; name: string } | null`, `Filters.portfolios?: string[]`.
- [ ] Pas de nouvelle dépendance, pas de nouvel appel HTTP, build OK.
- [ ] Aucune régression sur la fiche détail, la carte, le `/health`, le bouton de thème.
