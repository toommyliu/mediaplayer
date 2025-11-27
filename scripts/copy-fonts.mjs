import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(__dirname, '..');
const rendererPublicFonts = path.resolve(projectRoot, 'src', 'renderer', 'public', 'fonts');

const assetsToCopy = [
  {
    src: path.join(projectRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-400-normal.woff2'),
    dest: path.join(rendererPublicFonts, 'inter-latin-400-normal.woff2'),
  },
  {
    src: path.join(projectRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-500-normal.woff2'),
    dest: path.join(rendererPublicFonts, 'inter-latin-500-normal.woff2'),
  },
  {
    src: path.join(projectRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-600-normal.woff2'),
    dest: path.join(rendererPublicFonts, 'inter-latin-600-normal.woff2'),
  },
  {
    src: path.join(projectRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff2'),
    dest: path.join(rendererPublicFonts, 'inter-latin-700-normal.woff2'),
  },
  {
    src: path.join(projectRoot, 'node_modules', '@fontsource', 'ibm-plex-mono', 'files', 'ibm-plex-mono-latin-400-normal.woff2'),
    dest: path.join(rendererPublicFonts, 'ibm-plex-mono-latin-400-normal.woff2'),
  },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, {recursive: true});
}

async function copyFile(src, dest) {
  try {
    await fs.promises.copyFile(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Failed to copy ${src} -> ${dest}: ${err.message}`);
  }
}

async function main() {
  await ensureDir(rendererPublicFonts);
  for (const entry of assetsToCopy) {
    if (!fs.existsSync(entry.src)) {
      console.warn(`Source not found: ${entry.src}`);
      continue;
    }
    await copyFile(entry.src, entry.dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
