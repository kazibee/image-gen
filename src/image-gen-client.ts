import type { AuthConfig } from './auth';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Options for text-to-image generation. */
export interface GenerateImageOptions {
  /** Optional per-request model override. */
  model?: string;
  /** Target aspect ratio hint for the generated image. */
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  /** Output image size hint. `2K` and `4K` are primarily for Gemini 3 Pro Image Preview. */
  imageSize?: '1K' | '2K' | '4K';
  /** Include text response along with image output. */
  includeText?: boolean;
  /** Enables Google Search grounding for generation. */
  enableSearchGrounding?: boolean;
  /** Optional response mime type override if supported by model/runtime. */
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
}

/** Options for image editing/inpainting requests. */
export interface EditImageOptions extends GenerateImageOptions {
  /** MIME type override for the input image. */
  inputMimeType?: string;
}

/** Disk output result for image generation/editing methods. */
export interface GeneratedImageResult {
  /** Path where output image was written. */
  outputPath: string;
  /** MIME type of generated image payload. */
  mimeType: string;
  /** Gemini model ID used for generation. */
  model: string;
  /** Prompt used for the generation/edit request. */
  prompt: string;
  /** Optional accompanying text response from Gemini. */
  textResponse?: string;
}

/** In-memory/base64 image generation result. */
export interface GeneratedImageData {
  mimeType: string;
  base64Data: string;
  model: string;
  prompt: string;
  textResponse?: string;
}

/** Options for multi-reference composition/editing requests. */
export interface ReferenceImageOptions extends GenerateImageOptions {
  /** Optional mime type for all references. If omitted, each file MIME is inferred. */
  inputMimeType?: string;
}

/** Query options for Gemini model discovery. */
export interface ListModelsOptions {
  /** Max number of models to return in one request. */
  pageSize?: number;
  /** If true, only returns models likely related to images. */
  imageOnly?: boolean;
}

/** Summary information for a Gemini model from the models endpoint. */
export interface GeminiModelInfo {
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  supportedGenerationMethods: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
}

interface GeminiModelsResponse {
  models?: Array<{
    name?: string;
    displayName?: string;
    description?: string;
    version?: string;
    supportedGenerationMethods?: string[];
    inputTokenLimit?: number;
    outputTokenLimit?: number;
  }>;
  nextPageToken?: string;
}

/** Creates the image generation/editing client bound to API auth config. */
export function createImageGenClient(config: AuthConfig) {
  return {
    /** Returns the active Gemini image model used by this client. */
    getModel: () => config.model,

    /** Lists available Gemini models for the current API key. */
    listModels: (options: ListModelsOptions = {}) => listModels(config, options),

    /** Generates an image from text prompt and writes to disk. */
    generateImage: (prompt: string, outputPath: string, options: GenerateImageOptions = {}) =>
      generateImage(config, prompt, outputPath, options),

    /** Generates an image from text prompt and returns base64 data. */
    generateImageBase64: (prompt: string, options: GenerateImageOptions = {}) =>
      generateImageBase64(config, prompt, options),

    /** Edits an existing image using text instructions and writes output to disk. */
    editImage: (
      inputPath: string,
      prompt: string,
      outputPath: string,
      options: EditImageOptions = {},
    ) => editImage(config, inputPath, prompt, outputPath, options),

    /** Creates/edits an image from multiple reference images plus text instructions. */
    generateFromReferences: (
      inputPaths: string[],
      prompt: string,
      outputPath: string,
      options: ReferenceImageOptions = {},
    ) => generateFromReferences(config, inputPaths, prompt, outputPath, options),
  };
}

