import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ADVENTURERS = {
  repo: 'KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  commit: '672074b73ba276876a19e8816ecdc5241817ab47',
  root: 'addons/kaykit_character_pack_adventures',
};

const SKELETONS = {
  repo: 'KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0',
  commit: '15b62b9bad122f72926c10fb14d622c73819fa54',
  root: 'addons/kaykit_character_pack_skeletons',
};

const assets = [
  // Authored playable-character variants.
  { source: ADVENTURERS, src: 'Characters/gltf/Rogue.glb', out: 'characters/Rogue.glb', sha: 'c8827661105eef7b2bfbef3bc676d41a47625733', min: 3_000_000 },
  { source: ADVENTURERS, src: 'Characters/gltf/Rogue_Hooded.glb', out: 'characters/Rogue_Hooded.glb', sha: '5d2b1403240d5f9ffff12e02c007572038eca2a8', min: 3_000_000 },
  { source: ADVENTURERS, src: 'Characters/gltf/Knight.glb', out: 'characters/Knight.glb', sha: '717b56ca2b5ff5392679774725201ba03a3eefab', min: 3_000_000 },

  // Authored enemy variants.
  { source: SKELETONS, src: 'Characters/gltf/Skeleton_Rogue.glb', out: 'enemies/Skeleton_Rogue.glb', sha: '182403932e4d4e00aa4182f2ac882ac27326dd19', min: 4_000_000 },
  { source: SKELETONS, src: 'Characters/gltf/Skeleton_Warrior.glb', out: 'enemies/Skeleton_Warrior.glb', sha: '769e85c9e4cee8d1bd0952ddb3e9d26293144581', min: 4_000_000 },

  // Authored weapons. Hammer + Eclipse glaive keep the custom Eteria meshes.
  { source: ADVENTURERS, src: 'Assets/gltf/sword_1handed.gltf', out: 'weapons/sword_1handed.gltf', sha: 'ea5115c52ee9c07b2128105c0701fe706add7593' },
  { source: ADVENTURERS, src: 'Assets/gltf/sword_1handed.bin', out: 'weapons/sword_1handed.bin', sha: '1aca5d22ca1dbae65756af6c0b438f251c2c7e45' },
  { source: ADVENTURERS, src: 'Assets/gltf/sword_2handed.gltf', out: 'weapons/sword_2handed.gltf', sha: '593016769c491c37ce4705bc76f80e2a042ccaee' },
  { source: ADVENTURERS, src: 'Assets/gltf/sword_2handed.bin', out: 'weapons/sword_2handed.bin', sha: '11d1a5627499582733d4d5918807415fd0dc2baf' },
  { source: ADVENTURERS, src: 'Assets/gltf/dagger.gltf', out: 'weapons/dagger.gltf', sha: 'f090037e4ecdd0e6e891a412b2c4a9409226825e' },
  { source: ADVENTURERS, src: 'Assets/gltf/dagger.bin', out: 'weapons/dagger.bin', sha: '8825c09e4f6cf6cba918770082505ab9cc5d9a48' },
  { source: ADVENTURERS, src: 'Assets/gltf/axe_2handed.gltf', out: 'weapons/axe_2handed.gltf', sha: 'd0295aca8c5354070a58c6e9fca1647812b71067' },
  { source: ADVENTURERS, src: 'Assets/gltf/axe_2handed.bin', out: 'weapons/axe_2handed.bin', sha: 'b8abd54b0662070dbaf24d3a74851a606bb06e92' },
  { source: ADVENTURERS, src: 'Assets/gltf/staff.gltf', out: 'weapons/staff.gltf', sha: 'd8bbebc6f3f6fb59e152d6b45de52add254f0697' },
  { source: ADVENTURERS, src: 'Assets/gltf/staff.bin', out: 'weapons/staff.bin', sha: '680e289846b61c83a6c10ea444caa34faf43c9e4' },
  { source: ADVENTURERS, src: 'Assets/gltf/crossbow_2handed.gltf', out: 'weapons/crossbow_2handed.gltf', sha: '6c70f58913d64db677e6a2cd8e62b9aa4cf24ae3' },
  { source: ADVENTURERS, src: 'Assets/gltf/crossbow_2handed.bin', out: 'weapons/crossbow_2handed.bin', sha: '3ca37dcaefbd4daeaa48d6bb78201a599524a945' },

  // Texture atlases referenced by weapon glTF files.
  { source: ADVENTURERS, src: 'Assets/gltf/knight_texture.png', out: 'weapons/knight_texture.png', sha: 'a56eae7514f908862e304620b89dc2d0cb9f362f' },
  { source: ADVENTURERS, src: 'Assets/gltf/barbarian_texture.png', out: 'weapons/barbarian_texture.png', sha: '29d2db09000ac28e626cf24c3d5ff48f7c324351' },
  { source: ADVENTURERS, src: 'Assets/gltf/mage_texture.png', out: 'weapons/mage_texture.png', sha: 'd0b91fba111e8b9c952aab6698807c0200061100' },
  { source: ADVENTURERS, src: 'Assets/gltf/rogue_texture.png', out: 'weapons/rogue_texture.png', sha: '542954baba7281f028f93306943fc780b1ebcf55' },
];

const OUT = path.resolve(process.cwd(), 'public/assets/kaykit/runtime');

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

function rawUrl(asset) {
  const relative = [asset.source.root, asset.src]
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
  if (await validExisting(target, asset.sha)) {
    return { file: asset.out, cached: true };
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  const url = rawUrl(asset);
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Eteria-RPG-asset-build/5.0' },
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (asset.min && data.length < asset.min) {
        throw new Error(`asset too small: ${data.length} bytes`);
      }
      const actual = gitBlobSha(data);
      if (actual !== asset.sha) {
        throw new Error(`Git blob SHA mismatch: expected ${asset.sha}, got ${actual}`);
      }
      await fs.writeFile(target, data);
      return { file: asset.out, bytes: data.length, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }

  throw new Error(`Failed to fetch ${asset.out}: ${lastError?.message || lastError}`);
}

const workers = 4;
const queue = [...assets];
const results = [];

await Promise.all(Array.from({ length: workers }, async () => {
  while (queue.length) {
    const asset = queue.shift();
    results.push(await download(asset));
  }
}));

const downloaded = results.filter((x) => !x.cached);
const total = downloaded.reduce((sum, x) => sum + (x.bytes || 0), 0);
console.log(`[eteria] KayKit assets ready: ${results.length} files, ${downloaded.length} downloaded, ${(total / 1024 / 1024).toFixed(1)} MiB new`);
