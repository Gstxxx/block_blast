import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
let js = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
js = js.replace(/^import\s+['"].*?['"];\s*\r?\n/m, '');

let indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
indexHtml = indexHtml.replace('</head>', `  <style>\n${css}\n  </style>\n</head>`);
indexHtml = indexHtml.replace(
  '<script type="module" src="/src/main.js"></script>',
  `<script>\n${js}\n  </script>`
);

fs.writeFileSync(path.join(root, 'block_blast_v3.html'), indexHtml, 'utf8');
console.log('Wrote block_blast_v3.html');
