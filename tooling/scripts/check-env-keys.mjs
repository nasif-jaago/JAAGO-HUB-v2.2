import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf8');
console.log('Keys in .env:');
env.split('\n').forEach(line => {
  const [k] = line.split('=');
  if (k && !k.startsWith('#')) console.log(k.trim());
});
