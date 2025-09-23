import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { MultipleImagesPreview } from './lib/multiple-images-preview';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useImageUpload } from './upload-context';
import { v4 } from 'uuid';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';
import { sdpppSDK } from '@sdppp/common';
import { useWidgetable } from '@sdppp/widgetable-ui';
import { getPhotoshopImage } from './upload-context/direct-upload';

interface MultiImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    enableRemove?: boolean;
}

export const MultiImageComponent: React.FC<MultiImageProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    enableRemove = false
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

    const { callOnValueChange, clearImages: contextClearImages } = useImageUpload();
    const { runUploadPassOnce, addUploadPass, removeUploadPass } = useWidgetable();
    const { t } = useTranslation();
    
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

    const customUploadFromPhotoshop = useCallback(async (isMask = false, source: 'canvas' | 'curlayer' | 'selection' = 'canvas') => {
        try {
            const { thumbnail_url, file_token, source: imageSource } = await getPhotoshopImage(isMask, source);

            if (!thumbnail_url || !imageSource) {
                console.log('Missing thumbnail_url or source, aborting upload');
                return;
            }

            if (useVerticalLayout) {
                // 多图竖直排列模式：使用ref递增索引
                const uploadIndex = images.length + nextIndexRef.current;
                nextIndexRef.current += 1;
                handleThumbnailChange(uploadIndex, thumbnail_url, imageSource);
                setActiveUploads(prev => prev + 1);
                setTotalUploads(prev => prev + 1);
                
                // 创建 AbortController 并保存
                const abortController = new AbortController();
                abortControllersRef.current.set(uploadIndex, abortController);
                
                try {
                    await runUploadPassOnce({
                        getUploadFile: async (signal?: AbortSignal) => {
                            // 合并两个 signal：组件的和系统的
                            if (signal?.aborted || abortController.signal.aborted) {
                                throw new DOMException('Upload aborted', 'AbortError');
                            }
                            return { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` };
                        },
                        onUploaded: async (url, signal?: AbortSignal) => {
                            if (signal?.aborted || abortController.signal.aborted) {
                                return;
                            }
                            // 清除缩略图和上传状态，添加真实图片
                            handleThumbnailChange(uploadIndex, '', '');
                            abortControllersRef.current.delete(uploadIndex);
                            setActiveUploads(prev => {
                                const newCount = prev - 1;
                                if (newCount === 0) {
                                    setTotalUploads(0);
                                    setNextUploadIndex(0);
                                    nextIndexRef.current = 0;
                                }
                                return newCount;
                            });
                            const newImage: ImageDetail = { url, source: imageSource, thumbnail: thumbnail_url };
                            
                            // 获取当前最大的上传索引，确定实际应该插入的位置
                            const currentImages = [...imagesRef.current];
                            const actualIndex = Math.min(uploadIndex, currentImages.length);
                            
                            // 在正确的位置插入新图片
                            currentImages.splice(actualIndex, 0, newImage);
                            
                            callOnValueChange(currentImages);
                        },
                        onUploadError: (error: Error) => {
                            abortControllersRef.current.delete(uploadIndex);
                            if (error.name !== 'AbortError') {
                                handleThumbnailChange(uploadIndex, '', '');
                            }
                            setActiveUploads(prev => {
                                const newCount = prev - 1;
                                if (newCount === 0) {
                                    setTotalUploads(0);
                                    setNextUploadIndex(0);
                                    nextIndexRef.current = 0;
                                }
                                return newCount;
                            });
                        }
                    });
                } finally {
                    // 确保在任何情况下都清理 AbortController
                    if (abortControllersRef.current.has(uploadIndex)) {
                        abortControllersRef.current.delete(uploadIndex);
                    }
                }
            }
        } catch (error: any) {
            // 错误处理
        }
    }, [useVerticalLayout, images.length, handleThumbnailChange, runUploadPassOnce, callOnValueChange]);

    const customUploadFromDisk = useCallback(async (file: File) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            return;
        }

        try {
            const thumbnailURL = URL.createObjectURL(file);

            if (useVerticalLayout) {
                // 使用ref来获取并递增索引，避免状态更新的并发问题
                const uploadIndex = images.length + nextIndexRef.current;
                nextIndexRef.current += 1;
                
                // 立即显示缩略图
                handleThumbnailChange(uploadIndex, thumbnailURL, 'disk');
                setActiveUploads(prev => prev + 1);
                setTotalUploads(prev => prev + 1);
                
                // 创建 AbortController 并保存
                const abortController = new AbortController();
                abortControllersRef.current.set(uploadIndex, abortController);
                
                try {
                    await runUploadPassOnce({
                        getUploadFile: async (signal?: AbortSignal) => {
                            // 合并两个 signal：组件的和系统的
                            if (signal?.aborted || abortController.signal.aborted) {
                                throw new DOMException('Upload aborted', 'AbortError');
                            }
                            const buffer = await file.arrayBuffer();
                            return { type: 'buffer', tokenOrBuffer: Buffer.from(buffer), fileName: file.name };
                        },
                        onUploaded: async (url, signal?: AbortSignal) => {
                            if (signal?.aborted || abortController.signal.aborted) {
                                return;
                            }
                            // 清除缩略图和上传状态，添加真实图片
                            handleThumbnailChange(uploadIndex, '', '');
                            abortControllersRef.current.delete(uploadIndex);
                            setActiveUploads(prev => {
                                const newCount = prev - 1;
                                if (newCount === 0) {
                                    setTotalUploads(0);
                                    setNextUploadIndex(0);
                                    nextIndexRef.current = 0;
                                }
                                return newCount;
                            });
                            const newImage: ImageDetail = { url, source: 'disk', thumbnail: thumbnailURL };
                            
                            // 获取当前最大的上传索引，确定实际应该插入的位置
                            const currentImages = [...imagesRef.current];
                            const actualIndex = Math.min(uploadIndex, currentImages.length);
                            
                            // 在正确的位置插入新图片
                            currentImages.splice(actualIndex, 0, newImage);
                            
                            callOnValueChange(currentImages);
                        },
                        onUploadError: (error: Error) => {
                            abortControllersRef.current.delete(uploadIndex);
                            if (error.name !== 'AbortError') {
                                handleThumbnailChange(uploadIndex, '', '');
                            }
                            setActiveUploads(prev => {
                                const newCount = prev - 1;
                                if (newCount === 0) {
                                    setTotalUploads(0);
                                    setNextUploadIndex(0);
                                    nextIndexRef.current = 0;
                                }
                                return newCount;
                            });
                        }
                    });
                } finally {
                    // 确保在任何情况下都清理 AbortController
                    if (abortControllersRef.current.has(uploadIndex)) {
                        abortControllersRef.current.delete(uploadIndex);
                    }
                }
            } else {
            }
        } catch (error: any) {
            // 错误处理
        }
    }, [useVerticalLayout, images.length, handleThumbnailChange, runUploadPassOnce, callOnValueChange]);


    const renderPreviewImages = () => {
        const allItems = [];
        
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
        const uploadingItems = [];
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
                                        thumbnail: item.thumbnail
                                    } : item.data}
                                    previewVisible={previewVisible && previewCurrent === displayIndex}
                                    previewCurrent={0}
                                    onPreviewVisibleChange={setPreviewVisible}
                                    onPreviewCurrentChange={() => setPreviewCurrent(displayIndex)}
                                    onPreviewChange={() => {}}
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
                enableRemove={enableRemove}
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
