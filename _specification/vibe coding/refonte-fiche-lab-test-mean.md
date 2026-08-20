# Feature Spec: Refonte de la fiche Lab Test Mean

## Summary
- Réorganiser la **fiche détail** `/labtestmean/[id]` pour aérer la zone d'identité et resserrer l'information clé sous le titre.
- Introduire des **pictogrammes** pour les valeurs de `type`, `status`, et `complexity`. Chaque triple `(type, status, complexity)` est rendu sous forme de chip icône+texte (un par dimension), placés **sous le titre** du banc (et non plus au-dessus).
- Mettre **`code: [externalId]`** juste sous la ligne de localisation (au lieu de l'avoir dans la rangée des chips d'en-tête).
- Préfixer la description par un label visuel **"Description"** pour la cohérence avec le reste de la fiche (qui labelle déjà "Security & access", "Lifecycle", "Programs · Projects").
- Faire remonter le **Bench Manager** et le **Project Manager** dans le bloc d'identité (sous la location), chacun rendu dans un **encart léger** (cadre fin, padding compact). L'avatar à initiales (`components/Avatar.tsx`) reste utilisé.
- **Supprimer entièrement la section "People"** de la fiche : les listes pliables (Architects, Work package leaders, Lead engineers, Deputies, Departments) disparaissent. Le bench manager n'est plus dupliqué dans cette section puisqu'il est affiché plus haut.

## Motivation
- La hiérarchie actuelle place les méta-chips (`SIB · operational · simple · code`) au-dessus du nom — le **nom du banc** est ce qui doit ressortir en premier ; les attributs viennent ensuite, en explication.
- Les chips actuels sont purement textuels. Sur une grille à 313 bancs, l'œil ne distingue pas vite "SIB" de "SIMU" : un pictogramme lève l'ambiguïté en lecture périphérique.
- Le bloc "People" actuel est très dense (un encart manager + 5 listes pliables) alors qu'en pratique l'utilisateur ne consulte que **deux personnes** : le Bench Manager (qui possède le banc) et le Project Manager (qui pilote l'usage). Les autres rôles sont rarement utilisés et alourdissent la fiche.
- L'`externalId` ("code") est l'identifiant **opérationnel** du banc (ex. `V_2CINS_01`), distinct de l'UUID interne. Le sortir comme ligne dédiée `code: <…>` sous la location le rend recopiable et reconnaissable plutôt que noyé entre les chips.

## Décisions (arbitrées)

### Pictogrammes par type
Les 5 valeurs de `LabTestMeanType` reçoivent un pictogramme dédié. Choix proposés (SVG inline, palette monochrome `currentColor`) :

| Type | Libellé UI | Pictogramme |
|------|-----------|-------------|
| `SIMU` | "SIMU" | écran / monitor |
| `SIB` | "SIB" | engrenage / gear |
| `FIB` | "FIB" | puce / chip-circuit |
| `RT` | "Mean ResearchOnTest" | fiole / flask |
| `NA` | "NA" | tiret / minus-circle |

Les SVG sont **inline** dans un nouveau composant `components/icons/TypeIcon.tsx` (pas de dépendance externe). Style cohérent : trait 2 px, viewBox 24×24, `stroke="currentColor"`, `fill="none"`. La couleur est héritée du token `--color-fg` ou `--color-accent` selon le contexte (chip actif vs neutre).

### Pictogrammes par status
| Status | Libellé UI | Pictogramme |
|--------|-----------|-------------|
| `operational` | "Operational" | rond plein vert (utilise `--color-success`) |
| `mothballed` | "Mothballed" | pause |
| `out-of-service` | "Out of Service" | rond barré |
| `in-project` | "In Project" | sablier / horloge |

Composant `components/icons/StatusIcon.tsx`. Couleur du picto = `--color-success` pour `operational`, `--color-warning` pour `mothballed`, `--color-danger` pour `out-of-service`, `--color-muted` pour `in-project`.

### Pictogrammes par complexité
| Complexity | Libellé UI | Pictogramme |
|------------|-----------|-------------|
| `simple` | "Simple" | 1 barre |
| `medium` | "Medium" | 2 barres |
| `complex` | "Complex" | 3 barres |
| `null` | (rien affiché) | — |

Composant `components/icons/ComplexityIcon.tsx`, glyphe type indicateur de signal (1/2/3 barres montantes).

### Position dans l'en-tête
Ordre vertical du nouveau header de fiche :
1. **H1** — `m.name` (titre principal).
2. **Triple chip** (sous le H1) : `[icon] Type · [icon] Status · [icon] Complexity`. Mêmes styles que les chips actuels (bg `--color-surface`, border `--color-border`), mais avec icône à gauche du texte. Si `complexity == null`, le 3ᵉ chip est omis.
3. **Location** — `City, Country · Building · Room` (inchangé).
4. **`code: [externalId]`** — typographie `text-xs font-mono text-muted`. Le préfixe `code:` est en `text-muted` ; la valeur entre crochets est en `text-fg` pour ressortir.
5. **Encart Bench Manager + Project Manager** — rangée de 2 cartes côte à côte (1 colonne mobile, 2 colonnes ≥ md). Chaque carte : `border border-border rounded-card p-3`, avatar 40 px à gauche, nom + label de rôle ("Bench Manager" / "Project Manager") + email en `font-mono text-muted` à droite. Si Project Manager absent, la deuxième carte n'est pas rendue (pas d'espace vide).
6. **Description** — labelisée `<h2>` style "Description" (même typographie que les autres titres de section : `text-xs uppercase tracking-[0.15em] font-mono text-muted`), suivie du texte sur une nouvelle ligne. Si `description` est vide, le bloc entier (label + texte) n'est pas rendu.

