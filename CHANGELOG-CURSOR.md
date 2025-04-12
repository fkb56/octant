# CHANGELOG-CURSOR

## Explication de la commande preinstall dans package.json

La commande `"preinstall": "npx npm-force-resolutions"` dans le fichier `web/package.json` sert à:

- Exécuter automatiquement `npm-force-resolutions` avant l'installation des dépendances npm
- Forcer l'utilisation de versions spécifiques pour certaines dépendances transitives (dépendances de dépendances)
- Résoudre les problèmes de sécurité ou bugs dans les dépendances indirectes

Ces versions forcées sont définies dans la section `"resolutions"` du même fichier:

```json
"resolutions": {
  "browserslist": "^4.16.5",
  "dns-packet": "^5.2.2",
  "hosted-git-info": "^3.0.8",
  "merge": "^2.1.1",
  "xmlhttprequest-ssl": "^1.6.1",
  "yargs-parser": "^18.1.2"
}
```

Cette technique est particulièrement utile pour:
- Corriger des vulnérabilités de sécurité dans des dépendances indirectes
- Éviter des conflits de versions
- Assurer la cohérence des dépendances pour tous les développeurs travaillant sur le projet

## Adaptation pour Bun

Pour adapter ce système afin qu'il fonctionne avec Bun:

1. Nous avons supprimé la commande `"preinstall": "npx npm-force-resolutions"` du fichier `package.json`

2. Nous avons conservé la section `"resolutions"` telle quelle, car Bun supporte nativement cette fonctionnalité.

Bun prend en charge directement les champs `"resolutions"` de Yarn et `"overrides"` de npm dans le fichier `package.json`. 
Avec Bun, il n'est pas nécessaire d'utiliser un script ou un outil externe comme `npm-force-resolutions` pour forcer l'utilisation
de versions spécifiques de dépendances transitives.

Pour installer les dépendances avec Bun tout en appliquant les résolutions:

```bash
bun install
```

Bun respectera automatiquement les versions spécifiées dans la section `"resolutions"` du fichier `package.json`.

## Correction des problèmes de permissions

Lors du lancement de l'application, nous avons rencontré des erreurs de permissions de type `EACCES: permission denied` sur les fichiers dans le dossier `node_modules/@angular/core/package.json` et peut-être d'autres.

Pour résoudre ces problèmes, nous avons exécuté les commandes suivantes pour corriger les permissions:

```bash
# Vérifier les permissions actuelles
ls -la web/node_modules/@angular/core/package.json
ls -la web/node_modules/@angular

# Corriger les permissions pour le dossier @angular
sudo chmod -R 755 web/node_modules/@angular

# Corriger les permissions pour tous les node_modules par sécurité
sudo chmod -R 755 web/node_modules
```

Ces commandes ont accordé les permissions de lecture, d'écriture et d'exécution au propriétaire, et des permissions de lecture et d'exécution pour les autres utilisateurs, permettant ainsi à Angular de modifier ses fichiers lors de la compilation.

Suite aux premiers tests, nous avons également effectué une correction plus complète:

```bash
# Arrêter les processus existants sur les ports utilisés par l'application
lsof -i :7777 -t | xargs kill -9 2>/dev/null
lsof -i :4200 -t | xargs kill -9 2>/dev/null

# Mettre à jour à la fois le propriétaire et les permissions
cd web
sudo chown -R $(whoami) node_modules
chmod -R 755 node_modules
```

### Résultat des corrections

Après avoir appliqué ces modifications:

1. L'application Octant a pu démarrer correctement
2. Le serveur Angular a pu compiler et servir l'application frontend
3. L'application est maintenant accessible à l'adresse http://localhost:7777

Pour vérifier l'état de l'application, nous avons utilisé les commandes suivantes:

```bash
# Vérifier les processus en cours d'exécution
ps aux | grep -E "(octant|angular|ng serve)"

# Vérifier l'accessibilité du serveur
curl -s http://localhost:7777 > /dev/null && echo "Octant est accessible" || echo "Octant n'est pas accessible"
```

L'application est maintenant fonctionnelle et les problèmes de permissions sont résolus.

## Modification pour résoudre l'erreur OpenSSL dans Node.js v23

