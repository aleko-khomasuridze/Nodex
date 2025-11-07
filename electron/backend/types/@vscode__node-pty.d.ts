declare module '@vscode/node-pty' {
  import type nodePty = require('node-pty-prebuilt-multiarch');
  export = nodePty;
}
