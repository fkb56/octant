# Développement

## Prérequis

* [Go 1.15 ou supérieur](https://golang.org/dl/)
* [node 10.15.0 ou supérieur](https://nodejs.org/en/)
* [npm 6.4.1 ou supérieur](https://www.npmjs.com/get-npm)
* [mockgen](https://github.com/golang/mock) - génération de fichiers go utilisés pour les tests
* [protoc](https://github.com/protocolbuffers/protobuf) - compilateur protobuf

## Démarrage Rapide

    git clone git@github.com:vmware-tanzu/octant.git
    cd octant
    go run build.go go-install      # installer les dépendances Go.
    export NG_CLI_ANALYTICS=false   # si vous souhaitez désactiver les analyses Angular CLI ou
    export NG_CLI_ANALYTICS=ci      # si vous souhaitez activer les analyses Angular CLI
    go run build.go ci-quick        # construire l'UI, générer les fichiers UI, et créer le binaire octant.
    ./build/octant                  # exécuter le binaire Octant que vous venez de construire

## Tests

Nous exigeons généralement que des tests soient ajoutés pour toutes les modifications, à l'exception des plus triviales. Vous pouvez exécuter govet et les tests en utilisant les commandes ci-dessous :

    go run build.go vet
    go run build.go test

## Développement

Lors de modifications apportées au frontend, il peut être utile que ces modifications déclenchent la reconstruction de l'UI. Octant fournit un raccourci en utilisant :

    go run build.go serve

La commande `serve` démarre deux processus. Le premier est un alias pour `npm run start` et surveillera les changements pour reconstruire l'UI.
Le serveur UI sera lancé sur `http://localhost:4200`.

Le second est un alias pour `go run ./cmd/octant/main.go` mais avec des variables d'environnement utiles déjà définies, `OCTANT_PROXY_FRONTEND` qui effectuera un proxy inverse vers le service Angular et `OCTANT_DISABLE_OPEN_BROWSER` qui empêche Octant de tenter de démarrer le navigateur système par défaut. Le serveur Octant sera lancé sur `http://localhost:7777`.

## Avant Votre Pull Request

Lorsque vous êtes prêt à créer votre pull request, nous vous recommandons d'exécuter `go run build.go ci`.

Cette commande exécutera nos outils de linting et notre suite de tests ainsi que produira un binaire de version que vous pourrez utiliser pour effectuer un dernier test manuel de vos modifications.

## Utilisation de Storybook

Octant a configuré [Storybook](https://storybook.js.org/) pour faciliter le développement des composants pour le frontend. Pour démarrer Storybook, exécutez

```console
$ cd web
$ npm run storybook
```
