# Feature Spec: Refonte Template Export PDF

## Summary
Refondre le template de l'export PDF (`components/pdf/*`) pour le rapprocher visuellement du dashboard web et corriger le vocabulaire. Trois chantiers :

1. **Page de garde** — ajouter une **entête avec le logo Airbus** (asset réel `public/airbus-logo.svg`) en haut de page, plutôt que le simple texte « AIRBUS » actuel.
2. **Vocabulaire** — remplacer partout **« benches » / « bench » par « Lab Test Means » / « Lab Test Mean »** (page de garde, sommaire, pages détail, libellés type « Bench Manager »).
3. **Page détail d'un Lab Test Mean** — enrichir et réorganiser la fiche pour qu'elle ressemble à la fiche web (`LabTestMeanDetailClient` et ses sous-composants), avec icônes + labels, encarts et représentations graphiques.

Le but : un PDF dont chaque fiche est une transposition fidèle de la fiche en ligne, lisible hors-ligne et imprimable.

## Motivation
- L'export PDF actuel (`BenchDetailPage.tsx`) est un résumé textuel minimaliste : localisation en texte, programmes/ATA/capabilities en simples listes séparées par virgules, pas d'instrumentation/softwares, pas de description, pas de mini-carte, pas d'icônes. Il diverge fortement de la fiche web devenue riche (mini-carte pays, pictogrammes programmes/ATA, encart manager, icônes complexity/access/remote, timeline lifecycle).
- Les utilisateurs qui partagent/archivent un PDF veulent **retrouver la même information et la même lecture visuelle** que dans l'application — pas une version appauvrie.
- Le terme « bench » est un reliquat de l'ancien modèle ; l'app parle désormais de **Lab Test Means** partout. Le PDF doit s'aligner.

