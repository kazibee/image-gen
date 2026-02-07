export interface LoginResult {
  GEMINI_API_KEY: string;
  GEMINI_IMAGE_MODEL?: string;
}

/**
 * Gemini API key must be provided via environment.
 */
export async function login(): Promise<LoginResult> {
  throw new Error(
    'Set GEMINI_API_KEY via environment. Optional: GEMINI_IMAGE_MODEL (default gemini-3-pro-image-preview).',
  );
}
