// Type definitions pour Electron afin de résoudre les problèmes de compatibilité avec TypeScript 4.3.5

declare namespace Electron {
  interface ServerOptions {
    [key: string]: any;
  }

  interface Server {
    [key: string]: any;
  }
}

declare module 'electron' {
  // Des définitions supplémentaires peuvent être ajoutées ici si nécessaire
} 