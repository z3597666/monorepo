import React from 'react';
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import ImageSelect from './images';
import { WidgetableImagesWidget } from "@sdppp/common/schemas/schemas";
import { sdpppSDK } from '@sdppp/common';

// 创建一个真正的React组件来处理hooks
const ImagesWidgetComponent: React.FC<{
    widget: WidgetableImagesWidget;
    value: any;
    onValueChange: (value: any) => void;
    extraOptions?: any;
}> = ({ widget, value, onValueChange, extraOptions }) => {
    // 处理value，支持ComfyUI兼容模式
    let processedValue = value;

    // Temporary ComfyUI compatibility
    const tempOldComfyCompat = false;
    if (tempOldComfyCompat && processedValue) {
        const [subfolder, ...rest] = processedValue.split('/');
        const url = sdpppSDK.stores.PhotoshopStore.getState().comfyURL.endsWith('/') ?
            sdpppSDK.stores.PhotoshopStore.getState().comfyURL + 'api/view?type=input&filename=' + rest.join('/') + '&subfolder=' + subfolder :
            sdpppSDK.stores.PhotoshopStore.getState().comfyURL + '/api/view?type=input&filename=' + rest.join('/') + '&subfolder=' + subfolder;
        processedValue = {
            url: processedValue,
            thumbnail: url,
            source: 'comfyUI'
        };
    }

    if (widget.options?.maxCount && widget.options.maxCount > 1) {
        return (
            <ImageSelect
                value={processedValue || []}
                onValueChange={onValueChange}
                maxCount={widget.options?.maxCount}
                extraOptions={extraOptions}
            />
        );
    } else {
        return (
            <ImageSelect
                value={processedValue ? [processedValue] : []}
                onValueChange={(v) => onValueChange(v[0])}
                maxCount={1}
                extraOptions={extraOptions}
            />
        );
    }
};

export const imagesWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
    const imageWidget = widget as WidgetableImagesWidget;

    return (
        <ImagesWidgetComponent
            widget={imageWidget}
            value={value}
            onValueChange={onValueChange}
            extraOptions={extraOptions}
        />
    );

};