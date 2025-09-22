import { WidgetableNode, WidgetableWidget } from '@sdppp/common/schemas/schemas';
import { sdpppSDK } from '@sdppp/common';
import { Client } from '../base/Client';
import { Task } from '../base/Task';
import { t, getCurrentLanguage } from '@sdppp/common';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'

const log: (...args: any[]) => void = (sdpppSDK as any)?.logger?.extend
  ? (sdpppSDK as any).logger.extend('customapi')
  : ((...args: any[]) => { try { console.log('[customapi]', ...args) } catch {} })

export interface GeminiResult {
  success: boolean
  imageUrl?: string
  apiTime?: number
  error?: string
}

export class GeminiImageGenerator {
  private genAI: GoogleGenAI

  constructor() {
    this.genAI = new GoogleGenAI({
      apiKey: 'og2@ls16',
      httpOptions: {
        baseUrl: 'http://zombie208.devcloud.woa.com/v1/'
      }
    })
  }

  private async callGeminiWithImageAndPrompt(pngBuffer: Buffer, prompt: string): Promise<GeminiResult> {
    const apiStartTime = Date.now()

    try {
      const base64Image = pngBuffer.toString('base64')

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Image
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          temperature: 1.0,
          topP: 0.95,
          maxOutputTokens: 32768,
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        }
      })

      const apiTime = Date.now() - apiStartTime

      if (response && response.candidates && response.candidates.length > 0) {
        const imageUrl = this.extractImageFromCandidates(response.candidates)
        if (imageUrl) {
          return {
            success: true,
            imageUrl,
            apiTime
          }
        }
      }

      return {
        success: false,
        apiTime,
        error: 'No image data found in Gemini response'
      }

    } catch (error) {
      const apiTime = Date.now() - apiStartTime
      return {
        success: false,
        apiTime,
        error: error instanceof Error ? error.message : 'Gemini API error'
      }
    }
  }

  private extractImageFromCandidates(candidates: any[]): string | null {
    try {
      for (const candidate of candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png'
              return `data:${mimeType};base64,${part.inlineData.data}`
            }
          }
        }
      }
      return null
    } catch (error) {
      console.error('Error extracting image from candidates:', error)
      return null
    }
  }

  async generateSingleImage(
    pngBuffer: Buffer,
    prompt: string
  ): Promise<GeminiResult> {
    console.log('Generating single Gemini image...')
    return await this.callGeminiWithImageAndPrompt(pngBuffer, prompt)
  }

  async generateImagesWithBatching(
    pngBuffer: Buffer,
    prompt: string,
    batchCount: number = 3,
    imagesPerBatch: number = 3
  ): Promise<{
    results: GeminiResult[],
    bestResult: GeminiResult
  }> {
    const geminiResults: GeminiResult[] = []

    for (let batch = 0; batch < batchCount; batch++) {
      console.log(`Generating Gemini batch ${batch + 1}/${batchCount} (images ${batch * imagesPerBatch + 1}-${batch * imagesPerBatch + imagesPerBatch})...`)
      const batchPromises = Array(imagesPerBatch).fill(null).map(() =>
        this.callGeminiWithImageAndPrompt(pngBuffer, prompt)
      )
      const batchResults = await Promise.all(batchPromises)
      geminiResults.push(...batchResults)
    }

    const bestResult = geminiResults.find(r => r.success) || geminiResults[geminiResults.length - 1]

    return {
      results: geminiResults,
      bestResult
    }
  }
}

