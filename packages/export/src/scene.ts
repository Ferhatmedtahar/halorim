import { Scene, parseScene } from '@glowframe/schema';

export function exportSceneJson(scene: Scene, indent: number = 2): string {
  const validated = parseScene(scene);
  return JSON.stringify(validated, null, indent);
}
