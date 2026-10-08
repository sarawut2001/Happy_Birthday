import { copyFile, mkdir, stat } from 'node:fs/promises';

// Copy only: the source photos, including their original filenames, stay intact.
const files = [
  ['18-4-2026.JPG', 'memories/date-2026-04-18-01.jpg'],
  ['8-8-2026.JPG', 'memories/date-2026-08-08-01.jpg'],
  ['8-8-2026JPG.JPG', 'memories/date-2026-08-08-02.jpg'],
  ['18-8-2026.JPG', 'memories/date-2026-08-18-01.jpg'],
  ['23-8-2026.JPG', 'memories/date-2026-08-23-01.jpg'],
  ['23-8-2026..JPG', 'memories/date-2026-08-23-02.jpg'],
  ['23-8-2026...JPG', 'memories/date-2026-08-23-03.jpg'],
  ['23-8-2026....JPG', 'memories/date-2026-08-23-04.jpg'],
  ['2-9-2026.JPG', 'memories/date-2026-09-02-01.jpg'],
  ['jigsaw.JPG', 'puzzle/jigsaw.jpg'],
];
// Validate the whole batch before copying anything.
await Promise.all(files.map(([source]) => stat(new URL(`../image/${source}`, import.meta.url))));
for (const [source, destination] of files) {
  const target = new URL(`../public/assets/personal/${destination}`, import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await copyFile(new URL(`../image/${source}`, import.meta.url), target);
}
console.log(`Prepared ${files.length - 1} memories and one separate puzzle photo.`);