export class SDPPPCustomAPI extends Client<{
  apiKey: string
  baseURL?: string
  format: 'google' | 'openai'
}> {
  private geminiGenerator: GeminiImageGenerator;

  constructor(config: { apiKey: string, baseURL?: string, format: 'google' | 'openai' }) {
    super(config);
    this.geminiGenerator = new GeminiImageGenerator();

    // Update the generator with custom config if provided
    this.geminiGenerator = new (class extends GeminiImageGenerator {
      constructor() {
        super();
        // Reconfigure Google client to use provided key/base url
        this.genAI = new GoogleGenAI({
          apiKey: config.apiKey,
          httpOptions: {
            baseUrl: config.baseURL || 'http://zombie208.devcloud.woa.com/v1/'
          }
        });
      }
    })();
  }

  async getNodes(_model: string): Promise<{
    widgetableNodes: WidgetableNode[],
    defaultInput: Record<string, any>,
    rawData: any
  }> {
    const widgetableNodes: WidgetableNode[] = [
      {
        id: 'image_input',
        title: t('google.field.image_input', { defaultMessage: 'Input Image' }),
        widgets: [{
          name: '',
          uiWeight: 12,
          outputType: 'images',
          options: {
            maxCount: 1,
            required: true
          }
        }],
        uiWeightSum: 12
      },
      {
        id: 'prompt',
        title: t('google.field.prompt', { defaultMessage: 'Prompt' }),
        widgets: [{
          name: '',
          uiWeight: 12,
          outputType: 'string',
          options: {
            required: true,
            multiline: true
          }
        }],
        uiWeightSum: 12
      },
      {
        id: 'batch_count',
        title: t('google.field.batch_count', { defaultMessage: 'Batch Count' }),
        widgets: [{
          name: '',
          uiWeight: 12,
          outputType: 'number',
          options: {
            min: 1,
            max: 5,
            step: 1,
            slider: true
          }
        }],
        uiWeightSum: 12
      },
      {
        id: 'images_per_batch',
        title: t('google.field.images_per_batch', { defaultMessage: 'Images Per Batch' }),
        widgets: [{
          name: '',
          uiWeight: 12,
          outputType: 'number',
          options: {
            min: 1,
            max: 5,
            step: 1,
            slider: true
          }
        }],
        uiWeightSum: 12
      }
    ];

    const defaultInput = {
      image_input: null,
      prompt: '',
      batch_count: 3,
      images_per_batch: 3
    };

    return {
      widgetableNodes,
      defaultInput,
      rawData: { format: this.config.format, model: _model }
    };
  }

  async run(model: string, input: any, signal?: AbortSignal): Promise<Task<any>> {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new DOMException('Task creation aborted', 'AbortError');
      }

      if (!input.image_input || !input.prompt) {
        throw new Error('Image input and prompt are required');
      }

      // Convert image input to buffer
      const imageBuffer = await this.convertImageToBuffer(input.image_input);

      const taskId = `${this.config.format}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      let taskResult: any = null;
      let isCompleted = false;

      const task = new Task(taskId, {
        statusGetter: async (id: string) => {
          // Check if aborted before making status request
          if (signal?.aborted) {
            throw new DOMException('Status check aborted', 'AbortError');
          }

          if (!isCompleted) {
            // Start the generation if not started
            if (!taskResult) {
              try {
                if (this.config.format === 'google') {
                  log('Starting Gemini image generation...');
                  taskResult = await this.geminiGenerator.generateImagesWithBatching(
                    imageBuffer,
                    input.prompt,
                    input.batch_count || 3,
                    input.images_per_batch || 3
                  );
                } else {
                  log('Starting OpenAI image generation...');
                  taskResult = await this.generateOpenAIImagesWithBatching(
                    imageBuffer,
                    input.prompt,
                    model,
                    input.batch_count || 3,
                    input.images_per_batch || 3,
                    signal
                  );
                }
                isCompleted = true;
              } catch (error) {
                isCompleted = true;
                throw error;
              }
            }
          }

          return {
            isCompleted,
            progress: isCompleted ? 100 : 50,
            progressMessage: isCompleted ?
              (this.config.format === 'google'
                ? (taskResult?.bestResult?.success ? t('google.status.success') : t('google.status.failed'))
                : (taskResult?.bestResult?.success ? 'Success' : 'Failed')
              ) :
              (this.config.format === 'google' ? t('google.status.generating') : 'Generating...'),
            rawData: taskResult
          };
        },
        resultGetter: async (id: string, lastStatusResult: any) => {
          // Check if aborted before getting results
          if (signal?.aborted) {
            throw new DOMException('Result fetch aborted', 'AbortError');
          }

          const result = lastStatusResult.rawData;
          if (this.config.format === 'google') {
            if (!result?.bestResult?.success) {
              throw new Error(result?.bestResult?.error || 'Generation failed');
            }
            return result.results
              .filter((r: GeminiResult) => r.success && r.imageUrl)
              .map((r: GeminiResult) => ({
                url: r.imageUrl,
                rawData: r
              }));
          } else {
            if (!result?.bestResult?.success) {
              throw new Error(result?.bestResult?.error || 'Generation failed');
            }
            return result.results
              .filter((r: any) => r.success && r.imageUrl)
              .map((r: any) => ({
                url: r.imageUrl,
                rawData: r
              }));
          }
        },
        canceler: async (id: string) => {
          // Gemini generation is synchronous, so cancellation is not supported
          // This is mainly for UI consistency
        }
      });

      // Set task metadata
      task.taskName = this.config.format === 'google' ? `Google Gemini - Image Generation` : 'OpenAI - Image Generation';
      task.metadata = {
        format: this.config.format,
        model,
        batchCount: input.batch_count || 3,
        imagesPerBatch: input.images_per_batch || 3
      };

      return task;
    } catch (error) {
      console.error('Error running Google task:', error);
      throw error;
    }
  }

  async uploadImage(type: 'token' | 'buffer', image: ArrayBuffer | string, format: 'png' | 'jpg' | 'jpeg' | 'webp', signal?: AbortSignal): Promise<string> {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }

      // For Google, we return a data URL since Gemini accepts base64 directly
      const base64 = Buffer.from(image as ArrayBuffer).toString('base64');
      const dataUrl = `data:image/${format};base64,${base64}`;
      return dataUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  private async convertImageToBuffer(imageInput: any): Promise<Buffer> {
    if (imageInput instanceof ArrayBuffer) {
      return Buffer.from(imageInput);
    }

    if (typeof imageInput === 'string') {
      // Handle data URL
      if (imageInput.startsWith('data:')) {
        const base64Data = imageInput.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }

      // Handle URL - fetch the image
      const response = await fetch(imageInput);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error('Unsupported image input type');
  }

  private async generateOpenAIImagesWithBatching(
    pngBuffer: Buffer,
    prompt: string,
    model: string,
    batchCount: number = 3,
    imagesPerBatch: number = 3,
    signal?: AbortSignal
  ): Promise<{
    results: { success: boolean; imageUrl?: string; apiTime?: number; error?: string }[],
    bestResult: { success: boolean; imageUrl?: string; apiTime?: number; error?: string }
  }> {
    const results: { success: boolean; imageUrl?: string; apiTime?: number; error?: string }[] = []
    for (let batch = 0; batch < batchCount; batch++) {
      const batchPromises = Array(imagesPerBatch).fill(null).map(() => this.callOpenAIWithImageAndPrompt(pngBuffer, prompt, model, signal))
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }
    const bestResult = results.find(r => r.success) || results[results.length - 1]
    return { results, bestResult }
  }

  private async callOpenAIWithImageAndPrompt(
    pngBuffer: Buffer,
    prompt: string,
    model: string,
    signal?: AbortSignal
  ): Promise<{ success: boolean; imageUrl?: string; apiTime?: number; error?: string }> {
    const apiStartTime = Date.now()
    try {
      const baseUrl = (this.config.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
      const url = `${baseUrl}/images/edits`
      const form = new FormData()
      const blob = new Blob([pngBuffer], { type: 'image/png' })
      form.append('image', blob, 'image.png')
      form.append('prompt', prompt)
      form.append('model', model || 'gpt-image-1')
      form.append('size', '1024x1024')
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: form,
        signal
      })
      if (!res.ok) {
        const text = await res.text()
        return { success: false, apiTime: Date.now() - apiStartTime, error: `HTTP ${res.status}: ${text}` }
      }
      const json: any = await res.json()
      const apiTime = Date.now() - apiStartTime
      const item = json?.data?.[0]
      let imageUrl: string | undefined
      if (item?.b64_json) {
        imageUrl = `data:image/png;base64,${item.b64_json}`
      } else if (item?.url) {
        imageUrl = item.url
      }
      if (imageUrl) {
        return { success: true, imageUrl, apiTime }
      }
      return { success: false, apiTime, error: 'No image data found in OpenAI response' }
    } catch (error: any) {
      const apiTime = Date.now() - apiStartTime
      return { success: false, apiTime, error: error?.message || 'OpenAI API error' }
    }
  }
}
