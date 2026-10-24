import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parentURL = context.parentURL;
    if (parentURL && parentURL.startsWith('file://')) {
      const url = new URL(specifier, parentURL);
      const filePath = fileURLToPath(url);

      if (!existsSync(filePath) && existsSync(filePath + '.ts')) {
        return nextResolve(specifier + '.ts', context);
      }
    }
  }
  return nextResolve(specifier, context);
}
