import React, { useEffect, useState } from 'react';
import { Image, Button, Divider } from 'antd';
import { LeftOutlined, RightOutlined, CloseOutlined, DeleteOutlined, DownOutlined, StepForwardOutlined } from '@ant-design/icons';
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
    sdpppSDK.plugins.imaging.requestImageSend(images[currentIndex].url, images[currentIndex].source);
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
          size="small"
        />

        <div className="image-preview__container">

          
          <Image
            src={images[currentIndex].url}
            alt={`Preview ${currentIndex + 1}`}
            className="image-preview__image"
            preview={{
              visible: false,
              mask: false,
            }}
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
                type="primary"
                icon={<LeftOutlined />}
                onClick={handlePrev}
                shape="circle"
                size="large"
              />
            </>
          )}

          {/* 右侧中间按钮组 */}
          <div className="image-preview__right-buttons">
            {images.length > 1 && (
              <Button
                className="image-preview__nav image-preview__nav--next"
                type="primary"
                icon={<RightOutlined />}
                onClick={handleNext}
                shape="circle"
                size="large"
              />
            )}
            {currentIndex < images.length - 1 && (
              <Button
                className="image-preview__floating-btn image-preview__floating-btn--jump"
                type="primary"
                icon={<StepForwardOutlined />}
                onClick={handleJumpToLast}
                shape="circle"
                size="large"
                title="跳转到最后一个"
              />
            )}
          </div>
        </div>

        <div className="image-preview__floating-buttons">
          <Button
            className="image-preview__floating-btn image-preview__floating-btn--clear"
            type="primary"
            icon={<DeleteOutlined />}
            onClick={handleClearAll}
            shape="circle"
            size="large"
            title="清空所有图片"
          />
        </div>

        <Button
          className="image-preview__send-btn"
          type="primary"
          onClick={handleSendToPS}
          size="large"
        >
          发送到PS
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