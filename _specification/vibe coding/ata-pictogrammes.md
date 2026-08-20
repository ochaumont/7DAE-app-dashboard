# Feature Spec: ATA en pictogrammes

## Summary
- Représenter les **chapitres ATA** d'un banc sous forme de **tuiles** (pictogramme + code), exactement dans la lignée des `AircraftProgramTile` introduits par `programmes-avion-pictogrammes.md`.
- Les afficher dans la **même zone du header** que les programmes avion : colonne gauche, sous le label de localité, en complément des pictos avion.
- Pictogramme proposé : un **engrenage (gear / cog)** stylisé, glyphe unique pour tous les ATA (la spécificité passe par le label texte, ex : `ATA 21`, `ATA 32`).
- Label sous l'icône : le **code ATA** préfixé du marqueur `ATA` (`ATA 21`, `ATA 32-43`, etc.) pour qu'il soit auto-explicatif au scan, sans titre de section nécessaire.

## Motivation
- Les chapitres ATA sont une **dimension métier majeure** des bancs de test : ils disent à quel(s) système(s) du programme avion (Air Conditioning, Landing Gear, Hydraulics, Flight Controls, etc.) le banc s'adresse. Aujourd'hui cette information est totalement absente de l'UI (retirée en V1 par `integration-api-labtestmeans.md` faute d'exposition backend).
- Le couple **(programme avion × chapitres ATA)** est la lecture rapide la plus utile pour un ingénieur : *"banc d'A350 dédié aux systèmes de conditionnement d'air et au train d'atterrissage"*. Les afficher côte à côte donne au header une identité métier complète.
- Le **pictogramme uniformise visuellement** la zone et la rapproche du traitement déjà adopté pour les programmes avion. Cohérence > différenciation à l'icône près.
- Le code ATA seul (`21`, `32`) est cryptique pour quelqu'un qui n'est pas du métier ; le préfixe `ATA` rend la tuile lisible sans légende.

## Décisions (arbitrées)
- **Pictogramme ATA** : SVG inline dans `components/icons/AtaIcon.tsx`. Glyphe : **engrenage** (gear) à 8 dents, viewBox 24×24, `stroke="currentColor"`, `fill="none"`, trait 1.8 px. Style cohérent avec `AircraftIcon` et les icônes Lucide existantes (`KickoffIcon`, `InServiceIcon`, etc.). Même glyphe pour **tous** les chapitres — la différenciation passe par le label.
- **Tuile** : nouveau composant `components/AtaTile.tsx`, calqué sur `AircraftProgramTile`. Visuel : pictogramme engrenage centré (~28 px), label `ATA {code}` en dessous en `font-mono text-[11px] text-fg`, padding `p-1`, **pas de bordure** (cohérent avec les tuiles avion actuelles), pas d'interactivité en V1.
- **Conteneur** : nouveau composant `components/AtaList.tsx`, calqué sur `AircraftPrograms` actuel : `flex flex-row flex-nowrap items-start gap-3`. Une seule ligne, tous les ATA alignés à plat. Si la liste est vide → `null`.
- **Emplacement** : dans `LabTestMeanHeader.tsx`, **sous** les programmes avion, dans la même colonne gauche (sous mini-carte + locality + AircraftPrograms). Petit gap vertical (~8 px) entre les deux blocs pour les distinguer visuellement.
- **Format du label** : `ATA {code}` (ex. `ATA 21`, `ATA 32-43`). Le préfixe est ajouté côté composant ; le domaine stocke uniquement la valeur brute (`"21"`, `"32-43"`).
- **Liste vide** (aucun ATA associé) : aucun bloc rendu — pas de placeholder, pas de label "None". Cohérent avec le comportement de `AircraftPrograms`.
- **Source de données** : nouveau champ `m.atas: string[]` côté domaine. La présence du champ côté backend est un **prérequis** (voir Open Questions). Tant que le backend ne l'expose pas, l'adapter renverra `[]` et le bloc ne s'affichera pas, ce qui rend la feature **forward-compatible** sans casser la fiche actuelle.

## Requirements

### Functional Requirements

#### Composant pictogramme
- Nouveau `components/icons/AtaIcon.tsx` : SVG 24×24, glyphe **engrenage** (8 dents, cercle central pour évoquer le moyeu), trait 1.8 px en `currentColor`. `aria-hidden="true"`. Signature `{ size?: number; className?: string }` pour cohérence avec `AircraftIcon`, `ComplexityIcon`, `LifecycleStepIcon`.

