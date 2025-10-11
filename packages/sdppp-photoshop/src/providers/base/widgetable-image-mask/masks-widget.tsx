import { WidgetableMasksWidget } from "@sdppp/common/schemas/schemas";
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import React, { useCallback } from 'react';
import { SyncSelector } from './components/SyncSelector';

// 创建一个真正的React组件来处理hooks
const MaskWidgetComponent: React.FC<{
    widgetableId: string;
    widget: WidgetableMasksWidget;
    value: string;
    onValueChange: (value: string) => void;
    extraOptions?: any;
}> = ({ widgetableId, widget, value, onValueChange, extraOptions }) => {
    const handleValueChange = useCallback((v: string[]) => {
        onValueChange(v[0] || '');
    }, [onValueChange]);

    return (
        <SyncSelector
            widgetableId={widgetableId}
            value={value ? [value] : []}
            onValueChange={handleValueChange}
            maxCount={widget.options?.maxCount || 1}
            extraOptions={extraOptions}
            isMask={true}
        />
    );
};

export const masksWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
    const maskWidget = widget as WidgetableMasksWidget;

    return (
        <MaskWidgetComponent
            widgetableId={fieldInfo.id}
            widget={maskWidget}
            value={value}
            onValueChange={onValueChange}
            extraOptions={extraOptions}
        />
    );
};
