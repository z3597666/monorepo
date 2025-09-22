import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SDPPPCustomAPI } from '../_customapi/client'

// Mocks for @google/genai
vi.mock('@google/genai', async () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { inlineData: { mimeType: 'image/png', data: Buffer.from('fake').toString('base64') } }
                ]
              }
            }
          ]
        })
      }
    },
    HarmCategory: {
      HARM_CATEGORY_HATE_SPEECH: 'HATE',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'DANGEROUS',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'SEX',
      HARM_CATEGORY_HARASSMENT: 'HARASS'
    },
    HarmBlockThreshold: {
      BLOCK_NONE: 'NONE'
    }
  }
})

function dataUrlFromString(str: string) {
  return `data:image/png;base64,${Buffer.from(str).toString('base64')}`
}

describe('Custom API client (Google/OpenAI)', () => {
  const dummyPng = dataUrlFromString('dummy')

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('google: getNodes and run returns images', async () => {
    const client = new SDPPPCustomAPI({ apiKey: 'test-key', baseURL: 'http://mocked', format: 'google' })
    const { widgetableNodes, defaultInput, rawData } = await client.getNodes('gemini-2.5-flash-image-preview')
    expect(Array.isArray(widgetableNodes)).toBe(true)
    expect(defaultInput).toHaveProperty('prompt')
    expect(rawData.format).toBe('google')

    const task = await client.run('gemini-2.5-flash-image-preview', {
      image_input: dummyPng,
      prompt: 'hello',
      batch_count: 1,
      images_per_batch: 1
    })
    const images = await task.promise as { url: string }[]
    expect(Array.isArray(images)).toBe(true)
    expect(images.length).toBeGreaterThan(0)
    expect(images[0].url.startsWith('data:image/')).toBe(true)
  })

  it('openai: getNodes and run returns images', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValueOnce(new Response(
      JSON.stringify({ data: [{ b64_json: Buffer.from('openai').toString('base64') }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ))

    const client = new SDPPPCustomAPI({ apiKey: 'test-openai-key', baseURL: 'http://openai-mock/v1', format: 'openai' })
    const { widgetableNodes, defaultInput, rawData } = await client.getNodes('gpt-image-1')
    expect(Array.isArray(widgetableNodes)).toBe(true)
    expect(defaultInput).toHaveProperty('prompt')
    expect(rawData.format).toBe('openai')

    const task = await client.run('gpt-image-1', {
      image_input: dummyPng,
      prompt: 'hello',
      batch_count: 1,
      images_per_batch: 1
    })
    const images = await task.promise as { url: string }[]
    expect(Array.isArray(images)).toBe(true)
    expect(images.length).toBeGreaterThan(0)
    expect(images[0].url.startsWith('data:image/')).toBe(true)
    expect(fetchSpy).toHaveBeenCalled()
  })
})