## Décisions (arbitrées)
- **Périmètre** : modification du **template PDF uniquement** (`components/pdf/`). La logique de déclenchement (bouton catalogue, route serveur `app/api/export/pdf/route.ts`, résolution des photos) reste inchangée. On consomme le même domaine `LabTestMean` (cf. `lib/types.ts`).
- **Page A4 portrait** conservée, **mode clair fixe** conservé (palette `components/pdf/styles.ts`), **libellés en anglais** (cohérent avec l'UI).
- **Logo Airbus** : entête en haut de la page de garde, réutilisant `public/airbus-logo.svg`. Le logo `currentColor` doit être rendu en bleu Airbus / sombre lisible sur fond blanc.
- **Vocabulaire** : « Lab Test Means » (pluriel) pour les titres/compteurs, « Lab Test Mean » (singulier) pour une fiche, « Lab Test Mean Manager » à la place de « Bench Manager ».
- **Représentations graphiques** : on **transpose les icônes/SVG web vers les primitives `@react-pdf/renderer`** (`<Svg>`, `<Path>`, `<Circle>`, `<Rect>`, `<Line>`). C'est faisable car les icônes web sont déjà des SVG simples (`components/icons/*`) et la mini-carte est un SVG paramétré par données (`lib/country-map-data.generated.ts`).

### Page détail — sections attendues (ordre proposé)
Aligné sur la fiche web. Chaque section ne s'affiche que si la donnée existe (sinon masquée ou « — »).

1. **Header** : nom + `externalId` + **badge Status** (avec couleur de statut, cf. `statusColor`) — ajoute le **status** demandé, déjà partiellement présent.
2. **Identity** (conservé) : Type (avec icône type), et regroupe les **icônes attributs** :
   - **Complexity** (icône `ComplexityIcon` + label).
   - **Access is secured** (icône `AccessControlIcon` + état, depuis `security.accesscontrol`).
   - **Remote access** (icône capability, depuis `technicalCapabilities` contenant `remote-access` / `no-remote-access`).
3. **Location** : **représentation graphique du pays** (silhouette SVG) avec le **point rouge** de la ville (réutiliser `PATHS` + `SITE_COORDS` de `lib/country-map-data.generated.ts`, transposés en `<Svg><Path/><Circle/>`), à côté du texte **pays · ville · bâtiment · salle(s)**.
4. **Aircraft Programs** : affichés **en pictogrammes + label** (forme des tuiles `AircraftProgramTile` / `AircraftIcon`), pas une liste virgulée.
5. **ATA Chapters** : affichés **en pictogrammes + label** (forme `AtaTile` / `AtaIcon`).
6. **Lab Test Mean Manager** : **mis en avant dans un encart** (style proche de `ManagerCard` : nom, email, éventuel rôle/avatar à initiales), distinct du reste.
7. **Lifecycle** : affiché **comme une timeline** (étapes Kickoff → In Service → Mothballed → Dismantled, à l'image de `LifecycleStepIcon`), pas seulement 4 champs date.
8. **Instrumentation & Softwares** : ajouter **l'instrumentation** (`instrumentation`) et la **liste des softwares** (`softwares[]`).
9. **Description** : ajoutée **en dernier, dans un encadré** (`description`), après tous les autres attributs.

## Requirements

### Functional Requirements

#### Page de garde (`CoverPage.tsx`)
- Entête en haut de page avec le **logo Airbus** (`public/airbus-logo.svg`), aligné et dimensionné proprement.
- Titre principal **« Lab Test Means »**, sous-titre « Catalogue Export », date du jour, et compteur reformulé **« N Lab Test Means included »** (remplace « N benches included »).
- Le bloc « Active Filters » reste, alimenté par `filtersDescription`.

#### Vocabulaire (tous les composants `components/pdf/*`)
- Aucune occurrence visible de « bench » / « benches » dans le rendu : titres, compteurs, libellé manager, `<Document title=…>`, sommaire.
- Le renommage **visuel** est prioritaire ; les noms de fichiers/types internes (`BenchDetailPage`, `ResolvedBench`) peuvent être renommés pour cohérence mais ce n'est pas requis fonctionnellement (à laisser à l'implémentation).

#### Page détail (`BenchDetailPage.tsx`)
- Afficher le **Status** sous forme de badge coloré.
- **Location** : mini-carte SVG du pays + point rouge ville, alignée avec le texte pays/ville/bâtiment/salle.
- **Aircraft Programs** et **ATA** : rendus icône + label (pictogrammes), repliables sur plusieurs lignes (`flexWrap`).
- **Complexity**, **Access is secured**, **Remote access** : chacun une icône + label, comme sur la fiche web.
- **Manager** : encart visuellement distinct (fond/bordure, mise en avant).
- **Lifecycle** : représentation type timeline (étapes ordonnées avec marqueur + date).
- **Instrumentation** et **Softwares** : nouvelles sous-sections.
- **Description** : encadré final.
- Toute section sans donnée est masquée ou affiche « — » (jamais de crash).
- Le lien de pied de page « View on dashboard ↗ » est conservé.

### Non-Functional Requirements
- **Pas de nouvelle dépendance** : tout se fait avec `@react-pdf/renderer` déjà présent (primitives SVG incluses). Le logo SVG peut être rendu via `<Image src="/airbus-logo.svg">` ou transposé en primitives selon ce que `react-pdf` accepte le mieux (à valider — react-pdf a un support SVG partiel ; un PNG du logo en fallback est acceptable).
- **Réutilisation de la donnée** : les SVG paths de la carte proviennent de la source existante `lib/country-map-data.generated.ts` (ne pas dupliquer/hand-éditer).
- **Mode clair fixe** conservé ; couleurs depuis `components/pdf/styles.ts` (étendre la palette si besoin pour les pictogrammes).
- **Performance** : pas de régression notable sur le temps de génération (les SVG ajoutés sont légers et statiques).
- **Robustesse** : un Lab Test Mean aux champs manquants (pas de manager, pas de programmes, pays inconnu, etc.) doit produire une page valide.

## Scope

### In Scope
- `components/pdf/CoverPage.tsx` — entête logo + libellés « Lab Test Means ».
- `components/pdf/BenchDetailPage.tsx` — refonte des sections (status, mini-carte, pictogrammes programmes/ATA, icônes complexity/access/remote, encart manager, timeline lifecycle, instrumentation, softwares, description encadrée).
- `components/pdf/CatalogueExport.tsx` / `TableOfContents.tsx` — vocabulaire « Lab Test Mean(s) ».
- `components/pdf/styles.ts` — tokens/styles additionnels (encart, timeline, pictogrammes, badges).
- Éventuels petits helpers PDF pour transposer les icônes SVG web en primitives `react-pdf` (nouveaux fichiers sous `components/pdf/`).

### Out of Scope
- Le **mécanisme** d'export (bouton catalogue, route serveur, résolution photos, téléchargement) — inchangé.
- Export d'une **fiche seule** depuis la page détail web — autre feature.
- **Mode sombre** du PDF, **bilingue** FR/EN, **galerie multi-photos** et **panorama 360°** — hors périmètre.
- Modification du modèle de données (`lib/types.ts`, adapter, API) — l'export consomme l'existant.

## Affected Areas
- **Modifier** : `components/pdf/CoverPage.tsx`, `components/pdf/BenchDetailPage.tsx`, `components/pdf/CatalogueExport.tsx`, `components/pdf/TableOfContents.tsx`, `components/pdf/styles.ts`.
- **Réutiliser (lecture seule)** : `public/airbus-logo.svg`, `lib/country-map-data.generated.ts`, `lib/labels.ts`, `lib/format-date.ts`, et les icônes `components/icons/*` (comme référence de forme pour la transposition).
- **Créer (optionnel)** : helpers de pictogrammes PDF sous `components/pdf/`.
- **Non touché** : `app/api/export/pdf/route.ts`, `components/CatalogueClient.tsx`, le domaine `LabTestMean`, les pages web.

## Edge Cases
- **Pays inconnu** (`PATHS[country]` absent) → pas de mini-carte (comme le web qui retourne `null`), garder le texte localisation.
- **Site sans coordonnées** → silhouette pays sans point rouge.
- **Aucun programme / ATA / software** → section masquée ou « — ».
- **Pas de manager** → encart masqué (ou « — »).
- **Lifecycle partiel** (ex. seulement Kickoff) → timeline n'affiche que les étapes renseignées.
- **Description vide** → pas d'encadré final.
- **Logo SVG non rendu par react-pdf** → fallback PNG du logo Airbus.
- **Débordement de page** : si une fiche enrichie dépasse l'A4, laisser react-pdf paginer proprement (vérifier que l'ancre `id="...{externalId}"` du sommaire reste sur la 1ʳᵉ page de la fiche).
- **Accès / remote inconnus** (`null`) → icône neutre + « — ».

