import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const SOURCE = {
  repo: 'JesusFilm/story-lab',
  commit: 'd81da00efde08d83c2e0087b3620c1bdd25d8c05',
  root: 'prototypes/shepherd-adventure/assets/nature',
};

const assets = [
  ['CommonTree_2.gltf','432932594a1e2b81d1bec7521e1860565454bdde',2861],
  ['CommonTree_2.bin','d403b0998a02e845d599f326fa92506e0d989055',423024],
  ['TwistedTree_1.gltf','6cc821aba84e06ce309f90648f4301269b07064d',2822],
  ['TwistedTree_1.bin','4362f44bcefb925900c8d72e3770b25f73215ad2',732456],
  ['TwistedTree_3.gltf','cd311df19ec65f54a9ca8704598f69aeaf3ec336',2820],
  ['TwistedTree_3.bin','0e57535fca9237c80a155a693fa9c04c7b4f832f',771176],
  ['DeadTree_2.gltf','bfd183c0c21b74f72c8fabccc1ed681d077eece9',1629],
  ['DeadTree_2.bin','4cbfa5b092e341f5dab646fc01d30ed7f79685f3',453824],
  ['Rock_Medium_1.gltf','508bbd6e2367621e2438aacb0f795d3e6fd2d5a1',1343],
  ['Rock_Medium_1.bin','3b8d132a71b30b62787e206ee6b517097370267a',13284],
  ['Rock_Medium_2.gltf','c2dea1fcd42e2c60aade5358dab3aafd3ba57e7c',1337],
  ['Rock_Medium_2.bin','064074dca1028d3eb965b93be24da19710f44b55',9432],
  ['Rock_Medium_3.gltf','b4799704c145b19fe8bcc4e33b9a22d3e4a2cdf5',1344],
  ['Rock_Medium_3.bin','9eb3d53c7a97810c56540dc282f7cd7a74e97e11',20124],
  ['Pebble_Round_2.gltf','eb9e27c909fe8af52a6d804628684329d70d4ae5',1360],
  ['Pebble_Round_2.bin','482195e4cdb7ade653049f4a4a496ef4786c39e6',7468],
  ['Bark_NormalTree.png','64e8b0002d118342973f433dda3e519f42aefc0b',1228354],
  ['Bark_NormalTree_Normal.png','2ae8cc1d5e22b7da5b3921ed3819d1441455a7e2',1365444],
  ['Leaves_NormalTree.png','ea1735e52a330bc11d05da0f5d8d0a04c8bed05e',158772],
  ['Bark_TwistedTree.png','50d053418801ac1f52af3329e0604df4f3f94149',1375419],
  ['Bark_TwistedTree_Normal.png','21ff5232bb0e9a19e60687f827d3b8098244cf06',1721722],
  ['Leaves_TwistedTree.png','2d3caa95a74bc49a59be7eb6a2af8c3b4284a358',69611],
  ['Bark_DeadTree.png','c95b06cc82247efdb53254fecea31e97ac8e9931',1301290],
  ['Bark_DeadTree_Normal.png','21ff5232bb0e9a19e60687f827d3b8098244cf06',1721722],
  ['Rocks_Diffuse.png','27f9b1043b8529a7d119fa591bc71f96f219ac75',1141957],
  ['PathRocks_Diffuse.png','edfc869f735361341fe79135ce732663fc03a24b',811711],
  ['LICENSE.txt','d0fefddda140cd5892813f0387d038c78bc7af1a',852],
].map(([file, sha, min]) => ({ file, sha, min }));

const OUT = path.resolve(process.cwd(), 'public/assets/environment/quaternius');

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

function rawUrl(file) {
  return `https://raw.githubusercontent.com/${SOURCE.repo}/${SOURCE.commit}/${SOURCE.root.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(file)}`;
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
  const target = path.join(OUT, asset.file);
  if (await validExisting(target, asset.sha)) return { file: asset.file, cached: true };
  await fs.mkdir(path.dirname(target), { recursive: true });

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(rawUrl(asset.file), {
        headers: { 'User-Agent': 'Eteria-RPG-environment-build/7.0' },
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length < asset.min) throw new Error(`asset too small: ${data.length}`);
      const actual = gitBlobSha(data);
      if (actual !== asset.sha) throw new Error(`Git blob SHA mismatch: expected ${asset.sha}, got ${actual}`);
      await fs.writeFile(target, data);
      return { file: asset.file, bytes: data.length, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Failed to fetch ${asset.file}: ${lastError?.message || lastError}`);
}

const queue = [...assets];
const results = [];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) results.push(await download(queue.shift()));
}));

const downloaded = results.filter((item) => !item.cached);
const bytes = downloaded.reduce((sum, item) => sum + (item.bytes || 0), 0);
console.log(`[eteria] Environment assets ready: ${results.length} files, ${downloaded.length} downloaded, ${(bytes / 1024 / 1024).toFixed(1)} MiB new`);
