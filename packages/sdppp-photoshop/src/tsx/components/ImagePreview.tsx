import React, { useEffect, useState } from 'react';
import { Image, Spin } from 'antd';
import './ImagePreview.less';

interface ImagePreviewProps {
  images: Array<{ url: string; source: string; thumbnail_url: string, nativePath?: string }>;
  currentIndex: number;
  onIndexChange?: (index: number) => void;
}

export default function ImagePreview({ images, currentIndex, onIndexChange }: ImagePreviewProps) {
  const [imageLoading, setImageLoading] = useState(false);

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  useEffect(() => {
    setImageLoading(true);
  }, [currentIndex]);

  if (!images.length) {
    return null;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {imageLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(128, 128, 128, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <Spin size="large" />
        </div>
      )}

      <Image
        src={images[currentIndex].thumbnail_url}
        alt={`Preview ${currentIndex + 1}`}
        className="image-preview__image"
        preview={{
          src: images[currentIndex].nativePath ? 'file://' + images[currentIndex].nativePath : images[currentIndex].url,
          render: (originalNode, info) => {
            const previewUrl = info.src || '';
            if (isVideo(previewUrl)) {
              return (
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              );
            }
            return originalNode;
          }
        }}
        width={'100%'}
        height={'100%'}
        style={{
          objectFit: 'contain',
          transition: 'opacity 0.2s ease'
        }}
        onLoad={() => setImageLoading(false)}
        onError={() => setImageLoading(false)}
      />
    </div>
  );
}