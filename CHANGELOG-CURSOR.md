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

## Correction du problème de lint dans le workflow GitHub Actions

Pour résoudre l'erreur de lint dans le workflow GitHub Actions:

```
[warn] Code style issues found in 87 files. Forgot to run Prettier?
error: script "lint" exited with code 1
```

Nous avons effectué les modifications suivantes:

1. **Mise à jour du script `lint` dans `web/package.json`**:
   
   ```diff
   - "lint": "prettier -c 'src/**/*.ts'",
   + "lint": "prettier --write 'src/**/*.{ts,js,json,css,scss}'",
   + "lint:check": "prettier -c 'src/**/*.{ts,js,json,css,scss}'",
   ```
   
   Cette modification permet de:
   - Formater automatiquement les fichiers au lieu de simplement vérifier leur format
   - Étendre la vérification à d'autres types de fichiers (js, json, css, scss)
   - Ajouter une nouvelle commande `lint:check` pour vérifier sans modifier

2. **Amélioration du workflow `lint.yaml`**:
   
   ```yaml
   - name: Install dependencies
     run: |
       cd web && bun install
   - name: Format files with Prettier
     run: |
       cd web && bun run prettier
   - name: Run eslint
     run: |
       go run build.go web-lint
   ```
   
   Ces étapes permettent de:
   - Installer correctement les dépendances
   - Formater les fichiers avec Prettier avant de vérifier leur format
   - Exécuter la vérification de lint

Ces modifications garantissent que les fichiers sont correctement formatés pendant l'exécution du workflow, évitant ainsi les erreurs de lint.

## Mise à jour des actions GitHub vers les versions récentes

Pour résoudre les problèmes liés aux versions dépréciées des actions GitHub, nous avons mis à jour toutes les actions dans les fichiers de workflow vers leurs versions les plus récentes:

1. **Mise à jour des actions de configuration:**
   
   ```diff
   - uses: actions/setup-go@v2
   + uses: actions/setup-go@v5
   ```
   
   ```diff
   - uses: actions/checkout@v2
   + uses: actions/checkout@v4
   ```
   
   ```diff
   - uses: oven-sh/setup-bun@v1
   + uses: oven-sh/setup-bun@v2
   ```

2. **Mise à jour des actions de gestion des artifacts:**
   
   ```diff
   - uses: actions/upload-artifact@v2
   + uses: actions/upload-artifact@v4
   ```
   
   ```diff
   - uses: actions/download-artifact@v2
   + uses: actions/download-artifact@v4
   ```

Ces mises à jour ont été appliquées à tous les fichiers de workflow:
- `.github/workflows/lint.yaml`
- `.github/workflows/electron.yaml`
- `.github/workflows/preflight-checks.yaml`
- `.github/workflows/nightly.yaml`
- `.github/workflows/verify-generated.yaml`

Cette mise à jour résout le problème de dépréciation signalé par GitHub: "This request has been automatically failed because it uses a deprecated version of `actions/upload-artifact`."

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

4. **Modification de `.github/workflows/nightly.yaml`**:
   
   Nous avons remplacé la configuration Node.js/npm par Bun dans le workflow des builds nocturnes:
   
   ```diff
     steps:
       - uses: actions/checkout@v4
   -   - uses: actions/setup-node@v2.4.1
   -     with:
   -       node-version: '16'
   -       cache: 'npm'
   -       cache-dependency-path: 'web/package-lock.json'
   +   - name: Setup Bun
   +     uses: oven-sh/setup-bun@v2
   +     with:
   +       bun-version: latest
   ```
   
   Nous avons également mis à jour les versions des actions GitHub:
   
   ```diff
   - uses: actions/setup-go@v2
   + uses: actions/setup-go@v5
   ```
   
   ```diff
   - uses: actions/checkout@v2
   + uses: actions/checkout@v4
   ```

5. **Mise à jour du message d'erreur dans `build.go`**:
   
   Nous avons également mis à jour le message d'erreur dans la fonction `verifyNpmCache` pour refléter l'utilisation de Bun:
   
   ```diff
     if err := cmd.Run(); err != nil {
   -     log.Fatalf("NPM cache verify: %s", err)
   +     log.Fatalf("Bun cache verify: %s", err)
     }
   ```

Ces modifications permettent d'utiliser Bun à la place de npm dans l'environnement CI/CD, offrant une meilleure cohérence avec l'environnement de développement local qui utilise également Bun. De plus, la mise à jour des versions des actions GitHub permet de bénéficier des dernières améliorations et corrections de bugs.

## Correction des problèmes de compatibilité avec Bun

Pour résoudre l'erreur dans le workflow preflight-checks.yaml:

```
error: Script not found "cache"
2025/04/12 15:14:49 Bun cache verify: exit status 1
```

Nous avons effectué les modifications suivantes:

1. **Adaptation de la fonction `verifyNpmCache` dans `build.go` pour Bun**:
   
   Bun n'ayant pas d'équivalent à la commande `cache verify` comme npm, nous avons modifié la fonction pour qu'elle soit compatible avec Bun:

