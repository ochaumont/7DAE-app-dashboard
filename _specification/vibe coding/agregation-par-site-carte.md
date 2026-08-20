# Feature Spec: Agrégation par site sur la carte (cercles proportionnels)

## Summary
- Sur la vue `/map`, remplacer les **markers individuels par lab test mean** par un **unique cercle agrégé par site** (TLS, HMB, FIL, BRE).
- Le **rayon** du cercle est **proportionnel au nombre de LTMs visibles** sur le site (filtres en cours pris en compte).
- Le **nombre** est affiché **à l'intérieur** du cercle, parfaitement lisible sur fond clair et sombre.
- Le panneau filtre existant (`FilterBar` à gauche) garde son comportement actuel — c'est lui qui pilote `visible[]`, et c'est `visible[]` que la carte agrège.

## Motivation
- Aujourd'hui, chaque banc est rendu par un `<Marker>` à `m.location.lat/lng`. Comme **tous les bancs d'un site partagent les mêmes coordonnées** (table `GEO_MAP` dans `lib/labtestmean-adapter.ts:26-31` — quatre points fixes pour TLS / HMB / FIL / BRE), les ~314 markers se **superposent en quatre tas illisibles**. Cliquer ouvre toujours le même premier banc, jamais les autres.
- Le but réel de la carte est de **montrer la concentration géographique** des moyens de test, pas la position GPS exacte (qui est faussement précise puisque ce sont des coordonnées de site, pas de bâtiment). Une bulle agrégée raconte mieux l'histoire : « il y a X bancs ici ».
- Quand l'utilisateur applique un filtre (par programme, par type, par statut), il veut **voir comment les bancs visibles se répartissent par site** — quel site reste dominant, lequel se vide. Aujourd'hui le filtre ne change rien de visible sur la carte (les markers se superposent toujours dans les mêmes quatre tas).

