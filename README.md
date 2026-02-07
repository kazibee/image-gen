# @kazibee/image-gen

Gemini image generation/editing tool for kazibee (Nano Banana style workflow).

## Install

```bash
kazibee install image-gen github:kazibee/image-gen
```

Install globally with `-g`:

```bash
kazibee install -g image-gen github:kazibee/image-gen
```

## Authentication

Use environment variables:

- `GEMINI_API_KEY` (required)
- `GEMINI_IMAGE_MODEL` (optional)
  - Default: `gemini-3-pro-image-preview`

Recommended runtime usage:

```bash
kazibee --env GEMINI_API_KEY=your_key_here --env GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
```

## API

- `getModel()`
- `listModels(options?)`
- `generateImage(prompt, outputPath, options?)`
- `generateImageBase64(prompt, options?)`
- `editImage(inputPath, prompt, outputPath, options?)`

## Usage

```javascript
const model = tools["image-gen"].getModel();
const models = await tools["image-gen"].listModels({ imageOnly: true, pageSize: 100 });

const generated = await tools["image-gen"].generateImage(
  "Ultra clean product photo of a matte black bottle on white background",
  "/tmp/bottle.png",
  { mimeType: "image/png", aspectRatio: "1:1" }
);

const edited = await tools["image-gen"].editImage(
  "/tmp/bottle.png",
  "Add soft studio shadow and make lighting warmer",
  "/tmp/bottle-edited.png"
);
```
