# @kazibee/image-gen

Gemini image generation and editing tool for kazibee.

This package is designed for:
- text-to-image generation
- image editing/instruction-based transformation
- multi-reference image composition
- model discovery (`listModels`) so the agent can verify available models at runtime

## Install

```bash
kazibee install image-gen github:kazibee/image-gen
```

Global install:

```bash
kazibee install -g image-gen github:kazibee/image-gen
```

## Authentication

Required environment variable:
- `GEMINI_API_KEY`

Optional environment variable:
- `GEMINI_IMAGE_MODEL`
  - default: `gemini-3-pro-image-preview`

### Persistent env (recommended)

```bash
kazibee env image-gen --set GEMINI_API_KEY=your_gemini_api_key
kazibee env image-gen --set GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
```

### One-off env for a single run

```bash
kazibee --env GEMINI_API_KEY=your_gemini_api_key --env GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
```

## Model Selection

Current default is `gemini-3-pro-image-preview`.

You can switch at runtime without code changes:

```bash
kazibee env image-gen --set GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

Use `listModels` to discover what your API key can access:

```javascript
const models = await tools["image-gen"].listModels({ imageOnly: true, pageSize: 100 });
```

## API

- `getModel()`
  - Returns the active model ID for this tool instance.

- `listModels(options?)`
  - `pageSize?: number`
  - `imageOnly?: boolean`
  - Returns model metadata including `name`, `displayName`, and `supportedGenerationMethods`.

- `generateImage(prompt, outputPath, options?)`
  - Generates an image and writes it to `outputPath`.

- `generateImageBase64(prompt, options?)`
  - Generates an image and returns base64 data instead of writing a file.

- `editImage(inputPath, prompt, outputPath, options?)`
  - Edits an input image with text instructions.

- `generateFromReferences(inputPaths, prompt, outputPath, options?)`
  - Uses multiple reference images plus prompt.
  - Supports up to 14 input reference images.

## Generation Options

Shared options for generation/edit/reference workflows:
- `aspectRatio`: `1:1 | 2:3 | 3:2 | 3:4 | 4:3 | 4:5 | 5:4 | 9:16 | 16:9 | 21:9`
- `imageSize`: `1K | 2K | 4K`
- `includeText`: include textual response from model (`true` by default)
- `enableSearchGrounding`: enable Google Search grounding
- `mimeType`: requested output mime type (`image/png | image/jpeg | image/webp`)

Edit/reference-specific options:
- `inputMimeType`: optional override for the input reference image mime type

## Practical Examples

### 1) Check model and available image models

```javascript
const current = tools["image-gen"].getModel();
const models = await tools["image-gen"].listModels({ imageOnly: true, pageSize: 100 });
```

### 2) Text-to-image (write to disk)

```javascript
const result = await tools["image-gen"].generateImage(
  "Studio product shot of a matte-black travel mug on neutral background",
  "/tmp/mug.png",
  {
    aspectRatio: "1:1",
    imageSize: "2K",
    includeText: true,
  }
);
```

### 3) Text-to-image (base64 response)

```javascript
const base64Result = await tools["image-gen"].generateImageBase64(
  "Simple flat logo mark: geometric bee icon",
  {
    aspectRatio: "1:1",
    mimeType: "image/png",
  }
);
```

### 4) Edit an existing image

```javascript
const edited = await tools["image-gen"].editImage(
  "/tmp/source.png",
  "Keep subject identity, change background to clean white and add soft shadow",
  "/tmp/edited.png",
  {
    imageSize: "2K",
    includeText: false,
  }
);
```

### 5) Multi-reference composition

```javascript
const composite = await tools["image-gen"].generateFromReferences(
  ["/tmp/ref-style.png", "/tmp/ref-product.png"],
  "Create a single premium ad scene combining style and product references",
  "/tmp/composite.png",
  {
    aspectRatio: "16:9",
    imageSize: "2K",
  }
);
```

## Error Handling Notes

Common failure sources:
- invalid or missing `GEMINI_API_KEY`
- model not accessible by your key/project
- unsupported option combination for a model
- missing input file path for `editImage` or `generateFromReferences`

Recommended fallback sequence:
1. `listModels({ imageOnly: true })`
2. switch `GEMINI_IMAGE_MODEL` to an available image model
3. retry with simpler options (`aspectRatio` only, no grounding)

## Output Contract

Write-based methods return:
- `outputPath`
- `mimeType`
- `model`
- `prompt`
- optional `textResponse`

Base64 method returns:
- `base64Data`
- `mimeType`
- `model`
- `prompt`
- optional `textResponse`
