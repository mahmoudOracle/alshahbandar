const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git']);
const PATTERN = /[ØÙÃâœ�]/;

function scanDir(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, results);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|css|md)$/.test(entry.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (PATTERN.test(content)) {
      results.push(full);
    }
  }
}

const results = [];
scanDir(ROOT, results);

if (results.length) {
  console.error('Mojibake detected in files:');
  results.forEach((f) => console.error(`- ${path.relative(ROOT, f)}`));
  process.exit(1);
} else {
  console.log('No mojibake detected.');
}