Nous avons rencontré une erreur lors de la compilation avec Node.js v23.10.0 :

```
Error: error:0308010C:digital envelope routines::unsupported
    at Hash (node:internal/crypto/hash:79:19)
    ...
  opensslErrorStack: [
    'error:03000086:digital envelope routines::initialization error',
    'error:0308010C:digital envelope routines::unsupported'
  ],
  library: 'digital envelope routines',
  reason: 'unsupported',
  code: 'ERR_OSSL_EVP_UNSUPPORTED'
```

Cette erreur est causée par l'incompatibilité entre la version récente de Node.js (v23.10.0) et les dépendances plus anciennes d'Angular dans le projet. Node.js v23 utilise OpenSSL 3 qui a des changements majeurs par rapport aux versions précédentes.

### Solution appliquée

Pour résoudre ce problème, nous avons modifié le script `start` dans le fichier `web/package.json` pour inclure directement l'option OpenSSL legacy :

```diff
  "scripts": {
    "ng": "ng",
-   "start": "ng serve",
+   "start": "NODE_OPTIONS=--openssl-legacy-provider ng serve",
    "build": "node ./node_modules/@angular/cli/bin/ng build --configuration production --output-hashing=all",
    // ...
  },
```

Cette modification permet à Angular de continuer à utiliser le fournisseur OpenSSL hérité lors du démarrage du serveur de développement.

### Étapes supplémentaires possibles

Si l'erreur persiste dans d'autres scripts, les options suivantes peuvent être envisagées :

1. Modifier également les autres scripts (build, test, etc.) pour inclure la même option.
2. Installer une version antérieure de Node.js compatible avec le projet (v16 ou v18 LTS).
3. Utiliser un fichier `.npmrc` avec l'option `node-options=--openssl-legacy-provider`.
4. Mettre à jour les dépendances du projet pour qu'elles soient compatibles avec Node.js v23 et OpenSSL 3.

## Correction des erreurs de compilation TypeScript

Après le lancement de l'application, nous avons rencontré des erreurs de compilation TypeScript liées à des incompatibilités entre les types et la version de TypeScript utilisée dans le projet:

### Types d'erreurs rencontrées

1. Erreurs dans les types de Lodash:
   ```
   Error: node_modules/@types/lodash/common/common.d.ts:262:65 - error TS1005: '?' expected.
   262     type StringToNumber<T> = T extends `${infer N extends number}` ? N : never;
   ```

2. Erreurs dans les composants Cytoscape:
   ```
   Error: src/app/modules/shared/components/presentation/cytoscape/cytoscape.component.ts:18:51 - error TS2305: Module '"cytoscape"' has no exported member 'Stylesheet'.
   ```

3. Erreurs d'incompatibilité de types dans RxJS:
   ```
   Error: src/app/modules/shared/services/navigation/navigation.service.ts:75:13 - error TS2345: Argument of type 'MonoTypeOperatorFunction<Event_2>' is not assignable to parameter of type 'OperatorFunction<Event_2, unknown>'.
   ```

### Solutions à appliquer

1. **Corriger les définitions de types de @types/lodash**
   
   Le problème est lié à une incompatibilité entre la version de TypeScript utilisée dans le projet et les définitions de types dans @types/lodash. Nous devons installer une version compatible de @types/lodash:

   ```bash
   cd web
   bun add -d @types/lodash@4.14.191
   ```

2. **Corriger les problèmes de Cytoscape**
   
   Pour l'erreur concernant 'Stylesheet' dans Cytoscape, nous devons modifier les fichiers concernés pour utiliser le type CytoscapeOptions au lieu de Stylesheet:

   ```bash
   cd web
   # Éditer les fichiers concernés
   # src/app/modules/shared/components/presentation/cytoscape/cytoscape.component.ts
   # src/app/modules/shared/components/presentation/cytoscape2/cytoscape2.component.ts
   # src/app/modules/shared/components/presentation/resource-viewer/octant.style.ts
   # src/app/modules/shared/components/presentation/resource-viewer/resource-viewer.component.ts
   ```

3. **Installer une version antérieure de TypeScript compatible**
   
   Pour résoudre toutes ces erreurs, nous pouvons également installer une version de TypeScript spécifique compatible avec les types utilisés:

   ```bash
   cd web
   bun add -d typescript@4.3.5
   ```

