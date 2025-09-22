import React from 'react';
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import ImageSelect from './images';

// 创建一个真正的React组件来处理hooks
const MasksWidgetComponent: React.FC<{
    value: any;
    onValueChange: (value: any) => void;
    extraOptions?: any;
}> = ({ value, onValueChange, extraOptions }) => {
    return (
        <ImageSelect
            value={value ? [value] : []}
            onValueChange={(v) => onValueChange(v[0])}
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