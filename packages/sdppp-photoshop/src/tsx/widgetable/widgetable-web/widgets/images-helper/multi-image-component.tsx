import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { MultipleImagesPreview } from './lib/multiple-images-preview';
import { SingleImagePreview } from './lib/single-image-preview';
import { useWidgetable } from '../../../context';
import type { ImageDetail } from '../../../context';
import { useTranslation } from '@sdppp/common/i18n/react';


interface MultiImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    onImagesChange?: (images: ImageDetail[]) => void;
}

export const MultiImageComponent: React.FC<MultiImageProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    onImagesChange
}) => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
    const [uploadingSources, setUploadingSources] = useState<Map<number, string>>(new Map());
    const [activeUploads, setActiveUploads] = useState<number>(0);
    const [totalUploads, setTotalUploads] = useState<number>(0);
    const [nextUploadIndex, setNextUploadIndex] = useState<number>(0);
    const nextIndexRef = useRef<number>(0);
    const imagesRef = useRef(images);
    imagesRef.current = images;
    const abortControllersRef = useRef<Map<number, AbortController>>(new Map());
    // 用于跟踪每个上传索引对应的最终图片
    const uploadedImagesRef = useRef<Map<number, ImageDetail>>(new Map());
    
    // 初始化时，如果有已存在的图片，同步到 uploadedImagesRef
    useEffect(() => {
        if (images.length > 0 && uploadedImagesRef.current.size === 0) {
            images.forEach((img, index) => {
                uploadedImagesRef.current.set(index, img);
            });
        }
    }, []);
    
    const displayMax = 2;
    const useVerticalLayout = images.length < 5;

    // 当images清空时重置上传相关状态
    useEffect(() => {
        if (images.length === 0 && activeUploads === 0) {
            // 只有在没有图片且没有正在上传的文件时才清空
            setThumbnails(new Map());
            setUploadingSources(new Map());
            setNextUploadIndex(0);
            nextIndexRef.current = 0;
            setTotalUploads(0);
            uploadedImagesRef.current.clear();
        }
    }, [images.length, activeUploads]);

    const handlePreviewChange = useCallback((current: number, prev: number) => {
        setPreviewCurrent(current);
    }, []);

    const handleEllipsisClick = useCallback(() => {
        setPreviewCurrent(displayMax);
        setPreviewVisible(true);
    }, [displayMax]);

    const handleThumbnailChange = useCallback((index: number, thumbnail: string, source?: string) => {
        setThumbnails(prev => {
            const newThumbnails = new Map(prev);
            if (thumbnail) {
                newThumbnails.set(index, thumbnail);
            } else {
                newThumbnails.delete(index);
            }
            return newThumbnails;
        });
        if (source !== undefined) {
            setUploadingSources(prev => {
                const newSources = new Map(prev);
                if (source) {
                    newSources.set(index, source);
                } else {
                    newSources.delete(index);
                }
                return newSources;
            });
        }
    }, []);

    const { onImageStateChange } = useWidgetable();
    const { t } = useTranslation();
    
    // Notify widgetable context when images change for automatic upload pass management
    useEffect(() => {
        onImageStateChange(images);
    }, [images, onImageStateChange]);
    
    // 取消所有上传任务
    const cancelAllUploads = useCallback(() => {
        abortControllersRef.current.forEach((controller) => {
            controller.abort();
        });
        abortControllersRef.current.clear();
    }, []);
    
    // 在组件卸载时取消所有上传
    useEffect(() => {
        return () => {
            cancelAllUploads();
        };
    }, [cancelAllUploads]);



    const renderPreviewImages = () => {
        interface PreviewItem {
            type: 'image' | 'uploading';
            data: ImageDetail | { url: string; source: string; thumbnail: string };
            index: number;
            thumbnail: string | null;
        }
        
        const allItems: PreviewItem[] = [];
        
        // 先添加所有已上传的图片
        images.forEach((image, index) => {
            allItems.push({
                type: 'image',
                data: image,
                index: index,
                thumbnail: null
            });
        });
        
        // 再添加所有还在上传中的缩略图
        // 注意：由于我们使用 splice 插入，缩略图的原始索引已经不再准确
        // 我们需要根据当前已有图片数量来调整显示位置
        const uploadingItems: PreviewItem[] = [];
        thumbnails.forEach((thumbnail, originalIndex) => {
            if (thumbnail) {
                // 查找这个缩略图是否对应已完成的上传
                let isCompleted = false;
                // 如果这个索引的上传还没完成，就显示缩略图
                uploadingItems.push({
                    type: 'uploading',
                    data: { url: thumbnail, source: uploadingSources.get(originalIndex) || 'uploading', thumbnail },
                    index: originalIndex,
                    thumbnail: thumbnail
                });
            }
        });
        
        // 将上传中的项目添加到列表末尾
        allItems.push(...uploadingItems);

        if (allItems.length === 0) {
            return <EmptyState />;
        }

        if (useVerticalLayout) {
            return (
                <div className="vertical-images-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allItems.map((item, displayIndex) => (
                        <div key={`${item.type}-${item.index}`} className="single-image-wrapper">
                            <div className="image-preview-container">
                                <SingleImagePreview
                                    image={item.thumbnail ? {
                                        url: item.thumbnail,
                                        source: item.data.source,
                                        thumbnail: item.thumbnail,
                                        maintainUploadPass: (item.data as ImageDetail).maintainUploadPass || false, // Preserve maintainUploadPass state
                                        uploadPassId: (item.data as ImageDetail).uploadPassId
                                    } : item.data as ImageDetail}
                                    previewVisible={previewVisible && previewCurrent === displayIndex}
                                    previewCurrent={0}
                                    onPreviewVisibleChange={setPreviewVisible}
                                    onPreviewCurrentChange={() => setPreviewCurrent(displayIndex)}
                                    onPreviewChange={() => {}}
                                    onImageUpdate={(updatedImage) => {
                                        // Update the specific image in the images array
                                        const updatedImages = [...images];
                                        if (updatedImages[displayIndex]) {
                                            updatedImages[displayIndex] = {
                                                ...updatedImages[displayIndex],
                                                maintainUploadPass: updatedImage.maintainUploadPass,
                                                uploadPassId: updatedImage.uploadPassId
                                            };
                                            onImagesChange?.(updatedImages);
                                            onImageStateChange(updatedImages);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        const displayImages = images.slice(0, displayMax);
        const hasMore = images.length > displayMax;

        return (
            <MultipleImagesPreview
                images={images}
                displayImages={displayImages}
                hasMore={hasMore}
                displayMax={displayMax}
                previewVisible={previewVisible}
                previewCurrent={previewCurrent}
                onPreviewVisibleChange={setPreviewVisible}
                onPreviewCurrentChange={setPreviewCurrent}
                onPreviewChange={handlePreviewChange}
                onEllipsisClick={handleEllipsisClick}
            />
        );
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent, thumbnails, uploadingSources, useVerticalLayout]);

    return (
        <div
            className="image-select-container"
            style={{ width: '100%', ...uiWeightCSS }}
        >
            <div className="image-preview-container">
                {renderedImages}
            </div>
            <ActionButtons
                images={images}
                maxCount={maxCount}
                imagesRef={imagesRef}
                isUploading={activeUploads > 0}
                uploadProgress={activeUploads > 0 ? { completed: totalUploads - activeUploads, total: totalUploads } : undefined}
                onClearImages={() => {
                    // 先取消所有上传
                    cancelAllUploads();
                    // 清理缩略图
                    setThumbnails(new Map());
                    setUploadingSources(new Map());
                    setActiveUploads(0);
                    setTotalUploads(0);
                    setNextUploadIndex(0);
                    nextIndexRef.current = 0;
                    uploadedImagesRef.current.clear();
                }}
            />
        </div>
    );
};