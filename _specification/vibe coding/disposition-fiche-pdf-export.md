# Feature Spec: Disposition de la fiche PDF (export Lab Test Mean)

## Summary
Décrire le **positionnement exact** des éléments d'une page-fiche du PDF d'export (`components/pdf/BenchDetailPage.tsx`), d'après la maquette `temp/visual.jpg`. La donnée et les composants graphiques existent déjà (cf. `components/pdf/icons.tsx`) ; cette spec ne change **que la mise en page** (placement, regroupement, ordre, alignements) pour coller à la maquette.

La maquette impose 4 zones empilées : **(1) entête**, **(2) photo centrée**, **(3) bande 3 colonnes**, **(4) sections pleine largeur**.

## Motivation
L'implémentation actuelle diverge de la cible voulue :
- les attributs Complexity / Access / Remote sont dans une section « Identity » → la maquette les met **dans l'entête, à droite** ;
- la fiche est en 2 colonnes + empilement → la maquette veut une **bande à 3 colonnes** (Identity+Programs+ATA | Carte+Ville | Lifecycle) ;
- le lifecycle a été fait **horizontal** → la maquette le veut **vertical** (timeline, comme le web) ;
- l'encart manager est encadré et la description est encadrée → la maquette les montre **sans bordure** ;
- l'ordre des sections basses et le style de la carte (gris neutre) diffèrent.

But : un rendu fidèle à `temp/visual.jpg`.

## Wireframe (cible)

