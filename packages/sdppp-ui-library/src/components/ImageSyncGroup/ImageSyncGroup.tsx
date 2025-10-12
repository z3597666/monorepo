import { Image } from 'antd';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExclusiveSyncGroup,
  type ExclusiveSyncGroupProps,
} from '../ExclusiveSyncGroup/ExclusiveSyncGroup';

export interface ImageSyncGroupProps extends ExclusiveSyncGroupProps {
  imageUrl: string;
  buttonWidth?: number | string;
  'data-testid'?: string;
  // visual enhancements
  background?: 'checkerboard' | 'white';
  // styles/classes applied to the inner preview frame (contained area)
  previewStyle?: React.CSSProperties;
  previewClassName?: string;
}

export const ImageSyncGroup: FC<ImageSyncGroupProps> = ({
  imageUrl,
  buttonWidth,
  buttons,
  'data-testid': dataTestId,
  background = 'checkerboard',
  previewStyle,
  previewClassName,
  ...exclusiveSyncGroupProps
}) => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [imageRatio, setImageRatio] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    useEffect(() => {
      // Guard for test environments without ResizeObserver (e.g., jsdom)
      if (typeof ResizeObserver === 'undefined') return;
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(entries => {
        const rect = entries[0]?.contentRect;
        if (rect) {
          setContainerSize(prev => {
            // Only update if the size has actually changed to prevent infinite loops
            if (prev.width !== rect.width || prev.height !== rect.height) {
              return { width: rect.width, height: rect.height };
            }
            return prev;
          });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const bgStyle =
      background === 'checkerboard'
        ? {
            // Solid-color checkerboard without transparency using conic gradient
            backgroundImage:
              'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0',
          }
        : { backgroundColor: '#fff' } as React.CSSProperties;

    return (
      <div
        data-testid={dataTestId}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '8px',
          width: '100%',
        }}
      >
        <div style={{ flex: '0 0 auto' }}>
          <ExclusiveSyncGroup
            buttons={buttons}
            buttonWidth={buttonWidth}
            {...exclusiveSyncGroupProps}
          />
        </div>
        <div style={{ position: 'relative', flex: '1 1 0%', minWidth: 160 }}>
          {/* Preview area hosts a contained frame matching image aspect ratio */}
          <div
            onClick={() => {
              if (imageUrl) setPreviewVisible(true);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              // use sdppp theme vars for border color and radius
              border: '1px solid var(--sdppp-widget-border-color, var(--ant-color-border, #d9d9d9))',
              borderRadius: 'var(--sdppp-widget-border-radius, 4px)',
              cursor: imageUrl ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            ref={containerRef}
          >
            {/* Inner frame sized with contain logic; background applies here */}
            {(() => {
              const ratio = imageRatio ?? 1;
              const frameWidth = Math.min(containerSize.width, containerSize.height * ratio);
              const frameHeight = frameWidth / ratio;
              const sizeFallback = frameWidth === 0 || frameHeight === 0;
              return (
                <div
                  className={previewClassName}
                  style={{
                    width: sizeFallback ? '100%' : frameWidth,
                    height: sizeFallback ? '100%' : frameHeight,
                    ...bgStyle,
                    ...previewStyle,
                  }}
                >
                  {/* Image contained within the frame */}
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      onLoad={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                          setImageRatio(img.naturalWidth / img.naturalHeight);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  ) : null}
                </div>
              );
            })()}
          </div>

          {/* Antd preview modal */}
          <Image.PreviewGroup
            preview={useMemo(
              () => ({
                visible: previewVisible,
                onVisibleChange: (v: boolean) => setPreviewVisible(v),
              }),
              [previewVisible],
            )}
            items={useMemo(() => (imageUrl ? [{ src: imageUrl }] : []), [imageUrl])}
          />
        </div>
      </div>
    );
};
