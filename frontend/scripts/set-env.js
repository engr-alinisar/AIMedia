// Injects environment variables into environment.prod.ts at build time.
// Run before `ng build --configuration production`.
// Required env var: API_URL (e.g. https://api.yourdomain.com)

const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL;

if (!apiUrl) {
  console.error('ERROR: API_URL environment variable is not set.');
  console.error('Set it in Vercel dashboard → Project → Settings → Environment Variables.');
  process.exit(1);
}

const content = `// Auto-generated at build time by scripts/set-env.js — do not edit manually.
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  signalrUrl: '${apiUrl}/hubs/generation'
};
`;

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(targetPath, content, 'utf8');
console.log(`✅ environment.prod.ts generated → apiUrl: ${apiUrl}`);
