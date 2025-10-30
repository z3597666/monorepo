import React from 'react';
import { Spin, Alert } from 'antd';
import { useTranslation } from '@sdppp/common/i18n/react';
import { SyncButton } from '@sdppp/ui-library';
import { useImageSync } from '../hooks/useImageSync';
import { GlobalImageStore, useImageSlotState } from '../stores/global-image-store';
import './SelectionPreview.less';

interface SelectionPreviewProps {
  widgetableId: string;
  widget: any;
  value: string[];
  onValueChange: (urls: string[]) => void;
  description?: string;
  placeholder?: string;
}

export const SelectionPreview: React.FC<SelectionPreviewProps> = ({
  widgetableId,
  widget,
  value = [],
  onValueChange,
  description,
  placeholder,
}) => {
  const { t } = useTranslation();
  const isMountedRef = React.useRef(false);

  const { onSync, uploading, uploadError } = useImageSync({
    componentId: widgetableId,
    urls: value,
    isMask: false,
    onValueChange,
  });

  const slotState = useImageSlotState(widgetableId, 0);
  const previewUrl = slotState.previewUrl || value?.[0] || '';

  const resolvedDescription =
    description ??
    (widget?.options as any)?.selectionPreviewDescription ??
    '';

  const emptyPlaceholder =
    placeholder ??
    t('image.selectionPreview.placeholder', {
      defaultValue: '请在 Photoshop 中选择区域以查看预览。',
    });

  React.useEffect(() => {
    GlobalImageStore.getState().registerComponent(widgetableId, {
      maxCount: 1,
      isMask: false,
      urls: value || [],
    });
    isMountedRef.current = true;

    return () => {
      GlobalImageStore.getState().unregisterComponent(widgetableId);
      isMountedRef.current = false;
    };
  }, [widgetableId]);

  React.useEffect(() => {
    if (!isMountedRef.current) return;
    try {
      const store = GlobalImageStore.getState();
      const comp = store.components[widgetableId];
      const nextUrls = value || [];
      if (!comp || JSON.stringify(comp.urls) === JSON.stringify(nextUrls)) {
        return;
      }
      GlobalImageStore.getState().updateUrls(widgetableId, nextUrls);
    } catch {}
  }, [widgetableId, value]);

  const handleSync = React.useCallback(
    (event: { altKey: boolean; shiftKey: boolean }) => {
      void onSync(0, 'canvas', event, { boundary: 'selection', cropBySelection: 'positive' });
    },
    [onSync]
  );

  const buttonWidth = 74;

  return (
    <div className="selection-preview">
      <div className="selection-preview__main">
        <div className="selection-preview__controls">
          <div className="selection-preview__buttons">
            <SyncButton
              disabled={uploading}
              isAutoSync={false}
              autoSyncEnabled={false}
              onSync={handleSync}
              onAutoSyncToggle={() => {}}
              buttonWidth={buttonWidth}
              mainButtonType="primary"
            >
              {t('image.selectionPreview.button.selection', { defaultValue: '获取选中图像' })}
            </SyncButton>
          </div>
          {resolvedDescription ? (
            <div className="selection-preview__description">{resolvedDescription}</div>
          ) : null}
          {uploading ? (
            <div className="selection-preview__status">
              <Spin size="small" />
              <span>
                {t('image.upload.uploading', { defaultValue: 'Uploading…' })}
              </span>
            </div>
          ) : uploadError ? (
            <Alert
              type="error"
              showIcon
              message={uploadError}
              className="selection-preview__status-alert"
            />
          ) : null}
        </div>
        <div className="selection-preview__viewer">
          <div className="selection-preview__viewer-frame">
            {previewUrl ? (
              <img src={previewUrl} alt="Selection preview" />
            ) : (
              <div className="selection-preview__viewer-placeholder">{emptyPlaceholder}</div>
            )}
            {uploading && (
              <div className="selection-preview__viewer-overlay">
                <Spin />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
