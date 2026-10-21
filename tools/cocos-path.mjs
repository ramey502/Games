import { existsSync } from 'node:fs';
import path from 'node:path';

export function cocosPath() {
  const supplied = process.env.COCOS_EDITOR_PATH;
  const app = supplied || '/Applications/Cocos/Creator/3.8.8/CocosCreator.app';
  const binary = app.endsWith('.app') ? path.join(app, 'Contents/MacOS/CocosCreator') : app;
  if (!existsSync(binary))
    throw new Error('Set COCOS_EDITOR_PATH to the Creator 3.8.8 app or executable.');
  return {
    binary,
    resources: app.endsWith('.app')
      ? path.join(app, 'Contents/Resources')
      : path.join(path.dirname(app), 'resources'),
  };
}
