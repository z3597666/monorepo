export interface ProviderMetadata {
    id: string;
    name: string;
    description: string;
    brandColor: string;
    logoPath: string;
}

export const PROVIDER_METADATA: Record<string, ProviderMetadata> = {
    ComfyUI: {
        id: 'ComfyUI',
        name: 'ComfyUI',
        description: 'provider.comfyui.description',
        brandColor: '#172Ed8',
        logoPath: new URL('../assets/provider-logos/comfy_160x160.jpg', import.meta.url).href
    },
    Replicate: {
        id: 'Replicate',
        name: 'Replicate',
        description: 'provider.replicate.description',
        brandColor: '#f03a68',
        logoPath: new URL('../assets/provider-logos/replicate_160x160.jpg', import.meta.url).href
    },
    RunningHub: {
        id: 'RunningHub',
        name: 'RunningHub',
        description: 'provider.runninghub.description',
        brandColor: '#02dba3',
        logoPath: new URL('../assets/provider-logos/runninghub_160x160.png', import.meta.url).href
    }
};