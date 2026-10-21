import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { cocosPath } from './cocos-path.mjs';

const platform = process.argv[2];
if (!['web-mobile', 'wechatgame'].includes(platform))
  throw new Error('Expected web-mobile or wechatgame');
const project = path.resolve('games/knockdown');
const config = JSON.parse(
  readFileSync(
    path.join(project, platform === 'wechatgame' ? 'build-wechat.json' : 'build-web.json'),
  ),
);
if (platform === 'wechatgame')
  config.packages.wechatgame.appid =
    process.env.WECHAT_APP_ID || config.packages.wechatgame.appid || 'touristappid';
mkdirSync('artifacts', { recursive: true });
const configPath = path.resolve(`artifacts/build-${platform}.json`);
writeFileSync(configPath, JSON.stringify(config, null, 2));
const child = spawn(
  cocosPath().binary,
  ['--project', project, '--build', `configPath=${configPath}`],
  { stdio: 'inherit' },
);
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
// Cocos command-line builds use 36 for success, 32 for build failure.
child.on('exit', (code) => {
  process.exitCode = code === 0 || code === 36 ? 0 : code || 1;
});
