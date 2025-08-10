import React, { useState, useEffect, useCallback, useRef } from 'react';
import './images.less';
import { BaseWidgetProps } from './_base';
import { useUIWeightCSS } from '../../utils';
import { MultiImageComponent, SingleImageComponent, MaskComponent, ImageDetail, UploadProvider } from './images-helper';

interface ImageSelectProps extends BaseWidgetProps {
    value?: ImageDetail[];
    onValueChange?: (images: ImageDetail[]) => void;
    extraOptions?: Record<string, any>;
    maxCount?: number;
    isMask?: boolean;
}


function fixValue(value: ImageDetail[]) {
    if (!value.map) return []
    if (value.filter(image => typeof image === 'string').length == 0) return value; 
    return value.map(image => {
        if (typeof image === 'string') {
            return {
                url: image,
                thumbnail: image,
                source: 'remote',
            };
        } else {
            return image
        }
    });
}


export const ImageSelect: React.FC<ImageSelectProps> = ({ maxCount = 1, uiWeight, value = [], onValueChange, extraOptions, isMask = false }) => {
    value = fixValue(value);
    const [images, setImages] = useState<ImageDetail[]>(value);
    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const imagesRef = useRef<ImageDetail[]>([]);
    imagesRef.current = images;

    // Sync internal state with value prop changes
    useEffect(() => {
        const fixedValue = fixValue(value);
        if (JSON.stringify(fixedValue) !== JSON.stringify(images)) {
            setImages(fixedValue);
        }
    }, [value]);

    const callOnValueChange = useCallback((newImages: ImageDetail[]) => {
        setImages(newImages);
        onValueChange?.(newImages);
    }, []);

    const handleImagesSet = useCallback((newImages: ImageDetail[]) => {
        setImages(newImages);
    }, [onValueChange]);


    // 路由到对应的子组件，并用 UploadProvider 包裹
    return (
        <UploadProvider
            onCallOnValueChange={callOnValueChange}
            onSetImages={handleImagesSet}
        >
            {isMask ? (
                <MaskComponent
                    images={images}
                    maxCount={maxCount}
                    uiWeightCSS={uiWeightCSS}
                />
            ) : maxCount === 1 ? (
                <SingleImageComponent
                    images={images}
                    maxCount={maxCount}
                    uiWeightCSS={uiWeightCSS}
                />
            ) : (
                <MultiImageComponent
                    images={images}
                    maxCount={maxCount}
                    uiWeightCSS={uiWeightCSS}
                />
            )}
        </UploadProvider>
    );

};


export default ImageSelect;