# Feature Spec: Mode Clair et Mode Sombre

## Summary
- Offrir deux styles de rendu à l'échelle de toute l'application : **mode sombre** (actuel, déjà implémenté via `theme-industrial-premium` / `theme-map-first`) et un nouveau **mode clair**.
- Le choix est une **préférence utilisateur persistante**, indépendante de la route (donc orthogonale aux thèmes actuels attachés à `/` vs `/map`).
- Adaptation des éléments visuellement sensibles au contraste :
  - **Logo Airbus** : version adaptée à chaque fond (logo clair sur sombre, logo sombre sur clair).
  - **Boutons et badges** : couleurs accent, hover, focus, état actif, retravaillés pour rester lisibles et hiérarchisés en mode clair comme en mode sombre.
- **Toggle clair/sombre** dans le bandeau global (dans le slot droit déjà réservé), avec icônes explicites (soleil / lune) et support du raccourci clavier si simple.
- Respect initial de la préférence système de l'utilisateur (`prefers-color-scheme`) au premier chargement, puis priorité à son choix explicite ensuite.

## Motivation
- Les utilisateurs Airbus travaillent dans des contextes lumineux variés (salle de briefing éclairée, salle d'intégration sombre, extérieur, écran projeté). Un mode clair améliore la lisibilité dans les environnements éclairés et réduit la fatigue visuelle dans certains cas.
- Aligne l'application sur les standards actuels des produits internes modernes (tous les outils Airbus / SweetForge récents proposent light/dark).
- Prépare un design system cohérent : aujourd'hui les tokens CSS sont figés en sombre, ce qui bloque toute évolution. Introduire l'axe clair/sombre force une meilleure séparation sémantique des couleurs (accent vs fond vs texte).

## Requirements

### Functional Requirements

#### Application du mode
- Le mode (clair / sombre) est un attribut global qui s'applique à **toutes les pages** : accueil catalogue, carte, fiche banc, futures pages.
- Le mode survit à la navigation interne (pas de reset entre `/` et `/map`).
- Le mode est persisté (stockage local navigateur) et restauré au rechargement.
- Au **tout premier chargement** sans préférence stockée, le mode suit `prefers-color-scheme` du système ; si indéterminé, le défaut est **sombre** (cohérent avec l'app actuelle).
- Aucun flash de mauvais thème au chargement (pas de "FOUC" : mode sombre bref puis bascule clair).

#### Toggle clair/sombre
- Placé dans le **slot droit du bandeau** (réservé en V1 dans la feature précédente).
- Représenté par une icône soleil (☼) ou lune (☾) indiquant clairement l'action (clic = bascule vers l'autre mode).
- État actuel visible (icône différente selon le mode courant).
- Accessible au clavier (focus visible, activation par `Enter`/`Space`), avec `aria-pressed` ou équivalent ; label explicite pour les lecteurs d'écran ("Switch to light mode" / "Switch to dark mode").

#### Logo Airbus
- Deux versions du logo : l'une claire (pour fond sombre), l'autre sombre (pour fond clair).
- Sélection automatique en fonction du mode courant.
- Fallback texte "Airbus" existant conservé si les deux images échouent ; couleur du texte héritée via `currentColor` pour s'adapter aussi.

#### Boutons et composants interactifs
- Boutons primaires (ex. "Show N benches" du `FilterSheet`) : fond accent lisible sur les deux modes, texte toujours contrasté (WCAG AA sur ≥ 4.5:1 en texte normal, 3:1 en UI).
- Boutons de filtre actifs / inactifs (`FilterBar`) : conserver la hiérarchie claire entre sélectionné et non sélectionné dans les deux modes.
- Badges de statut (`BadgeStatus`) : operational / maintenance / out-of-service / in-project restent identifiables au premier coup d'œil ; tons pastel adaptés au mode clair (couleurs actuelles trop saturées pour un fond clair).
- Chips de type (`ChipType`) : accent + bordure + fond translucide retravaillés pour fonctionner sur fond clair.
- États hover, focus et actif distincts et visibles dans les deux modes.

#### Thème "map-first" (glassmorphism)
- Le mode clair doit également produire une version lisible du glassmorphism (`glass-panel` sur la page `/map`) : blur maintenu, surface translucide claire sur la carte (qui elle peut rester sombre — voir Open Questions) ou adaptée.
- Aucune régression visuelle sur la vue map en mode clair.

#### Thème global vs thème de route
- La distinction **clair / sombre** est orthogonale à la classe de thème actuelle (`theme-industrial-premium`, `theme-map-first`).
- Techniquement : introduction d'un attribut `data-theme="light" | "dark"` (ou classe équivalente) au niveau `<html>` ou `<body>`, indépendant des classes `theme-*` déjà posées.

### Non-Functional Requirements
- Bascule instantanée visuelle (< 100 ms), sans recharger la page.
- Pas de saut de layout (reflow) pendant la bascule.
- Aucun impact négatif sur les performances de rendu (les variables CSS coûtent zéro, l'écueil serait des re-renders React inutiles — à éviter).

## Scope

### In Scope
- Définition d'un jeu de tokens CSS **clair** parallèle au jeu sombre existant (background, surface, border, foreground, muted, accent, accent-fg, success, warning, danger).
- Adaptation des deux thèmes de direction existants (`theme-industrial-premium`, `theme-map-first`) pour qu'ils aient chacun une variante claire et sombre, ou refactoring des tokens pour n'avoir qu'un axe clair/sombre si la direction n'ajoute plus rien.
- Ajout d'un composant `ThemeToggle` intégré dans le `Header` (slot droit).
- Logique de persistance (localStorage) + respect de `prefers-color-scheme` au premier chargement + script anti-flash au tout début du `<body>` ou dans `<head>`.
- Ajout d'un logo Airbus sombre (`public/airbus-logo-dark.svg`) en plus du logo clair existant (`public/airbus-logo.svg`).
- Retravail des couleurs de : `BadgeStatus`, `ChipType`, boutons de `FilterBar` / `FilterSheet`, liens, cards `BenchCard`.

### Out of Scope
- Thèmes supplémentaires (haute visibilité, daltonien, sépia, etc.) — uniquement clair et sombre.
- Synchronisation du choix entre plusieurs onglets / plusieurs appareils.
- Préférences serveur / compte utilisateur (pas d'authentification dans l'app).
- Animation élaborée de la transition entre modes (un simple fondu via `transition: background-color, color` est acceptable, pas d'effet de vague ou de masque circulaire).
- Retrait du concept de thème par route (`map-first` reste une zone visuellement distincte).

## Affected Areas
- **Tokens CSS** : `app/globals.css` (variables racines) et `styles/themes/*.css` (variables par thème de route).
- **Nouveau composant** `components/ThemeToggle.tsx` (client, `"use client"`, lit et écrit le mode, affiche l'icône appropriée).
- **Composant modifié** `components/Header.tsx` : intègre `ThemeToggle` dans le slot droit, choisit le bon fichier de logo selon le mode.
- **Script anti-flash** : petite fonction inline injectée dans `<head>` via `app/layout.tsx` (avant hydratation) pour poser l'attribut `data-theme` avant tout rendu.
- **Composants de couleurs retravaillés** : `BadgeStatus.tsx`, `ChipType.tsx`, `FilterBar.tsx` (boutons toggle), `FilterSheet.tsx` (bouton valider), `BenchCard.tsx` (hover, border).
- **Assets** : ajout de `public/airbus-logo-dark.svg` (version sombre du logo existant, `fill="#000"` ou `currentColor` avec couleur forcée).
- **Types** : éventuel type `Theme = "light" | "dark"` dans `lib/types.ts` ou local au `ThemeToggle`.

## Edge Cases
- Utilisateur sans JavaScript / avec hydratation différée : le thème par défaut (sombre) s'applique via CSS natif ; pas d'erreur visible, juste pas de bascule possible.
- `localStorage` bloqué (mode navigation privée stricte) : la bascule reste fonctionnelle pendant la session mais n'est pas persistée — pas de crash.
- Changement de `prefers-color-scheme` pendant la session : si l'utilisateur a fait un choix explicite, on le respecte ; sinon on peut suivre le système (à trancher — voir Open Questions).
- Thème map (carte MapLibre en `dark-matter-gl-style`) : en mode clair, la carte doit aussi basculer vers un style clair (`positron-gl-style` CartoDB, par exemple), sinon incohérence visuelle forte.
- Panneau glass sur carte en mode clair : fond blanc légèrement translucide sur tuiles claires — lisibilité à valider.
- Panorama 360° (`react-photo-sphere-viewer`) : la visionneuse a ses propres contrôles ; vérifier qu'ils restent visibles sur les deux modes (sinon style custom).
- Images des bancs (`picsum.photos`, couvertures sombres en moyenne) : pas de bordure brutale sur fond clair → ajout d'une bordure légère `--color-border` sur les `<img>` cover si nécessaire.
- Badge status "warning" (jaune vif) : contraste faible sur fond clair → teinte ajustée.
- Transition de mode pendant un scroll ou un drag (ex. sur la map) : ne doit pas perturber l'interaction en cours.

## Open Question
- Doit-on continuer à suivre `prefers-color-scheme` après un choix explicite de l'utilisateur, ou verrouiller le choix jusqu'à reset manuel ? pas de choix du systéme, uiquement un toggle présenté à l'utilisateur. le mode clair est celui par défaut.
- Le mode **auto** (suit le système) doit-il être un troisième état du toggle (soleil / lune / auto), ou implicite (pas de choix = auto) ? non 2 état soleil et lune
- Les deux directions visuelles (`industrial-premium`, `map-first`) gardent-elles chacune une variante claire distincte, ou fusionne-t-on en un seul thème dont seul l'axe clair/sombre varie ? un seul theme commun à toute l'appli
- Pour la carte en mode clair : basculer automatiquement le style de tuiles (`positron-gl-style`) ou conserver la carte sombre pour préserver l'esthétique ? conserver la carte sombre
- Logo sombre : fallback si on ne trouve pas de version officielle → inverser dynamiquement le logo clair via `filter: invert(1)` acceptable comme workaround V1 ? oui
- Placement du toggle : slot droit du bandeau (comme prévu) ou ailleurs (préférences utilisateur à terme) ? slot droit

## Acceptance Criteria
- [ ] L'application dispose de deux modes : clair et sombre, avec un jeu complet de tokens CSS pour chaque.
- [ ] Un toggle visible est présent dans le bandeau (slot droit) sur toutes les pages et bascule le mode en un clic.
- [ ] Le choix est persisté (localStorage) et restauré au rechargement sans flash visuel.
- [ ] Au premier chargement sans choix antérieur, le mode suit `prefers-color-scheme` du système.
- [ ] Le logo Airbus affiché est cohérent avec le mode (logo clair sur fond sombre, logo sombre sur fond clair).
- [ ] Le fallback texte "Airbus" s'affiche dans la bonne couleur dans les deux modes.
- [ ] Boutons, badges, chips, cards, filtres restent lisibles et hiérarchisés dans les deux modes (contraste WCAG AA minimum pour le texte).
- [ ] La vue `/map` reste cohérente : panneau glass lisible, carte adaptée au mode (ou justification si conservée sombre).
- [ ] La bascule entre modes est fluide (< 100 ms, pas de reflow, pas de flash).
- [ ] Le toggle est accessible au clavier et annoncé correctement par un lecteur d'écran.
- [ ] Aucune régression visuelle sur les 4 statuts de `BadgeStatus`, les chips de type, les 20 fiches banc, la galerie et le panorama 360°.