#### Tuile ATA
- Nouveau `components/AtaTile.tsx` : reçoit `{ code: string }`. Rendu :
  - Icône engrenage centrée en haut (~28 px de hauteur effective).
  - Label `ATA {code}` en dessous, centré, `font-mono text-[11px] leading-none truncate max-w-full`.
  - Wrapper `flex flex-col items-center gap-1 p-1 text-fg` (identique à `AircraftProgramTile`).
  - Pas de bordure, pas de fond (le bloc reste léger comme les tuiles avion).

#### Conteneur ATA
- Nouveau `components/AtaList.tsx` : reçoit `{ atas: string[] }`. Rendu :
  - Si `atas.length === 0` → retourne `null`.
  - Sinon : `<div className="flex flex-row flex-nowrap items-start gap-3">` avec une `<AtaTile>` par chapitre, dans l'ordre du tableau.

#### Intégration header
- Dans `LabTestMeanHeader.tsx`, ajouter `<AtaList>` dans la colonne gauche, **immédiatement sous** `<AircraftPrograms>`.
- Layout résultant de la colonne gauche du header :
  1. Mini-carte pays (200 × 140 px).
  2. Label `city` (text-sm).
  3. Label `building · room` (text-xs muted).
  4. Tuiles avion (1 ligne).
  5. **Tuiles ATA (1 ligne)** ← nouveauté.
- Espacement : utiliser `gap-3` du flex-col actuel pour homogénéité avec les programmes avion.

#### Domaine
- Étendre `LabTestMean` (lib/types.ts) avec un champ `atas: string[]`.
- Étendre le DTO `LabTestMeanDto` (lib/atom-api.ts) avec le champ correspondant — nom backend à confirmer (probablement `atas` ou `ataChapters`).
- Étendre `lib/labtestmean-adapter.ts` pour mapper le champ DTO → `atas`. Si absent du DTO → tableau vide.

### Non-Functional Requirements
- **Pas de nouvelle dépendance npm** (icône SVG inline, comme tous les autres pictos du projet).
- **Theme** : héritage `currentColor` → mode clair/sombre OK sans config additionnelle.
- **Accessibilité** : icône `aria-hidden="true"`, le label texte porte tout le sens. La lecture par lecteur d'écran donne `"ATA 21"`, suffisant.
- **Responsive** : la liste reste `flex-row flex-nowrap` (une seule ligne) ; au-delà de la largeur disponible, on accepte le débord horizontal (cohérent avec le choix fait pour les programmes avion). À surveiller si un banc cumule 8+ ATA.
- **Performance** : aucune nouvelle requête, le champ est livré dans le payload existant `GET /api/infos/labtestmeans` (et `/{externalId}`).

## Scope

### In Scope
- Créer `components/icons/AtaIcon.tsx`, `components/AtaTile.tsx`, `components/AtaList.tsx`.
- Modifier `components/LabTestMeanHeader.tsx` pour insérer `<AtaList>` sous `<AircraftPrograms>`.
- Modifier `lib/types.ts` : ajout du champ `atas: string[]` sur `LabTestMean`.
- Modifier `lib/atom-api.ts` : ajout du champ correspondant sur `LabTestMeanDto`.
- Modifier `lib/labtestmean-adapter.ts` : mapping DTO → domaine pour `atas` (avec fallback `[]`).

### Out of Scope
- Affichage du **nom complet** du chapitre ATA (`ATA 21 → Air Conditioning & Pressurization`) au survol — V2 (cf. Open Questions). En V1, le code seul.
- Click-through depuis une tuile vers une vue filtrée du catalogue par ATA — V2.
- Filtrage du catalogue / map par ATA — V2.
- **Pictogrammes différenciés par chapitre** (engrenage rouge pour ATA 32, valve bleue pour ATA 21, etc.) — V2 si besoin métier. V1 reste uniforme.
- Bordure / fond coloré par ATA pour les distinguer — V2.
- Affichage des ATA sur la grille catalogue ou dans la popup map — la fiche détail reste l'endroit dédié.
- Édition / réordonnancement des ATA depuis l'UI — la donnée reste read-only.

## Affected Areas
- **Créer** :
  - `components/icons/AtaIcon.tsx`
  - `components/AtaTile.tsx`
  - `components/AtaList.tsx`
- **Modifier** :
  - `components/LabTestMeanHeader.tsx` — insertion de `<AtaList>` sous `<AircraftPrograms>` dans la colonne gauche.
  - `lib/types.ts` — ajout `atas: string[]` sur `LabTestMean`.
  - `lib/atom-api.ts` — ajout du champ DTO miroir.
  - `lib/labtestmean-adapter.ts` — mapping + fallback `[]`.