### Suppression de la section People
- Le composant `<Section title="People">` du fichier `app/labtestmean/[id]/page.tsx` est retiré.
- Les helpers `PeopleList` et l'agrégat `roleEntries` deviennent inutiles → supprimés du fichier.
- Le type `LabTestMean.roles` reste sur le domaine (utilisé nulle part ailleurs en V1, mais conservé pour l'avenir — coût zéro).
- Le **Project Manager** affiché en haut est le **premier** élément de `m.roles.projectManagers` (s'il y en a plusieurs, les autres ne sont plus visibles dans la fiche V1 — accepté).

## Requirements

### Functional Requirements

#### En-tête identité (composant `LabTestMeanHeader`)
- Le H1 (nom du banc) reste le premier élément.
- La rangée de chips passe **sous le H1** au lieu d'au-dessus.
- Chaque chip combine **icône + texte** dans le même conteneur (pas deux blocs séparés).
- Plus d'`externalId` dans la rangée des chips (déplacé plus bas).
- Plus d'`m.complexity` rendu sous forme de chip texte uppercase — il devient un chip à pictogramme comme les autres.

#### Bloc `code` + managers
- `code: [externalId]` rendu en monospace, sur sa propre ligne, juste sous la location.
- Encart managers : grid `md:grid-cols-2`, gap modéré, les deux cartes ont la même hauteur. Si seule la carte Bench Manager existe, elle prend 1 colonne, pas la pleine largeur (esthétique cohérente).

#### Description
- Si `m.description` est non vide, on rend le label `Description` (même style typo que les autres labels de section) puis le paragraphe.
- Si `m.description` est vide ou null, ni le label ni le paragraphe ne sont rendus.

#### Suppression people
- L'ancienne section People (manager card + listes pliables des 5 rôles) n'apparaît plus dans la fiche.
- La grille principale `md:grid-cols-2 gap-x-12 gap-y-10` qui contenait 4 sections (Security, Lifecycle, People, Programs) passe à 3 sections.

### Non-Functional Requirements
- **Cohérence visuelle** : les pictogrammes utilisent la même grille (24×24), même trait, même style stroke/fill. Pas de mélange Lucide / Heroicons / SVG custom.
- **Accessibilité** : chaque pictogramme a `aria-hidden="true"` (le texte adjacent porte le sens). Les chips entiers sont rendus en `<span>` simple (rôle implicite).
- **Pas de nouvelle dépendance npm** : tous les SVG sont écrits à la main dans des composants React. Les SVGs sont compacts (<200 octets chacun après minification SSR).
- **Mode clair / sombre** : les couleurs dérivent toutes de tokens existants (`--color-fg`, `--color-accent`, `--color-muted`, `--color-success`, `--color-warning`, `--color-danger`, `--color-border`, `--color-surface`). Aucune couleur en dur.
- **Aucun changement back/data** : zéro modification API, zéro modification adapter, zéro modification des types domaine.

## Scope

### In Scope
- Réécriture du rendu de `components/LabTestMeanHeader.tsx`.
- Réécriture du rendu de `app/labtestmean/[id]/page.tsx` pour :
  - Ajouter le bloc `code` + encart managers entre l'en-tête et la grille des sections.
  - Ajouter le label "Description" devant la description.
  - Supprimer la section People (et le helper `PeopleList`, et le calcul `roleEntries`, et le helper `Section` utilisé uniquement pour People — à voir s'il est réutilisé ailleurs sur la fiche : oui, par Security/Lifecycle/Programs, donc il reste).
- Création de :
  - `components/icons/TypeIcon.tsx` (sélection du SVG selon `LabTestMeanType`).
  - `components/icons/StatusIcon.tsx` (sélection selon `LabTestMeanStatus`, couleur incluse).
  - `components/icons/ComplexityIcon.tsx` (sélection selon `Complexity`).

### Out of Scope
- Modification de la grille catalogue `/`, du popup map, de la fiche d'autres modules — la refonte est **isolée à la page détail**.
- Pictogrammes sur les chips de la grille catalogue (`LabTestMeanCard`) — peut être appliqué dans un second temps mais pas obligatoire pour cohérence (l'utilisateur le découvre d'abord sur la grille en texte, puis sur la fiche en texte+icône — ordre plausible).
- Réintroduction des autres rôles (architects, work package leaders, lead engineers, deputies, depts) plus tard via un onglet ou un panneau "Équipe étendue" — pas ici.
- Nouveau type d'avatar pour les managers ; on garde `components/Avatar.tsx` (initiales).
- Modification du type `Roles` ou `LabTestMean.roles` côté domaine.

## Affected Areas
- **Créer** :
  - `components/icons/TypeIcon.tsx`
  - `components/icons/StatusIcon.tsx`
  - `components/icons/ComplexityIcon.tsx`
- **Modifier** :
  - `components/LabTestMeanHeader.tsx` — ré-ordonner H1 / chips / location, ajouter pictos dans les chips, retirer le bloc manager (déplacé dans la page).
  - `app/labtestmean/[id]/page.tsx` — ajouter bloc `code: […]` + encart managers, ajouter label "Description", supprimer la section People + helpers `PeopleList` et `roleEntries`.
  - `components/ChipType.tsx` — soit accueille le pictogramme, soit est remplacé par un nouveau chip plus générique. Préférence : étendre `ChipType` pour qu'il rende `<TypeIcon>` à gauche du texte.
  - `components/BadgeStatus.tsx` — idem, intégrer `<StatusIcon>` à gauche.
- **Non touché** :
  - `lib/types.ts`, `lib/atom-api.ts`, `lib/labtestmean-adapter.ts` — aucun changement domaine.
  - `components/CatalogueClient.tsx`, `LabTestMeanCard.tsx`, `MapView.tsx`, `MapClient.tsx`, `Gallery.tsx`, `FilterBar.tsx`, `FilterSheet.tsx`, `Pagination.tsx` — pas concernés (la refonte est limitée à la fiche).

## Edge Cases
- `complexity == null` → le chip complexité n'est pas rendu (on ne montre ni icône ni "—" pour ne pas polluer la rangée).
- `m.description` vide ou null → le bloc Description (label + texte) est masqué entièrement.
- `m.manager == null` et `m.roles.projectManagers` vide → l'encart managers complet (les 2 cartes) est masqué, pas de cadre vide.
- `m.manager == null` mais 1 Project Manager présent → seule la carte Project Manager est rendue, sur 1 colonne.
- `m.manager` présent mais aucun Project Manager → seule la carte Bench Manager, sur 1 colonne.
- Plusieurs Project Managers → seul le **premier** est affiché. Les autres sont silencieusement ignorés en V1.
- `externalId` vide → le bloc `code: [...]` n'est pas rendu (rare en pratique mais possible si la dérivation backend échoue).
- Type `NA` ou Status / Complexity mappé sur valeur inconnue → le chip rend l'icône fallback (tiret pour TypeIcon, point d'interrogation neutre pour les autres) avec le label texte tel quel ("NA", `s.toString()`, etc.).

## Open Questions
- **Faut-il un tooltip au survol des pictogrammes** rappelant la signification ? Recommandation : non en V1, le texte du chip est déjà à côté ; tooltip = redondant. => non
- **Le label "Description"** doit-il être traduit (`Description` en anglais comme aujourd'hui) ou en français pour matcher les autres specs vibe ? Recommandation : garder l'anglais — le reste de l'UI de la fiche est en anglais (Security & access, Lifecycle, Programs · Projects, Back to catalog). => anglais
- **Code formaté `code: [V_2CINS_01]`** : faut-il rendre les crochets littéralement, ou utiliser un encart visuel (bordure, fond) ? Recommandation : crochets littéraux, plus rapide à scanner et plus simple à recopier. => crochet
- **Si plusieurs Project Managers**, faut-il rendre la liste complète plutôt que juste le premier ? Recommandation : V1 = premier seul. Si feedback "il en faut plus", on bascule en V2 vers une carte "Project Managers (N)" dépliable. => Premier seul
- **Avatar du Project Manager** : les Project Managers sont des `Person` (sans `Manager.title`). On les affiche via `<Avatar name={p.name} seed={p.email} />` + label fixe "Project Manager" en dessous du nom.
=> oui
## Acceptance Criteria
- [ ] Sur `/labtestmean/[id]`, le H1 (nom du banc) est le **premier** élément visible de la zone droite.
- [ ] Sous le H1, une rangée de chips affiche **type, status, complexity** chacun avec **un pictogramme** à gauche du texte.
- [ ] La rangée de chips n'inclut plus l'`externalId`.
- [ ] Sous la location, une ligne `code: [<externalId>]` apparaît en monospace.
- [ ] Sous le bloc `code`, un encart contient **Bench Manager** et **Project Manager** côte à côte (selon disponibilité), chacun avec un cadre fin, l'avatar à initiales à gauche, le nom / rôle / email à droite.
- [ ] Le bloc Description commence par un label "Description" en typographie de section.
- [ ] L'ancienne section "People" (manager card + 5 listes pliables) n'existe plus sur la fiche.
- [ ] Tous les pictogrammes héritent leur couleur via `currentColor` et utilisent les tokens existants ; mode clair et sombre rendent correctement.
- [ ] Aucun changement à la grille catalogue, à la map, au filtrage, à la pagination.
- [ ] Aucun changement de DTO, d'adaptateur, ou de types domaine (sauf éventuellement extension de `ChipType` / `BadgeStatus`).
- [ ] Build Next OK, types stricts OK, pas de régression visuelle vérifiable sur `/`, `/map`, `/labtestmean/[id]`.
