// Correction des types pour http et https
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

// Corrige les problèmes de définitions de types dans node https
declare module 'https' {
  interface ServerOptions {
    // Options génériques pour éviter les erreurs de typage
    [key: string]: any;
  }

  interface Server extends net.Server {}

  // Supprimez les fonctions problématiques qui causent les erreurs
  export function createServer(): Server;
  export function createServer(options: ServerOptions): Server;
  export function createServer(
    options: ServerOptions,
    requestListener?: any
  ): Server;
}

// Corrige les problèmes de définitions de types dans node http
declare module 'http' {
  interface Server extends net.Server {}

  interface ServerOptions {
    // Options génériques pour éviter les erreurs de typage
    [key: string]: any;
  }

  export function createServer(): Server;
  export function createServer(requestListener?: any): Server;
  export function createServer(options: ServerOptions, requestListener?: any): Server;
}

// Corrige les problèmes de définitions de types dans node net
declare module 'net' {
  interface ListenOptions {
    // Options génériques pour éviter les erreurs de typage
    [key: string]: any;
  }
} 