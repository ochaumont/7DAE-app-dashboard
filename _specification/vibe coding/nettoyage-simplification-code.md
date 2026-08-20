# Feature Spec: Nettoyage et Simplification du Code

## Summary
- Suppression du code mort identifié (composants orphelins, exports inutiles, CSS non utilisé).
- Centralisation des constantes dupliquées (labels de statut, type, complexité) dans un module partagé.
- Factorisation de fonctions identiques définies dans plusieurs fichiers.
- Fusion de composants quasi-identiques en une abstraction réutilisable.
- Objectif : zéro comportement changé, code plus facile à maintenir et à faire évoluer.

## Motivation
- Les mêmes mappings (`STATUS_LABELS`, `TYPE_LABELS`, `COMPLEXITY_LABELS`) sont définis dans 9+ emplacements distincts ; toute correction doit être répercutée manuellement partout.
- Deux fonctions de formatage de date identiques (`formatLifecycleDate` / `fmtDate`) coexistent dans des fichiers différents sans raison.
- ~~`PanoramaClient.tsx` et `PanoramaViewer.tsx` existent dans `components/` mais ne sont référencés par aucune route active~~ — **invalidé** : ces composants sont bien utilisés via `Gallery.tsx` pour le viewer 360° de la page de détail ; ne pas supprimer.
- La classe CSS `.grid-bg` est définie dans `styles/themes/industrial-premium.css` mais jamais utilisée dans le code.
- `generateStaticParams` est exportée dans `app/labtestmean/[externalId]/page.tsx` alors que `force-dynamic` désactive le SSG, rendant cette fonction morte.

## Requirements

### Functional Requirements

#### 1. Centralisation des constantes de labels (`lib/labels.ts`)
- Créer `lib/labels.ts` exportant :
  - `STATUS_LABELS` (actuellement dans `FilterBar.tsx`, `filterDescription.ts`, `BenchDetailPage.tsx`)
  - `TYPE_LABELS` (actuellement dans `FilterBar.tsx`, `ChipType.tsx`, `BenchDetailPage.tsx`)
  - `COMPLEXITY_LABELS` (actuellement dans `FilterBar.tsx`, `filterDescription.ts`, `ChipComplexity.tsx`, `BenchDetailPage.tsx`)
- Remplacer toutes les définitions locales par un import depuis `lib/labels.ts`.
- Aucune valeur ne doit changer ; uniquement la source de vérité est déplacée.

#### 2. Extraction de la fonction de formatage de date (`lib/format-date.ts`)
- Créer `lib/format-date.ts` exportant une fonction unique de formatage de date de cycle de vie.
- Supprimer `formatLifecycleDate()` de `components/detail/LifecycleSection.tsx` (lignes ~56–62).
- Supprimer `fmtDate()` de `components/pdf/BenchDetailPage.tsx` (lignes ~32–38).
- Remplacer par un import depuis `lib/format-date.ts` dans les deux fichiers.

#### 3. ~~Suppression des composants orphelins~~ — action annulée
- `PanoramaClient.tsx` est importé par `Gallery.tsx` (ligne 6) pour le viewer 360° de la page de détail.
- `PanoramaViewer.tsx` est chargé dynamiquement depuis `PanoramaClient.tsx` (SSR désactivé).
- Ces composants sont actifs et doivent être conservés.

#### 4. Suppression de la CSS morte
- Supprimer le bloc `.grid-bg` dans `styles/themes/industrial-premium.css` (lignes ~47–52).
- Vérifier que la classe n'est utilisée nulle part (grep complet) avant suppression.

#### 5. Nettoyage de `generateStaticParams`
- Supprimer l'export `generateStaticParams` de `app/labtestmean/[externalId]/page.tsx`.
- La page utilise `export const dynamic = "force-dynamic"` ; le SSG est désactivé et la fonction n'est jamais appelée.
- Ajouter un commentaire court expliquant pourquoi `force-dynamic` est utilisé (dépendance API live).

