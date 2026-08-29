#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputDir = path.join(projectRoot, 'public', 'fonts');

const files = [
  {
    name: 'ZCOOLQingKeHuangYou-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf',
  },
  {
    name: 'MaShanZheng-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf',
  },
  {
    name: 'OFL-ZCOOL-QingKe-HuangYou.txt',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolqingkehuangyou/OFL.txt',
  },
  {
    name: 'OFL-Ma-Shan-Zheng.txt',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/OFL.txt',
  },
];

await mkdir(outputDir, { recursive: true });

for (const file of files) {
  process.stdout.write(`Downloading ${file.name}... `);
  const response = await fetch(file.url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download ${file.url}: ${response.status} ${response.statusText}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(outputDir, file.name), data);
  console.log(`${Math.round(data.byteLength / 1024)} KB`);
}

console.log(`Built-in TTF files saved to ${outputDir}`);
