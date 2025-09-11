import React from 'react';
import { WidgetableNode, WidgetableWidget } from "@sdppp/common/schemas/schemas";

export interface WidgetRendererProps {
    fieldInfo: WidgetableNode;
    widget: WidgetableWidget;
    widgetIndex: number;
    value: any;
    onValueChange: (value: any) => void;
    extraOptions?: any;
}

export type WidgetRenderer = (props: WidgetRendererProps) => React.ReactElement | null;

export interface WidgetRegistry {
    [widgetType: string]: WidgetRenderer;
}

export interface WidgetRegistryContextType {
    registry: WidgetRegistry;
    registerWidget: (widgetType: string, renderer: WidgetRenderer) => void;
    unregisterWidget: (widgetType: string) => void;
    getWidgetRenderer: (widgetType: string) => WidgetRenderer | null;
}

export const createDefaultWidgetRegistry = (): WidgetRegistry => {
    // Import default widgets lazily to avoid circular dependencies
    const { 
        renderToggleWidget, 
        renderNumberWidget, 
        renderComboWidget, 
        renderSegmentWidget, 
        renderStringWidget, 
        renderErrorWidget
    } = require('./widgetable-web/default-widgets');
    
    return {
        'number': renderNumberWidget,
        'combo': renderComboWidget,
        'segment': renderSegmentWidget,
        'boolean': renderToggleWidget,
        'toggle': renderToggleWidget,
        'string': renderStringWidget,
        'customtext': renderStringWidget,
        'text': renderStringWidget,
        'error': renderErrorWidget,
        // Note: 'images', 'masks', 'PS_DOCUMENT', 'PS_LAYER' are now externally injected
    };
};