async function listModels(
  config: AuthConfig,
  options: ListModelsOptions,
): Promise<GeminiModelInfo[]> {
  const params = new URLSearchParams();
  if (options.pageSize) params.set('pageSize', String(options.pageSize));

  const url = `${API_BASE}/models?${params.toString()}&key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url);
  const json = (await res.json()) as GeminiModelsResponse;

  if (!res.ok) {
    throw new Error(`Gemini models API error ${res.status}: ${JSON.stringify(json)}`);
  }

  const mapped: GeminiModelInfo[] = (json.models ?? []).map((model) => ({
    name: model.name ?? '',
    displayName: model.displayName,
    description: model.description,
    version: model.version,
    supportedGenerationMethods: model.supportedGenerationMethods ?? [],
    inputTokenLimit: model.inputTokenLimit,
    outputTokenLimit: model.outputTokenLimit,
  }));

  if (!options.imageOnly) {
    return mapped;
  }

  return mapped.filter((model) => {
    const haystack = `${model.name} ${model.displayName ?? ''} ${model.description ?? ''}`.toLowerCase();
    return haystack.includes('image');
  });
}

async function generateImage(
  config: AuthConfig,
  prompt: string,
  outputPath: string,
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> {
  const image = await generateImageBase64(config, prompt, options);
  await Bun.write(outputPath, Buffer.from(image.base64Data, 'base64'));

  return {
    outputPath,
    mimeType: image.mimeType,
    model: image.model,
    prompt: image.prompt,
    textResponse: image.textResponse,
  };
}

async function generateImageBase64(
  config: AuthConfig,
  prompt: string,
  options: GenerateImageOptions,
): Promise<GeneratedImageData> {
  const model = options.model?.trim() || config.model;
  const parts: GeminiPart[] = [{ text: prompt }];
  const responseModalities = options.includeText === false ? ['IMAGE'] : ['IMAGE', 'TEXT'];
  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities,
      imageConfig: {
        ...(options.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
        ...(options.imageSize ? { imageSize: options.imageSize } : {}),
      },
      ...(options.mimeType ? { responseMimeType: options.mimeType } : {}),
    },
    ...(options.enableSearchGrounding ? { tools: [{ google_search: {} }] } : {}),
  };

  const data = await geminiGenerateContent(config, model, body);
  return extractImageFromResponse(data, model, prompt);
}

async function editImage(
  config: AuthConfig,
  inputPath: string,
  prompt: string,
  outputPath: string,
  options: EditImageOptions,
): Promise<GeneratedImageResult> {
  const model = options.model?.trim() || config.model;
  const inputFile = Bun.file(inputPath);
  const exists = await inputFile.exists();
  if (!exists) {
    throw new Error(`Input image not found: ${inputPath}`);
  }

  const inputMimeType = options.inputMimeType || inputFile.type || 'image/png';
  const inputBase64 = Buffer.from(await inputFile.arrayBuffer()).toString('base64');

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: inputMimeType,
              data: inputBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: options.includeText === false ? ['IMAGE'] : ['IMAGE', 'TEXT'],
      imageConfig: {
        ...(options.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
        ...(options.imageSize ? { imageSize: options.imageSize } : {}),
      },
      ...(options.mimeType ? { responseMimeType: options.mimeType } : {}),
    },
    ...(options.enableSearchGrounding ? { tools: [{ google_search: {} }] } : {}),
  };

  const data = await geminiGenerateContent(config, model, body);
  const image = extractImageFromResponse(data, model, prompt);
  await Bun.write(outputPath, Buffer.from(image.base64Data, 'base64'));

  return {
    outputPath,
    mimeType: image.mimeType,
    model: image.model,
    prompt: image.prompt,
    textResponse: image.textResponse,
  };
}

async function generateFromReferences(
  config: AuthConfig,
  inputPaths: string[],
  prompt: string,
  outputPath: string,
  options: ReferenceImageOptions,
): Promise<GeneratedImageResult> {
  const model = options.model?.trim() || config.model;
  if (!inputPaths.length) {
    throw new Error('inputPaths cannot be empty.');
  }
  if (inputPaths.length > 14) {
    throw new Error('Maximum 14 reference images are supported.');
  }

  const inlineParts: GeminiPart[] = [];
  for (const path of inputPaths) {
    const file = Bun.file(path);
    const exists = await file.exists();
    if (!exists) {
      throw new Error(`Reference image not found: ${path}`);
    }
    const mimeType = options.inputMimeType || file.type || 'image/png';
    const data = Buffer.from(await file.arrayBuffer()).toString('base64');
    inlineParts.push({ inlineData: { mimeType, data } });
  }

  const body = {
    contents: [
      {
        parts: [{ text: prompt }, ...inlineParts],
      },
    ],
    generationConfig: {
      responseModalities: options.includeText === false ? ['IMAGE'] : ['IMAGE', 'TEXT'],
      imageConfig: {
        ...(options.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
        ...(options.imageSize ? { imageSize: options.imageSize } : {}),
      },
      ...(options.mimeType ? { responseMimeType: options.mimeType } : {}),
    },
    ...(options.enableSearchGrounding ? { tools: [{ google_search: {} }] } : {}),
  };

  const data = await geminiGenerateContent(config, model, body);
  const image = extractImageFromResponse(data, model, prompt);
  await Bun.write(outputPath, Buffer.from(image.base64Data, 'base64'));

  return {
    outputPath,
    mimeType: image.mimeType,
    model: image.model,
    prompt: image.prompt,
    textResponse: image.textResponse,
  };
}

async function geminiGenerateContent(
  config: AuthConfig,
  model: string,
  body: object,
): Promise<GeminiResponse> {
  const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as unknown;

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(json)}`);
  }

  return json as GeminiResponse;
}

function extractImageFromResponse(
  data: GeminiResponse,
  model: string,
  prompt: string,
): GeneratedImageData {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  const textPart = parts.find((part) => typeof part.text === 'string' && part.text.trim().length > 0);

  if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
    throw new Error(`No image returned by Gemini model ${model}. Raw response: ${JSON.stringify(data)}`);
  }

  return {
    mimeType: imagePart.inlineData.mimeType,
    base64Data: imagePart.inlineData.data,
    model,
    prompt,
    textResponse: textPart?.text,
  };
}
