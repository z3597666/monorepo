import { sdpppSDK } from '@sdppp/common';
import { ImageSyncGroupList, type ImageSyncGroupData } from '@sdppp/ui-library';
import React, { useMemo, useEffect, useCallback } from 'react';
import { Spin, Alert } from 'antd';
import { useTranslation } from '@sdppp/common/i18n/react';
import { ImageUIStore, useBindRealtimeThumbnails, useComponent } from '../../stores/image-ui-store';
import { RealtimeThumbnailStore } from '../../stores/realtime-thumbnail-store';
import { useButtonConfigs } from './button-configs';
import { useImageSync } from './useImageSync';
import { useImageAutoSync } from './useImageAutoSync';

export interface ImageSyncGroupListAdapterProps {
  componentId: string;
  urls: string[];
  maxCount: number; // 1 => single style
  isMask?: boolean;
  enableRemove?: boolean;
  onValueChange: (urls: string[]) => void;
}

export const ImageSyncGroupListAdapter: React.FC<ImageSyncGroupListAdapterProps> = ({
  componentId,
  urls,
  maxCount,
  isMask = false,
  onValueChange,
}) => {
  const { t } = useTranslation();
  const buttons = useButtonConfigs(isMask);
  // ensure component exists (avoid setState during render)
  useEffect(() => {
    ImageUIStore.getState().ensureComponent(componentId, { maxCount, isMask });
  }, [componentId, maxCount, isMask]);
  useBindRealtimeThumbnails(componentId);

  // determine group count; always show at least 1 group
  const groupCount = useMemo(() => {
    if (maxCount === 1) return 1;
    return Math.max(urls?.length || 0, 1);
  }, [urls, maxCount]);

  const comp = useComponent(componentId);
  const docId = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
  const thumbs = RealtimeThumbnailStore(state => state.thumbsByDoc[docId || 0]);
  const groups: ImageSyncGroupData[] = useMemo(() => {
    const arr: ImageSyncGroupData[] = [];
    for (let i = 0; i < groupCount; i++) {
      const slot = comp?.slots?.[i];
      const activeId = slot?.auto?.content || null;
      const key = activeId ? `${activeId}${slot?.auto?.alt ? '_alt' : ''}` : null;
      const rt = key ? (comp?.isMask ? (thumbs as any)?.mask?.[key] : (thumbs as any)?.image?.[key]) : '';
      const fallback = urls?.[i] || '';
      arr.push({
        buttons,
        imageUrl: rt || slot?.thumbnail || fallback,
        activeAutoSyncId: activeId,
      });
    }
    return arr;
  }, [comp, groupCount, urls, buttons, thumbs]);

  const { onSync, uploading, uploadError } = useImageSync({ componentId, urls, isMask, onValueChange });
  const { onAutoSyncChange } = useImageAutoSync({ componentId, urls, isMask, onValueChange });

  const onAdd = useCallback(() => {
    if (maxCount === 1) return; // single style
    const limit = Math.max(1, maxCount || 0);
    const curr = urls || [];
    if (curr.length >= limit) return;
    const next = [...curr, ''];
    onValueChange(next);
  }, [urls, maxCount, onValueChange]);

  const onRemove = useCallback((index: number) => {
    const curr = urls || [];
    if (curr.length <= 1 && maxCount === 1) {
      // single style: clear content but keep one slot
      const next = [...curr];
      if (!next.length) {
        onValueChange(['']);
        return;
      }
      next[index] = '';
      onValueChange(next);
      return;
    }

    // Shift ImageUIStore slot states down to keep indices aligned after removal
    try {
      const compState = ImageUIStore.getState().components[componentId];
      const slotKeys = Object.keys(compState?.slots || {})
        .map(k => parseInt(k, 10))
        .filter(n => !Number.isNaN(n))
        .sort((a, b) => a - b);
      for (const k of slotKeys) {
        if (k < index) continue;
        const src = compState?.slots?.[k + 1];
        if (src) {
          ImageUIStore.getState().setSlotAuto(componentId, k, src.auto || null);
          ImageUIStore.getState().setSlotThumbnail(componentId, k, src.thumbnail);
          ImageUIStore.getState().setSlotUploading(componentId, k, !!src.uploading, src.uploadId || null);
        } else {
          ImageUIStore.getState().clearSlot(componentId, k);
        }
      }
    } catch {}

    const next = curr.filter((_, i) => i !== index);
    onValueChange(next);
  }, [urls, maxCount, onValueChange]);

  const showAddRemove = maxCount !== 1;

  return (
    <div style={{ width: '100%' }}>
      {/* Realtime binding hooked via store setSlotAuto */}
      <ImageSyncGroupList
        groups={groups}
        onSync={onSync}
        onAutoSyncChange={onAutoSyncChange}
        onAdd={onAdd}
        onRemove={onRemove}
        showAddRemove={showAddRemove}
        buttonWidth={135}
        background={isMask ? 'white' : 'checkerboard'}
      />
      {/* Per-group uploading indicator driven by ImageUIStore slot.uploading */}
      {Array.from({ length: groupCount }).map((_, idx) => (comp?.slots?.[idx]?.uploading ? (
        <div key={`slot-upload-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Spin size="small" />
          <span style={{ color: 'var(--sdppp-host-text-color-secondary)', fontSize: 12 }}>
            {t('image.upload.uploading', { defaultValue: 'Uploading…' })}
          </span>
        </div>
      ) : null))}
      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Spin size="small" />
          <span style={{ color: 'var(--sdppp-host-text-color-secondary)', fontSize: 12 }}>
            {t('image.upload.uploading', { defaultValue: 'Uploading…' })}
          </span>
        </div>
      )}
      {uploadError && (
        <div style={{ marginTop: 8 }}>
          <Alert type="error" showIcon message={uploadError} />
        </div>
      )}
    </div>
  );
};

export default ImageSyncGroupListAdapter;
