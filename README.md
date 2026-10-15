# Kora Talents — MVP de démonstration

MVP Next.js pour publier des offres d’emploi, recevoir des candidatures et les consulter dans un espace admin simplifié.

## Démarrer

Prérequis : Node.js 22 et pnpm.

```powershell
pnpm install
pnpm dev
```

Ouvrir `http://localhost:3000` pour le site public et `http://localhost:3000/admin` pour gérer les offres et candidatures. Une offre de démonstration est créée automatiquement au premier chargement.

## Parcours disponibles

- Créer, modifier, publier, clôturer ou supprimer une offre depuis l’admin.
- Consulter les offres publiées sur le site public et déposer une candidature avec un CV PDF (8 Mo maximum).
- Consulter les candidatures, télécharger leur CV et mettre à jour leur statut dans l’admin.

## Limites du mode démo

Toutes les données, y compris les fichiers PDF, sont conservées dans IndexedDB du navigateur. Elles sont uniquement disponibles dans ce navigateur et sur cette origine ; elles ne sont pas partagées entre les visiteurs, appareils ou navigateurs. Effacer les données du site les supprime définitivement.

L’espace `/admin` n’est pas protégé par authentification. Ce mode convient aux tests d’interface, pas à la collecte de candidatures réelles ni à un déploiement de production. Pour un usage réel, remplacer le stockage local par un service de persistance partagé et ajouter une authentification côté serveur.

## Vérifications

```powershell
pnpm lint
pnpm build
```
