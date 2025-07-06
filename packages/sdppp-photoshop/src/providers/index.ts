import { availableModels as liblibAvailableModels, SDPPPLiblib } from "./_liblib/client";
import { availableModels as replicateAvailableModels, SDPPPReplicate } from "./_replicate/client";
import LiblibRenderer from "./_liblib/renderer/liblib";
import ReplicateRenderer from "./_replicate/renderer/replicate";
import { ComfyFrontendRenderer } from "./_comfy_frontend/renderer/comfy_frontend.tsx";

export const Providers = {
    comfyUI: {
        Renderer: ComfyFrontendRenderer,
    },
    replicate: {
        client: SDPPPReplicate,
        Renderer: ReplicateRenderer,
        availableModels: replicateAvailableModels,
    },
    '哩布哩布AI': {
        client: SDPPPLiblib,
        Renderer: LiblibRenderer,
        availableModels: liblibAvailableModels,
    },
}