```
┌─────────────────────────────────────────────────────────────────────┐
│ SA_LR_WBI_RADAR                                                       │  Zone 1 — Entête
│ [N_RADAR_01]  ‹OPERATIONAL›        ⚙ Simple   ✗ Access not secured    │
│                                    ✗ No remote access                 │
│                                                                       │
│                       ┌───────────────────────┐                      │  Zone 2 — Photo
│                       │        (photo)         │                      │  centrée
│                       └───────────────────────┘                      │
│                                                                       │
│  IDENTITY                  (carte pays)           ○ Kickoff           │  Zone 3 — 3 colonnes
│  ┌──────┐                   ▲ point rouge           Not started       │
│  │⚙ SIB │                                                            │
│  └──────┘                                          ● In Service       │
│                                                      Operational …    │
│  AIRCRAFT PROGRAMS            Toulouse                                │
│  ✈ LR-A330  ✈ SA       M24 · C095 / C097 / …      ○ Mothballed       │
│                                                      Not mothballed   │
│  ATA CHAPTERS                                                         │
│  ⚙ ATA 34                                          ○ Dismantled       │
│                                                      Still in service │
│                                                                       │
│  LAB TEST MEAN MANAGER                                                │  Zone 4 — pleine largeur
│  (KD)  Karine Roques …  /  Lab Test Mean Manager  /  email            │
│                                                                       │
│  DESCRIPTION                                                          │
│  texte multi-lignes …                                                 │
│                                                                       │
│  INSTRUMENTATION                                                      │
│  SYGAM                                                                │
│                                                                       │
│  SOFTWARE                                                             │
│  [Aneto A]  [Aneto All in One]                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Positionnement détaillé

### Zone 1 — Entête (pleine largeur)
- **Ligne 1** : le **nom** du LTM (`name`), grand, gras, bleu Airbus (`colors.fg`).
- **Ligne 2** : disposée en **row, espace entre deux groupes** :
  - **Groupe gauche** : `[externalId]` (mono, muted) suivi du **badge Status** plein (couleur = `statusColor[status]`, ex. vert « OPERATIONAL »).
  - **Groupe droit** : trois attributs **icône + label**, alignés à droite, qui peuvent passer sur 2 lignes (`flexWrap`) :
    1. **Complexity** : `PdfComplexityIcon` + label (`COMPLEXITY_LABELS`, ex. « Simple »).
    2. **Access** : `PdfAccessIcon` + « Access secured » / « Access not secured » (croix rouge si non sécurisé).
    3. **Remote** : `PdfRemoteIcon` + « Remote access » / « No remote access » (croix rouge si absent).
  - ⇒ Ces 3 attributs **quittent** la section « Identity ».

### Zone 2 — Photo (pleine largeur, centrée)
- Cover (`resolvedCover`) **centrée horizontalement**, largeur ~45–55 % de la page, hauteur fixe (~170–180), `objectFit: contain`. Placeholder « No photo available » si absente.

### Zone 3 — Bande 3 colonnes (sous la photo)
`flexDirection: row`, 3 colonnes. Largeurs indicatives : **gauche ~32 %**, **centre ~36 %**, **droite ~32 %**, avec `gap`.

- **Colonne gauche** — sections empilées :
  - **IDENTITY** : une **puce Type** = icône de type (à transposer : `PdfTypeIcon` d'après `components/icons/TypeIcon.tsx`) + libellé `TYPE_LABELS[type]` (ex. « SIB »), dans un **chip arrondi à fond bleu clair** (`color-mix` accent léger ; en PDF : fond clair `colors.surface`/accent à faible opacité, bordure fine).
  - **AIRCRAFT PROGRAMS** : tuiles `PdfAircraftIcon` + code (`programs[]`), en `row`/`wrap`.
  - **ATA CHAPTERS** : tuiles `PdfAtaIcon` + « ATA {code} » (`atas[]`), en `row`/`wrap`.
- **Colonne centre** — bloc localisation **centré** :
  - **Carte pays** `PdfCountryMap` (silhouette **gris neutre**, pas bleu marine ; point ville **rouge**), centrée.
  - **Ville** (`location.city`, ex. « Toulouse ») centrée, en évidence (taille moyenne).
  - **Bâtiment · salles** (`building` · `room`, ex. « M24 · C095 / C097 / C098 / C099 ») centré, muted.
- **Colonne droite** — **Lifecycle vertical (timeline)** :
  - 4 étapes de haut en bas : **Kickoff → In Service → Mothballed → Dismantled**.
  - Chaque étape : un **marqueur** (pastille pleine si atteinte, anneau muted sinon) + l'**icône d'étape** (colorée si atteinte : kickoff=accent, inService=success, mothballed=warning, dismantled=danger ; muted sinon) + **label** (gras) + **description** (small, muted).
  - **Réutiliser les libellés du web** (`components/detail/LifecycleSection.tsx`) : atteint → « Project started in … » / « Operational since … » / « Mothballed since … » / « Dismantled in … » ; non atteint → « Not started » / « Not yet in service » / « Not mothballed » / « Still in service ».

### Zone 4 — Sections pleine largeur (sous la bande, empilées, dans cet ordre)
1. **LAB TEST MEAN MANAGER** : **sans encadré** — avatar rond (initiales déterministes + couleur seed = email, cf. `avatarColor`/`initials`) puis, à droite : **nom** (gras), **« Lab Test Mean Manager »** (muted), **email** (mono muted).
2. **DESCRIPTION** : bloc de texte multi-lignes **sans bordure** (texte simple, `description`).
3. **INSTRUMENTATION** : texte simple (`instrumentation`).
4. **SOFTWARE** : `wrap` de **chips bordés** (fond clair) avec `softwares[].name`.

### Style commun des titres de section
Tous les intitulés (`IDENTITY`, `AIRCRAFT PROGRAMS`, `ATA CHAPTERS`, `LAB TEST MEAN MANAGER`, `DESCRIPTION`, `INSTRUMENTATION`, `SOFTWARE`) : **petites capitales, letter-spacing, couleur muted** (style `styles.h3` existant).

## Écarts à corriger vs implémentation actuelle (`BenchDetailPage.tsx`)
- **Déplacer** Complexity/Access/Remote de la section Identity **vers l'entête** (groupe droit).
- **Identity** ne contient plus que la **puce Type** (icône type + label, fond clair).
- **Passer en 3 colonnes** la bande (Identity+Programs+ATA | Carte+Ville | Lifecycle) au lieu de 2 colonnes + empilement.
- **Lifecycle vertical** (timeline avec marqueurs + descriptions) au lieu de l'horizontal actuel.
- **Manager sans bordure** (retirer `styles.card`) ; conserver avatar + nom + rôle + email.
- **Description sans encadré** (retirer `styles.descriptionBox`) ; texte simple.
- **Carte pays en gris neutre** (paramètre `color` gris, pas `colors.fg` marine).
- **Ordre des sections basses** : Manager → Description → Instrumentation → Software.
- **Nouveau** : `PdfTypeIcon` (transposition de `components/icons/TypeIcon.tsx`) pour la puce Identity.

## Requirements

### Functional Requirements
- La page-fiche respecte les 4 zones et le wireframe ci-dessus.
- L'entête montre nom, externalId, badge status, et les 3 attributs icône+label à droite.
- La bande centrale est en 3 colonnes alignées comme décrit ; la carte et les libellés ville/salle sont **centrés** dans la colonne médiane.
- Le lifecycle est vertical, étape atteinte colorée + description ; non atteinte en muted.
- Manager, Description, Instrumentation, Software sont **pleine largeur** sous la bande, dans l'ordre indiqué, manager et description **sans bordure**.
- Toute section vide est masquée (programmes/ATA/manager/instrumentation/software/description) ; localisation inconnue → carte masquée mais texte conservé.

### Non-Functional Requirements
- **Aucune nouvelle dépendance** ; uniquement réagencement + `PdfTypeIcon` (primitives `@react-pdf/renderer` déjà utilisées).
- Réutiliser `components/pdf/icons.tsx`, `styles.ts` (ajouter au besoin `chipType`, styles colonnes), et les libellés `lib/labels.ts`.
- Mode clair fixe, A4 portrait, libellés anglais — inchangés.
- Pagination : si la fiche déborde, laisser react-pdf paginer ; garder l'ancre `id="bench-${externalId}"` sur le `<Page>`.

## Scope

### In Scope
- `components/pdf/BenchDetailPage.tsx` — réagencement complet selon les 4 zones.
- `components/pdf/icons.tsx` — ajouter `PdfTypeIcon`.
- `components/pdf/styles.ts` — styles colonnes + chip Type ; ajuster manager/description (sans bordure) ; couleur carte grise.

### Out of Scope
- Page de garde, sommaire, route serveur, déclenchement, résolution photo — inchangés.
- Contenu/données du modèle `LabTestMean` — inchangé.
- Galerie multi-photos, 360°, mode sombre, i18n.

## Affected Areas
- **Modifier** : `components/pdf/BenchDetailPage.tsx`, `components/pdf/icons.tsx`, `components/pdf/styles.ts`.
- **Référence (lecture)** : `components/icons/TypeIcon.tsx` (glyphes type), `components/detail/LifecycleSection.tsx` (libellés étapes), `temp/visual.jpg` (maquette).
- **Non touché** : `CoverPage.tsx`, `TableOfContents.tsx`, `CatalogueExport.tsx`, route serveur, web.

## Edge Cases
- **Pays inconnu** → carte masquée, ville/bâtiment/salle conservés (centrés).
- **Pas de programmes / ATA** → colonne gauche n'affiche que les sections présentes.
- **Lifecycle vide** → 4 étapes affichées toutes « non atteintes » (muted).
- **Access/Remote `null`** → label « — » (icône neutre ou absente, pas de croix rouge trompeuse).
- **Manager absent** → section masquée.
- **Texte long** (description, salles) → wrap normal, pagination si nécessaire.
- **Beaucoup de programmes/ATA** → wrap sur plusieurs lignes dans la colonne gauche (peut allonger la colonne).

## Acceptance Criteria
- [ ] L'entête affiche nom + `[externalId]` + badge status à gauche, et Complexity/Access/Remote (icône+label) à droite.
- [ ] La photo est centrée sous l'entête.
- [ ] Sous la photo : 3 colonnes — gauche (Identity puce Type, Aircraft Programs, ATA Chapters), centre (carte grise + point rouge, Ville, bâtiment·salles centrés), droite (lifecycle vertical).
- [ ] Le lifecycle est vertical avec marqueur + icône colorée (atteint) + description ; étapes non atteintes en muted.
- [ ] Sous la bande, en pleine largeur et dans l'ordre : Manager (sans bordure) → Description (sans bordure) → Instrumentation → Software (chips).
- [ ] La puce Identity montre l'icône de type + libellé (ex. « SIB ») sur fond clair.
- [ ] Un LTM aux champs manquants se génère sans erreur (sections masquées).
- [ ] `npm run build` OK ; rendu visuellement conforme à `temp/visual.jpg`.
