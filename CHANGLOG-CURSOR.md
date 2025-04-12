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

## Correction de l'erreur OpenSSL dans Node.js v23

Après avoir résolu les problèmes de permissions, nous avons rencontré une nouvelle erreur lors de la compilation avec Node.js v23.10.0:

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

### Solution

Pour résoudre ce problème, nous avons défini la variable d'environnement NODE_OPTIONS pour utiliser le fournisseur OpenSSL hérité:

```bash
# Ajouter cette ligne dans le fichier ~/.zshrc pour une configuration permanente
export NODE_OPTIONS=--openssl-legacy-provider

# Appliquer pour la session actuelle
export NODE_OPTIONS=--openssl-legacy-provider
```

Nous avons également réinstallé les dépendances avec Bun et relancé l'application:

```bash
# Nettoyer les processus existants et lancer l'application avec NODE_OPTIONS défini
export NODE_OPTIONS=--openssl-legacy-provider && \
lsof -i :7777 -t | xargs kill -9 2>/dev/null || true && \
lsof -i :4200 -t | xargs kill -9 2>/dev/null || true && \
cd web && bun install && cd .. && \
go run build.go serve
```

### Vérification du résultat

Après avoir appliqué ces modifications, nous avons vérifié que l'application fonctionne correctement:

```bash
sleep 10 && curl -s http://localhost:7777 > /dev/null && echo "Octant est accessible" || echo "Octant n'est pas accessible"
```

Le résultat a confirmé que "Octant est accessible", ce qui montre que notre solution a résolu avec succès l'erreur OpenSSL.

### Modifications permanentes

Pour éviter d'avoir à définir la variable NODE_OPTIONS à chaque démarrage d'une nouvelle session de terminal, nous avons ajouté cette configuration au fichier de profil shell:

```bash
echo 'export NODE_OPTIONS=--openssl-legacy-provider' >> ~/.zshrc
```

Maintenant, la configuration sera automatiquement chargée à chaque ouverture d'un nouveau terminal. 