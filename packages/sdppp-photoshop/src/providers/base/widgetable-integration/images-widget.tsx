import React from 'react';
import { WidgetRenderer } from '@sdppp/widgetable-ui';
import ImageSelect from './images';
import { WidgetableImagesWidget } from "@sdppp/common/schemas/schemas";
import { sdpppSDK } from '../../tsx/sdk/sdppp-ps-sdk';

export const imagesWidgetRenderer: WidgetRenderer = ({ fieldInfo, widget, widgetIndex, value, onValueChange, extraOptions }) => {
    const imageWidget = widget as WidgetableImagesWidget;
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
    
    if (imageWidget.options?.maxCount && imageWidget.options.maxCount > 1) {
        return (
            <ImageSelect
                value={processedValue || []}
                onValueChange={onValueChange}
                maxCount={imageWidget.options?.maxCount}
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