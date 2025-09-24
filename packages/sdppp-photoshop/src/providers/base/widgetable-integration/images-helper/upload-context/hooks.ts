import { useContext, useEffect, useRef } from 'react';
import { UploadContext } from './upload-provider';
import { PhotoshopParams, PhotoshopMaskParams, useSourceInfo } from '../lib/source-render';

export const useImageUpload = () => {
    const context = useContext(UploadContext);
    if (context === undefined) {
        throw new Error('useImageUpload must be used within an UploadProvider');
    }
    return context;
};

// Convenience hook for auto upload scenarios
export const useAutoImageUpload = (
    imageSource: string,
    enabled = true,
    targetIndex?: number
) => {
    const { createImageUploadPass, removeImageUploadPass, createMaskUploadPass, removeMaskUploadPass } = useImageUpload();
    const sourceInfo = useSourceInfo(imageSource);
    const imageConfigRef = useRef<PhotoshopParams | null>(null);
    const maskConfigRef = useRef<PhotoshopMaskParams | null>(null);

    useEffect(() => {
        if (!(enabled && imageSource && (
            (sourceInfo.type === 'photoshop_image' && sourceInfo.params) ||
            (sourceInfo.type === 'photoshop_mask' && sourceInfo.maskParams)
        ))) {
            // Cleanup existing configs
            if (imageConfigRef.current) {
                removeImageUploadPass(imageConfigRef.current);
                imageConfigRef.current = null;
            }
            if (maskConfigRef.current) {
                removeMaskUploadPass(maskConfigRef.current);
                maskConfigRef.current = null;
            }
            return;
        }

        if (sourceInfo.type === 'photoshop_image' && sourceInfo.params) {
            const config = sourceInfo.params;

            // Remove previous mask config if switching types
            if (maskConfigRef.current) {
                removeMaskUploadPass(maskConfigRef.current);
                maskConfigRef.current = null;
            }

            // Remove previous image config if different
            if (imageConfigRef.current && (
                imageConfigRef.current.content !== config.content ||
                imageConfigRef.current.boundary !== config.boundary ||
                imageConfigRef.current.cropBySelection !== config.cropBySelection
            )) {
                removeImageUploadPass(imageConfigRef.current);
            }

            imageConfigRef.current = config;
            createImageUploadPass(config, targetIndex);
        }

        if (sourceInfo.type === 'photoshop_mask' && sourceInfo.maskParams) {
            const config = sourceInfo.maskParams;

            // Remove previous image config if switching types
            if (imageConfigRef.current) {
                removeImageUploadPass(imageConfigRef.current);
                imageConfigRef.current = null;
            }

            // Remove previous mask config if different
            if (maskConfigRef.current && (
                maskConfigRef.current.content !== config.content ||
                maskConfigRef.current.reverse !== config.reverse ||
                maskConfigRef.current.imageSize !== config.imageSize
            )) {
                removeMaskUploadPass(maskConfigRef.current);
            }

            maskConfigRef.current = config;
            createMaskUploadPass(config, targetIndex);
        }

        return () => {
            if (imageConfigRef.current) {
                removeImageUploadPass(imageConfigRef.current, targetIndex);
            }
            if (maskConfigRef.current) {
                removeMaskUploadPass(maskConfigRef.current, targetIndex);
            }
        };
    }, [imageSource, sourceInfo, enabled, targetIndex, createImageUploadPass, removeImageUploadPass, createMaskUploadPass, removeMaskUploadPass]);

    return { 
        uploadConfig: imageConfigRef.current || maskConfigRef.current,
        imageConfig: imageConfigRef.current,
        maskConfig: maskConfigRef.current 
    };
};
