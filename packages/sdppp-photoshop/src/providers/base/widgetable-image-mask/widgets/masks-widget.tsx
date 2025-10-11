import { WidgetableMasksWidget } from "@sdppp/common/schemas/schemas";
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import React from 'react';
import { SyncSelector } from '../components/SyncSelector';

// 创建一个真正的React组件来处理hooks
const MasksWidgetComponent: React.FC<{
    widgetableId: string;
    widget: WidgetableMasksWidget;
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
            isMask={true}
        />
    );
};

export const masksWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
    const maskWidget = widget as WidgetableMasksWidget;

    return (
        <MasksWidgetComponent
            widgetableId={fieldInfo.id}
            widget={maskWidget}
            value={value}
            onValueChange={onValueChange}
            extraOptions={extraOptions}
        />
    );
};