## Open Questions
- **Rendu du logo Airbus** : `<Image>` du SVG, transposition en primitives, ou PNG embarqué ? À trancher selon le support réel de `react-pdf` (le SVG `currentColor` doit recevoir une couleur explicite). Recommandation : tester `<Image>` SVG, fallback PNG. => suivre recommendation
- **Avatars manager** : reproduire les initiales déterministes (`Avatar.tsx`) en PDF, ou se limiter au nom + email encadrés ? Recommandation V1 : encart nom/email/rôle, initiales si simple. => suivre recommendation
- **Timeline lifecycle** : timeline horizontale (4 étapes en ligne) ou verticale ? Recommandation : horizontale compacte, proche du web. => suivre recommendation
- **Pictogrammes programmes/ATA** : reproduire l'icône exacte (`AircraftIcon`/`AtaIcon`) ou une puce générique + label ? Recommandation : icône simple + label pour rester fidèle sans surcharger. => suivre recommendation
- **Couleur des pictogrammes/points** : reprendre les tokens PDF (`colors.accent`, `colors.danger`) plutôt que les variables CSS du web (non disponibles en PDF). => suivre recommendation

## Acceptance Criteria
- [ ] La page de garde affiche le **logo Airbus** en entête et le titre **« Lab Test Means »**, avec un compteur « N Lab Test Means included ».
- [ ] Aucune occurrence visible de « bench/benches » dans le PDF généré.
- [ ] Chaque fiche affiche le **Status** (badge coloré).
- [ ] La section **Location** montre la **silhouette du pays + point rouge** de la ville, plus pays/ville/bâtiment/salle.
- [ ] **Aircraft Programs** et **ATA** sont affichés en **icône + label**.
- [ ] **Complexity**, **Access is secured**, **Remote access** apparaissent avec leur **icône**.
- [ ] Le **manager** est dans un **encart mis en avant** (« Lab Test Mean Manager »).
- [ ] Le **lifecycle** est rendu comme une **timeline** d'étapes.
- [ ] **Instrumentation** et **Softwares** sont présents.
- [ ] La **description** apparaît **en dernier, dans un encadré**.
- [ ] Une fiche aux champs manquants se génère sans erreur (sections masquées / « — »).
- [ ] `npm run build` OK ; aucune régression sur le déclenchement de l'export ni sur le reste de l'app.
