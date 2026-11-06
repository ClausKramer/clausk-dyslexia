// Samler de filer, der skal på webserveren, i dist/ (uden tests, scripts og infrastruktur).
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const f of ['index.html', 'styles.css', 'staticwebapp.config.json', 'src', 'vendor', 'docs']) {
  const from = join(root, f);
  if (existsSync(from)) cpSync(from, join(dist, f), { recursive: true });
}
console.log(`Byggede dist/ (${dist})`);
