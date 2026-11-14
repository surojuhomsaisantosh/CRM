/**
 * Unit Test Environment Setup & TypeScript Module Loader
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

// Path alias resolution for '@/...'
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  if (request.startsWith('@/')) {
    const relativeTarget = request.slice(2);
    const resolvedPath = path.resolve(projectRoot, relativeTarget);
    return originalResolve.call(this, resolvedPath, parent, isMain);
  }
  return originalResolve.call(this, request, parent, isMain);
};

// TypeScript on-the-fly transpiler for .ts and .tsx files
require.extensions['.ts'] = function(module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  return module._compile(compiled.outputText, filename);
};

require.extensions['.tsx'] = require.extensions['.ts'];

// Minimal browser mocks for window/localStorage/document when testing UI utilities
if (typeof global.window === 'undefined') {
  const store = {};
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    atob: (str) => Buffer.from(str, 'base64').toString('binary'),
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    localStorage: {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
  };
  global.self = global.window;
  global.localStorage = global.window.localStorage;
  global.document = {
    cookie: '',
    documentElement: {
      style: {
        setProperty: () => {},
      },
    },
    createElement: () => ({
      click: () => {},
      setAttribute: () => {},
    }),
  };
  global.Event = class Event {};
  global.Blob = class Blob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = opts?.type || '';
    }
  };
  global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {},
  };
}

module.exports = { projectRoot };
