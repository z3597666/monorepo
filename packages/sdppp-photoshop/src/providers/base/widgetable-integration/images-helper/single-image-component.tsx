import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ActionButtons, EmptyState } from './lib/common-components';
import { SingleImagePreview } from './lib/single-image-preview';
import { ImageDetail, useAutoImageUpload, useImageUpload } from './upload-context';


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

    // 使用 upload context 提供的方法
    const { uploadFromPhotoshop, uploadFromDisk } = useImageUpload();
    const [uploadingSource, setUploadingSource] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const customUploadFromPhotoshop = useCallback(async (isMask = false) => {
        try {
            setIsUploading(true);
            await uploadFromPhotoshop(isMask);
        } finally {
            setIsUploading(false);
        }
    }, [uploadFromPhotoshop]);

    const customUploadFromDisk = useCallback(async (file: File) => {
        try {
            setIsUploading(true);
            await uploadFromDisk(file);
        } finally {
            setIsUploading(false);
        }
    }, [uploadFromDisk]);

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