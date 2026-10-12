# Kora Talents — Gestion des candidatures

Application Next.js pour publier des offres d’emploi, créer un formulaire par offre et recevoir les candidatures dans un espace de recrutement protégé. Les données métier et les CV PDF sont stockés dans PostgreSQL.

## Prérequis

- Node.js 20.9 ou plus récent et pnpm
- PostgreSQL 14 ou plus récent

## Installation locale

1. Installer les dépendances et créer la configuration locale :

   ```powershell
   pnpm install
   Copy-Item .env.example .env.local
   ```

2. Modifier `.env.local` :
   - `DATABASE_URL` : URL PostgreSQL dédiée à l’application.
   - Les variables `S3_*` ne sont nécessaires que si la base contient d’anciens CV stockés dans un bucket S3.

3. Créer les tables et le premier compte administrateur :

   ```powershell
   pnpm db:migrate
   pnpm db:bootstrap-admin
   ```

   Le schéma Prisma et son historique versionné se trouvent dans `prisma/schema.prisma` et `prisma/migrations`. La première migration peut aussi compléter la base créée précédemment avec le script SQL de ce projet ; elle vérifie les objets existants et y ajoute les nouvelles colonnes sans supprimer les candidatures.

   `ADMIN_EMAIL` et `ADMIN_PASSWORD` ne servent qu’à cette commande. Utiliser un mot de passe unique d’au moins 16 caractères, puis retirer ces deux valeurs de `.env.local` et de l’environnement du serveur web. Le script de provisionnement refuse de remplacer un compte existant.

   Pour changer le mot de passe d’un administrateur, définir temporairement `ADMIN_EMAIL` et `ADMIN_PASSWORD`, puis exécuter `pnpm db:reset-admin-password`. Toutes ses sessions actives seront révoquées.

4. Lancer l’application :

   ```powershell
   pnpm dev
   ```

   Le site public est disponible à `http://localhost:3000` et l’espace recruteur à `http://localhost:3000/admin`.

## Fonctionnalités

- Landing page publique et offres uniquement publiées et non clôturées.
- Formulaire de candidature configurable pour chaque offre : questions courtes, longues, e-mail, téléphone et choix dans une liste.
- Coordonnées et CV PDF requis ; CV limité à 8 Mo et stocké dans PostgreSQL avec la candidature. Son téléchargement est réservé aux administrateurs authentifiés.
- Dashboard administrateur : création, édition, publication et clôture des offres ; liste des candidatures et page de détail par profil, mise à jour de leur statut, qualification, notes internes, note de 0 à 100, signalement prioritaire, classement et suppression définitive d’un dossier.
- Unicité d’une candidature par adresse e-mail et par offre.

## Organisation du code

- `app/` contient les routes Next.js et les points d’entrée des pages.
- `components/public/` regroupe les sections du site public, les détails d’offre et le formulaire de candidature.
- `components/admin/` regroupe l’espace recruteur, ses vues (connexion, candidatures, offres), ses panneaux et ses tiroirs.
- `lib/` contient les accès aux données, les types et les utilitaires partagés.

## Sécurité et déploiement

- Toute API d’administration vérifie une session persistée côté serveur. Les cookies sont `HttpOnly`, `SameSite=Strict`, limités à 8 heures et marqués `Secure` en production. Les mutations exigent une origine de même site.
- Les mots de passe administrateur sont hachés avec `scrypt`. Les connexions et dépôts de candidatures sont limités par adresse IP dans PostgreSQL. En production derrière un proxy, configurer le proxy pour remplacer `X-Real-IP` ou `X-Forwarded-For` avec l’adresse du client ; ne pas accepter une valeur fournie directement par le navigateur.
- Les accès à PostgreSQL passent par Prisma ; l’unique requête SQL brute restante utilise des paramètres. Les CV ne sont jamais servis depuis un dossier public ; les téléchargements nécessitent une session administrateur et un lien signé d’une minute.
- En production, utiliser HTTPS, des secrets gérés par l’hébergeur, TLS vers PostgreSQL et des sauvegardes chiffrées. Les CV étant stockés dans PostgreSQL, dimensionner la base et ses sauvegardes en conséquence. Ajouter un scan antivirus/quarantaine des fichiers selon les exigences de l’organisation avant de les rendre accessibles aux recruteurs.
- Définir la durée de conservation et le processus de suppression des données candidats selon les obligations légales applicables. Limiter l’accès administrateur et auditer régulièrement les comptes.
- Planifier `pnpm db:cleanup` au moins quotidiennement : il vide, si nécessaire, la file de suppression des anciens CV S3 et purge les sessions et limites de débit expirées.
- Exécuter `pnpm db:migrate` une fois contre la base cible avant de démarrer les instances web. Le schéma est défini dans `prisma/schema.prisma` ; exécuter `pnpm db:generate` après chaque modification du schéma.

## Vérifications

```powershell
pnpm lint
pnpm build
```

La compilation ne nécessite pas de connexion PostgreSQL ; PostgreSQL est nécessaire à l’exécution des parcours de candidature et d’administration.