### Redémarrage de l'application

Après avoir appliqué ces corrections, redémarrez l'application:

```bash
export NODE_OPTIONS=--openssl-legacy-provider && \
lsof -i :7777 -t | xargs kill -9 2>/dev/null || true && \
lsof -i :4200 -t | xargs kill -9 2>/dev/null || true && \
cd web && bun install && cd .. && \
go run build.go serve
```

Ces modifications devraient résoudre les erreurs de compilation TypeScript et permettre à l'application de fonctionner correctement. 

## Erreurs de taille de message gRPC

Après avoir corrigé les problèmes de compilation TypeScript et OpenSSL, nous avons rencontré une nouvelle erreur liée au serveur gRPC :

```
generate content: grpc client content: rpc error: code = ResourceExhausted desc = grpc: received message larger than max (19752553 vs. 16777216)
```

Cette erreur indique que les messages gRPC générés par le plugin Helm sont trop volumineux et dépassent la limite maximale par défaut de 16 Mo.

### Solutions possibles

Pour résoudre cette erreur, plusieurs approches peuvent être utilisées :

1. **Augmenter la limite de taille des messages gRPC** :
   - Modifier le code pour augmenter la limite `MaxRecvMsgSize` et `MaxSendMsgSize` dans la configuration gRPC
   - Chercher dans le code source où ces limites sont définies (probablement dans un fichier Go lié à la configuration gRPC)

2. **Réduire la taille des données transmises** :
   - Examiner pourquoi le plugin Helm génère des données aussi volumineuses
   - Ajouter une pagination ou un filtrage des données pour réduire la taille des messages

3. **Désactiver temporairement le plugin Helm** :
   - Si vous n'avez pas besoin des fonctionnalités Helm, renommer ou déplacer temporairement le plugin Helm pour qu'il ne soit pas chargé

### Exemple de modification pour augmenter la limite

Si vous souhaitez modifier le code pour augmenter la limite, vous devrez identifier où la configuration gRPC est définie. Par exemple, recherchez des fichiers contenant `grpc.NewServer` ou `MaxRecvMsgSize`.

```go
// Exemple de code à chercher et modifier
opts := []grpc.ServerOption{
    grpc.MaxRecvMsgSize(16 * 1024 * 1024), // Augmenter à 32 Mo : 32 * 1024 * 1024
    grpc.MaxSendMsgSize(16 * 1024 * 1024), // Augmenter à 32 Mo : 32 * 1024 * 1024
}
```

## Résumé des commandes à exécuter pour résoudre tous les problèmes

```bash
# 1. Arrêter les processus existants
lsof -i :7777 -t | xargs kill -9 && lsof -i :4200 -t | xargs kill -9 || true

# 2. Configurer Node.js pour utiliser le fournisseur OpenSSL hérité
export NODE_OPTIONS=--openssl-legacy-provider

# 3. Installer les dépendances TypeScript correctes
cd web
bun add -d typescript@4.3.5
bun add -d @types/lodash@4.14.191

# 4. Désactiver temporairement le plugin Helm (optionnel - si vous n'avez pas besoin du plugin Helm)
# Renommer ou déplacer temporairement le plugin
mv ~/.config/octant/plugins/octant-helm ~/.config/octant/plugins/octant-helm.disabled

# 5. Pour une solution permanente à l'erreur gRPC, modifier ~/.zshrc pour augmenter la limite
echo 'export CLIENT_MAX_RECV_MSG_SIZE=33554432' >> ~/.zshrc
source ~/.zshrc

# 6. Exécuter l'application avec la configuration mise à jour
cd ..
go run build.go serve
```

Pour rendre les modifications permanentes, ajoutez ces lignes à votre `~/.zshrc` :
```bash
# Configuration pour Octant
export NODE_OPTIONS=--openssl-legacy-provider
export CLIENT_MAX_RECV_MSG_SIZE=33554432
```

## Commit des modifications

```bash
# Ajouter les fichiers modifiés
git add web/package.json CHANGLOG-CURSOR.md

# Commit avec un message descriptif
git commit -m "fix: résolution des problèmes de compatibilité avec Node.js v23 et augmentation des limites gRPC"
```
