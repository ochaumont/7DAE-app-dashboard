# Feature Spec: Intégration GraphQL — attributs étendus Application

## Summary
- Ajouter au domaine `Application` onze nouveaux attributs à récupérer depuis une **source GraphQL** (nouvelle intégration, distincte de l'API REST `atom-synchronizer-dev` utilisée aujourd'hui) : `airbusSite`, `businessCriticality`, `functionalSuitability`, `technicalSuitability`, `programCategory`, `partIS`, `obsoRiskStatus`, `BRDURL`, `ARDURL`, `confluenceURL`, `gDrivePath`.
- Ajouter une nouvelle relation `relApplicationToBusinessCapability` (liste de Business Capabilities liées à l'application), également issue de GraphQL.
- Modifier le data model (`lib/types.ts`), la couche de récupération de données (nouvelle requête GraphQL, en complément ou en remplacement partiel de `lib/atom-api.ts`), et l'affichage sur la fiche détail `/application?id=<externalId>`.
- Affichage V1 volontairement minimal : les nouveaux champs sont listés **à la suite**, dans une disposition simple choisie par l'implémentation — la mise en page définitive sera revue dans une itération ultérieure.

## Motivation
- Le référentiel ATOM expose historiquement ses données via REST (`atom-synchronizer-dev`, cf. CLAUDE.md), mais une partie des attributs métier attendus pour les Applications (suitability fonctionnelle/technique, catégorie programme, risque d'obsolescence, liens vers la documentation projet, rattachement aux Business Capabilities) n'est disponible que via une **API GraphQL** distincte.
- `airbusSite` était identifié comme absent de l'API REST lors de l'intégration initiale des Applications (cf. `_specification/vibe coding/integration-api-applications.md`, section Décisions : "sera ajouté plus tard côté backend — confirmé"). Sa disponibilité via GraphQL est la concrétisation de cette promesse, et ouvre la voie à peupler enfin `/map` (actuellement vide faute de données de localisation).
- Le rattachement aux **Business Capabilities** (`relApplicationToBusinessCapability`) est une dimension métier absente du modèle actuel — elle permettra à terme de répondre à des questions de type "quelles applications supportent telle capability".
- Cette spec pose les fondations (modèle de données, requête, affichage basique) sans figer la disposition finale de l'UI, pour itérer rapidement une fois les vraies données visibles.

## Décisions (arbitrées)

### Nouvelle source de données
- Une requête GraphQL dédiée est introduite pour récupérer ces attributs, en complément de la requête REST existante (`fetchApplications`/`fetchApplication` dans `lib/atom-api.ts`), qui continue de fournir tous les champs déjà en place aujourd'hui (nom, catégorie, statut, portfolio, lifecycle, etc.).
- Le **point d'entrée**, l'**authentification** et le **mécanisme de fusion** entre les données REST et les données GraphQL (une seule application à la fois vs liste complète, appel systématique vs à la demande) restent à préciser — voir Open Questions. Cette spec ne présume pas d'une architecture technique donnée.

### Attributs simples (valeur scalaire)
Les huit attributs suivants sont ajoutés tels quels au type `Application` :
- `airbusSite` — site Airbus de rattachement de l'application (texte ou code, domaine de valeurs à confirmer avec le fournisseur GraphQL).
- `businessCriticality` — **attention** : ce nom existe déjà dans le modèle actuel, alimenté par l'API REST (`missionCritical`/`businessCritical`/`businessOperational`/`administrativeService`). La spec ne tranche pas si la valeur GraphQL **remplace**, **complète** ou **entre en conflit** avec la valeur REST existante — voir Open Questions (arbitrage nécessaire avant implémentation).
- `functionalSuitability` — adéquation fonctionnelle (domaine de valeurs à confirmer).
- `technicalSuitability` — adéquation technique (domaine de valeurs à confirmer).
- `programCategory` — catégorie de programme (domaine de valeurs à confirmer).
- `partIS` — indicateur/statut lié aux systèmes d'information (nom et domaine à confirmer, présumé booléen ou enum).
- `obsoRiskStatus` — statut de risque d'obsolescence (domaine de valeurs à confirmer).
- `BRDURL`, `ARDURL`, `confluenceURL`, `gDrivePath` — quatre liens/chemins vers de la documentation projet externe (Business Requirements Document, Architecture Requirements Document, espace Confluence, dossier Google Drive).

### Nouvelle relation : Business Capabilities
- `relApplicationToBusinessCapability` devient une liste de Business Capabilities rattachées à l'application, suivant le même schéma de référence que les autres relations déjà modélisées (portfolio, manager, etc. — un identifiant + un nom).
- Aucune page ou filtre dédié aux Business Capabilities n'est créé dans cette itération : seule la liste des capabilities liées à l'application affichée est montrée sur sa fiche détail.

### Portée de l'affichage V1
- Les onze attributs scalaires et la liste de Business Capabilities sont affichés **à la suite**, sur la fiche détail `/application?id=<externalId>` uniquement (pas sur le board catalogue, pas sur `/map`, pas dans l'export PDF pour cette itération).
- La disposition exacte (groupement, libellés, mise en forme des URLs en liens cliquables, etc.) est laissée à l'appréciation de l'implémentation et sera revue dans une itération ultérieure — ce n'est pas un critère d'acceptation figé ici.

## Requirements

### Functional Requirements
- Le data model `Application` (`lib/types.ts`) intègre les onze nouveaux attributs scalaires et la relation `businessCapabilities` (liste de références nommées).
- Une requête GraphQL récupère ces données pour l'application affichée sur la fiche détail (a minima), avec un mécanisme de récupération cohérent avec le reste de l'application (gestion d'erreur, absence de photo/backend down, etc. — mêmes standards que l'intégration REST existante).
- La fiche détail affiche, à la suite des sections existantes, les nouveaux attributs et la liste des Business Capabilities lorsqu'ils sont disponibles.
- Les quatre champs URL (`BRDURL`, `ARDURL`, `confluenceURL`, `gDrivePath`) sont rendus de façon à rester consultables (lien cliquable ou texte brut, à trancher en implémentation).

### Non-Functional Requirements
- **Cohérence avec la politique réseau du projet** : tout nouvel appel HTTP (y compris GraphQL) doit respecter la règle CLAUDE.md "Network calls — ask first" — confirmation explicite requise avant tout appel réel vers le nouvel endpoint, y compris en phase d'exploration/test.
- **Résilience** : si la source GraphQL est indisponible ou renvoie une erreur, la fiche détail doit rester utilisable avec les données REST existantes (dégradation gracieuse), plutôt que de faire échouer toute la page.
- **Pas de régression** sur les champs et sections déjà affichés (catégorie, statut, lifecycle, portfolio, operator & provider, managers).

## Scope

### In Scope
- Modification du data model `Application` pour les onze nouveaux attributs + la relation Business Capabilities.
- Mise en place d'une requête GraphQL pour récupérer ces données.
- Affichage basique (disposition libre, non figée) de ces données sur la fiche détail.

### Out of Scope
- Disposition/maquette définitive de l'affichage des nouveaux champs — itération future.
- Utilisation d'`airbusSite` pour peupler `/map` — bien que cette spec débloque la donnée, l'intégration cartographique reste une feature séparée.
- Filtres catalogue sur les nouveaux attributs (Program Category, Obso Risk Status, Business Capability, etc.) — non demandés ici.
- Export PDF des nouveaux attributs.
- Page ou vue dédiée aux Business Capabilities elles-mêmes.

## Affected Areas
- **Modifier** : `lib/types.ts` (type `Application` étendu).
- **Créer/Modifier** : couche d'accès aux données GraphQL (nouveau module, nom et emplacement à définir en implémentation, en miroir de `lib/atom-api.ts`) ; l'adapter (`lib/application-adapter.ts`) pour fusionner les données REST et GraphQL dans l'objet `Application`.
- **Modifier** : `components/ApplicationDetailClient.tsx` (ou un nouveau sous-composant dédié) pour afficher les nouveaux champs.
- **Non touché (pour cette itération)** : board catalogue (`ApplicationCard.tsx`), `/map`, filtres (`FilterBar.tsx`/`FilterSheet.tsx`), export PDF (`components/pdf/*`).

## Edge Cases
- Un attribut GraphQL absent ou `null` pour une application donnée → affiché avec un état "non renseigné" cohérent avec le reste de la fiche (ex. "—" comme pour les champs REST optionnels existants), pas de section masquée silencieusement sauf si la spec le prévoit explicitement.
- `relApplicationToBusinessCapability` vide → la section Business Capabilities n'affiche aucune donnée (comportement à trancher : section masquée vs message "Aucune business capability").
- Conflit entre `businessCriticality` REST et GraphQL (cf. Open Questions) → tant que non arbitré, l'implémentation ne doit pas silencieusement écraser l'un par l'autre sans décision explicite.
- Source GraphQL indisponible → la fiche détail reste utilisable avec les données REST, les nouveaux champs affichent un état d'indisponibilité plutôt que de bloquer toute la page.
- URLs malformées ou vides (`BRDURL`, `ARDURL`, `confluenceURL`, `gDrivePath`) → pas de lien cassé affiché comme cliquable ; un champ vide suit la même convention "non renseigné" que les autres.

## Open Questions
- **Endpoint et authentification GraphQL** : quelle est l'URL du service GraphQL, et quel mécanisme d'authentification utiliser (même approche que le JWT dev optionnel de `lib/atom-api.ts`, ou différent) ? Bloquant pour l'implémentation réelle — nécessite une réponse de l'utilisateur avant tout appel réseau (cf. règle CLAUDE.md).
- **Stratégie de fusion REST + GraphQL** : un seul appel GraphQL par application affichée sur la fiche détail (à la demande), ou une récupération groupée pour toutes les applications (comme le fait `fetchApplications` pour le board) ? Recommandation : à la demande, uniquement sur la fiche détail dans cette V1, pour limiter le risque et la portée du premier appel réel.
- **Conflit `businessCriticality`** : la valeur GraphQL remplace-t-elle la valeur REST existante, les deux coexistent-elles sous des noms distincts, ou la GraphQL est-elle simplement ignorée si REST est déjà renseigné ? Recommandation : renommer le champ GraphQL en interne (ex. distinguer clairement les deux sources) tant que l'arbitrage métier n'est pas fait, plutôt que d'en écraser un silencieusement.
- **Domaines de valeurs des enums** : `functionalSuitability`, `technicalSuitability`, `programCategory`, `partIS`, `obsoRiskStatus` — quelles sont les valeurs possibles pour chacun ? Nécessaire pour prévoir des libellés lisibles (comme `STATUS_LABELS`/`CATEGORY_LABELS` existants) plutôt que d'afficher des codes bruts.
- **Format de `relApplicationToBusinessCapability`** : une Business Capability est-elle identifiée par un couple id/nom (comme `FactsheetRef` aujourd'hui), ou porte-t-elle d'autres attributs utiles à afficher (ex. hiérarchie, description) ?
- **Rendu des champs URL** : lien cliquable ouvrant un nouvel onglet, ou texte brut copiable ? Recommandation : lien cliquable (`target="_blank"`), cohérent avec l'usage attendu de documentation externe.

## Acceptance Criteria
- [ ] Le type `Application` expose les onze nouveaux attributs et la relation Business Capabilities.
- [ ] Une requête GraphQL récupère ces données pour l'application affichée sur la fiche détail.
- [ ] La fiche détail affiche, à la suite, les nouveaux attributs et la liste des Business Capabilities lorsqu'ils sont disponibles.
- [ ] L'indisponibilité de la source GraphQL n'empêche pas l'affichage du reste de la fiche (données REST).
- [ ] Aucun appel réseau réel n'est effectué sans confirmation explicite de l'utilisateur, conformément à la règle CLAUDE.md.
- [ ] Build Next OK, pas de régression sur les sections existantes de la fiche détail, sur le board catalogue, ni sur `/map`.
