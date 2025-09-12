import React, { useEffect, useState } from 'react';
import { Image, Spin } from 'antd';
import { isVideo } from '../../utils/fileType';
import './ImagePreview.less';

interface ImagePreviewProps {
  images: Array<{ url: string; source: string; thumbnail_url: string, nativePath?: string }>;
  currentIndex: number;
  onIndexChange?: (index: number) => void;
}

export default function ImagePreview({ images, currentIndex, onIndexChange }: ImagePreviewProps) {
  const [imageLoading, setImageLoading] = useState(false);


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

      {isVideo(images[currentIndex].url) ? (
        <video
          src={images[currentIndex].url}
          className="image-preview__image"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transition: 'opacity 0.2s ease',
            cursor: 'pointer'
          }}
          onLoadedData={() => setImageLoading(false)}
          onError={() => setImageLoading(false)}
          onClick={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }}
        />
      ) : (
        <Image
          src={images[currentIndex].thumbnail_url}
          alt={`Preview ${currentIndex + 1}`}
          className="image-preview__image"
          preview={{
            src: images[currentIndex].url,
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
      )}
    </div>
  );
}