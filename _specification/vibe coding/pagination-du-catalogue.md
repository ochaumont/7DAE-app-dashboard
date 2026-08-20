# Feature Spec: Pagination du Catalogue

## Summary
- Introduire un **système de pagination client-side** sur la vue catalogue `/` : afficher **6 lab test means par page** au lieu des ~312 d'un seul coup.
- Les filtres restent **cumulatifs avec la pagination** : le filtrage s'applique d'abord, puis la pagination agit sur la liste filtrée. Compteur du type "Page 3 / 12 · 68 résultats".
- Contrôle en bas de la grille : boutons `Précédent` / `Suivant`, numéros de page (avec ellipsis au-delà de ~7 pages), saut direct à une page.
- Un changement de filtre **remet la pagination à la page 1** automatiquement (sinon l'utilisateur se retrouve sur une page vide).
- La page courante est **reflétée dans l'URL** (ex. `/?page=3`) pour permettre le partage / le back navigateur. La taille de page reste fixe en V1 (6) mais le code est pensé pour rendre ça configurable plus tard.
- **Scope limité à `/`** : la vue `/map` n'est pas paginée (la carte affiche tout d'un coup par nature), et la fiche détail `/labtestmean/[id]` n'a pas de liste concernée.

## Motivation
- La liste complète (312 entries aujourd'hui, potentiellement 400+) sur une seule page cause trois problèmes concrets :
  1. **Scroll interminable** — trouver un banc précis sans filtre devient une corvée.
  2. **Perception de lenteur** — le temps de rendu initial de 300 cards avec image cover + chips + badges est visible, même si l'API répond rapidement.
  3. **Coût de rendu répété** — chaque changement de filtre force React à re-évaluer et rendre la grille complète.
- La pagination règle les trois : 6 cards par page = rendu immédiat, navigation claire, coût React constant.
- Choix de 6 cards par page : aligné avec la grille responsive actuelle (1 / 2 / 3 colonnes selon breakpoint) ; 6 donne une grille pleine en desktop (2 lignes × 3 colonnes) et reste digeste sur mobile.

## Requirements

### Functional Requirements

#### Pagination
- Taille de page fixe : **6 entries** par page en V1.
- Calcul : `totalPages = ceil(filteredCount / 6)`. Si `filteredCount === 0`, afficher le message vide actuel ("No lab test mean matches these filters") et masquer les contrôles de pagination.
- Contrôles affichés sous la grille des cards :
  - Bouton `← Previous` (désactivé en page 1).
  - Numéros de page cliquables. Si ≤ 7 pages, toutes affichées. Sinon : `1 … 4 5 [6] 7 8 … 12` (page courante toujours entourée, ellipsis pour masquer le milieu).
  - Bouton `Next →` (désactivé en dernière page).
  - Compteur textuel à côté : `Showing 13–18 of 68`.
- La page par défaut est **1**.

#### Synchronisation URL
- La page courante est portée par le query param `?page=N` (ex. `/?page=3`).
- `?page=1` → omis dans l'URL (URL canonique = `/`).
- Valeur invalide (`?page=abc`, `?page=0`, `?page=999` alors qu'il n'y a que 12 pages) → fallback silencieux sur page 1.
- La navigation clavier (`Tab` sur les boutons pagination + `Enter`) et le back navigateur doivent fonctionner naturellement.

#### Interaction avec les filtres
- Tout changement de filtre (search, type, status, country, program, complexity) **remet la pagination à page 1**. Raison : sinon l'utilisateur qui réduit violemment sa liste se retrouve sur une page vide.
- Quand la page change via la pagination, les filtres restent inchangés.
- Le compteur déjà présent (`visible.length / total`) reste affiché dans la sidebar et conserve son rôle global — la pagination ajoute un second compteur dans ses propres contrôles (`Showing 13–18 of 68`).

#### Apparence
- Contrôles stylés en cohérence avec les autres boutons de l'app (boutons secondaires bordés, accent pour la page courante).
- Mode clair et mode sombre : les contrôles utilisent les tokens existants (`--color-accent`, `--color-border`, `--color-fg`, `--color-muted`) et n'introduisent pas de nouvelle couleur.

### Non-Functional Requirements
- Pas de dépendance externe. Pagination purement client, pas d'appel API par page (la V1 charge toujours la liste complète via `getLabTestMeans()`).
- Pas d'impact sur la latence du build ni sur le temps de premier rendu au-delà d'un léger allègement (moins de DOM à peindre).
- Accessibilité : chaque bouton pagination expose un `aria-label` explicite ("Go to page 3", "Next page"). La page courante a `aria-current="page"`. Les boutons désactivés utilisent `disabled` et non `pointer-events: none` seul.

## Scope

### In Scope
- Nouveau composant `components/Pagination.tsx` (client) — affiche les contrôles, reçoit `page`, `totalPages`, `onPageChange`, `range` (indices affichés).
- Modification de `components/CatalogueClient.tsx` :
  - État `page: number` synchronisé avec `?page=` via `useSearchParams` + `router.replace`.
  - Slicing de la liste filtrée avant rendu des cards.
  - Reset de `page = 1` à chaque `setFilters`.
  - Intégration de `<Pagination />` sous la grille.
- Constante `PAGE_SIZE = 6` exportée depuis un fichier centralisé (`lib/pagination.ts` ou simplement dans `CatalogueClient.tsx`) pour préparer la configurabilité future.
- Aucune modification de l'API, ni du backend, ni de la fiche détail, ni de la vue map.

### Out of Scope
- Sélecteur de taille de page (6 / 12 / 24). Figé à 6 en V1. Peut arriver en V2.
- Pagination côté serveur (pas d'endpoint paginé côté `atom-synchronizer-dev`). Toute la pagination reste client-side.
- Scroll-to-top automatique au changement de page (à discuter ; cas d'usage peu clair sur desktop à grille 3 colonnes où la pagination est déjà juste sous la viewport).
- Ajout de la pagination sur `/map` (pas de sens) ou sur la fiche détail (pas de liste).
- Mémorisation de la page via `localStorage` — l'URL est déjà le bon véhicule, pas besoin d'un second canal.

## Affected Areas
- **Créer** :
  - `bench-catalog/components/Pagination.tsx` — contrôles paginaux.
- **Modifier** :
  - `bench-catalog/components/CatalogueClient.tsx` — état `page`, synchro URL, reset sur filtre, slicing, intégration des contrôles.
- **Non touché** :
  - `lib/labtestmeans.ts`, `lib/atom-api.ts`, `lib/labtestmean-adapter.ts` — aucune notion de pagination côté data.
  - `components/MapView.tsx`, `components/MapClient.tsx` — pas de pagination sur la carte.
  - `app/labtestmean/[id]/page.tsx` — hors scope.
  - `FilterBar`, `FilterSheet` — ils ne savent pas qu'il y a pagination ; le reset à la page 1 est orchestré par `CatalogueClient`.

## Edge Cases
- `filteredCount === 0` → bandeau vide existant, pas de contrôles de pagination.
- `filteredCount ≤ 6` → une seule page, contrôles masqués ou affichés en disabled (à trancher : les masquer proprement simplifie l'UI).
- `?page=` absent → page 1.
- `?page=2` avec un filtre qui ne laisse que 3 résultats → réduire automatiquement à page 1 + mise à jour de l'URL.
- Navigation back browser depuis `?page=5` vers `/` → la grille revient à page 1 automatiquement (le `useSearchParams` est réactif).
- Changement de filtre alors qu'on est sur page 5 → reset à page 1 (URL passe de `/?page=5` à `/`).
- Changement de page via clic : on veut `router.replace` (pas `push`) pour ne pas polluer l'historique navigateur avec un back pour chaque page consultée. À confirmer.

## Open Questions
- **Scroll-to-top au changement de page** : automatique ou pas ? Recommandation : pas automatique en V1 (les contrôles sont juste sous la grille, l'utilisateur reste ancré visuellement).=> pas auto
- **Comportement back/forward** : `router.replace` (URL mise à jour, pas d'entrée dans l'historique) vs `router.push` (chaque page ajoute une entrée). Recommandation : `replace`, pour ne pas forcer l'utilisateur à faire 10 back pour sortir du catalogue.=> replace
- **Afficher les contrôles quand il n'y a qu'une seule page** ? Recommandation : les masquer (moins de bruit visuel).=> les masquer
- **Taille de page configurable dès V1** via un dropdown `6 / 12 / 24` ? Proposition : non, garder V1 minimaliste, ajouter plus tard si besoin réel.=> non

## Acceptance Criteria
- [ ] La vue `/` affiche au plus **6 cards** simultanément.
- [ ] Les contrôles de pagination affichent `Previous`, `Next`, les numéros de page, et le compteur `Showing X–Y of Z`.
- [ ] La page courante est reflétée dans l'URL via `?page=N` (sauf page 1, URL canonique `/`).
- [ ] Un changement de filtre remet automatiquement la page à 1 ; l'URL est mise à jour en conséquence.
- [ ] Le bouton `Previous` est désactivé en page 1, `Next` en dernière page.
- [ ] Les 4 cas limites (0 résultats, ≤ 6 résultats, `?page=` invalide, page devenant hors plage après filtre) n'entraînent aucun crash et aucun affichage vide inexplicable.
- [ ] Navigation clavier complète (Tab, Enter/Space) et `aria-current="page"` sur la page courante.
- [ ] Fonctionne en mode clair et en mode sombre sans ajustement CSS spécifique.
- [ ] Aucune régression sur le compteur sidebar (`visible.length / total`).
- [ ] Aucune modification API, aucun appel réseau supplémentaire.
