import { WidgetRegistry, WidgetRenderer } from '@sdppp/widgetable-ui';
import { imagesWidgetRenderer } from './widgets/images-widget';
import { masksWidgetRenderer } from './widgets/masks-widget';

// Deprecated widgets for PS_DOCUMENT and PS_LAYER
export const renderDeprecatedWidget: WidgetRenderer = () => {
    return <span>SDPPP 2.0不需要这个节点了</span>;
};

// Re-export the image and mask renderers
export const renderImageWidget: WidgetRenderer = imagesWidgetRenderer;
export const renderMaskWidget: WidgetRenderer = masksWidgetRenderer;

// Create base widget registry for SDPPP-specific widgets
export const createImageMaskWidgetRegistry = (): WidgetRegistry => {
    return {
        'images': renderImageWidget,
        'masks': renderMaskWidget,
        'PS_DOCUMENT': renderDeprecatedWidget,
        'PS_LAYER': renderDeprecatedWidget,
    };
};
