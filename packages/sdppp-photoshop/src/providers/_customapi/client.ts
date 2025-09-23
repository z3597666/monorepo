import { WidgetableNode, WidgetableWidget } from '@sdppp/common/schemas/schemas';
import { Client } from '../base/Client';
import { Task } from '../base/Task';
import { t, getCurrentLanguage, sdpppSDK } from '@sdppp/common';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'
import { runOpenAIEditHttp } from './handlers';
// OpenAI SDK removed; using HTTP calls via handlers

export interface GeminiResult {
  success: boolean
  imageUrl?: string
  apiTime?: number
  error?: string
}

export class GeminiImageGenerator {
  protected genAI!: GoogleGenAI

  constructor(config: { apiKey: string, baseURL?: string }) {
    const options: any = { apiKey: config.apiKey };
    if (config.baseURL) {
      options.httpOptions = { baseUrl: config.baseURL };
    }
    this.genAI = new GoogleGenAI(options);
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
      // console.log(`Generating Gemini batch ${batch + 1}/${batchCount} (images ${batch * imagesPerBatch + 1}-${batch * imagesPerBatch + imagesPerBatch})...`)
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
  baseURL: string
  format: 'google' | 'openai'
}> {
  private geminiGenerator: GeminiImageGenerator | null = null;

  constructor(config: { apiKey: string, baseURL: string, format: 'google' | 'openai' }) {
    super(config);
    if (config.format === 'google') {
      this.geminiGenerator = new GeminiImageGenerator({ apiKey: config.apiKey, baseURL: config.baseURL });
    }
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

    ];

    const defaultInput = {
      image_input: null,
      prompt: ''
    };

    return {
      widgetableNodes,
      defaultInput,
      rawData: { format: this.config.format, model: _model }
    };
  }

  async run(model: string, input: { image_input: string, prompt: string }, signal?: AbortSignal): Promise<Task<any>> {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new DOMException('Task creation aborted', 'AbortError');
      }

      if (!input.image_input || !input.prompt) {
        throw new Error('Image input and prompt are required');
      }

      // Convert base64 image_input to buffer
      const imageBuffer = this.convertBase64ToBuffer(input.image_input);

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
                  console.log('Starting Gemini image generation...');
                  taskResult = await this.geminiGenerator!.generateSingleImage(
                    imageBuffer,
                    input.prompt
                  );
                } else {
                  console.log('Starting OpenAI image edit via HTTP API...');
                  taskResult = await runOpenAIEditHttp(this.config.apiKey, this.config.baseURL, imageBuffer, input.prompt, model);
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
            progressMessage: isCompleted
              ? (this.config.format === 'google'
                ? (taskResult?.success ? t('google.status.success') : t('google.status.failed'))
                : (taskResult?.success ? 'Success' : 'Failed'))
              : (this.config.format === 'google' ? t('google.status.generating') : 'Generating...'),
            rawData: taskResult
          };
        },
        resultGetter: async (id: string, lastStatusResult: any) => {
          // Check if aborted before getting results
          if (signal?.aborted) {
            throw new DOMException('Result fetch aborted', 'AbortError');
          }

          const result = lastStatusResult.rawData;
          if (!result?.success || !result.imageUrl) {
            throw new Error(result?.error || 'Generation failed');
          }
          return [{ url: result.imageUrl, rawData: result }];
        },
        canceler: async (id: string) => {
          // Gemini generation is synchronous, so cancellation is not supported
          // This is mainly for UI consistency
        }
      });

      // Set task metadata
      task.taskName = this.config.format === 'google' ? `Google Gemini - Image Generation` : 'OpenAI - Image Edit';
      task.metadata = {
        format: this.config.format,
        model
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

      if (type === 'token') {
        const { base64 } = await sdpppSDK.plugins.photoshop.getImageBase64({ token: image as string })
        return base64 || '';

      } else {
        throw new Error('Unsupported image input type');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  private convertBase64ToBuffer(imageInput: string): Buffer {
    // Handle data URL format (data:image/png;base64,...)
    if (imageInput.startsWith('data:')) {
      const base64Data = imageInput.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // Handle plain base64 string
    return Buffer.from(imageInput, 'base64');
  }

  // OpenAI generation moved to HTTP handlers in run()
}
