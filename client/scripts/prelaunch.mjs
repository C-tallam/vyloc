// Run with:  npm run prelaunch   (after `npm run build`, with your PRODUCTION VITE_API_URL)
// Fails (exit code 1) until every launch requirement is met.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const { SITE } = await import(pathToFileURL(path.join(root, 'src/config.js')).href);

check('Operator name is set in src/config.js', Boolean(SITE.operatorName.trim()));
check('Contact email is set in src/config.js', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(SITE.contactEmail));
check('Policies marked as reviewed (policiesReviewed: true)', SITE.policiesReviewed === true);
check('Policies "last updated" date is set', Boolean(SITE.policiesUpdated.trim()));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('Favicon file exists', fs.existsSync(path.join(root, 'public/favicon.svg')));
check('Favicon is linked in index.html', /rel="icon"[^>]*favicon\.svg/.test(html));

const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
check('/privacy route exists', app.includes('path="/privacy"'));
check('/terms route exists', app.includes('path="/terms"'));

function walk(dir, exts, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => f.name.endsWith(e))) out.push(p);
  }
  return out;
}
const srcFiles = walk(path.join(root, 'src'), ['.js', '.jsx', '.css']);
const srcRules = [
  ['No em dashes in source', /\u2014/],
  ['No gradients in source', /gradient\(/i],
  ['No pill-shaped radii in source', /border-radius:\s*(999|9999)/i],
  ['No placeholder text in source', /lorem ipsum/i],
];
for (const [name, re] of srcRules) {
  const hits = srcFiles.filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
  check(name, hits.length === 0, hits.join(', '));
}

const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) {
  check('Production build exists (run npm run build first)', false);
} else {
  const files = walk(dist, ['.js', '.html', '.css']);
  const text = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  check('Build has no "made with" or "built with AI" tag', !/made with|built with ai|generated (by|with) ai|lovable|bolt\.new|v0\.dev/i.test(text));
  check('Build does not point at localhost (set the production VITE_API_URL)', !/localhost:\d+/.test(text));
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? ` (${r.detail})` : ''}`);
}
console.log(failed ? `\n${failed} requirement(s) not met. Do not launch yet.` : '\nAll automated checks passed. Also complete the manual checks in LAUNCH.md.');
process.exit(failed ? 1 : 0);
