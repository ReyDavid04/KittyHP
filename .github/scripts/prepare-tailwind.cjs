const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '../..');
const frontendRoot = path.join(repositoryRoot, 'frontend');
const packagePath = path.join(frontendRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

packageJson.devDependencies = {
  ...packageJson.devDependencies,
  '@tailwindcss/postcss': '^4.1.0',
  postcss: '^8.5.0',
  tailwindcss: '^4.1.0',
};

packageJson.devDependencies = Object.fromEntries(
  Object.entries(packageJson.devDependencies).sort(([left], [right]) => left.localeCompare(right)),
);

fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
fs.writeFileSync(
  path.join(frontendRoot, '.postcssrc.json'),
  `${JSON.stringify({ plugins: { '@tailwindcss/postcss': {} } }, null, 2)}\n`,
);
