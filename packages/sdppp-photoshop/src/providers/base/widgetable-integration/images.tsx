import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './images.less';
import { useUIWeightCSS } from '@sdppp/widgetable-ui';
import { MultiImageComponent, SingleImageComponent, MaskComponent, ImageDetail, UploadProvider } from './images-helper';
import { useImageUpload } from './images-helper/upload-context';
import { sdpppSDK } from '@sdppp/common';

interface ImageSelectProps {
    uiWeight?: number;
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
    const fixedValue = useMemo(() => fixValue(value), [value]);
    const [images, setImages] = useState<ImageDetail[]>(fixedValue);
    // 临时上传展示标记：在 GET 返回 thumbnail 时阻止外部 value 覆盖
    const tempImagesRef = useRef<boolean>(false);
    // 记录最近一次“最终提交”的 url，用于抵御外部旧值覆盖
    const lastCommittedUrlRef = useRef<string>(fixedValue?.[0]?.url || '');

    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const imagesRef = useRef<ImageDetail[]>([]);
    imagesRef.current = images;

    // 初次渲染默认自动采集（方案2）：支持通过 extraOptions.defaultAuto 指定 'canvas'|'curlayer'|'selection'
    // 多图可通过 extraOptions.defaultAutoSlots 指定需要激活的槽位（如 [0,1] 或 数字 n 表示前 n 个），默认仅激活第 0 槽位。
    const initAutoDoneRef = useRef<boolean>(false);

    // Memoize extraOptions to handle object reference instability
    const stableExtraOptions = useMemo(() => extraOptions || {}, [extraOptions]);

    // Get enableRemove from extraOptions, default to false - memoize to avoid unnecessary re-renders
    const enableRemove = useMemo(() => stableExtraOptions.enableRemove === true, [stableExtraOptions.enableRemove]);

    useEffect(() => {
        if (initAutoDoneRef.current) return;
        // 若外部已提供初值，则不做默认激活，避免覆盖外部意图
        if ((imagesRef.current && imagesRef.current.length > 0)) {
            initAutoDoneRef.current = true;
            return;
        }
        const autoContent = (stableExtraOptions.defaultAuto as ('canvas' | 'curlayer' | 'selection')) || 'canvas';
        if (!autoContent) {
            initAutoDoneRef.current = true;
            return;
        }
        const psType = isMask ? 'mask' : 'image';
        const buildAutoImage = (): ImageDetail => ({
            url: '',
            thumbnail: '',
            source: JSON.stringify({ __psType: psType, content: autoContent }),
            auto: true
        });

        if (maxCount <= 1) {
            setImages([buildAutoImage()]);
            initAutoDoneRef.current = true;
            return;
        }

        // 多图：默认激活第 0 槽位；支持 extraOptions.defaultAutoSlots（数组或数字）
        const slotsOpt = stableExtraOptions.defaultAutoSlots;
        let targetIndexes: number[] = [0];
        if (Array.isArray(slotsOpt)) {
            targetIndexes = slotsOpt.filter((i) => Number.isInteger(i) && i >= 0 && i < maxCount);
        } else if (typeof slotsOpt === 'number') {
            const n = Math.min(Math.max(0, slotsOpt), maxCount);
            targetIndexes = Array.from({ length: n }, (_, i) => i);
        }
        const next = [...imagesRef.current];
        const needLen = Math.max(next.length, (targetIndexes.length ? Math.max(...targetIndexes) + 1 : 1));
        while (next.length < needLen) next.push({ url: '', source: '', thumbnail: '' } as any);
        for (const idx of targetIndexes) {
            next[idx] = buildAutoImage();
        }
        setImages(next);
        initAutoDoneRef.current = true;
    }, [stableExtraOptions.defaultAuto, stableExtraOptions.defaultAutoSlots, maxCount, isMask]);

