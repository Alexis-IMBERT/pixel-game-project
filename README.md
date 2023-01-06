# Pixel game - PROJECT
Projet réalisé par :  
Jean Bernard CAVELIER  
Alexis IMBERT  
Pierre LUYPAERT  

Encadré par :  
Maxime GUÉRIAU  
Alexandre PAUCHET  

Dans le cadre du projet Pixel ART en TechnoWeb.

Sujet :  
Réalisé un site reprennant le principe de Pixel War de Reddit

# Installation
Aller dans le dossier pixel-game-project/backend et executer la commande pour installer les dépendances du projet : 
```bash
npm install
```
# Lancement du serveur
Afin de lancé le projet faire la commande dans le dossier : pixel-game-project/backend

```bash
npm start
```

Le site est accessible à l'url : [localhost:3000](localhost:3000)

# Utilisation :
## création d'un compte :
Depuis la page d'accueil cliquer sur le bouton "inscription"  
Veuillez entrer un pseudo et un mot de passe d'au moins 6 caractères. Veuillez confirmer le mot de passe.

Erreur possible :
 - Le pseudo ne doit pas déjà être présent dans la base de donnée
 - Le mot de passe doit contenir plus de 6 caractères
 - Le mot de passe et le mot la confirmation du mot de passe doit être la même chaine de caractère

Si l'opération a correctement fonctionné vous aller être redirigé vers la page d'accueil et vous pourrez vous y connecter.
## Connexion 
Depuis la page d'accueil cliquer sur le bouton de connexion :  
Veuillez rentrer votre pseudo et votre mot de passe.

Attention si vous avez oubliez votre mot de passe ou votre pseudo vous ne pourrez pas vous connecter.

## Une fois connecté 
Une fois connecté vous pourrez :
 - accéder à la page de statistique en cliquant sur le bouton "profile" 
 - accéder à la liste des canvas auquel on est inscrit en cliquant sur le bouton "canvas"
 - Vous déconnecté

## Profile :
C'est une liste de statistique obtenu en fonction des actions effectué par l'utilisateur sur le site. Si l'utilisateur vient de juste de s'inscrire des valeur par défault sont renvoyés

## Canvas 
C'est la liste des canvas dans lesquels on peut participer.  
Sont indiqué : le nom du salon (du canva), le créateur du canva, et sa taille.  
Il est aussi possible de récupérer un csv avec l'historique des pixel posé das un canva donné en cliquant sur la feuille.

En cliquant sur un canva on accède à la page de visualisation du canva où l'on peut changer les pixels.

Si l'utilisateur est VIP il peut créer un nouveau canvas, en précisant : le nom du canvas, sa taille et les utilisateurs qui pourront y accéder

## Dans un canva :
Vous pouvez visualiser le canva dans sa globalité, selectionner la couleur nouvelle couleur et un pixel. Si le minuteur est à zero on peut cliquer pour envoyer la soumission au serveur et ainsi qu'aux autres utilisateur.