- **Non touché** :
  - Catalogue `/`, map `/map` — pas d'usage des ATA en V1.
  - `LifecycleSection`, `Gallery`, `BadgeStatus`, et tous les composants de chip déjà existants.
  - `app/labtestmean/[externalId]/page.tsx` — pas de modification (le header gère seul l'affichage).

## Edge Cases
- **`m.atas` vide** → `<AtaList>` retourne `null`. Le header reste compact, la colonne gauche s'arrête après les programmes avion.
- **1 seul ATA** → 1 tuile sur sa ligne, alignée à gauche.
- **2-4 ATA** → tuiles côte à côte sur une seule ligne, lisible dans la largeur disponible.
- **Beaucoup d'ATA (≥ 6-8)** → débord horizontal de la ligne (`flex-nowrap`). Conforme au comportement actuel des programmes avion. À reconsidérer (wrap ou scroll horizontal contenu) si le débord devient problématique en pratique.
- **Code ATA exotique** (ex: `32-43`, `ATA 70-89`, ou avec préfixe déjà inclus comme `"ATA 21"` côté backend) :
  - Hypothèse V1 : le backend renvoie le code brut (`"21"`, `"32-43"`). Le préfixe `ATA` est ajouté par le composant.
  - Si le backend renvoie déjà préfixé (`"ATA 21"`), on aurait `ATA ATA 21` à l'écran → à arbitrer dès la première fiche réelle, soit en normalisant côté adapter, soit en adaptant le composant.
- **Code ATA vide ou null** dans le tableau → tuile rendue avec label `ATA ` (vide). Hypothèse : l'adapter filtre les valeurs falsy avant de produire le tableau. Si une valeur vide passe, c'est un bug à investiguer côté backend, pas à masquer côté UI.
- **Champ DTO totalement absent** (backend n'expose pas encore les ATA) → adapter renvoie `[]`, bloc ne s'affiche pas. Aucune régression de la fiche actuelle.
- **Champ DTO `null` au lieu de `[]`** → idem, géré par l'adapter avec fallback `[]`.

## Open Questions
- **Choix de l'icône** : engrenage retenu (recommandation), mais alternatives possibles : clé à molette (wrench, plus orienté maintenance), livre ouvert (book, évoque le manuel ATA), schéma technique (circuit). Le user a explicitement demandé une **proposition** — engrenage est l'option la plus universellement reconnaissable comme "système / sous-ensemble technique". À valider visuellement avant implémentation. => choisit engrenage
- **Format du code livré par le backend** : brut (`"21"`) ou pré-formaté (`"ATA 21"`) ? À confirmer par un appel à l'API dès qu'elle expose le champ. Décision V1 : on normalise côté composant en ajoutant `ATA `, et si le backend pré-formate, on retirera le préfixe dans l'adapter.=> suivre recommendation
- **Tooltip avec le nom complet du chapitre** (`ATA 21` → "Air Conditioning & Pressurization") au survol ? Très utile pour les non-experts. Recommandation : V2 — la table des libellés ATA fait ~100 entrées et mérite son propre composant `AtaCatalog`. En V1, le code seul est suffisant pour l'audience cible. => code seul
- **Position relative aux programmes avion** : sous (recommandation, choix décrit ici) vs. à côté (sur la même ligne horizontale) ? Sous est plus lisible quand il y a plusieurs ATA et plusieurs programmes ; à côté économise de la hauteur mais entasse l'info. Trancher visuellement après la première implémentation si la verticalité fatigue. => suivre recommendation
- **Limite d'ATA affichés** : faut-il tronquer à N et afficher `+M more` au-delà ? Recommandation : pas de limite en V1 — on observe le pire cas réel et on décidera. Aucun banc connu ne dépasse 5 ATA aujourd'hui (à confirmer côté donnée). => pas de limite

## Acceptance Criteria
- [ ] Sur une fiche avec ≥ 1 chapitre ATA, une rangée de tuiles ATA apparaît **sous** les tuiles de programmes avion, dans la colonne gauche du header.
- [ ] Chaque tuile contient un **pictogramme engrenage** au-dessus et le **code ATA préfixé** (`ATA 21`, `ATA 32-43`, etc.) en label en-dessous.
- [ ] Les tuiles ATA s'alignent sur **une seule ligne** (`flex-nowrap`) cohérente avec le rendu des programmes avion.
- [ ] Sur une fiche **sans ATA** (`m.atas.length === 0` ou champ absent côté backend), aucune rangée ATA ne s'affiche, le header reste compact.
- [ ] La donnée `m.atas` est exposée côté domaine et alimentée par l'adapter, avec fallback `[]` si le DTO ne la contient pas.
- [ ] Mode clair / sombre : tuiles lisibles dans les deux thèmes, l'engrenage hérite via `currentColor`.
- [ ] Aucune nouvelle dépendance npm. `npm run build` OK, types stricts OK, `npm run lint` 0 nouvelle erreur.
- [ ] Aucune régression visuelle sur les fiches sans ATA (le header reste identique au rendu actuel).
