# Token JWT utilisateur (AFTER) pour les appels API

## Contexte

Revirement par rapport à la spec précédente (`token-authentification-appels-api.md`, Basic Auth applicatif commun). Le bon modèle est le **JWT de l'utilisateur**, émis par la plateforme AFTER (Istio Gateway + Keycloak) qui héberge l'application, et transmis au backend `atom-synchronizer` en `Authorization: Bearer <jwt>`.

Cette spec :
1. décrit le modèle de sécurité AFTER (d'après `temp/Security_1.pdf` et `temp/Authentication - 1.pdf`) ;
2. liste **ce qu'il faut retirer** (la mécanique du token commun déjà implémentée) ;
3. propose **la nouvelle gestion** du token JWT utilisateur ;
4. traite le **mode développement** (pas de token généré → fourni via un fichier de config).

## Modèle de sécurité AFTER (synthèse des documents)

- Toute requête HTTP passe par l'**Istio Gateway** d'AFTER. S'il n'y a pas de JWT valide, le gateway déclenche le SSO (Mobile SSO → Keycloak) et obtient un **access token** (JWT) propre à l'utilisateur.
- Le JWT est un **Bearer token** transporté dans `Authorization: Bearer <jwt>`. Il est court (≈ 5 min) et rafraîchi par le gateway (refresh token ≈ 30 min).
- À l'issue de l'authentification, le gateway **pose des cookies** de session, dont **`AFTER_ACCESS_TOKEN`** (contient le JWT) et `AFTER_REFRESH_TOKEN`.
- Le gateway **injecte lui-même** l'access token dans le bearer des requêtes qu'il route vers l'API applicative.
- Le JWT porte l'identité et les attributs de l'utilisateur (email, preferred_username, roles, company…). L'autorisation fine est faite côté backend (Spring Security + OPA), hors périmètre du dashboard.
- **En développement** : impossible de générer un JWT valide en local (clé privée Airbus requise). La doc AFTER recommande d'en fabriquer un de test via `jwt.io` pour valider la configuration de sécurité.

## Décisions actées

| Question | Décision |
|---|---|
| Type de token | **JWT de l'utilisateur courant** (Bearer), émis par AFTER — **abandon** du Basic Auth applicatif commun |
| Dashboard ↔ API en prod | **Same-origin** derrière le même gateway |
| Injection du Bearer en prod | **Assurée par le gateway** (à confirmer par test — voir Vérification) |
| Rafraîchissement du token (5 min) | **Transparent** via le gateway |
| CORS sur les APIs | **Configuré** côté backend |
| Cookie `AFTER_ACCESS_TOKEN` HttpOnly ? | **Indéterminé — non bloquant** (l'approche retenue n'a pas besoin de lire le cookie en JS) |

## Approche retenue

Comme le dashboard et l'API sont **same-origin** et que le gateway injecte le Bearer, la SPA n'a, en prod, **rien à faire de spécial** ; seul le **dev** nécessite un token manuel.

- **Prod** : un `fetch` normal (same-origin) envoie automatiquement les cookies de session AFTER → le gateway injecte le `Authorization: Bearer` vers l'API. La SPA **ne lit pas** le token et **n'ajoute pas** d'en-tête. → La question HttpOnly devient sans objet.
- **Dev** : pas de gateway. La SPA ajoute `Authorization: Bearer <jwt>` à partir d'un JWT placé dans un **fichier de configuration** (`.env.local`, variable dédiée type `NEXT_PUBLIC_DEV_JWT`). Absent → aucun en-tête (comportement actuel inchangé).
- **Code unifié** : `atomFetch` (point unique dans `lib/atom-api.ts`) ajoute le header `Bearer` **uniquement si** un token dev est configuré ; sinon requête normale. Aucun branchement prod/dev complexe, aucune régression tant que rien n'est configuré.

## À retirer (mécanique du token commun déjà en place)

- `docker/40-env-config.sh` (entrypoint qui encodait le Basic Auth).
- `Dockerfile` : la copie du script d'entrypoint.
- `nginx-custom.conf` : la règle `no-store` dédiée à `env-config.js`.
- `public/env-config.js` et le `<Script>` `env-config.js` dans `app/layout.tsx`.
- Helm : `deployment/helm/templates/secret.yaml`, les variables d'env `ATOM_API_USERNAME/PASSWORD` dans `deployment.yaml`, le bloc `app.auth` dans `values.yaml` / `values-val.yaml` / `values-prod.yaml`.
- `Jenkinsfile` : le `withCredentials` Basic Auth et les `--set app.auth.*` du déploiement Helm.
- `lib/runtimeConfig.ts` : remplacé par une lecture simple du token dev (ou supprimé si on lit directement `process.env` dans `atom-api.ts`).
- `lib/atom-api.ts` : remplacement de la logique Basic par la logique Bearer (dev uniquement).

À **conserver** : la détection des **401/403** et l'écran « Access not authorized » de `app/error.tsx`.

## Nouvelle gestion (à ajouter)

- Helper unique retournant le JWT à utiliser : en dev, la valeur de `NEXT_PUBLIC_DEV_JWT` (`.env.local`) ; en prod, **rien** (chaîne vide → pas de header, le gateway s'en charge).
- `atomFetch` : ajoute `Authorization: Bearer <jwt>` seulement si le helper renvoie une valeur.
- Conserver la gestion 401/403 → écran dédié.

## Mode développement

- Le développeur génère un JWT de test (procédure AFTER via `jwt.io`) et le place dans `.env.local` (gitignoré) sous `NEXT_PUBLIC_DEV_JWT`.
- Sans cette variable, le dashboard fonctionne comme aujourd'hui (aucun en-tête envoyé), tant que le backend local n'exige pas l'auth.

## Contingence (peu probable)

Si le test de déploiement montre que le gateway **n'injecte pas** le Bearer **et** que le cookie `AFTER_ACCESS_TOKEN` est **HttpOnly**, la SPA ne peut ni s'appuyer sur l'injection ni lire le token. Il faudrait alors une autre solution (configuration du gateway, ou un endpoint exposant le token). À documenter si ce cas se présente.

## Portée et impacts

- Frontend : helper de token dev + intégration dans `atomFetch` ; nettoyage de `runtimeConfig`/`layout`.
- Docker / nginx / Helm / Jenkins : suppression de la mécanique de secret commun.
- Backend (hors repo) : accepte déjà le Bearer JWT AFTER ; CORS déclaré configuré.

## Critères d'acceptation

- [ ] La mécanique du token commun (Basic Auth) est entièrement retirée (Docker/nginx/Helm/Jenkins/front).
- [ ] En prod (same-origin), les appels API aboutissent **sans** que la SPA ajoute de Bearer (injection gateway).
- [ ] En dev, un JWT fourni via `.env.local` est transmis en `Authorization: Bearer` aux appels.
- [ ] Sans token configuré (dev), aucune régression sur `/`, `/map`, `/labtestmean?id=…`, `/health`.
- [ ] Un 401/403 affiche l'écran « Access not authorized ».

## Vérification au déploiement (confirme les hypothèses Q2/Q1)

- **Injection gateway (Q2)** : déployer l'approche (aucun Bearer ajouté par la SPA) et vérifier que les appels renvoient **200**. Si 401 → bascule sur la contingence.
- **HttpOnly (Q1)** : si besoin, vérifier dans le navigateur **DevTools → Application → Cookies**, colonne **HttpOnly** de `AFTER_ACCESS_TOKEN` (pas de log/code nécessaire).
