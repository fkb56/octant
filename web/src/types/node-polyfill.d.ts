// Type definitions pour les polyfills Node.js utilisés dans un environnement Electron
// Cela résout les problèmes de compatibilité avec TypeScript 4.3.5

declare module 'crypto' {
  export interface Hash {
    [key: string]: any;
  }
  
  export interface Hmac {
    [key: string]: any;
  }

  export interface Decipher {
    [key: string]: any;
  }

  export interface Cipher {
    [key: string]: any;
  }

  export function createHash(algorithm: string): Hash;
  export function createHmac(algorithm: string, key: string | Buffer): Hmac;
  export function createCipher(algorithm: string, password: string | Buffer): Cipher;
  export function createDecipher(algorithm: string, password: string | Buffer): Decipher;
}

declare module 'fs' {
  // Définir les types problématiques ici si nécessaire
  // Cela permet de contourner les erreurs de types dans les modules fs
}

declare module 'path' {
  // Définir les types problématiques ici si nécessaire 
}

declare module 'stream' {
  // Définir les types problématiques ici si nécessaire
}

// Ajoutez d'autres modules Node.js qui pourraient causer des problèmes 