## Décisions (arbitrées)
- **Stack** : on conserve **MapLibre via `react-map-gl/maplibre`** déjà installé. Pas de nouvelle dépendance. La couche d'agrégation est faite **côté client** dans `MapView` (regrouper `visible[]` par `site`, calculer un rayon par groupe).
- **Niveau d'agrégation** : par **site** (code 3 lettres `m.location.site`). Pas par ville, pas par pays — le site est le grain naturel et c'est exactement ce que la table `GEO_MAP` projette.
- **Coordonnées du cercle** : centre = `GEO_MAP[site]`. Pas de centroïde calculé — le site a un point fixe.
- **Rayon** : suit la **loi des aires** cartographique → `r = R_MIN + (R_MAX - R_MIN) * sqrt(count / max_count)` où `R_MIN` et `R_MAX` sont des constantes en pixels et `max_count` = max des comptes par site sur la vue courante. Cela donne une perception visuelle proportionnelle à la quantité (l'aire représente la donnée, pas le diamètre).
- **`R_MIN` / `R_MAX`** : `18px` / `48px`. Lisibles à zoom 3.5 (vue Europe par défaut), label à deux chiffres tient dedans.
- **Le label** : nombre entier, centré, `font-mono` `text-sm` `font-bold`. Couleur : `--color-accent-fg` sur cercle accent → contraste fort.
- **Couleur du cercle** : remplissage `--color-accent` à opacité 0.85, contour blanc 2px (même idiome que les markers actuels). Hover : opacité 1.
- **Implémentation visuelle** : `<Marker>` MapLibre comme aujourd'hui, mais le contenu n'est plus un `<button>` 12×12px — c'est un `<div>` rond (taille calculée) avec le nombre au centre. MapLibre s'occupe du positionnement géographique, le SVG est purement HTML/CSS.
- **Click sur un cercle** : ouvre une **popup listant les LTMs visibles** de ce site, format compact (nom + chip type + lien fiche). Une popup, pas la fiche du premier LTM. Permet d'accéder à n'importe lequel des bancs du tas.
- **Re-calcul** : à chaque changement de `visible[]` (donc de filtre), les cercles recalculent leur rayon. `useMemo` sur le groupement.
- **Sites sans coordonnées** (`Unknown` ou inconnus) : ignorés — déjà filtrés par la condition existante `m.location.lat != null && m.location.lng != null`.
- **Filtre vide** (count = 0 sur tous les sites) : aucun cercle. Le message « No lab test means match these filters. » de `MapClient.tsx:53-58` reste affiché tel quel.

## Requirements

### Functional Requirements

#### Agrégation
- Regrouper `visible[]` par `m.location.site`.
- Filtrer les groupes dont `lat`/`lng` sont absents (sécurité — `GEO_MAP` couvre uniquement TLS/HMB/FIL/BRE).
- Compter les LTMs par groupe.

#### Rendu d'un cercle
- Position : `<Marker longitude={lng} latitude={lat}>` du site.
- Forme : `<button>` rond, `width=height=2*r`, `border-radius=50%`, fond `bg-accent/85`, contour `border-2 border-white shadow-lg`.
- Contenu : le nombre, centré, `font-mono font-bold text-accent-fg`. Taille de police adaptative : `text-xs` (1 chiffre), `text-sm` (2 chiffres), `text-base` (3+ chiffres) — conserve la lisibilité.
- Hover : `hover:opacity-100 hover:scale-105 transition-transform`. Cursor pointer.
- `aria-label` : `"X lab test means at <site name>"`.

#### Popup au click
- Au click d'un cercle, ouvre une `<Popup>` à la position du site.
- Contenu : titre `<site name>` (Toulouse / Hamburg / Filton / Bremen), sous-titre `X lab test means`, puis **liste scrollable** (`max-h-72 overflow-y-auto`) de tous les LTMs du groupe :
  - Chaque item : `ChipType` + nom (texte tronqué) + `BadgeStatus` + lien fiche (`<Link>` vers `/labtestmean/[externalId]`).
- Bouton fermer (`closeButton: true` ou ✕ explicite).

#### Réactivité aux filtres
- Le composant `MapView` reçoit `labTestMeans` (déjà filtré par `MapClient`). À chaque changement, les cercles recomputent rayon et label.

### Non-Functional Requirements
- **Bundle** : 0 nouvelle dépendance. `react-map-gl` et MapLibre déjà installés.
- **Performance** : 4 cercles maximum aujourd'hui, calcul O(n) sur `visible[]`. Pas d'enjeu.
- **Accessibilité** : chaque cercle est un `<button>` avec `aria-label` parlant. Le clavier peut tabuler dessus (`focus:ring`).
- **Theming** : couleurs via `--color-accent`, `--color-accent-fg`, `--color-bg` — adaptation automatique clair/sombre.
- **Responsive** : MapLibre gère le zoom ; les cercles restent en pixels (taille fixe au zoom). C'est conforme à l'intention — l'agrégation est sémantique, pas géographique.

## Scope

### In Scope
- Refonte de `components/MapView.tsx` : remplacer la boucle de markers individuels par la logique d'agrégation + rendu des cercles + popup-liste.
- Ajustement éventuel du `FilterSheet` mobile pour rappeler le total visible (déjà présent dans `MapClient` ligne 63 — pas de changement nécessaire a priori).

### Out of Scope
- Changement du **niveau d'agrégation** (par ville, par pays, par building, par room) — le site est l'échelle qui fait sens ici.
- **Cluster dynamique au zoom** type MapLibre Cluster — overkill pour 4 sites fixes.
- **Heatmap** ou **choroplèthe** par pays — un autre langage visuel, à proposer séparément si besoin.
- **Animations** d'apparition/disparition des cercles au filtrage — possible mais non prioritaire.
- **Légende** explicative du rapport rayon/count en bas à droite — utile si la lecture s'avère ambiguë, à ajouter en V2.
- **Persistance de la popup ouverte** quand on change de filtre — comportement par défaut MapLibre suffit (la popup se ferme).

## Affected Areas
- **Modifier** :
  - `components/MapView.tsx` — refonte du rendu : agrégation par site, cercles proportionnels, popup-liste au click.
- **Non touché** :
  - `components/MapClient.tsx` — la chaîne `filters → visible[] → MapView` reste identique.
  - `app/map/page.tsx`, `app/map/layout.tsx`.
  - `lib/labtestmean-adapter.ts` (`GEO_MAP`, `CITY_MAP`, `COUNTRY_MAP` réutilisés).
  - `lib/labtestmeans.ts` (filterLabTestMeans inchangé).
  - `components/FilterBar.tsx`, `FilterSheet.tsx` — sources des filtres.
  - Toute la vue catalogue.

## Edge Cases
- **Filtre vide** (`visible.length === 0`) : aucun cercle rendu. Le message overlay existant prend le relais.
- **1 seul LTM sur un site** : cercle au rayon `R_MIN`, label `1`. Visible mais discret.
- **Tous les LTMs sur le même site** (improbable mais possible si filtre de pays restrictif) : un seul cercle au `R_MAX`. Pas de problème de chevauchement.
- **Sites étrangers à `GEO_MAP`** (nouveau code site, ex. `MAD`) : ignorés (pas de coordonnées). À surveiller via warning console si pertinent.
- **Sites trop proches** géographiquement (Hamburg ↔ Bremen sont à ~95 km, à zoom 3.5 c'est ~30 px d'écart) : cercles peuvent se toucher au `R_MAX`. Acceptable. Si gênant, dezoomer un peu ou réduire `R_MAX`.
- **Mode clair / sombre** : couleurs adaptatives via tokens.
- **Re-render au changement de thème** : les cercles utilisent les variables CSS, donc la transition est gratuite.
- **Click répété sur le même cercle** : la popup reste ouverte (comportement MapLibre par défaut).
- **Click hors d'un cercle, sur la carte** : la popup se ferme (`onClose` du `<Popup>`).
- **Beaucoup de LTMs sur un site** (>50, peu probable) : le label déborde — la règle `text-base` à partir de 3 chiffres reste lisible jusqu'à 999. Au-delà, la UI casse — non scopé.

## Open Questions
- **Couleur unique ou couleur par type dominant** ? Recommandation : **couleur unique accent**. Coloriser par type fragmente l'info et rentre en conflit avec les `ChipType` du popup. Si plus tard on veut signaler la composition, ajouter un mini-arc-en-ciel autour du cercle (couronne segmentée) plutôt qu'une couleur de fond. => suivre recommendation
- **Le rayon doit-il être `sqrt`-proportionnel ou linéaire** ? Recommandation : **sqrt** (loi des aires). Linéaire gonfle trop les gros sites visuellement. => suivre recommendation
- **Faut-il afficher le nom du site sous le cercle** (label permanent type `Toulouse · 87`) ? Recommandation : non — la popup au click suffit, et un label permanent surcharge la carte. Si vraiment utile, ajouter en V2 dans la légende.=> suivre recommendation
- **Faut-il un tooltip natif** (`title` attribute) au survol indiquant le nom du site ? Recommandation : **oui**, c'est gratuit et améliore la lisibilité avant click.=> suivre recommendation
- **Comportement clavier** : Tab cycle entre les cercles, Enter ouvre la popup. À tester.=> non
- **Faut-il garder l'option de cliquer sur un LTM individuel** dans la popup pour aller direct sur sa fiche, ou n'afficher que la liste cliquable ? Recommandation : **liste cliquable directement vers la fiche** — pas de popup intermédiaire. => suivre recommendation
- **La popup doit-elle scroller la fenêtre vers le centre du cercle** (`flyTo`) avant d'ouvrir ? Recommandation : non, juste ouvrir la popup. Le centre actuel suffit. => suivre recommendation

## Acceptance Criteria
- [ ] Sur `/map` sans filtre, **4 cercles** apparaissent : un sur Toulouse, un sur Hamburg, un sur Filton, un sur Bremen.
- [ ] Le **rayon** de chaque cercle reflète visuellement le rapport des effectifs (le plus gros site a le plus grand cercle).
- [ ] Le **nombre** affiché au centre est **égal** au compte de LTMs visibles sur ce site.
- [ ] **Aucun marker individuel** par LTM n'est rendu sur la carte.
- [ ] Quand un filtre est appliqué (ex. country = `Germany`), seuls les cercles concernés (Hamburg, Bremen) sont visibles avec leur **nouveau** count, et les autres disparaissent.
- [ ] Quand le filtre vide complètement la liste, **aucun cercle** n'est rendu et le message overlay existant s'affiche.
- [ ] Click sur un cercle ouvre une popup listant **tous** les LTMs visibles du site, chacun avec un lien vers sa fiche.
- [ ] Click sur un nom de banc dans la popup → navigation vers `/labtestmean/[externalId]`.
- [ ] Survol d'un cercle : `title` natif révèle le nom du site (Toulouse / Hamburg / Filton / Bremen).
- [ ] Mode clair / sombre : cercle accent avec contour blanc, label `--color-accent-fg`. Lisible dans les deux modes.
- [ ] Pas de nouvelle dépendance npm. Build OK, types stricts OK. Pas de régression sur `/`, `/labtestmean/[externalId]`, `/health`.
- [ ] La performance reste subjectivement instantanée (pas de blocage au filtrage, pas de saccade au pan/zoom).
