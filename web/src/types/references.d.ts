/// <reference path="./http.d.ts" />
/// <reference path="./electron.d.ts" />
/// <reference path="./node-polyfill.d.ts" />

// Garantit que les modules Node.js sont disponibles dans le contexte Electron
interface NodeRequire {
  (id: string): any;
}

interface NodeModule {
  exports: any;
  require: NodeRequire;
  id: string;
  filename: string;
  loaded: boolean;
  parent: NodeModule | null;
  children: NodeModule[];
  paths: string[];
}

declare var module: NodeModule; 