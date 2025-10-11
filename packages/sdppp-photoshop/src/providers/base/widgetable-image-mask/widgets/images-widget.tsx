import { WidgetableImagesWidget } from "@sdppp/common/schemas/schemas";
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import React from 'react';
import { SyncSelector } from '../components/SyncSelector';

// 创建一个真正的React组件来处理hooks
const ImagesWidgetComponent: React.FC<{
    widgetableId: string;
    widget: WidgetableImagesWidget;
    value: string[];
    onValueChange: (value: string[]) => void;
    extraOptions?: any;
}> = ({ widgetableId, widget, value, onValueChange, extraOptions }) => {
    return (
        <SyncSelector
            widgetableId={widgetableId}
            value={value}
            onValueChange={onValueChange}
            maxCount={widget.options?.maxCount || 1}
            extraOptions={extraOptions}
            isMask={false}
        />
    );
};

export const imagesWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
    const imageWidget = widget as WidgetableImagesWidget;

    return (
        <ImagesWidgetComponent
            widgetableId={fieldInfo.id}
            widget={imageWidget}
            value={value}
            onValueChange={onValueChange}
            extraOptions={extraOptions}
        />
    );
};