    // Sync internal state with value prop changes - per-slot reconcile for multi-image
    useEffect(() => {
        // 当处于临时上传展示阶段（例如展示 GET 的 thumbnail）时：
        // 单图：整体阻断外部覆盖（保留现有逻辑）；多图：逐槽位合并（上传中的槽位保留内部，其余槽位接受外部）。
        if (tempImagesRef.current) {
            if (maxCount > 1) {
                const maxLen = Math.max(fixedValue.length, images.length);
                const merged: ImageDetail[] = [] as any;
                for (let i = 0; i < maxLen; i++) {
                    const internal = images[i] as any;
                    const external = fixedValue[i] as any;
                    if (internal && (internal.isUploading || internal.uploadId)) {
                        merged[i] = internal;
                    } else if (external) {
                        merged[i] = external;
                    } else if (internal) {
                        merged[i] = internal;
                    }
                }
                // 清除已无上传中的临时态
                if (!merged.some((it: any) => it && (it.isUploading))) {
                    tempImagesRef.current = false;
                }
                // 仅当有变化时再更新，避免无谓渲染
                const changed = merged.length !== images.length || merged.some((m, idx) => {
                    const cur = images[idx];
                    return !cur || m?.url !== cur?.url || m?.source !== cur?.source || m?.thumbnail !== cur?.thumbnail || (!!m?.isUploading) !== (!!cur?.isUploading);
                });
                if (changed) setImages(merged.filter(Boolean) as ImageDetail[]);
                return;
            } else {
                // 单图：若外部与内部一致则解除临时态
                const isSame = fixedValue.length === images.length &&
                    fixedValue.every((item, index) => (
                        !!images[index] &&
                        item.url === images[index].url &&
                        item.source === images[index].source &&
                        item.thumbnail === images[index].thumbnail
                    ));
                if (isSame) {
                    tempImagesRef.current = false;
                }
                return;
            }
        }

        // 非临时态：与外部 value 对齐（避免不必要更新）
        const needUpdate = (
            fixedValue.length !== images.length ||
            fixedValue.some((item, index) => {
                const currentItem = images[index];
                if (!currentItem) return true;

                // 如果当前项有auto状态，只比较url和thumbnail，忽略source差异
                if (currentItem.auto !== undefined) {
                    return item.url !== currentItem.url || item.thumbnail !== currentItem.thumbnail;
                }

                // 普通情况下比较所有字段
                return item.url !== currentItem.url ||
                       item.source !== currentItem.source ||
                       item.thumbnail !== currentItem.thumbnail;
            })
        );
        if (needUpdate) {
            // 合并外部value与当前auto状态，保留auto属性和source
            const mergedImages = fixedValue.map((externalItem, index) => {
                const currentItem = images[index];
                // 如果当前图片有auto状态，保留auto和source
                if (currentItem?.auto !== undefined) {
                    return {
                        ...externalItem,
                        auto: currentItem.auto,
                        // 保留当前的source，因为它包含了正确的激活状态信息
                        source: currentItem.source
                    };
                }
                return externalItem;
            });

            // 单图的旧值防护
            if (maxCount <= 1 && images.length === 1 && fixedValue.length === 1) {
                const currentUrl = images[0]?.url || '';
                const externalUrl = fixedValue[0]?.url || '';
                if (lastCommittedUrlRef.current && currentUrl === lastCommittedUrlRef.current && externalUrl !== lastCommittedUrlRef.current) {
                    return;
                }
            }
            setImages(mergedImages);
        }
    }, [fixedValue, images, maxCount]);

    const callOnValueChange = useCallback((newImages: ImageDetail[]) => {
        // 最终值回写：解除临时态并同步到外部
        tempImagesRef.current = false;
        // 记录"最终提交"的 url（仅单图考虑）
        if (maxCount <= 1 && newImages?.[0]?.url) {
            lastCommittedUrlRef.current = newImages[0].url;
        }
        setImages(newImages);
        onValueChange?.(newImages);
    }, [onValueChange, maxCount]);

    const handleImagesSet = useCallback((newImages: ImageDetail[]) => {
        // 来自上传流程的中间态（例如 GET thumbnail），允许覆盖内部显示
        tempImagesRef.current = true;
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
                    {/* Error indicator moved into specific image components bottom */}
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
