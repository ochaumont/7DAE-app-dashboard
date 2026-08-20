# Feature Spec: Amélioration des Performances d'Affichage et de Navigation

## Summary
- Mettre en cache côté client la liste des lab test means et l'arbre avion, chargés **une seule fois par session** au lieu d'être re-téléchargés à chaque navigation.
- Supprimer le téléchargement des 317 items sur la page de détail (qui n'en affiche qu'un).
- Mémoïser les calculs dérivés (compteurs programmes, listes de valeurs uniques de filtres) recalculés inutilement à chaque render.
- Mettre en cache les photos de couverture pour éviter de les re-télécharger à chaque pagination / retour catalogue.
- Quelques gains secondaires (prefetch des liens de navigation, attributs image).
- Objectif : navigation catalogue ↔ carte ↔ détail quasi instantanée après le premier chargement, sans changer le comportement fonctionnel ni la fraîcheur perçue des données.

## Motivation
Depuis le passage en **client-side data fetching** (SPA statique), le cache `React.cache()` a été retiré. Conséquence : **chaque page refait tous les appels réseau** et ré-adapte 317 objets à chaque fois.

- `useLabTestMeans` (`lib/useLabTestMeans.ts:46`) appelle `getLabTestMeans()` + `getAircraftTree()` à chaque montage (catalogue **et** carte).
- La page de détail (`components/LabTestMeanDetailClient.tsx:39-42`) **re-télécharge la liste complète des 317** uniquement pour trouver un élément par `id`, alors qu'un endpoint unitaire existe déjà (`fetchLabTestMean(externalId)`, `lib/atom-api.ts:154`, non utilisé).
- Naviguer catalogue → détail → retour → carte rejoue l'intégralité des fetchs à chaque étape → latence et clignotement de squelettes.
- `useLabTestMeans` recalcule `computeProgramCounts`, `uniqueTypes/Statuses/Countries/Complexities/Portfolios` **à chaque render** (`lib/useLabTestMeans.ts:67-73`, hors `useMemo`) ; or le catalogue re-rend à chaque frappe de filtre → balayages répétés des 317 items.
- `usePhoto` (`lib/usePhoto.ts:20`) fait un **POST `/api/infos/resource` par image, sans cache**, et révoque le blob au démontage : les 6 vignettes sont re-téléchargées à chaque changement de page ou retour catalogue.

À l'inverse, les grosses dépendances (`three`, `@photo-sphere-viewer`, `react-photo-sphere-viewer`) sont déjà en **chunk lazy** (chargées uniquement pour une photo 360° via `PanoramaClient`) et ne sont donc **pas** un problème de bundle.

## Requirements

### Functional Requirements

#### 1. Cache client partagé des données (levier prioritaire)
- La liste des lab test means et l'arbre avion doivent être chargés **une fois par session** et réutilisés par toutes les pages (catalogue, carte, détail).
- Les pages suivantes ne doivent **pas** redéclencher d'appel réseau si la donnée est déjà en cache.
- **Décision — librairie de cache : SWR** (cache + dédoublonnage des requêtes intégrés). La donnée est chargée une fois et partagée par clé entre toutes les pages.
- **Décision — fraîcheur : chargement unique par session + rafraîchissement manuel.** Pas de revalidation automatique au focus/intervalle ; un **bouton refresh placé en haut à droite** (dans le slot droit du Header, à côté du ⓘ / ThemeToggle) force le re-fetch de la liste + de l'arbre et invalide le cache SWR.
- Les états **loading / error / success** existants doivent être préservés (premier chargement + cas backend indisponible via `app/error.tsx`).

#### 2. Page de détail — hybride cache-first
- La page de détail ne doit plus dépendre systématiquement de `getLabTestMeans()` (téléchargement des 317) pour afficher un seul élément.
- **Décision — stratégie hybride cache-first** :
  1. **Si la liste est déjà en cache** (navigation depuis le catalogue/carte) → lire l'élément en mémoire → **aucune requête réseau**, transition instantanée.
  2. **Sinon (accès à froid : URL directe, signet, reload, lien externe)** → appeler l'**endpoint unitaire** `fetchLabTestMean(externalId)` (`lib/atom-api.ts:154`) pour afficher la fiche avec un **payload minimal**.
