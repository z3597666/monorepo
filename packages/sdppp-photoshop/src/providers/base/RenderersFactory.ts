import type { RenderActionButtonsFunction, RenderImageMetadataFunction } from '../../tsx/widgetable/context';
import { photoshopRenderActionButtons } from './renderers/PhotoshopActionButtonRenderer';
import { photoshopRenderImageMetadata } from './renderers/PhotoshopImageMetaRenderer';

// Re-export types for convenience
export type { PhotoshopParams, PhotoshopMaskParams, SourceInfo } from './types';

/**
 * Creates the Photoshop-specific action button renderer
 */
export function createPhotoshopActionButtonRenderer(): RenderActionButtonsFunction {
    return photoshopRenderActionButtons;
}

/**
 * Creates the Photoshop-specific image metadata renderer
 */
export function createPhotoshopImageMetaRenderer(): RenderImageMetadataFunction {
    return photoshopRenderImageMetadata;
}

/**
 * Creates both Photoshop renderers as a convenient bundle
 */
export function createPhotoshopRenderers() {
    return {
        renderActionButtons: createPhotoshopActionButtonRenderer(),
        renderImageMetadata: createPhotoshopImageMetaRenderer()
    };
}

/**
 * Export individual renderers for direct use
 */
export {
    photoshopRenderActionButtons,
    photoshopRenderImageMetadata
};