import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cocosPath } from './cocos-path.mjs';

mkdirSync('artifacts', { recursive: true });
const declaration = path.join(
  cocosPath().resources,
  'resources/3d/engine/bin/.declarations/cc.d.ts',
);
const config = {
  compilerOptions: {
    target: 'ES2017',
    module: 'ESNext',
    moduleResolution: 'node',
    strict: true,
    skipLibCheck: true,
    experimentalDecorators: true,
    useDefineForClassFields: false,
    noEmit: true,
    types: [],
    lib: ['ES2020', 'DOM'],
  },
  files: [declaration],
  include: [path.resolve('games/knockdown/assets/scripts/**/*.ts')],
};
writeFileSync('artifacts/tsconfig.check.json', JSON.stringify(config, null, 2));
const result = spawnSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', 'artifacts/tsconfig.check.json'],
  { stdio: 'inherit' },
);
process.exitCode = result.status || 0;
