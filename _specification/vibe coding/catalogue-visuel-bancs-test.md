# Feature Spec: Catalogue Visuel des Bancs de Test Airbus

## Summary
- Application web moderne et fluide qui présente le catalogue des bancs de test Airbus (SIB, SIMU, FIB, etc.) sous une forme très visuelle.
- Chaque banc dispose d'une fiche riche : identité, type, description, instrumentation, capabilities techniques, applications installées, liens (autres bancs, shared resources, projets, ATA, programs avions), statut opérationnel, localisation géographique et bench manager.
- Galerie multi-photos par banc (1 à 15 images) incluant des panoramas 360° navigables à la souris.
- Recherche et filtres multi-critères (type, statut, pays/site/building, programme, ATA, capability, manager…).
- Avant développement : présentation au stakeholder de **plusieurs propositions visuelles / moodboards** pour valider la direction d'UX.

## Motivation
- Les bancs de test sont aujourd'hui décrits dans des documents épars peu engageants ; les ingénieurs et planners ont besoin d'un point d'entrée unique, immédiatement compréhensible.
- Un rendu très visuel (cartes, photos, 360°) accélère la prise de décision (réservation de banc, compréhension des capabilities, recherche de ressource compatible avec un projet).
- Aligne l'expérience utilisateur sur le standard des produits internes modernes Airbus / SweetForge.

## Requirements

### Functional Requirements

#### Vue catalogue (liste / exploration)
- Affichage en grille de cartes visuelles (vignette photo principale + nom + type + statut + site).
- Bascule grille ↔ liste compacte ↔ vue carte géographique (monde → pays → site → building).
- Recherche plein-texte (nom, référence externe, description, applications, manager).
- Filtres combinables :
  - Type de banc (SIB, SIMU, FIB, …)
  - Statut opérationnel (opérationnel, maintenance, hors service, en projet)
  - Localisation : pays / ville / building
  - Programme avion lié (A320, A350, …)
  - ATA chapter
  - Technical capability
  - Bench manager
  - Date d'entrée en service (range)
