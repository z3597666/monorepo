import React from 'react';
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import ImageSelect from './images';

export const masksWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
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