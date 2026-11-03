import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = path.join(projectRoot, '.pages-dist');
const textExtensions = new Set(['.html', '.css', '.js', '.mjs']);
const allowedExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.ogg', '.wav', '.mp4', '.webm', '.txt']);
const slash = value => value.split(path.sep).join('/');

function inside(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function isRuntimePath(relative) {
  return relative === 'index.html' || relative.startsWith('src/') || relative.startsWith('assets/');
}

function resolveReference(reference, parent, documentRelative = false) {
  const value = reference.trim();
  if (!value || value.startsWith('#') || /^(?:data|blob):/i.test(value)) return null;
  if (/^(?:https?:)?\/\//i.test(value)) throw new Error(`Remote runtime dependency is not bundled: ${value} in ${parent}`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) throw new Error(`Unsupported runtime URL: ${value} in ${parent}`);
  if (value.startsWith('/')) throw new Error(`Root-relative URL would break a repository Pages site: ${value} in ${parent}`);
  if (value.includes('${')) throw new Error(`Dynamic asset path needs an explicit build rule: ${value} in ${parent}`);
  const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  const absolute = path.resolve(documentRelative ? projectRoot : path.dirname(path.join(projectRoot, parent)), pathname);
  const relative = slash(path.relative(projectRoot, absolute));
  if (!inside(projectRoot, absolute) || !isRuntimePath(relative) || !allowedExtensions.has(path.extname(relative).toLowerCase())) {
    throw new Error(`Dependency is outside the web runtime allowlist: ${value} in ${parent}`);
  }
  return relative;
}

function references(contents, filename) {
  const result = new Set();
  const add = (value, documentRelative = false) => {
    const reference = resolveReference(value, filename, documentRelative);
    if (reference) result.add(reference);
  };
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.html') {
    for (const match of contents.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) add(match[1]);
  }
  if (extension === '.css') {
    for (const match of contents.matchAll(/url\(\s*(["']?)([^"'\)]+)\1\s*\)/gi)) add(match[2]);
    for (const match of contents.matchAll(/@import\s+["']([^"']+)["']/gi)) add(match[1]);
  }
  if (extension === '.js' || extension === '.mjs') {
    // The game uses native, literal ES module imports. No bundler/runtime package is needed.
    const imports = [
      /\b(?:import|export)\s+(?:[^;"']*?\s+from\s*)?["']([^"']+)["']/g,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
      /\bnew\s+URL\s*\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
    ];
    for (const pattern of imports) for (const match of contents.matchAll(pattern)) add(match[1]);
    // HERO_ART.file values become inline CSS URLs, so these are document-relative,
    // unlike imports in the same module. The literal mapping includes every atlas.
    for (const match of contents.matchAll(/["'`](assets\/[^"'`\r\n]+)["'`]/g)) add(match[1], true);
  }
  return result;
}

async function verifySource(relative, realRoot) {
  const absolute = path.join(projectRoot, relative);
  const actual = await realpath(absolute).catch(() => { throw new Error(`Missing runtime dependency: ${relative}`); });
  if (!inside(realRoot, actual)) throw new Error(`Dependency escapes the project through a symbolic link: ${relative}`);
  const info = await stat(actual);
  if (!info.isFile()) throw new Error(`Runtime dependency is not a file: ${relative}`);
  return { absolute, bytes: info.size };
}

export async function buildPages() {
  const realRoot = await realpath(projectRoot);
  const queue = ['index.html'];
  const files = new Map();
  for (let index = 0; index < queue.length; index++) {
    const relative = queue[index];
    if (files.has(relative)) continue;
    const source = await verifySource(relative, realRoot);
    files.set(relative, source);
    if (textExtensions.has(path.extname(relative).toLowerCase())) {
      const contents = await readFile(source.absolute, 'utf8');
      for (const dependency of references(contents, relative)) if (!files.has(dependency)) queue.push(dependency);
    }
  }

  // Keep the distribution notices with the bundled fonts even though licenses
  // are not fetched by the renderer itself.
  if ([...files.keys()].some(file => file.startsWith('assets/fonts/'))) {
    for (const entry of await readdir(path.join(projectRoot, 'assets', 'fonts'), { withFileTypes: true })) {
      if (entry.isFile() && /^(?:license|ofl|copyright)/i.test(entry.name) && /\.txt$/i.test(entry.name)) {
        const relative = `assets/fonts/${entry.name}`;
        files.set(relative, await verifySource(relative, realRoot));
      }
    }
  }

  // The only recursive removal target is the fixed, verified build directory.
  // Never follow an output-directory symlink or remove the project itself.
  if (outputDirectory !== path.join(projectRoot, '.pages-dist') || !inside(projectRoot, outputDirectory)) {
    throw new Error('Refusing to clean an unexpected output directory.');
  }
  const previous = await lstat(outputDirectory).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (previous?.isSymbolicLink() || (previous && !previous.isDirectory())) throw new Error('.pages-dist must be an ordinary directory.');
  if (previous) {
    const actualOutput = await realpath(outputDirectory);
    if (actualOutput !== path.join(realRoot, '.pages-dist')) throw new Error('Build output resolves outside the intended directory.');
    await rm(outputDirectory, { recursive: true, force: false });
  }
  await mkdir(outputDirectory, { recursive: true });

  const ordered = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [relative, source] of ordered) {
    const destination = path.join(outputDirectory, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source.absolute, destination);
  }
  await writeFile(path.join(outputDirectory, '.nojekyll'), '', 'utf8');
  const bytes = ordered.reduce((total, [, file]) => total + file.bytes, 0);
  const report = { output: slash(path.relative(projectRoot, outputDirectory)), files: ordered.length + 1, bytes, megabytes: Number((bytes / 1024 / 1024).toFixed(2)), paths: [...ordered.map(([file]) => file), '.nojekyll'] };
  console.log(`GitHub Pages build: ${report.files} files, ${report.megabytes} MiB → ${report.output}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildPages().catch(error => { console.error(error.message); process.exitCode = 1; });
}