#### 6. Fusion de `AircraftProgramTile` et `AtaTile` (optionnel — V2)
- Les deux composants ont une structure quasi-identique (icône + code, empilés verticalement).
- Envisager un composant générique `IconTile` acceptant `code` et `Icon` en props.
- Cette action est marquée optionnelle car elle implique un changement d'interface de composant.

## Scope

### In Scope
- Refactorisation pure : aucun comportement UI ne change.
- Suppression de fichiers confirmés comme orphelins.
- Extraction de constantes et fonctions en modules partagés.
- Suppression de CSS non utilisée.

### Out of Scope
- Ajout de nouvelles fonctionnalités.
- Changement de style visuel ou de tokens de thème.
- Refactorisation des routes ou de la structure App Router.
- Migration de librairies ou de dépendances.

## Affected Areas
- `lib/` : ajout de `labels.ts` et `format-date.ts`.
- `components/FilterBar.tsx` : suppression des définitions locales de labels.
- `lib/filterDescription.ts` : suppression des définitions locales de labels.
- `components/ChipType.tsx` : suppression de la définition locale.
- `components/ChipComplexity.tsx` : suppression de la définition locale.
- `components/pdf/BenchDetailPage.tsx` : suppression des définitions locales + `fmtDate`.
- `components/detail/LifecycleSection.tsx` : suppression de `formatLifecycleDate`.
- `components/PanoramaClient.tsx` : conservé (viewer 360° actif via `Gallery.tsx`).
- `components/PanoramaViewer.tsx` : conservé (idem).
- `styles/themes/industrial-premium.css` : suppression du bloc `.grid-bg`.
- `app/labtestmean/[externalId]/page.tsx` : suppression de `generateStaticParams`.

## Edge Cases
- Vérifier que `filterDescription.ts` reste cohérent après suppression des constantes locales (il peut exporter d'autres valeurs calculées à partir des labels).
- S'assurer que le build TypeScript (`tsc --noEmit`) passe sans erreur après chaque suppression.
- Vérifier qu'aucun fichier `.next/` en cache ne masque une erreur : supprimer `.next/` et relancer `npm run build` en fin de refactorisation.

## Open Questions
- ~~La fonctionnalité panorama 360° est-elle abandonnée ?~~ **Répondu** : `PanoramaClient` / `PanoramaViewer` sont actifs via `Gallery.tsx` — à conserver.
- La fusion `AircraftProgramTile` + `AtaTile` en `IconTile` générique doit-elle faire partie de ce ticket ou d'un ticket dédié ? => non les garder séparés
- Y a-t-il d'autres exports `generateStaticParams` dans d'autres pages qui seraient dans le même cas ? => non, c'est le seul cas

## Acceptance Criteria
- [ ] `lib/labels.ts` existe et exporte `STATUS_LABELS`, `TYPE_LABELS`, `COMPLEXITY_LABELS`.
- [ ] Aucune définition locale dupliquée de ces constantes ne subsiste dans `FilterBar.tsx`, `filterDescription.ts`, `ChipType.tsx`, `ChipComplexity.tsx`, `BenchDetailPage.tsx`.
- [ ] `lib/format-date.ts` existe ; `formatLifecycleDate` et `fmtDate` sont supprimées de leurs fichiers d'origine.
- [x] `components/PanoramaClient.tsx` et `components/PanoramaViewer.tsx` : conservés — utilisés par `Gallery.tsx` pour le viewer 360°.
- [ ] Le bloc `.grid-bg` est absent de `styles/themes/industrial-premium.css`.
- [ ] `generateStaticParams` est supprimée de `app/labtestmean/[externalId]/page.tsx`.
- [ ] `npm run build` passe sans erreur après toutes les suppressions.
- [ ] Aucune régression visuelle sur `/`, `/map`, et `/labtestmean/[externalId]`.
