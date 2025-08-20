import { availableModels as replicateAvailableModels, SDPPPReplicate } from "./_replicate/client";
import { SDPPPRunningHub } from "./_runninghub/client";
import ReplicateRenderer from "./_replicate/renderer/replicate";
import RunningHubRenderer from "./_runninghub/renderer/runninghub";
import { ComfyFrontendRenderer } from "./_comfy_frontend/renderer/comfy_frontend.tsx";

export const Providers = {
    ComfyUI: {
        Renderer: ComfyFrontendRenderer,
    },
    Replicate: {
        client: SDPPPReplicate,
        Renderer: ReplicateRenderer,
        availableModels: replicateAvailableModels,
    },
    RunningHub: {
        client: SDPPPRunningHub,
        Renderer: RunningHubRenderer
    },
}