```go
   func verifyNpmCache() {
       // Bun n'a pas la commande 'cache verify' comme npm
       if NODE_PACKAGES_MANAGER == "bun" {
           // Pour Bun, vérifions simplement que bun est bien installé
           cmd := newCmd(NODE_PACKAGES_MANAGER, nil, "--version")
           cmd.Stdout = os.Stdout
           cmd.Stderr = os.Stderr
           cmd.Stdin = os.Stdin
           cmd.Dir = "./web"
           if err := cmd.Run(); err != nil {
               log.Fatalf("Bun check: %s", err)
           }
           return
       }

       // Pour npm ou autres gestionnaires
       cmd := newCmd(NODE_PACKAGES_MANAGER, nil, "cache", "verify")
       // ...
   }
   ```

2. **Ajout d'étapes d'installation de dépendances explicites dans `preflight-checks.yaml`**:
   
   Nous avons ajouté des étapes d'installation des dépendances avant l'exécution des tests et des builds:
   
   ```yaml
   - name: Install dependencies
     run: |
       cd web && bun install
   ```
   
   Ces étapes ont été ajoutées aux jobs:
   - `node_unit_tests`
   - `bundle_assets`

Ces modifications garantissent la compatibilité avec Bun et évitent les erreurs lors de la vérification du cache et de l'exécution des tests.

## Correction des problèmes de build macOS avec Python 3

Pour résoudre l'erreur avec `dmg-builder` lors de la construction des packages macOS:

```
Error: Exit code: 1. Command failed: /Users/runner/hostedtoolcache/Python/3.11.9/arm64/bin/python /Users/runner/work/octant/octant/web/node_modules/dmg-builder/vendor/dmgbuild/core.py
Traceback (most recent call last):
  File "/Users/runner/work/octant/octant/web/node_modules/dmg-builder/vendor/dmgbuild/core.py", line 7, in <module>
    reload(sys)  # Reload is a hack
    ^^^^^^
NameError: name 'reload' is not defined
```

Nous avons effectué les modifications suivantes dans le workflow GitHub Actions `electron.yaml`:

1. **Retour à Python 2.7 pour macOS**
   
   ```yaml
   - name: Setup Python for macOS
     if: matrix.os == 'macos-latest'
     uses: actions/setup-python@v5
     with:
       python-version: '2.7'
   ```
   
   Le problème est que la fonction `reload(sys)` est dépréciée dans Python 3 et a été supprimée. Cependant, le script `dmg-builder` utilise encore cette fonction, ce qui provoque une erreur lors de l'exécution avec Python 3.

2. **Spécification des versions exactes d'Electron et electron-builder**
   
   ```yaml
   - name: Pin electron-builder dmg-builder for Python 3 compatibility
     if: matrix.os == 'macos-latest'
     run: |
       cd web
       sed -i '' 's/"electron": "^13.2.3"/"electron": "13.6.9"/g' package.json
       sed -i '' 's/"electron-builder": "^22.12.0"/"electron-builder": "23.0.2"/g' package.json
   ```
   
   Cette approche garantit l'utilisation de versions spécifiques qui fonctionnent bien ensemble et avec l'environnement de construction.

### Alternatives possibles

Si le passage à Python 2.7 n'est pas souhaitable à long terme, les options suivantes peuvent être envisagées:

1. **Patch du script problématique**: Modifier le script `core.py` dans `dmg-builder` pour utiliser `importlib.reload` au lieu de `reload` directement.

2. **Utiliser une version plus récente d'electron-builder**: Les versions récentes d'electron-builder ont peut-être résolu ce problème de compatibilité Python 3.

3. **Remplacer dmg-builder**: Utiliser un autre outil pour la création de DMG qui soit compatible avec Python 3.

Cette modification temporaire avec Python 2.7 permet de continuer les builds macOS en attendant une solution plus pérenne.

## Mise à jour d'Electron - [Date: `date +%Y-%m-%d`]

### Modifications effectuées

1. Mise à jour des dépendances dans `web/package.json`:
   - Electron: de la version `^13.2.3` à `^25.9.7`
   - electron-builder: de la version `^22.12.0` à `^24.8.0`

2. Suppression de l'étape de pin des versions d'Electron dans le workflow GitHub `.github/workflows/electron.yaml` car nous utilisons maintenant des versions plus récentes compatibles avec Python 3.

### Pourquoi ces changements?

- Les versions précédentes d'Electron étaient obsolètes et pouvaient présenter des problèmes de sécurité.
- Les nouvelles versions offrent de meilleures performances et une meilleure compatibilité avec les systèmes récents.
- La version 24+ d'electron-builder a une meilleure compatibilité avec Python 3.

### Problèmes potentiels et solutions

Si des problèmes surviennent pendant le build avec les nouvelles versions:

1. **Problème de compatibilité avec l'API Electron**:
   - Si le code utilise des API obsolètes, consulter la [documentation de migration d'Electron](https://www.electronjs.org/docs/latest/breaking-changes) pour adapter le code.

2. **Problèmes de build avec electron-builder**:
   - Vérifier la configuration dans `electron-builder.json` pour s'assurer qu'elle est compatible avec la nouvelle version.
   - Consulter les [notes de version d'electron-builder](https://github.com/electron-userland/electron-builder/releases) pour des changements spécifiques.

3. **Problèmes avec Node.js ou les dépendances**:
   - Electron 25 utilise Node.js 18, ce qui pourrait nécessiter des mises à jour de certaines dépendances.
   - Essayer de mettre à jour d'autres dépendances si nécessaire.
