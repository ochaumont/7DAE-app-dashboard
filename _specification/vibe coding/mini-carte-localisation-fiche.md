# Feature Spec: Mini-carte de localisation sur la fiche

## Summary
- Insérer une **mini-carte schématique** entre la ligne `LOCATION` et la ligne `CODE` du header de la fiche `/labtestmean/[externalId]`.
- La carte représente le **pays** où se trouve le banc (parmi **France**, **Allemagne**, **Royaume-Uni**) avec un **point rouge** positionné sur la ville (Toulouse, Hamburg, Bremen, Filton).
- Visuel **purement schématique** : silhouette du pays en outline, point rouge marqué, pas de tuiles cartographiques, pas de noms de villes (le label `LOCATION` au-dessus porte déjà l'info textuelle).
- Format compact (≈ 200 × 140 px) qui ne casse pas la verticalité de la zone d'identité — ne doit pas être plus large que `max-w-detail-info` (24 rem) déjà utilisé pour les cartes managers et la description.

## Motivation
- Les utilisateurs scannent rapidement la fiche : un repère **visuel-géographique** est lu en 200 ms vs ~1.5 s pour parser "Toulouse, France · C_51_3".
- L'app a déjà une carte complète sur `/map` mais elle est globale (zoom 3, vue Europe). Sur la fiche, on veut le **point** isolé dans son pays — pas un sous-état de la carte globale.
- Les sites connus aujourd'hui sont **4** (TLS, HMB, FIL, BRE), répartis sur **3 pays**. Cas simple, qui justifie un visuel sur-mesure plutôt que d'embarquer une vraie carte (MapLibre + tuiles + ~100 KB de dépendances dynamiques pour 200 px d'affichage).

## Décisions (arbitrées)
- **Stack** : SVG inline dans un nouveau composant `components/icons/CountryMapIcon.tsx`. Pas de MapLibre, pas de bibliothèque cartographique. Aucune nouvelle dépendance npm. Viewbox `0 0 200 140`.
- **Pays supportés** : `France`, `Germany`, `United Kingdom`. Toute autre valeur → composant retourne `null` (la mini-carte est masquée, le reste de la fiche n'est pas impacté).
- **Source des silhouettes** : paths SVG hand-tailored (simplifiés à ~500 octets chacun depuis Natural Earth simplified ou équivalent). Pas de mapping géographique réel — le but est la reconnaissance visuelle, pas la précision.
- **Couleurs** : silhouette en `currentColor` à opacité 0.4 (s'adapte au thème via `--color-fg`). Le contour à `currentColor` opacité 1 (trait fin 1.5 px). Le point rouge en `--color-danger`, taille 5 px de diamètre.
- **Identification du pays** : utilise `m.location.country` (déjà mappé par l'adapter via `COUNTRY_MAP` : `Fr → France`, `Ge → Germany`, `UK → United Kingdom`).
- **Identification du site / point** : utilise `m.location.site` (code 3 lettres) projeté via une **table de coordonnées SVG** (pas lat/lng) — chaque site a une position précomputée dans le viewBox du pays correspondant. Table simple, hardcodée dans `CountryMapIcon`.
- **Position dans le header** : entre la ligne `LOCATION` et la ligne `CODE`, alignée à gauche, `mt-2` au-dessus, `mb-2` en dessous pour respirer.
- **Pas d'interactivité** : pas de hover, pas de clic. La mini-carte est purement informative. Si l'utilisateur veut zoomer, il a la vue `/map`.
- **Responsive** : la mini-carte ne change pas de taille (200 × 140). En mobile elle reste à droite de la zone d'identité (qui est en colonne unique sous `lg`), donc s'affiche normalement.

## Requirements

### Functional Requirements

#### Détection du pays
- Si `m.location.country` ∉ `["France", "Germany", "United Kingdom"]` → mini-carte masquée (retour `null`).
- Si `m.location.site` ∉ table de coordonnées (TLS, HMB, FIL, BRE) → silhouette du pays dessinée mais pas de point rouge. La mini-carte reste affichée comme indicateur de pays seul.

#### Rendu
- Composant `CountryMapIcon` reçoit `{ country, site }` en props. Retourne un `<svg>` ou `null`.
- viewBox normalisé pour les 3 pays : on choisit un viewBox commun `0 0 200 140` et on adapte la silhouette à occuper ~80 % de cet espace (centré + padding).
- Outline du pays : `<path d="…" stroke="currentColor" fill="currentColor" fillOpacity="0.4" strokeWidth="1.5" />`.
- Point rouge : `<circle cx="X" cy="Y" r="3" fill="var(--color-danger)" stroke="white" strokeWidth="1" />` — la bordure blanche assure la lisibilité même quand le point est sur la silhouette colorée.
- `aria-hidden="true"` (la ligne `LOCATION` au-dessus porte le sens accessibilité).

#### Insertion dans le header
- Dans `LabTestMeanHeader.tsx`, entre le bloc `LOCATION` (ligne du nom de ville/pays) et le bloc `CODE` :
  ```
  <CountryMapIcon
    country={m.location.country}
    site={m.location.site}
  />
  ```
- Le composant gère son propre masquage interne — pas besoin de wrap dans une condition côté parent.

### Non-Functional Requirements
- **Bundle** : 0 KB de nouvelle dépendance. Le composant pèse ≈ 2-3 KB de SVG (3 silhouettes hand-tailored).
- **Accessibilité** : `aria-hidden` sur le SVG. Le label textuel `LOCATION: Toulouse, France · C_51_3` reste la source d'information primaire.
- **Theme** : `currentColor` + `var(--color-danger)` → s'adapte automatiquement clair/sombre.
- **Aucun changement back / data** : la feature ne lit que des champs déjà présents dans `LabTestMean.location`.

## Scope

### In Scope
- Création de `components/icons/CountryMapIcon.tsx` :
  - Tables hardcodées : 3 silhouettes SVG (`PATHS: Record<Country, string>`) et coordonnées des 4 sites (`COORDS: Record<Site, { x: number; y: number; country: Country }>`).
  - Logique de détection pays + point.
- Modification de `components/LabTestMeanHeader.tsx` : insertion entre `LOCATION` et `CODE`.

### Out of Scope
- Tuiles cartographiques réelles (MapLibre, Leaflet, etc.).
- Hover / clic / interaction (la `/map` complète existe pour ça).
- Support de pays au-delà des 3 connus (Spain, Italy, etc.) — à ajouter quand les données le justifieront.
- Plusieurs sites par pays affichés simultanément.
- Migration de la carte `/map` complète vers ce composant — c'est un usage différent (vue détail focalisée vs vue catalogue globale).
- Animation d'entrée du point.

## Affected Areas
- **Créer** :
  - `components/icons/CountryMapIcon.tsx`.
- **Modifier** :
  - `components/LabTestMeanHeader.tsx` — un seul `<CountryMapIcon>` entre les blocs `LOCATION` et `CODE`.
- **Non touché** :
  - `lib/labtestmean-adapter.ts`, `lib/types.ts`, `lib/atom-api.ts` — aucun changement domaine.
  - `app/map/*`, `MapView`, `MapClient` — c'est un usage parallèle, pas une refonte.
  - Toute autre page ou composant.

## Edge Cases
- **Pays inconnu** (`Unknown`, ou n'importe quoi d'autre) → composant retourne `null`. Le header reste compact, pas de cadre vide.
- **Site connu mais pas mappé** (par ex. nouveau code 3 lettres `MAD` que personne n'a renseigné dans la table COORDS) → silhouette du pays dessinée si `country` est connu, mais sans point. Décision intentionnelle : on montre quand même le pays.
- **Coordonnées d'un site dans un mauvais pays** (incohérence backend, ex. site `TLS` avec country `Germany`) → silhouette de l'Allemagne dessinée, point dans le viewBox aux coordonnées de TLS calculées pour la France → point hors silhouette mais reste dans le viewBox. Pas de crash. À surveiller via `console.warn` éventuel si on veut détecter.
- **`m.location.site` vide (`""`)** → silhouette dessinée si country connu, pas de point.
- **Resize / zoom navigateur** : SVG vectoriel, scale parfaitement.
- **Mode sombre** : silhouette via `currentColor` → couleur claire ; point rouge garde sa couleur fixe `--color-danger` qui a déjà ses valeurs theme-adaptées.

## Open Questions
- **Faut-il une légende** indiquant le pays en texte sous la silhouette ? Recommandation : non. Le label `LOCATION` ligne au-dessus est plus lisible et le but de la carte est complémentaire visuel. => pas de label
- **Si plusieurs LTM partagent le même site** (cas typique : V_2CINS_01 et V_3CINS_01 tous deux à TLS), faut-il agglomérer ? Recommandation : hors scope — chaque fiche est isolée, on affiche son site et basta. => hors scope
- **Les silhouettes hand-tailored** seront-elles assez reconnaissables ? Recommandation : on commence avec 3 paths simplifiés (~30-50 points par pays), on ajuste après visu utilisateur. Une simplif trop brutale rend le RU comme un blob ; trop précise alourdit. => suivre recommendation
- **Faut-il un tooltip au survol** indiquant la ville ? Recommandation : non — la ligne `LOCATION` au-dessus le dit déjà.=> oui un tooltip
- **Faut-il animer l'entrée du point** (fade-in à l'ouverture de la fiche) ? Recommandation : non — la fiche entière apparaît en une fois, ajouter une anim sur le seul point semble incohérent avec le reste. => non

## Acceptance Criteria
- [ ] Sur une fiche dont `country` ∈ {France, Germany, United Kingdom}, une mini-carte SVG apparaît entre `LOCATION` et `CODE`.
- [ ] La silhouette correcte du pays est rendue (FR / DE / UK reconnaissable au premier coup d'œil).
- [ ] Un point rouge (`--color-danger`) est positionné sur la silhouette **à l'emplacement approximatif** de Toulouse (TLS), Hamburg (HMB), Bremen (BRE) ou Filton (FIL) selon `m.location.site`.
- [ ] Sur une fiche dont `country` n'est pas dans la liste, ou avec country `"Unknown"`, **aucune mini-carte** n'est rendue. Aucun cadre vide, aucun crash.
- [ ] Sur une fiche dont `site` n'est pas dans la table mais le pays oui, la silhouette est rendue **sans point**.
- [ ] Mode clair / sombre : silhouette héritée de `--color-fg`, point reste rouge bien visible. Aucun ajustement CSS spécifique requis.
- [ ] Aucune nouvelle dépendance npm. Bundle initial inchangé (composant SVG inline pèse < 5 KB).
- [ ] Build Next OK, types stricts OK, pas de régression sur la grille catalogue, la map globale, la pagination ou le filtrage.