- Implémentation naturelle avec SWR : clé `["ltm", externalId]` dont la donnée initiale (`fallbackData`) provient du cache de la liste si présent, sinon fetch unitaire.
- **LTM liés (« depends on »)** : la résolution `id → externalId` s'appuie sur la liste en cache si disponible ; en accès à froid, charger la liste en arrière-plan pour activer les liens (la fiche reste affichée pendant ce temps).
- Résultat attendu : navigation interne vers une fiche **sans requête réseau**, et accès direct **léger** (un seul objet, pas les 317).

#### 3. Mémoïsation des calculs dérivés
- Dans `useLabTestMeans`, envelopper les valeurs dérivées (`programCounts`, `hasUnassignedPrograms`, `types`, `statuses`, `countries`, `complexities`, `portfolios`) dans des `useMemo` dépendant de `labTestMeans` / `tree`.
- Aucune valeur calculée ne doit changer ; seul le **moment** du calcul change (plus de recalcul à chaque render).

#### 4. Cache des photos de couverture
- `usePhoto` doit réutiliser une image déjà récupérée (cache indexé par `resourceId`) au lieu de re-POSTer à chaque montage.
- **Décision — représentation** : cacher l'objet **Blob** (octets) par `resourceId`, et en dériver un `blob:` pour l'affichage `<img>`. Pas de cache `data:` pour l'affichage (`blob:` est ~33 % plus léger). Le même Blob caché sert à dériver une URL `data:` pour l'**export PDF** (react-pdf l'exige) → un seul POST pour affichage **et** PDF (remplace `fetchPhotoDataUrl` qui re-POSTe).
- **Décision — cache partagé** catalogue ↔ détail ↔ export, via **SWR** (clé `["photo", resourceId]`, dédoublonnage intégré). La fiche détail réutilise la couverture déjà chargée par le catalogue.
- **Décision — durée de vie : session entière, en mémoire** (vidée au reload). **Ne plus révoquer le blob par composant** (`usePhoto.ts:37`) — c'est ce qui casse le partage et force le re-fetch. Pas de persistance `localStorage`/`sessionStorage`.
- **Décision — pas d'éviction au départ** (volumétrie modeste : seules les vignettes visibles, 6/page, sont chargées). Une **LRU** (cap en Mo / nombre d'entrées, avec révocation du blob à l'éviction) est reportée en **V2** si les vraies photos s'avèrent lourdes/nombreuses.
- Résultat attendu : pagination et retour catalogue **sans re-télécharger** les vignettes déjà vues.

#### 5. Gains secondaires (faible effort)
- Réactiver le **prefetch** sur les liens de **navigation** du Header (Catalogue / Map), tout en conservant `prefetch={false}` sur les liens de **détail** (qui pointent tous vers la même page statique).
- Ajouter `decoding="async"` et des dimensions/ratio explicites sur les images de carte pour éviter tout layout shift.

### Non-Functional Requirements
- **Aucune régression fonctionnelle** : filtres, pagination, export PDF, carte, détail, thème clair/sombre inchangés.
- Compatible avec `output: "export"` (SPA statique nginx) — pas de code serveur à l'exécution.
- Respect de la gestion d'auth existante (Bearer dev-only / injection gateway en prod) sur tous les appels, y compris ceux issus du cache photos.

## Scope

### In Scope
- Introduction d'un mécanisme de cache client (librairie type SWR/React Query, Context provider, ou mémoïsation module — cf. Open Questions).
- Refonte du chargement de données du catalogue, de la carte et de la fiche détail pour passer par ce cache.
- Mémoïsation des dérivés dans `useLabTestMeans`.
- Cache des ressources photo.
- Ajustements mineurs de prefetch et d'attributs image.

### Out of Scope
- Changement du modèle de déploiement (reste SPA statique nginx).
- Pagination ou filtrage **côté serveur** (la volumétrie de ~317 items ne le justifie pas).
- Suppression/remplacement des dépendances lourdes (déjà en lazy-load).
- Tout changement visuel ou de tokens de thème.
- Mise en cache HTTP côté nginx/gateway (sujet distinct).

## Affected Areas
- `lib/useLabTestMeans.ts` : source des données partagées + mémoïsation des dérivés.
- `lib/labtestmeans.ts` / `lib/aircraftStructure.ts` : point d'entrée du cache des données (hooks SWR).
- `components/LabTestMeanDetailClient.tsx` : hybride cache-first (cache SWR de la liste, sinon `fetchLabTestMean`) au lieu de `getLabTestMeans()`.
- `components/CatalogueClient.tsx` et `components/MapClient.tsx` : consommation du cache partagé (SWR).
- `lib/usePhoto.ts` : cache des ressources photo.
- `components/Header.tsx` : **bouton refresh** (slot droit) qui invalide le cache SWR + prefetch des liens de navigation.
- `components/LabTestMeanCard.tsx` : attributs image (mineur).
- `package.json` : ajout de la dépendance **SWR**.

## Edge Cases
- **Backend indisponible** : le premier chargement doit toujours afficher l'écran « ATOM API unavailable » (`app/error.tsx`) ; le cache ne doit pas masquer une erreur réelle.
- **`id` inconnu sur la fiche détail** : conserver le comportement `notFound()`.
- **Donnée mise à jour côté backend** : comme il n'y a pas de revalidation automatique, le **bouton refresh** (ou un rechargement de page) doit refléter les ajouts/suppressions de LTM.
- **Photos** : le blob caché vit pour la session (non révoqué par composant) — fuite mémoire bornée par la volumétrie (vignettes visibles seulement) ; révocation uniquement à l'éviction LRU si introduite en V2.
- **Cohérence map `id → externalId`** sur la fiche détail après suppression du re-téléchargement complet.
- Vérifier qu'aucun cache `.next/` ne masque une erreur : supprimer `.next/` et relancer `npm run build` en fin d'implémentation.

## Open Questions
- ~~**Stratégie de cache**~~ — **Répondu : SWR.**
- ~~**Fraîcheur des données**~~ — **Répondu : chargement unique par session + bouton refresh manuel en haut à droite (slot droit du Header).**
- ~~**Fiche détail**~~ — **Répondu : hybride cache-first** (lecture en cache si présent, sinon endpoint unitaire `fetchLabTestMean` ; liste chargée en arrière-plan pour les LTM liés en accès à froid).
- ~~**Cache photos**~~ — **Répondu : Blob caché par `resourceId` via SWR, partagé catalogue ↔ détail ↔ PDF, `blob:` à l'affichage + `data:` dérivé pour le PDF, durée = session (en mémoire), pas d'éviction (LRU en V2).**

## Acceptance Criteria
- [ ] Naviguer catalogue → détail → retour catalogue → carte ne déclenche **aucun** nouvel appel `GET /api/infos/labtestmeans` ni `.../aircraftStructures/tree` après le premier chargement (vérifiable dans l'onglet Network).
- [ ] La page de détail ne télécharge plus la liste complète des 317 pour afficher un seul élément (cache si présent, sinon endpoint unitaire).
- [ ] Un **bouton refresh en haut à droite** force le re-fetch de la liste + de l'arbre et met à jour l'affichage ; aucune revalidation automatique entre-temps.
- [ ] Les calculs dérivés de `useLabTestMeans` ne sont plus recalculés à chaque frappe dans les filtres (mémoïsés).
- [ ] La pagination et le retour au catalogue ne re-téléchargent pas les vignettes déjà affichées (cache partagé par `resourceId`).
- [ ] L'export PDF réutilise les Blobs déjà chargés (pas de nouveau POST `/api/infos/resource` pour une couverture déjà affichée).
- [ ] Les liens de navigation du Header sont préchargés ; les liens de détail restent `prefetch={false}`.
- [ ] Aucune régression : filtres, pagination, export PDF, carte, fiche détail, thème, écran d'erreur backend fonctionnent comme avant.
- [ ] `npm run build` passe sans erreur et l'application reste un export statique servable par nginx.
