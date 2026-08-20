# Token d'authentification dans les appels API

## Contexte

Le dashboard est une SPA statique (`output: export`, servie par nginx) qui fetche les données du backend `atom-synchronizer` **directement depuis le navigateur** (`lib/atom-api.ts`). Aujourd'hui, ces appels (`/api/infos/labtestmeans`, `/api/infos/aircraftStructures/tree`, `/api/infos/resource`) ne transmettent **aucun en-tête d'authentification**. Une fois la sécurité activée côté backend/gateway, ils échoueront (401/403).

Cette spec définit comment configurer et transmettre un token d'authentification sur les appels API, en tenant compte de la contrainte forte : **tout ce qui est exécuté dans le navigateur est visible par l'utilisateur** (DevTools).

## Décisions actées

| Question | Décision |
|---|---|
| Mécanisme d'auth attendu | **Basic Authentication** (`Authorization: Basic base64(user:password)`) |
| Portée du token | **Applicatif** — un seul identifiant partagé par tous les utilisateurs, indépendant de l'utilisateur connecté |
| Same-origin en prod ? | **Non** — dashboard et API peuvent être sur des origines différentes (cross-origin) |
| Rotation sans rebuild ? | **Oui** souhaité (sans recompiler l'image) |
| Solution retenue | **Option C — token injecté au runtime** (config dynamique servie par nginx) |
| Sécurité | **Acceptée pour l'instant** via un **compte backend dédié à droits limités** (lecture seule, périmètre restreint). Les identifiants étant de fait visibles dans le navigateur, aucun compte privilégié ne doit être utilisé. |

## Problème

- Les `fetch` de `lib/atom-api.ts` n'ajoutent aucun en-tête `Authorization`.
- La SPA étant statique, il n'y a pas de couche serveur applicative pour porter un secret — sauf à l'injecter au runtime dans le conteneur.
- En Basic Auth, le `base64(user:password)` n'est **pas** chiffré : il est lisible par tout utilisateur du dashboard. D'où l'obligation d'un **compte backend dédié à droits minimaux**.

## Solution retenue — Option C : token injecté au runtime

Le couple identifiants (ou directement la chaîne Basic encodée) n'est **pas gravé au build**. Il est fourni au **démarrage du conteneur** :

1. Les identifiants proviennent d'un **secret Kubernetes** exposé en variable d'environnement au conteneur (via le chart Helm).
2. L'**entrypoint** du conteneur génère un petit fichier de config runtime (ex. `env-config.js`) à partir de cette variable, servi par nginx à la racine du site.
3. L'application **lit cette config au chargement**, avant le premier appel API.
4. `atomFetch` (dans `lib/atom-api.ts`) ajoute l'en-tête `Authorization: Basic …` à chaque requête, de façon **centralisée** (un seul endroit porte la logique du token).

Avantages : une seule image réutilisable entre environnements, token changeable par déploiement. Limite assumée : la valeur reste visible côté navigateur (mitigée par le compte à droits limités).

### Rotation
Changer le token = mettre à jour le secret Kubernetes puis **redémarrer le pod** (l'entrypoint régénère la config). Donc **sans rebuild d'image**, mais avec un **redéploiement / restart**.

## Pré-requis backend (bloquants)

1. **Activer Basic Auth** sur les endpoints consommés par le dashboard, et créer le **compte dédié à droits limités**.
2. **CORS avec preflight** : l'en-tête `Authorization` rend la requête « non-simple » → le navigateur envoie d'abord un **OPTIONS (preflight)**. En cross-origin, le backend doit :
   - autoriser **l'origine du dashboard** (explicite, pas `*`),
   - autoriser l'en-tête **`Authorization`** (`Access-Control-Allow-Headers`),
   - répondre correctement aux requêtes **OPTIONS**.
   (Les annotations `@CrossOrigin` ajoutées précédemment ont été retirées des controllers ; il faudra une configuration CORS backend adaptée à Basic Auth cross-origin.)

## Portée et impacts (frontend)

- **`lib/atom-api.ts`** : ajout centralisé de l'en-tête `Authorization: Basic …` dans `atomFetch`, à partir de la config runtime.
- **Lecture de la config runtime** : mécanisme pour charger `env-config.js` (ou équivalent) et exposer la valeur à `atom-api.ts`.
- **Docker / nginx** : entrypoint générant la config runtime depuis la variable d'environnement ; nginx sert le fichier.
- **Helm** : déclaration du secret + injection en variable d'environnement du conteneur.
- **Gestion des erreurs** : compléter `app/error.tsx` pour distinguer un **401/403** (non authentifié / non autorisé) du cas « backend down » déjà géré.

## Options écartées (pour mémoire)

- **A — Session gateway (SSO)** : nécessiterait same-origin et une auth par utilisateur → écartée (cross-origin, token applicatif).
- **B — Flux OIDC par utilisateur** : trop complexe et hors besoin (accès applicatif partagé).
- **D — Token gravé au build (`NEXT_PUBLIC_*`)** : non rotable sans rebuild, image par environnement → écartée au profit du runtime (C).
- **E — Proxy injectant le token côté serveur** : la plus sûre (secret jamais dans le navigateur) ; à reconsidérer si le compte à droits limités devient insuffisant et que l'exposition navigateur n'est plus acceptable.

## Critères d'acceptation

- [ ] Un **compte backend dédié à droits limités** est créé et utilisé (aucun compte privilégié).
- [ ] Le backend accepte Basic Auth et gère le **CORS cross-origin** (origine du dashboard + en-tête `Authorization` + preflight OPTIONS).
- [ ] Les appels API portent l'en-tête `Authorization: Basic …`, ajouté **uniquement** dans `atomFetch`.
- [ ] Le token est **injecté au runtime** (secret K8s → variable d'env → config servie par nginx), **non gravé** dans le bundle.
- [ ] La rotation fonctionne **sans rebuild** (mise à jour du secret + restart du pod).
- [ ] Un **401/403** affiche un écran clair, distinct de « API indisponible ».
- [ ] Pas de régression sur `/`, `/map`, `/labtestmean?id=…`, `/health`.
