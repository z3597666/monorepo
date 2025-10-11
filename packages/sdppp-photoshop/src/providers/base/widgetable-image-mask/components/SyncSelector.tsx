import React from 'react';
import { ImageSyncGroupList } from '@sdppp/ui-library';
import { Spin, Alert } from 'antd';
import { useTranslation } from '@sdppp/common/i18n/react';
import { useImageManager } from '../hooks/useImageManager';
import { GlobalImageStore, useComponent } from '../stores/global-image-store';
import './SyncSelector.less';

interface ImageSelectProps {
    widgetableId: string;
    uiWeight?: number;
    value: string[];
    onValueChange: (urls: string[]) => void;
    extraOptions?: Record<string, any>;
    maxCount: number;
    isMask: boolean;
}

function ImageSelectComponent({
    widgetableId,
    maxCount = 1,
    value = [],
    onValueChange,
    isMask = false
}: ImageSelectProps) {
    const { t } = useTranslation();

    // Use the new image manager hook
    const imageManager = useImageManager({
        componentId: widgetableId,
        maxCount,
        isMask,
        urls: value,
        onValueChange,
    });

    // Get component state for per-slot uploading indicators
    const comp = useComponent(widgetableId);
    const groupCount = Math.max(imageManager.groups.length, 1);

    return (
        <div style={{ width: '100%' }}>
            <ImageSyncGroupList
                groups={imageManager.groups}
                onSync={imageManager.onSync}
                onAutoSyncChange={imageManager.onAutoSync}
                onAdd={imageManager.onAdd}
                onRemove={imageManager.onRemove}
                showAddRemove={imageManager.showAddRemove}
                buttonWidth={135}
                background={isMask ? 'white' : 'checkerboard'}
            />

            {/* Per-group uploading indicator driven by GlobalImageStore slot.uploading */}
            {Array.from({ length: groupCount }).map((_, idx) =>
                comp?.slots?.[idx]?.uploading ? (
                    <div key={`slot-upload-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Spin size="small" />
                        <span style={{ color: 'var(--sdppp-host-text-color-secondary)', fontSize: 12 }}>
                            {t('image.upload.uploading', { defaultValue: 'Uploading…' })}
                        </span>
                    </div>
                ) : null
            )}

            {/* Global uploading indicator */}
            {imageManager.uploading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <Spin size="small" />
                    <span style={{ color: 'var(--sdppp-host-text-color-secondary)', fontSize: 12 }}>
                        {t('image.upload.uploading', { defaultValue: 'Uploading…' })}
                    </span>
                </div>
            )}

            {/* Upload error display */}
            {imageManager.uploadError && (
                <div style={{ marginTop: 8 }}>
                    <Alert type="error" showIcon message={imageManager.uploadError} />
                </div>
            )}
        </div>
    );
}

export const SyncSelector: React.FC<ImageSelectProps> = ImageSelectComponent;
