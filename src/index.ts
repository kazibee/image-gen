import { getAuthConfig, type Env } from './auth';
import { createImageGenClient } from './image-gen-client';

export type { Env } from './auth';
export type {
  GenerateImageOptions,
  EditImageOptions,
  GeneratedImageResult,
  GeneratedImageData,
  ListModelsOptions,
  GeminiModelInfo,
  ReferenceImageOptions,
} from './image-gen-client';

export default function main(env: Env) {
  const config = getAuthConfig(env);
  return createImageGenClient(config);
}
