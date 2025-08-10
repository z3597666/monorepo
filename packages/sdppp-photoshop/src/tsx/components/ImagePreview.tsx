import React, { useEffect, useState } from 'react';
import { Image, Button, Divider } from 'antd';
import { LeftOutlined, RightOutlined, CloseOutlined, DeleteOutlined, DownOutlined, StepForwardOutlined, SendOutlined } from '@ant-design/icons';
import './ImagePreview.less';
import { MainStore } from '../App.store';
import { sdpppSDK } from '../../sdk/sdppp-ps-sdk';

export default function ImagePreview() {
  const images = MainStore(state => state.previewImageList)
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleSendToPS = () => {
    sdpppSDK.plugins.photoshop.requestImageSend({ url: images[currentIndex].url, source: images[currentIndex].source });
  };

  const handleClose = () => {
    MainStore.setState({ showingPreview: false });
  };

  const handleClearAll = () => {
    MainStore.setState({ previewImageList: [] });
  };

  const handleJumpToLast = () => {
    if (images.length > 0) {
      setCurrentIndex(images.length - 1);
    }
  };

  const [prevLength, setPrevLength] = useState(images.length);
  useEffect(() => {
    if (currentIndex === prevLength - 1 && images.length > prevLength) {
      handleNext();
    }
    setPrevLength(images.length);
  }, [images.length, currentIndex]);

  if (!images.length) {
    return null;
  }

  return (
    <>

      <div className="image-preview">
        <Button
          className="image-preview__close-btn"
          type="text"
          icon={<CloseOutlined />}
          onClick={handleClose}
          size="middle"
        />

        <div className="image-preview__container">


          <Image
            src={images[currentIndex].url}
            alt={`Preview ${currentIndex + 1}`}
            className="image-preview__image"
            preview={true}
            width={'100%'}
            height={'100%'}
            style={{
              objectFit: 'contain',
            }}
          />

          {images.length > 1 && (
            <>
              <Button
                className="image-preview__nav image-preview__nav--prev"
                icon={<LeftOutlined />}
                onClick={handlePrev}
                shape="circle"
                size="middle"
              />
            </>
          )}

          {/* 右侧中间按钮组 */}
          <div className="image-preview__right-buttons">
            {images.length > 1 && (
              <Button
                className="image-preview__nav image-preview__nav--next"
                icon={<RightOutlined />}
                onClick={handleNext}
                shape="circle"
                size="middle"
              />
            )}
            {currentIndex < images.length - 1 && (
              <Button
                className="image-preview__floating-btn--jump"
                icon={<StepForwardOutlined />}
                onClick={handleJumpToLast}
                shape="circle"
                size="middle"
                title="跳转到最后一个"
              />
            )}
          </div>
        </div>

        <div className="image-preview__floating-buttons">
          <Button
            className="image-preview__floating-btn--clear"
            icon={<DeleteOutlined />}
            onClick={handleClearAll}
            shape="circle"
            size="middle"
            title="清空所有图片"
          />
        </div>

        <Button
          className="image-preview__send-btn"
          type="primary"
          onClick={handleSendToPS}
          size="large"
        >
          <SendOutlined style={{ fontSize: '14px' }} />
          {/* <PhotoshopIcon /> */}
        </Button>

        {images.length > 1 && (
          <div className="image-preview__indicator">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
      <Divider />
    </>
  );
}

function PhotoshopIcon() {
  return (
    <svg style={{ width: '12px', height: '12px' }} xmlns="http://www.w3.org/2000/svg" viewBox="19 19 38 38" version="1.1" baseProfile="full">
      <path fill="currentColor" fill-opacity="1" stroke-width="0.2" stroke-linejoin="round" d="M 21.8953,23.1174C 23.8181,22.7673 26.4837,22.5055 30.1099,22.5055C 34.0428,22.5055 36.9266,23.3355 38.8059,24.9084C 40.5537,26.3507 41.6901,28.6663 41.6901,31.4192C 41.6901,34.2158 40.8164,36.5318 39.1559,38.1051C 37.0148,40.2461 33.6501,41.2512 29.8485,41.2512C 28.8434,41.2512 27.9256,41.2076 27.2262,41.0762L 27.2262,52.1755L 21.8953,52.1755L 21.8953,23.1174 Z M 27.2262,36.8382C 27.882,37.0132 28.7561,37.0564 29.8485,37.0564C 33.8683,37.0564 36.3152,35.0904 36.3152,31.6379C 36.3152,28.3609 34.0428,26.6126 30.3285,26.6126C 28.8434,26.6126 27.7947,26.744 27.2262,26.8753L 27.2262,36.8382 Z M 42.8675,37.1001C 42.8675,33.3421 45.9704,30.4142 50.9084,30.4142C 53.2676,30.4142 55.3219,31.0261 56.5447,31.6816L 55.4964,35.4831C 54.5786,34.9585 52.874,34.2599 50.9957,34.2599C 49.0733,34.2599 48.0242,35.1777 48.0242,36.4877C 48.0242,37.8433 49.0292,38.4983 51.7385,39.4597C 55.5837,40.858 57.3747,42.8245 57.4193,45.9701C 57.4193,49.8154 54.4041,52.6564 48.7665,52.6564C 46.1886,52.6564 43.8725,52.0005 42.3002,51.1268L 43.3484,47.2379C 44.5721,47.9811 46.8882,48.7667 48.811,48.7667C 51.1707,48.7667 52.2185,47.8057 52.2185,46.4079C 52.2185,44.9655 51.3451,44.2223 48.7237,43.3045C 44.5721,41.863 42.8243,39.5902 42.8675,37.1001 Z " />
    </svg>
  )
}