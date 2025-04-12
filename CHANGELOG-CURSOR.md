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

## Mise à jour des limites de taille des messages gRPC côté serveur et client

Après avoir augmenté la constante `MaxMessageSize` à 32 Mo, nous avons constaté que l'erreur `ResourceExhausted` persistait. Cela était dû au fait que nous avions seulement augmenté la limite côté client pour la réception, mais pas pour l'envoi, et que nous n'avions pas configuré la limite d'envoi côté serveur.

Nous avons donc apporté les modifications supplémentaires suivantes:

1. **Ajout de l'option MaxSendMsgSize au serveur gRPC** dans le fichier `pkg/plugin/api/api.go`:
   ```diff
     s := grpc.NewServer(
         grpc.MaxRecvMsgSize(viper.GetInt("client-max-recv-msg-size")),
   +     grpc.MaxSendMsgSize(viper.GetInt("client-max-recv-msg-size")),
     )
   ```

2. **Ajout de l'option MaxCallSendMsgSize au client gRPC** dans le fichier `pkg/plugin/api/client.go`:
   ```diff
     conn, err := grpc.Dial(address,
         grpc.WithInsecure(),
   -     grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(viper.GetInt("client-max-recv-msg-size"))),
   +     grpc.WithDefaultCallOptions(
   +         grpc.MaxCallRecvMsgSize(viper.GetInt("client-max-recv-msg-size")),
   +         grpc.MaxCallSendMsgSize(viper.GetInt("client-max-recv-msg-size")),
   +     ),
     )
   ```

Ces modifications permettent d'augmenter à la fois les limites d'envoi et de réception des messages gRPC, ce qui devrait résoudre complètement le problème de `ResourceExhausted`.

### Tests de la modification

Pour vérifier que les modifications sont effectives:

1. Redémarrez Octant: `go run build.go serve`
2. Vérifiez qu'il n'y a plus d'erreur `ResourceExhausted` dans les logs
3. Si vous utilisez le plugin Helm, vérifiez que les fonctionnalités liées à Helm fonctionnent correctement

### Commit des modifications

```bash
git add pkg/plugin/api/api.go pkg/plugin/api/client.go CHANGELOG-CURSOR.md
git commit -m "fix: augmenter les limites d'envoi et de réception des messages gRPC pour résoudre l'erreur ResourceExhausted"
```

## Configuration gRPC pour les plugins externes

Malgré les modifications précédentes pour augmenter les limites de taille des messages gRPC entre Octant et ses clients, nous avons toujours rencontré l'erreur `ResourceExhausted` lors de l'utilisation du plugin Helm:

```
generate content: grpc client content: rpc error: code = ResourceExhausted desc = grpc: received message larger than max (19752553 vs. 16777216)
```

Le problème était que nous devions également configurer les limites de taille des messages gRPC pour les communications entre Octant et ses plugins externes, comme le plugin Helm.

Nous avons apporté les modifications suivantes:

1. **Configuration du client gRPC pour les plugins externes** dans le fichier `pkg/plugin/manager.go`:
   ```diff
     c := pluginCmd(cmd)
   
   + maxMsgSize := viper.GetInt("client-max-recv-msg-size")
     return plugin.NewClient(&plugin.ClientConfig{
       HandshakeConfig: Handshake,
       Plugins:         pluginMap,
       Cmd:             c,
       AllowedProtocols: []plugin.Protocol{
         plugin.ProtocolGRPC,
       },
       Logger: loggerAdapter,
   +   GRPCDialOptions: []grpc.DialOption{
   +     grpc.WithDefaultCallOptions(
   +       grpc.MaxCallRecvMsgSize(maxMsgSize),
   +       grpc.MaxCallSendMsgSize(maxMsgSize),
   +     ),
   +   },
     })
   ```

2. **Configuration du serveur gRPC pour les plugins** dans le fichier `pkg/plugin/server.go`:
   ```diff
   + // CustomGRPCServer creates a gRPC server with increased message size limits
   + func CustomGRPCServer(opts []grpc.ServerOption) *grpc.Server {
   +   maxMsgSize := viper.GetInt("client-max-recv-msg-size")
   +   opts = append(opts,
   +     grpc.MaxRecvMsgSize(maxMsgSize),
   +     grpc.MaxSendMsgSize(maxMsgSize),
   +   )
   +   return grpc.NewServer(opts...)
   + }
   
     // Serve serves a plugin.
     func Serve(service Service) {
       plugin.Serve(&plugin.ServeConfig{
         HandshakeConfig: Handshake,
         Plugins: plugin.PluginSet{
           Name: &ServicePlugin{Impl: service},
         },
   -     GRPCServer: plugin.DefaultGRPCServer,
   +     GRPCServer: CustomGRPCServer,
       })
     }
   ```

