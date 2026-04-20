export interface Env {
	GEMINI_API_KEY: string;
	GEMINI_IMAGE_MODEL?: string;
}
/** Options for text-to-image generation. */
export interface GenerateImageOptions {
	/** Optional per-request model override. */
	model?: string;
	/** Target aspect ratio hint for the generated image. */
	aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
	/** Output image size hint. `2K` and `4K` are primarily for Gemini 3 Pro Image Preview. */
	imageSize?: "1K" | "2K" | "4K";
	/** Include text response along with image output. */
	includeText?: boolean;
	/** Enables Google Search grounding for generation. */
	enableSearchGrounding?: boolean;
	/** Optional response mime type override if supported by model/runtime. */
	mimeType?: "image/png" | "image/jpeg" | "image/webp";
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
declare function main(env: Env): {
	getModel: () => Promise<string>;
	listModels: (options?: ListModelsOptions) => Promise<GeminiModelInfo[]>;
	generateImage: (prompt: string, outputPath: string, options?: GenerateImageOptions) => Promise<GeneratedImageResult>;
	generateImageBase64: (prompt: string, options?: GenerateImageOptions) => Promise<GeneratedImageData>;
	editImage: (inputPath: string, prompt: string, outputPath: string, options?: EditImageOptions) => Promise<GeneratedImageResult>;
	generateFromReferences: (inputPaths: string[], prompt: string, outputPath: string, options?: ReferenceImageOptions) => Promise<GeneratedImageResult>;
};

export {
	main as default,
};

export {};