- Tri configurable (nom, date d'entrée en service, statut, type).
- URL partageable reflétant filtres + recherche.

#### Fiche banc (détail)
- En-tête : nom, référence externe, type (chip coloré), statut (badge), localisation (pays / ville / building), bench manager (avatar + contact).
- Galerie photos 1 à 15 :
  - Vignettes en bandeau, grand format au clic.
  - Détection automatique des photos 360° → viewer panoramique interactif (drag souris, zoom, plein écran).
  - Indicateur visuel sur les vignettes 360°.
- Bloc description (texte riche).
- Bloc instrumentation (liste/tableau).
- Date d'entrée en service.
- Section *Technical Capabilities* (tags / badges).
- Section *Applications installées* (liste avec versions si disponibles).
- Section *Liens* :
  - Autres bancs liés (mini-cartes cliquables).
  - Shared resources liées.
  - Projets, ATA, Programs avions (chips cliquables qui filtrent le catalogue).
- Sections pliables / ancrées dans une nav latérale (sticky).

#### Propositions visuelles (phase amont, livrable de cadrage)
- Produire **3 à 5 directions visuelles** distinctes (moodboards / mockups statiques) couvrant :
  - Style "industriel premium" (sombre, accents bleu Airbus, typo technique).
  - Style "data-rich dashboard" (fond clair, dense, focus filtres et tableaux).
  - Style "immersif photo-first" (vignettes pleine largeur, hero 360° en page d'accueil).
  - Style "carte interactive" (la map est l'écran principal).
  - Style "Bento / cards modulaires" inspiration produits modernes (Linear / Vercel).
- Chaque direction présente : home/catalogue, détail banc, vue filtres mobiles.
- Validation stakeholder avant tout développement.

#### Navigation & performance
- Transitions fluides entre liste et détail (shared element / view transitions).
- Lazy loading des photos, pré-chargement de la première du banc adjacent.
- Réactif desktop / tablette ; mobile lecture-only acceptable.

## Scope

### In Scope
- Frontend complet du catalogue et de la fiche banc.
- Viewer 360° intégré dans la galerie.
- Filtres, recherche, tri, vue carte géographique.
- Préparation et présentation des directions visuelles.
- Lecture des données depuis une source unifiée (API ou fixtures pour la phase démo).

### Out of Scope
- Édition / création / modification d'un banc (read-only dans cette première itération).
- Module de réservation / planning du banc (renvoyer vers l'outil existant).
- Gestion des droits fins par banc (au-delà d'une auth standard).
- Import / synchronisation back-end avec les référentiels source — supposés déjà disponibles via API.
- Application mobile native.

## Affected Areas
- Nouveau frontend (probablement Next.js, à confirmer en phase technique).
- Composant viewer 360° réutilisable (basé sur photo-sphere-viewer / Three.js).
- Couche d'accès données bancs (API ou fixtures).
- Design system : extension avec composants cards, chips type/status, galerie, viewer pano, map.
- Documentation utilisateur (mini-guide d'utilisation des filtres et de la 360°).

## Edge Cases
- Banc sans aucune photo → placeholder élégant (ex. illustration + type).
- Banc avec uniquement des photos 360° (aucune photo classique).
- Photo 360° mal taguée ou non équirectangulaire → fallback en photo plate + warning interne.
- Très grande quantité de bancs (>500) → virtualisation de la grille.
- Caractères spéciaux / accents dans la recherche (Airbüs sites internationaux).
- Bench manager non renseigné → mention "Non assigné" au lieu de masquer la section.
- Liens vers banc supprimé ou inexistant → affichage grisé non-cliquable.
- Localisation incomplète (building manquant) → fallback sur ville/pays.
- Connexion lente : photos 8 Mo+ → compression / formats modernes (AVIF/WebP) et placeholders blur.
- Mode hors-ligne / tunnel : message clair, conservation des derniers résultats.

## Open Question
- Quelle est la **source de vérité** des données bancs (API existante ? Export ? Référentiel à créer) ? API eistantes à mocker dans un premier temps
- Faut-il une **authentification** Airbus SSO dès cette première version ? non
- Les **photos 360°** sont-elles déjà stockées quelque part avec un tag identifiable, ou faut-il une convention (suffixe de fichier, métadonnée) ? pas encore disponibles
- Quel volume de bancs est attendu (10, 100, 1000+) — impacte choix de virtualisation et pagination ? 400 bancs
- La **vue carte géographique** est-elle indispensable dès la V1 ou peut-elle être une V1.1 ? indispensable
- Y a-t-il des **chartes graphiques Airbus** imposées (couleurs, typo) à intégrer dès les moodboards ? non
- Le bench manager doit-il être contactable (mailto / Teams) ou simple affichage ? non
- Multilingue requis (FR/EN) dès la V1 ? EN uniquement

## Acceptance Criteria
- [ ] 3 à 5 directions visuelles présentées au stakeholder, une est sélectionnée et tracée dans le repo.
- [ ] Le catalogue affiche tous les bancs avec vignette, nom, type, statut, site.
- [ ] Recherche plein-texte renvoie des résultats pertinents en < 200 ms sur le dataset cible.
- [ ] Tous les filtres listés fonctionnent et sont combinables ; l'URL reflète l'état.
- [ ] La fiche banc affiche les 12 catégories d'information listées dans le Summary.
- [ ] La galerie supporte 1 à 15 photos ; les 360° sont détectées et navigables (drag, zoom, plein écran) sans lag perceptible.
- [ ] Vue carte géographique (si retenue en V1) permet de cliquer un site et filtrer le catalogue.
- [ ] Transitions liste → détail fluides (pas de flash blanc, pas de saut visuel).
- [ ] Tous les edge cases listés sont gérés sans erreur visible utilisateur.
- [ ] Performance : premier rendu utile < 2 s sur connexion bureau standard.
