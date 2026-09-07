# RwidaGuessr

Un jeu de cinq manches où l’on estime le prix en MAD d’une voiture ou d’une moto. Chaque manche révèle toutes les caractéristiques et les options autorisées de l’annonce, ainsi qu’un résumé de sa description, mais masque le prix jusqu’à la validation. Le joueur peut choisir 1, 2, 5, 10 ou 30 minutes par estimation; le serveur bloque systématiquement toute durée au-delà de 30 minutes.

## Démarrage local

Le projet ne dépend d’aucun framework ni paquet. Ouvrez `index.html` dans un navigateur pour vérifier l’interface et jouer avec les sept annonces fictives du mode aperçu. Elles ne sont pas des annonces Moteur.ma.

Pour tester le flux sécurisé de production, servez le projet avec Cloudflare Pages:

```powershell
npx wrangler pages dev .
```

Définissez alors les deux secrets décrits plus loin. Sans eux, l’application bascule volontairement sur le mode aperçu.

## Contenu des annonces: condition indispensable

Ne copiez pas automatiquement les annonces ou photos de Moteur.ma dans ce projet. Les [conditions de Moteur.ma](https://www.moteur.ma/fr/conditions/) indiquent que leurs textes, images, bases de données et autres contenus sont protégés et que leur utilisation non autorisée est interdite. Obtenez une autorisation écrite ou un accès partenaire/API avant toute mise en production. Le jeu ne doit pas laisser entendre qu’il est affilié à Moteur.ma.

Une fois ce droit obtenu, préparez au moins cinq enregistrements dans le format de [`data/listings.example.json`](data/listings.example.json). Pour chaque annonce autorisée:

- conservez chaque caractéristique fournie dans `features` et chaque équipement dans `options`;
- rédigez `summary` comme une synthèse originale, factuelle et brève de la description de l’annonceur;
- excluez systématiquement nom, téléphone, adresse précise et toute autre donnée personnelle;
- utilisez uniquement des `images` (un tableau d’URLs HTTPS) et une `sourceUrl` dont la réutilisation/lien est autorisée; la galerie offre la navigation, le zoom et le plein écran;
- fournissez chaque texte visible dans les deux langues avec le format `{ "en": "…", "ar": "…" }`, y compris les libellés et valeurs de caractéristiques;
- retirez les annonces expirées et toute information incorrecte.

`price` doit être un nombre en MAD, sans espaces ni symbole. Il n’est jamais renvoyé par l’API `/api/game`; seule `/api/guess` le compare une fois la réponse du joueur reçue.

## Hébergement gratuit sur Cloudflare Pages

Cloudflare Pages convient ici parce que les fichiers statiques et les Pages Functions sont pris en charge par son offre gratuite. Créez un projet Pages depuis un dépôt GitHub, GitLab ou directement avec Wrangler. Pour un dépôt Git, utilisez **no build command** et `/` comme dossier de sortie.

Ajoutez ces secrets dans **Settings → Variables and Secrets**, pour les environnements Preview et Production:

| Nom | Valeur |
| --- | --- |
| `LISTINGS_JSON` | Le contenu JSON complet de votre fichier de listings autorisés (y compris les prix). |
| `GAME_SIGNING_SECRET` | Une chaîne aléatoire longue et privée (au moins 32 caractères). |

Vous pouvez aussi les ajouter depuis le terminal après vous être connecté à Wrangler:

```powershell
npx wrangler pages secret put LISTINGS_JSON --project-name votre-projet
npx wrangler pages secret put GAME_SIGNING_SECRET --project-name votre-projet
npx wrangler pages deploy . --project-name votre-projet
```

Ne versionnez jamais le JSON de production ni ces secrets. Le fichier `.gitignore` protège le chemin prévu `data/listings.production.json`.

## Vérification

```powershell
npm run check
```

Le jeu ne démarre que lorsqu’au moins cinq annonces valides sont disponibles. Chaque nouvelle partie reçoit cinq annonces mélangées. Les jetons de manche sont signés et expirent à la fin du temps choisi, ce qui empêche le client de demander le prix d’un autre identifiant de listing.
