import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const GENESARA = {
  repo: 'Genesara/genesara-web',
  commit: '90c166baa14682eedf1358c6c0a6e40e91765495',
  root: 'public/models/characters',
};

const UAL1 = {
  repo: 'DyingStar-game/DyingStar',
  commit: '8bf981c9a1ba6e19fcbfe48c7ee2ac1edeedec6b',
  root: 'assets/Universal Animation Library',
};

const FREE_MODELS = {
  repo: 'agentkaerf/FreeModels',
  commit: 'db3df04d1e4714298a09510b26fb6de6645138a2',
  root: '',
};

const assets = [
  {
    source: GENESARA,
    src: 'idle.glb',
    out: 'animations/genesara_idle.glb',
    sha: '2a634a33bb31f31f20bd3637697b647a39fffb63',
    min: 240_000,
  },
  {
    source: UAL1,
    src: 'Unreal-Godot/UAL1_Standard.glb',
    out: 'animations/UAL1_Standard.glb',
    sha: '473e59080288428d0b6da826ba19324d07b191f0',
    min: 7_500_000,
  },
  { source: GENESARA, src: 'male_ranger.glb', out: 'characters/male_ranger.glb', sha: '6a96cf9743dff4274f9eb2e8daef571586ce6090', min: 1_500_000 },
  { source: GENESARA, src: 'male_peasant.glb', out: 'characters/male_peasant.glb', sha: '99c2d6cd0701c1b9fa015d77015bd8ec43d85f8c', min: 600_000 },
  { source: GENESARA, src: 'male_head.glb', out: 'characters/male_head.glb', sha: '6d8482dad3eec64117d3cf7dea0f651cb782549f', min: 200_000 },
  { source: GENESARA, src: 'hair_simpleparted.glb', out: 'characters/hair_simpleparted.glb', sha: '8eb080f844977db85c7cd25f96b89cc3bd2a90e7', min: 60_000 },
  { source: GENESARA, src: 'hair_buzzed.glb', out: 'characters/hair_buzzed.glb', sha: 'f1a948677ebc448df8e74c122d3b294c20c87511', min: 45_000 },
  { source: GENESARA, src: 'female_ranger.glb', out: 'characters/female_ranger.glb', sha: '86de7d31e50c74487115764b98013f89386fb622', min: 1_500_000 },
  { source: GENESARA, src: 'female_head.glb', out: 'characters/female_head.glb', sha: 'bcd652cbbf1cf945e898c38d66c87a6678cb2ef3', min: 220_000 },
  { source: GENESARA, src: 'hair_long.glb', out: 'characters/hair_long.glb', sha: 'de2ad5ecb25904e8109fe612142e721363b358ee', min: 180_000 },
  {
    source: FREE_MODELS,
    src: 'Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb',
    out: 'animations/UAL2_Standard.glb',
    sha: 'dc684c2a664927964307e8eb7b27b0000ebf6a18',
    min: 8_000_000,
  },
];

const OUT = path.resolve(process.cwd(), 'public/assets/quaternius/runtime');

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

function rawUrl(asset) {
  const relative = [asset.source.root, asset.src]
    .filter(Boolean)
    .join('/')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `https://raw.githubusercontent.com/${asset.source.repo}/${asset.source.commit}/${relative}`;
}

async function validExisting(file, sha) {
  try {
    const data = await fs.readFile(file);
    return gitBlobSha(data) === sha;
  } catch {
    return false;
  }
}

async function download(asset) {
  const target = path.join(OUT, asset.out);
  if (await validExisting(target, asset.sha)) return { file: asset.out, cached: true };

  await fs.mkdir(path.dirname(target), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(rawUrl(asset), {
        headers: { 'User-Agent': 'Eteria-RPG-asset-build/6.0' },
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (asset.min && data.length < asset.min) throw new Error(`asset too small: ${data.length} bytes`);
      const actual = gitBlobSha(data);
      if (actual !== asset.sha) throw new Error(`Git blob SHA mismatch: expected ${asset.sha}, got ${actual}`);
      await fs.writeFile(target, data);
      return { file: asset.out, bytes: data.length, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  throw new Error(`Failed to fetch ${asset.out}: ${lastError?.message || lastError}`);
}

const queue = [...assets];
const results = [];
const workers = 4;
await Promise.all(Array.from({ length: workers }, async () => {
  while (queue.length) results.push(await download(queue.shift()));
}));

const downloaded = results.filter((item) => !item.cached);
const total = downloaded.reduce((sum, item) => sum + (item.bytes || 0), 0);
console.log(`[eteria] Quaternius Eteria 6 assets ready: ${results.length} files, ${downloaded.length} downloaded, ${(total / 1024 / 1024).toFixed(1)} MiB new`);
