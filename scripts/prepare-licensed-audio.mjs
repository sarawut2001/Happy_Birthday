// Retrieve licensed audio for this completed website, without publishing source binaries.
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = new URL('../public/assets/audio/', import.meta.url);
const assets = [
  { file: 'classical-4.mp3', url: 'https://assets.mixkit.co/music/711/711.mp3', hash: 'ee56ec98f9028f3b88e81170a4b4f9a2ac3e9eec6315f1fdabe1f8f811e1bc0a' },
  { file: 'page.wav', url: 'https://assets.mixkit.co/active_storage/sfx/1104/1104.wav', hash: 'd1ccce088b96216c6ed725c1b56333722ba77c658d2327fc7aef3e7f3b98640f' },
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(directory, { recursive: true });
for (const asset of assets) {
  const target = new URL(asset.file, directory);
  let existing;
  try { existing = await readFile(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    if (digest(existing) !== asset.hash) throw new Error(`Unexpected audio content: ${asset.file}. Restore the licensed recording before building.`);
    continue;
  }
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const temporary = new URL(`${asset.file}.download`, directory);
    try {
      console.log(`Preparing ${asset.file} from Mixkit (attempt ${attempt})`);
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${asset.file}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (digest(bytes) !== asset.hash) throw new Error(`Downloaded audio did not match ${asset.file}`);
      await writeFile(temporary, bytes);
      await rename(temporary, target);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await rm(temporary, { force: true });
    }
  }
  if (lastError) throw new Error(`Could not prepare ${asset.file}. See docs/ASSET-CREDITS.md for the source.`, { cause: lastError });
}
console.log('Licensed website audio is ready.');
