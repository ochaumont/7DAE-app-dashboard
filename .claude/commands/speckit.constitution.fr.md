---
description: Créer ou mettre à jour la constitution du projet à partir de principes fournis ou collectés interactivement, en veillant à la synchronisation de tous les modèles dépendants.
handoffs: 
  - label: Construire la spécification
    agent: speckit.specify
    prompt: Implémenter la spécification fonctionnelle à partir de la constitution mise à jour. Je veux construire...
---

## Entrée utilisateur

```text
$ARGUMENTS
```

Vous **DEVEZ** prendre en compte l'entrée utilisateur avant de continuer (si non vide).

## Plan d'exécution

Vous mettez à jour la constitution du projet dans `.specify/memory/constitution.md`. Ce fichier est un MODÈLE contenant des jetons de substitution entre crochets (ex. `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`). Votre travail consiste à (a) collecter/déduire les valeurs concrètes, (b) remplir le modèle avec précision, et (c) propager toute modification dans les artefacts dépendants.

**Note** : Si `.specify/memory/constitution.md` n'existe pas encore, il aurait dû être initialisé depuis `.specify/templates/constitution-template.md` lors de la configuration du projet. S'il est manquant, copiez d'abord le modèle.

Suivez ce flux d'exécution :

1. Charger la constitution existante dans `.specify/memory/constitution.md`.
   - Identifier chaque jeton de substitution de la forme `[IDENTIFIANT_EN_MAJUSCULES]`.
   **IMPORTANT** : L'utilisateur peut demander moins ou plus de principes que ceux utilisés dans le modèle. Si un nombre est spécifié, respectez-le — suivez le modèle général. Vous mettrez à jour le document en conséquence.

2. Collecter/déduire les valeurs des jetons :
   - Si l'entrée utilisateur (conversation) fournit une valeur, l'utiliser.
   - Sinon, inférer à partir du contexte existant du dépôt (README, docs, versions antérieures de la constitution si intégrées).
   - Pour les dates de gouvernance : `RATIFICATION_DATE` est la date d'adoption initiale (si inconnue, demander ou marquer TODO), `LAST_AMENDED_DATE` est la date du jour si des modifications sont apportées, sinon conserver la précédente.
   - `CONSTITUTION_VERSION` doit être incrémentée selon les règles de versionnement sémantique :
     - MAJEUR : Suppressions ou redéfinitions de gouvernance/principes incompatibles avec les versions précédentes.
     - MINEUR : Nouveau principe/section ajouté ou guidance substantiellement enrichie.
     - CORRECTIF : Clarifications, reformulations, corrections typographiques, ajustements non sémantiques.
   - Si le type d'incrémentation est ambigu, proposer un raisonnement avant de finaliser.

3. Rédiger le contenu mis à jour de la constitution :
   - Remplacer chaque jeton par du texte concret (aucun jeton entre crochets ne doit rester, sauf les emplacements de modèle intentionnellement conservés que le projet a choisi de ne pas encore définir — justifier explicitement tout jeton restant).
   - Conserver la hiérarchie des titres ; les commentaires peuvent être supprimés une fois remplacés, sauf s'ils apportent encore une guidance clarifiante.
   - S'assurer que chaque section Principe contient : une ligne de nom succinct, un paragraphe (ou liste à puces) décrivant les règles non négociables, une justification explicite si non évidente.
   - S'assurer que la section Gouvernance liste la procédure d'amendement, la politique de versionnement et les attentes en matière de revue de conformité.

4. Liste de vérification de propagation de cohérence (convertir la liste de vérification précédente en validations actives) :
   - Lire `.specify/templates/plan-template.md` et s'assurer que tout "Constitution Check" ou règle s'aligne avec les principes mis à jour.
   - Lire `.specify/templates/spec-template.md` pour l'alignement périmètre/exigences — mettre à jour si la constitution ajoute/supprime des sections ou contraintes obligatoires.
   - Lire `.specify/templates/tasks-template.md` et s'assurer que la catégorisation des tâches reflète les types de tâches ajoutés ou supprimés liés aux principes (ex. observabilité, versionnement, discipline de tests).
   - Lire chaque fichier de commande dans `.specify/templates/commands/*.md` (y compris celui-ci) pour vérifier qu'aucune référence obsolète (noms spécifiques à un agent comme CLAUDE uniquement) ne subsiste quand une guidance générique est requise.
   - Lire toute documentation de guidance d'exécution (ex. `README.md`, `docs/quickstart.md`, ou fichiers de guidance spécifiques à un agent si présents). Mettre à jour les références aux principes modifiés.

5. Produire un rapport d'impact de synchronisation (insérer en commentaire HTML en haut du fichier de constitution après mise à jour) :
   - Changement de version : ancienne → nouvelle
   - Liste des principes modifiés (ancien titre → nouveau titre si renommé)
   - Sections ajoutées
   - Sections supprimées
   - Modèles nécessitant des mises à jour (✅ mis à jour / ⚠ en attente) avec les chemins de fichiers
   - TODOs de suivi si des jetons ont été intentionnellement reportés.

6. Validation avant sortie finale :
   - Aucun jeton entre crochets non expliqué restant.
   - La ligne de version correspond au rapport.
   - Dates au format ISO YYYY-MM-DD.
   - Les principes sont déclaratifs, vérifiables et exempts de langage vague ("devrait" → remplacer par une justification DOIT/DEVRAIT le cas échéant).

7. Écrire la constitution finalisée dans `.specify/memory/constitution.md` (écraser).

8. Fournir un résumé final à l'utilisateur avec :
   - Nouvelle version et justification de l'incrémentation.
   - Tout fichier signalé pour suivi manuel.
   - Message de commit suggéré (ex. `docs: amend constitution to vX.Y.Z (ajout de principes + mise à jour gouvernance)`).

Exigences de formatage et de style :

- Utiliser les titres Markdown exactement comme dans le modèle (ne pas rétrograder/promouvoir les niveaux).
- Limiter les longues lignes de justification pour garder la lisibilité (<100 caractères idéalement) mais ne pas imposer de coupures artificielles.
- Conserver une seule ligne vide entre les sections.
- Éviter les espaces en fin de ligne.

Si l'utilisateur fournit des mises à jour partielles (ex. révision d'un seul principe), effectuer tout de même les étapes de validation et de décision de version.

Si une information critique est manquante (ex. date de ratification réellement inconnue), insérer `TODO(<NOM_DU_CHAMP>): explication` et l'inclure dans le rapport d'impact de synchronisation sous les éléments reportés.

Ne pas créer un nouveau modèle ; toujours opérer sur le fichier `.specify/memory/constitution.md` existant.