Ces modifications permettent d'augmenter les limites de taille des messages gRPC pour les communications entre Octant et ses plugins externes, ce qui devrait résoudre définitivement le problème de `ResourceExhausted`.

### Tests de la modification

Pour vérifier que les modifications sont effectives:

1. Redémarrez Octant: `go run build.go serve`
2. Vérifiez que le plugin Helm fonctionne correctement
3. Vérifiez qu'il n'y a plus d'erreur `ResourceExhausted` dans les logs

### Commit des modifications

```bash
git add pkg/plugin/manager.go pkg/plugin/server.go CHANGELOG-CURSOR.md
git commit -m "fix: configurer les limites gRPC pour les plugins externes (Helm)"
```

## Mise à jour des GitHub Actions pour utiliser Bun

Nous avons mis à jour les fichiers de workflow GitHub Actions pour utiliser Bun au lieu de npm:

1. **Modification de `.github/workflows/lint.yaml`**:
   
   Nous avons remplacé la configuration Node.js/npm par l'installation de Bun:
   
   ```diff
     eslint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
   -     - uses: actions/setup-node@v2.4.1
   -       with:
   -         node-version: '16'
   -         cache: 'npm'
   -         cache-dependency-path: 'web/package-lock.json'
   +     - name: Setup Bun
   +       uses: oven-sh/setup-bun@v1
   +       with:
   +         bun-version: latest
   ```

2. **Modification de `.github/workflows/electron.yaml`**:
   
   Nous avons également remplacé la configuration Node.js/npm par l'installation de Bun dans le workflow Electron:
   
   ```diff
     steps:
       - uses: actions/checkout@v4
   -   - uses: actions/setup-node@v2.4.1
   -     with:
   -       node-version: '16'
   -       cache: 'npm'
   -       cache-dependency-path: 'web/package-lock.json'
   +   - name: Setup Bun
   +     uses: oven-sh/setup-bun@v1
   +     with:
   +       bun-version: latest
   ```

3. **Modification de `.github/workflows/preflight-checks.yaml`**:
   
   Nous avons remplacé toutes les configurations Node.js/npm par Bun dans le workflow de vérification préliminaire:
   
   ```diff
     steps:
       - uses: actions/checkout@v2
   -   - uses: actions/setup-node@v2.4.1
   -     with:
   -       node-version: '16'
   -       cache: 'npm'
   -       cache-dependency-path: 'web/package-lock.json'
   +   - name: Setup Bun
   +     uses: oven-sh/setup-bun@v1
   +     with:
   +       bun-version: latest
   ```
   
   Nous avons également mis à jour l'installation de prettier pour utiliser Bun au lieu de npm:
   
   ```diff
   - npm i -g prettier
   + bun add -g prettier
   ```

4. **Mise à jour du message d'erreur dans `build.go`**:
   
   Nous avons également mis à jour le message d'erreur dans la fonction `verifyNpmCache` pour refléter l'utilisation de Bun:
   
   ```diff
     if err := cmd.Run(); err != nil {
   -     log.Fatalf("NPM cache verify: %s", err)
   +     log.Fatalf("Bun cache verify: %s", err)
     }
   ```

Ces modifications permettent d'utiliser Bun à la place de npm dans l'environnement CI/CD, offrant une meilleure cohérence avec l'environnement de développement local qui utilise également Bun.

# Journal des modifications effectuées

## Modifications du [date d'aujourd'hui]

### Fichiers modifiés
- `.github/workflows/electron.yaml` - Modifications du workflow Electron
- `web/package.json` - Mise à jour des dépendances
- `web/bun.lockb` - Mise à jour du fichier de verrouillage des dépendances

### Nouveaux fichiers
- `web/electron/application-menu.js.map` - Fichier de mapping pour le menu de l'application
- `web/electron/paths.js.map` - Fichier de mapping pour les chemins
- `web/electron/store.js.map` - Fichier de mapping pour le stockage
- `web/electron/tray-menu.js.map` - Fichier de mapping pour le menu de la barre d'état

### Résumé des changements
Les modifications concernent principalement les configurations Electron et les mises à jour des dépendances. Les fichiers .map sont des fichiers générés automatiquement pour faciliter le débogage.
