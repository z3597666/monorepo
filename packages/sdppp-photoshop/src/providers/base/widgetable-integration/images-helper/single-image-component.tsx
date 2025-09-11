import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useAutoImageUpload, useImageUpload } from './upload-context';
import { sdpppSDK } from '../../../../../sdk/sdppp-ps-sdk';
import { v4 } from 'uuid';
import { useWidgetable } from '../../../context';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from '@sdppp/common/i18n/react';

const log = sdpppSDK.logger.extend('images.tsx')

interface SingleImageProps {
    images: ImageDetail[];
    maxCount: number;
    uiWeightCSS: React.CSSProperties;
    thumbnail?: string;
    onThumbnailChange?: (thumbnail: string) => void;
}

export const SingleImageComponent: React.FC<SingleImageProps> = ({
    images,
    maxCount,
    uiWeightCSS,
    thumbnail: externalThumbnail = '',
    onThumbnailChange
}) => {
    // log(images)
    const { callOnValueChange } = useImageUpload();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const [internalThumbnail, setInternalThumbnail] = useState<string>('');
    const thumbnail = externalThumbnail || internalThumbnail;
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Auto upload logic for images with auto=true
    const hasAutoImage = images.length > 0 && images[0].auto;
    const autoImageSource = hasAutoImage ? images[0].source : '';

    // Use auto upload when image has auto=true
    useAutoImageUpload(
        autoImageSource,
        hasAutoImage
    );

    const handlePreviewChange = useCallback((current: number) => {
        setPreviewCurrent(current);
    }, []);

    const handleImageUpdate = useCallback((updatedImage: ImageDetail) => {
        const newImages = [updatedImage];
        callOnValueChange(newImages);
    }, [callOnValueChange]);

    const setThumbnailImage = useCallback((thumbnailUrl: string) => {
        if (onThumbnailChange) {
            onThumbnailChange(thumbnailUrl);
        } else {
            setInternalThumbnail(thumbnailUrl);
        }
    }, [onThumbnailChange]);

    const clearThumbnail = useCallback(() => {
        if (onThumbnailChange) {
            onThumbnailChange('');
        } else {
            setInternalThumbnail('');
        }
    }, [onThumbnailChange]);

    const { runUploadPassOnce } = useWidgetable();

    const [uploadingSource, setUploadingSource] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const { t } = useTranslation();

    const customUploadFromPhotoshop = useCallback(async (isMask = false) => {
        try {
            const { thumbnail_url, file_token, source } = isMask
                ? await sdpppSDK.plugins.photoshop.requestMaskGet({ isMask: true })
                : await sdpppSDK.plugins.photoshop.requestImageGet({});

            if (!thumbnail_url || !source) {
                return;
            }

            // 设置缩略图和上传中的source
            setThumbnailImage(thumbnail_url);
            setUploadingSource(source);
            setIsUploading(true);

            // 开始上传
            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    return { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` };
                },
                onUploaded: async (url, signal?: AbortSignal) => {
                    if (signal?.aborted) {
                        return;
                    }
                    // 上传成功，清除缩略图和上传状态并设置真实图片
                    clearThumbnail();
                    setUploadingSource('');
                    setIsUploading(false);
                    const newImage: ImageDetail = { url, source, thumbnail: thumbnail_url };
                    callOnValueChange([newImage]);
                },
                onUploadError: (error: Error) => {
                    // 上传失败，清除缩略图和上传状态
                    if (error.name !== 'AbortError') {
                        clearThumbnail();
                        setUploadingSource('');
                        setIsUploading(false);
                    }
                }
            });
        } catch (error: any) {
            clearThumbnail();
            setUploadingSource('');
            setIsUploading(false);
        }
    }, [setThumbnailImage, clearThumbnail, callOnValueChange, runUploadPassOnce, setUploadingSource]);

    const customUploadFromDisk = useCallback(async (file: File) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            return;
        }

        try {
            const thumbnailURL = URL.createObjectURL(file);
            
            // 设置缩略图和上传中的source
            setThumbnailImage(thumbnailURL);
            setUploadingSource('disk');
            setIsUploading(true);

            // 开始上传
            await runUploadPassOnce({
                getUploadFile: async (signal?: AbortSignal) => {
                    if (signal?.aborted) {
                        throw new DOMException('Upload aborted', 'AbortError');
                    }
                    const buffer = await file.arrayBuffer();
                    return { type: 'buffer', tokenOrBuffer: Buffer.from(buffer), fileName: file.name };
                },
                onUploaded: async (url, signal?: AbortSignal) => {
                    if (signal?.aborted) {
                        return;
                    }
                    // 上传成功，清除缩略图和上传状态并设置真实图片
                    clearThumbnail();
                    setUploadingSource('');
                    setIsUploading(false);
                    const newImage: ImageDetail = { url, source: 'disk', thumbnail: thumbnailURL };
                    callOnValueChange([newImage]);
                },
                onUploadError: (error: Error) => {
                    // 上传失败，清除缩略图和上传状态
                    if (error.name !== 'AbortError') {
                        clearThumbnail();
                        setUploadingSource('');
                        setIsUploading(false);
                    }
                }
            });
        } catch (error: any) {
            clearThumbnail();
            setUploadingSource('');
            setIsUploading(false);
        }
    }, [setThumbnailImage, clearThumbnail, callOnValueChange, runUploadPassOnce, setUploadingSource]);

    const renderPreviewImages = () => {
        if (images.length === 0 && !thumbnail) {
            return <EmptyState />;
        }

        // Show thumbnail when uploading, otherwise show the actual image
        const displayImage = thumbnail ? {
            url: thumbnail,
            source: uploadingSource,
            thumbnail: thumbnail
        } : images[0];

        // 确保在有缩略图或有图片时都显示预览组件
        if (displayImage) {
            return (
                <SingleImagePreview
                    image={displayImage}
                    previewVisible={previewVisible}
                    previewCurrent={previewCurrent}
                    onPreviewVisibleChange={setPreviewVisible}
                    onPreviewCurrentChange={setPreviewCurrent}
                    onPreviewChange={handlePreviewChange}
                    onImageUpdate={handleImageUpdate}
                />
            );
        }

        return <EmptyState />;
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent, thumbnail, uploadingSource]);

    const shouldHideActionButtons = images.length > 0 && images[0].auto;

    return (
        <div
            className="image-select-container"
            style={{ width: '100%', ...uiWeightCSS }}
        >
            <div className="image-preview-container">
                {renderedImages}
            </div>
            {!shouldHideActionButtons && (
                <ActionButtons
                    images={images}
                    maxCount={maxCount}
                    imagesRef={imagesRef}
                    customUploadFromPhotoshop={customUploadFromPhotoshop}
                    customUploadFromDisk={customUploadFromDisk}
                    isUploading={isUploading}
                />
            )}
        </div>
    );
};