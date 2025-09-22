import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './images.less';
import { BaseWidgetProps } from '@sdppp/widgetable-ui';
import { useUIWeightCSS } from '@sdppp/widgetable-ui';
import { MultiImageComponent, SingleImageComponent, MaskComponent, ImageDetail, UploadProvider } from './images-helper';

interface ImageSelectProps extends BaseWidgetProps {
    value?: ImageDetail[];
    onValueChange?: (images: ImageDetail[]) => void;
    extraOptions?: Record<string, any>;
    maxCount?: number;
    isMask?: boolean;
}


function fixValue(value: ImageDetail[]) {
    if (!value || !value.map) return [];

    // 检查是否需要修复
    const needsFixing = value.some(image => typeof image === 'string');
    if (!needsFixing) return value; // 如果不需要修复，直接返回原数组

    return value.map(image => {
        if (typeof image === 'string') {
            return {
                url: image,
                thumbnail: image,
                source: 'remote',
            };
        } else {
            return image;
        }
    });
}


function ImageSelectComponent({ maxCount = 1, uiWeight, value = [], onValueChange, extraOptions, isMask = false }: ImageSelectProps) {
    value = fixValue(value);
    const [images, setImages] = useState<ImageDetail[]>(value);
    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const imagesRef = useRef<ImageDetail[]>([]);
    imagesRef.current = images;

    // Get enableRemove from extraOptions, default to false
    const enableRemove = extraOptions?.enableRemove === true;

    // Sync internal state with value prop changes
    useEffect(() => {
        const fixedValue = fixValue(value);
        if (JSON.stringify(fixedValue) !== JSON.stringify(images)) {
            setImages(fixedValue);
        }
    }, [value, images]);

    const callOnValueChange = useCallback((newImages: ImageDetail[]) => {
        setImages(newImages);
        onValueChange?.(newImages);
    }, [onValueChange]);

    const handleImagesSet = useCallback((newImages: ImageDetail[]) => {
        setImages(newImages);
    }, []);

    // 路由到对应的子组件，并用 UploadProvider 包裹
    return (
        <UploadProvider
            onCallOnValueChange={callOnValueChange}
            onSetImages={handleImagesSet}
            maxCount={maxCount}
        >
            {isMask ? (
                <MaskComponent
                    images={images}
                    maxCount={maxCount}
                    uiWeightCSS={uiWeightCSS}
                    enableRemove={enableRemove}
                />
            ) : maxCount > 1 ? (
                <MultiImageComponent
                    images={images}
                    maxCount={maxCount}
                    uiWeightCSS={uiWeightCSS}
                    enableRemove={enableRemove}
                />
            ) : (
                <SingleImageComponent
                    images={images}
                    maxCount={maxCount}
                    uiWeightCSS={uiWeightCSS}
                    enableRemove={enableRemove}
                />
            )}
        </UploadProvider>
    );
}

export const ImageSelect: React.FC<ImageSelectProps> = ImageSelectComponent;


export default ImageSelect;