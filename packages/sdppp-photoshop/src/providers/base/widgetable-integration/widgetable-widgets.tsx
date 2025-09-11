import React from 'react';
import { WidgetRenderer, WidgetRegistry } from '@sdppp/widgetable-ui';
import { imagesWidgetRenderer } from './images-widget';  
import { masksWidgetRenderer } from './masks-widget';

// Deprecated widgets for PS_DOCUMENT and PS_LAYER
export const renderDeprecatedWidget: WidgetRenderer = () => {
    return <span>SDPPP 2.0不需要这个节点了</span>;
};

// Re-export the image and mask renderers
export const renderImageWidget: WidgetRenderer = imagesWidgetRenderer;
export const renderMaskWidget: WidgetRenderer = masksWidgetRenderer;

// Create base widget registry for SDPPP-specific widgets
export const createBaseWidgetRegistry = (): WidgetRegistry => {
    return {
        'images': renderImageWidget,
        'masks': renderMaskWidget,
        'PS_DOCUMENT': renderDeprecatedWidget,
        'PS_LAYER': renderDeprecatedWidget,
    };
};