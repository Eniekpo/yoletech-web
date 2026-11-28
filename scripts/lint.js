#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const errors = [];

function checkSyntax(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return;
  try {
    execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
  } catch (err) {
    errors.push(`Syntax error in ${relPath}: ${err.stderr ? err.stderr.toString() : err.message}`);
  }
}

const jsFiles = [
  'server/index.js',
  'server/blog-page.js',
  'server/site-config.js',
  'server/learn/index.js',
  'api/index.js',
  'api/blog-page.js',
  'public/app.js',
  'public/components.js',
  'public/data.js',
  'public/dashboard.js',
  'public/learn.js',
  'scripts/build-learn.js',
  'scripts/migrate.js',
  'scripts/seed-learn.js',
  'scripts/lint.js'
];
jsFiles.forEach(checkSyntax);

// Strict TypeScript check
try {
  execFileSync(path.join(ROOT, 'node_modules', '.bin', 'tsc'), ['-p', path.join(ROOT, 'tsconfig.json')], {
    stdio: 'pipe'
  });
} catch (err) {
  errors.push(`TypeScript error:\n${err.stdout ? err.stdout.toString() : err.message}`);
}

// Disallow `any` in src/learn/*.ts
const learnSrcDir = path.join(ROOT, 'src', 'learn');
if (fs.existsSync(learnSrcDir)) {
  for (const file of fs.readdirSync(learnSrcDir).filter((f) => f.endsWith('.ts'))) {
    const content = fs.readFileSync(path.join(learnSrcDir, file), 'utf8');
    if (/:\s*any\b|\bas\s+any\b/.test(content)) {
      errors.push(`Forbidden 'any' type found in src/learn/${file}`);
    }
  }
}

// Validate JSON files
for (const jsonRel of ['package.json', 'vercel.json', 'tsconfig.json']) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, jsonRel), 'utf8'));
  } catch (err) {
    errors.push(`Invalid JSON in ${jsonRel}: ${err.message}`);
  }
}

if (errors.length > 0) {
  console.error('Lint failed:\n' + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

console.log(`Lint passed: ${jsFiles.length} JS files syntax-checked, TypeScript strict passed, 0 forbidden 'any' types.`);
