import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './images.less';
import { BaseWidgetProps } from '@sdppp/widgetable-ui';
import { useUIWeightCSS } from '@sdppp/widgetable-ui';
import { MultiImageComponent, SingleImageComponent, MaskComponent, ImageDetail, UploadProvider } from './images-helper';
import { useImageUpload } from './images-helper/upload-context';
import { Alert } from 'antd';
import { sdpppSDK } from '@sdppp/common';

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
    // Memoize fixValue result to avoid unnecessary calculations
    const log = useMemo(() => sdpppSDK.logger.extend('ImageSelect'), []);
    const fixedValue = useMemo(() => fixValue(value), [value]);
    const [images, setImages] = useState<ImageDetail[]>(fixedValue);
    // 临时上传展示标记：在 GET 返回 thumbnail 时阻止外部 value 覆盖
    const tempImagesRef = useRef<boolean>(false);
    // 记录最近一次“最终提交”的 url，用于抵御外部旧值覆盖
    const lastCommittedUrlRef = useRef<string>(fixedValue?.[0]?.url || '');

    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const imagesRef = useRef<ImageDetail[]>([]);
    imagesRef.current = images;

    

    // Memoize extraOptions to handle object reference instability
    const stableExtraOptions = useMemo(() => extraOptions || {}, [extraOptions]);

    // Get enableRemove from extraOptions, default to false - memoize to avoid unnecessary re-renders
    const enableRemove = useMemo(() => stableExtraOptions.enableRemove === true, [stableExtraOptions.enableRemove]);

    // Sync internal state with value prop changes - use more efficient comparison
    useEffect(() => {
        // 当处于临时上传展示阶段（例如展示 GET 的 thumbnail）时，不要被外部 value 覆盖
        if (tempImagesRef.current) {
            // 如果外部 value 已经与内部 images 一致，则解除临时态
            const isSame = fixedValue.length === images.length &&
                fixedValue.every((item, index) => (
                    !!images[index] &&
                    item.url === images[index].url &&
                    item.source === images[index].source &&
                    item.thumbnail === images[index].thumbnail
                ));
            if (isSame) {
                log('external value matched internal temp images, clear temp flag');
                tempImagesRef.current = false;
            }
            log('skip external sync due to temp images', {
                external: fixedValue.map(i => ({ url: i?.url, th: i?.thumbnail, auto: i?.auto })),
                internal: images.map(i => ({ url: i?.url, th: i?.thumbnail, auto: i?.auto }))
            });
            return;
        }

        // 与外部 value 同步：长度或关键字段不同才更新
        if (fixedValue.length !== images.length ||
            fixedValue.some((item, index) =>
                !images[index] ||
                item.url !== images[index].url ||
                item.source !== images[index].source ||
                item.thumbnail !== images[index].thumbnail
            )) {
            // 若是单图场景，且当前内部 url 等于最后一次“已提交”的最终 url，
            // 但外部传入的 url 与该“最终 url”不一致，则认为外部值可能是旧值/延迟同步，忽略之，避免闪烁。
            if (maxCount <= 1 && images.length === 1 && fixedValue.length === 1) {
                const currentUrl = images[0]?.url || '';
                const externalUrl = fixedValue[0]?.url || '';
                if (lastCommittedUrlRef.current && currentUrl === lastCommittedUrlRef.current && externalUrl !== lastCommittedUrlRef.current) {
                    log('ignore external value due to committed url mismatch', { currentUrl, externalUrl, committed: lastCommittedUrlRef.current });
                    return;
                }
            }
            log('sync internal images from external value', {
                from: images.map(i => ({ url: i?.url, th: i?.thumbnail, auto: i?.auto })),
                to: fixedValue.map(i => ({ url: i?.url, th: i?.thumbnail, auto: i?.auto }))
            });
            setImages(fixedValue);
        }
    }, [fixedValue, images]);

    const callOnValueChange = useCallback((newImages: ImageDetail[]) => {
        // 最终值回写：解除临时态并同步到外部
        tempImagesRef.current = false;
        // 记录“最终提交”的 url（仅单图考虑）
        if (maxCount <= 1 && newImages?.[0]?.url) {
            lastCommittedUrlRef.current = newImages[0].url;
        }
        log('callOnValueChange', newImages.map(i => ({ url: i?.url, th: i?.thumbnail, auto: i?.auto })));
        setImages(newImages);
        onValueChange?.(newImages);
    }, [onValueChange]);

    const handleImagesSet = useCallback((newImages: ImageDetail[]) => {
        // 来自上传流程的中间态（例如 GET thumbnail），允许覆盖内部显示
        tempImagesRef.current = true;
        log('onSetImages(temp)', newImages.map(i => ({ url: i?.url, th: i?.thumbnail, auto: i?.auto, up: i?.isUploading })));
        setImages(newImages);
    }, []);

    // 使用 useMemo 优化 InnerRenderer 组件，避免每次渲染都重新创建
    const InnerRenderer = useMemo(() => {
        const Component: React.FC = () => {
            const { uploadState } = useImageUpload();
            const innerRenderCountRef = useRef(0);

            useEffect(() => {
                innerRenderCountRef.current++;
            });

            // 与子组件保持一致：当单图且 auto 时会隐藏 ActionButtons
            const autoMode = images.length > 0 && !!images[0].auto;
            const singleOrMask = maxCount <= 1; // 单图/蒙版组件路径
            const shouldShowGlobalError = autoMode && singleOrMask && !!uploadState.uploadError;

            return (
                <>
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
                    {shouldShowGlobalError && (
                        <div style={{ marginTop: 8 }}>
                            <Alert
                                message={uploadState.uploadError}
                                type="error"
                                showIcon
                                closable
                            />
                        </div>
                    )}
                </>
            );
        };
        return Component;
    }, [images, maxCount, uiWeightCSS, enableRemove, isMask]);

    // 路由到对应的子组件，并用 UploadProvider 包裹
    return (
        <UploadProvider
            onCallOnValueChange={callOnValueChange}
            onSetImages={handleImagesSet}
            maxCount={maxCount}
        >
            <InnerRenderer />
        </UploadProvider>
    );
}

// Wrap with React.memo to prevent unnecessary re-renders
const MemoizedImageSelectComponent = React.memo(ImageSelectComponent, (prevProps, nextProps) => {
    // Only check props that truly matter for rendering - ignore function references
    const propsToCompare = ['maxCount', 'uiWeight', 'isMask'] as const;

    // Check simple props
    for (const prop of propsToCompare) {
        if (prevProps[prop] !== nextProps[prop]) {
            return false;
        }
    }

    // Check value array - this is the most important comparison
    if (prevProps.value?.length !== nextProps.value?.length) {
        return false;
    }

    if (prevProps.value?.some((item, index) => {
        const nextItem = nextProps.value?.[index];
        return !nextItem ||
               (typeof item === 'string' ? item !== nextItem : item.url !== nextItem.url);
    })) {
        return false;
    }

    // Check extraOptions content, not reference
    const prevOptions = prevProps.extraOptions || {};
    const nextOptions = nextProps.extraOptions || {};
    if (prevOptions.enableRemove !== nextOptions.enableRemove) {
        return false;
    }

    // Skip onValueChange comparison - function references will always change
    // Our internal optimizations (useMemo, useCallback) will handle performance

    return true;
});

export const ImageSelect: React.FC<ImageSelectProps> = MemoizedImageSelectComponent;


export default ImageSelect;
