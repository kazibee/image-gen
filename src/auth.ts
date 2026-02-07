export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_IMAGE_MODEL?: string;
}

export interface AuthConfig {
  apiKey: string;
  model: string;
}

const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';

export function getAuthConfig(env: Env): AuthConfig {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment.');
  }

  return {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
  };
}
