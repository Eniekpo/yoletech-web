#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

async function build() {
  fs.mkdirSync(path.join(ROOT, 'server', 'learn'), { recursive: true });

  await Promise.all([
    esbuild.build({
      entryPoints: [path.join(ROOT, 'src', 'learn', 'server-entry.ts')],
      outfile: path.join(ROOT, 'server', 'learn', 'index.js'),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      sourcemap: false,
      external: ['node:*', 'zod', 'country-state-city', 'libphonenumber-js']
    }),
    esbuild.build({
      entryPoints: [path.join(ROOT, 'src', 'learn', 'client.ts')],
      outfile: path.join(ROOT, 'public', 'learn.js'),
      bundle: true,
      platform: 'browser',
      format: 'iife',
      target: ['es2020'],
      minify: true,
      sourcemap: false
    })
  ]);

  console.log('Built server/learn/index.js and public/learn.js successfully.');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
