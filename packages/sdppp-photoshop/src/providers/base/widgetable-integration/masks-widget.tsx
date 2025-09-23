import React, { useCallback } from 'react';
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import ImageSelect from './images';

// 创建一个真正的React组件来处理hooks
const MasksWidgetComponent: React.FC<{
    value: any;
    onValueChange: (value: any) => void;
    extraOptions?: any;
}> = ({ value, onValueChange, extraOptions }) => {
    // Memoize the callback to prevent unnecessary re-renders
    const handleValueChange = useCallback((v: any[]) => {
        onValueChange(v[0]);
    }, [onValueChange]);

    return (
        <ImageSelect
            value={value ? [value] : []}
            onValueChange={handleValueChange}
            maxCount={1}
            extraOptions={extraOptions}
            isMask={true}
        />
    );
};

export const masksWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
    return (
        <MasksWidgetComponent
            value={value}
            onValueChange={onValueChange}
            extraOptions={extraOptions}
        />
    );
};