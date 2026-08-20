# Refactor — Client-Side Data Fetching (SPA statique)

## Contexte et décision architecturale

Ce document capture la décision prise lors d'une session de travail : le mode de déploiement cible de l'application est une **SPA statique servie par nginx**, et non un serveur Node.js SSR.

### Architecture cible

```
npm run build  →  out/  (HTML + JS statiques)
nginx          →  sert les fichiers de out/
navigateur     →  fetche les données live depuis le backend API
```

- `next.config.mjs` doit conserver `output: "export"`
- Les fichiers statiques sont produits dans `out/` au build
- **Aucun serveur Node.js à l'exécution** — nginx uniquement
- Les données sont toujours fraîches car fetchées par le navigateur à chaque visite

---

## Problème actuel

Le code utilise des **Server Components** qui fetchent les données **au moment du build** et les passent en props aux composants client. Avec `output: "export"`, ces données sont figées dans le HTML généré : elles reflètent l'état du backend au moment du `npm run build`, pas au moment de la visite.

### Pattern actuel (incorrect pour ce déploiement)

```tsx
// app/page.tsx
export default async function CataloguePage() {
  const all = await getLabTestMeans(); // exécuté une fois au build
  return <CatalogueClient labTestMeans={all} />; // données figées dans le HTML
}
```

---

## Refactor requis

### Principe

Les pages Next.js deviennent de simples **shells vides** (pas de fetch serveur). Les composants client sont responsables de leurs propres appels API via `useEffect` ou SWR, en ciblant `NEXT_PUBLIC_ATOM_API_BASE_URL`.

### Pattern cible

```tsx
// app/page.tsx
export default function CataloguePage() {
  return <CatalogueClient />; // le client fetche lui-même au montage
}
```

### Périmètre du refactor

| Fichier | Changement |
|---|---|
| `app/page.tsx` | Supprimer le fetch serveur, retourner `<CatalogueClient />` sans props |
| `app/map/page.tsx` | Idem pour `<MapClient />` |
| `app/labtestmean/[externalId]/page.tsx` | Idem — supprimer `generateStaticParams`, `dynamicParams`, `force-dynamic` |
| `components/CatalogueClient.tsx` | Ajouter fetch via `useEffect` / SWR |
| `components/MapClient.tsx` | Idem |
| `lib/atom-api.ts` | Vérifier que les fonctions sont utilisables côté client (via `NEXT_PUBLIC_*`) |
| `next.config.mjs` | Conserver `output: "export"`, retirer `output: "standalone"` |

### États à gérer dans les composants client

Chaque composant client qui fetche des données doit gérer :
- **Loading** : squelette ou spinner pendant le fetch
- **Error** : message si le backend est inaccessible
- **Success** : affichage normal des données

---

## Contraintes et points d'attention

- `output: "export"` est **incompatible** avec `force-dynamic`, `generateStaticParams` avec `dynamicParams: false`, et tout code serveur exécuté à la requête.
- `NEXT_PUBLIC_ATOM_API_BASE_URL` doit être défini au build (baked dans le JS) — il ne peut pas changer après déploiement sans rebuild.
- Le Dockerfile nginx existant reste valide une fois `out/` recréé.
- `generateStaticParams` a causé des 404 par le passé (chemins pré-rendus ne correspondant pas à l'état du backend) — ne pas le réintroduire.

---

## Décisions exclues

- **Pas de serveur Node.js** à l'exécution (standalone supprimé).
- **Pas de SSR** (Server-Side Rendering à la requête) — trop coûteux en infrastructure pour ce cas d'usage.
- **Pas de ISR** (Incremental Static Regeneration) — incompatible avec nginx statique.
