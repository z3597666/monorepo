import React from 'react';
import { Button, Divider } from 'antd';
import { CloseOutlined, DeleteOutlined, StepForwardOutlined, SendOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { MainStore } from '../App.store';
import { sdpppSDK } from '../../sdk/sdppp-ps-sdk';
import { useTranslation } from '@sdppp/common';
import ImagePreview from './ImagePreview';

interface ImagePreviewWrapperProps {
  children?: React.ReactNode;
}

export default function ImagePreviewWrapper({ children }: ImagePreviewWrapperProps) {
  const { t } = useTranslation();
  const images = MainStore(state => state.previewImageList);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleSendToPS = () => {
    sdpppSDK.plugins.photoshop.requestImageSend({ 
      url: images[currentIndex].url, 
      source: images[currentIndex].source 
    });
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

  const [prevLength, setPrevLength] = React.useState(images.length);
  React.useEffect(() => {
    if (currentIndex === prevLength - 1 && images.length > prevLength) {
      handleNext();
    }
    setPrevLength(images.length);
  }, [images.length, currentIndex]);

  if (!images.length) {
    return null;
  }

  const actionButtons = {
    close: (
      <Button
        className="image-preview__close-btn"
        type="text"
        icon={<CloseOutlined />}
        onClick={handleClose}
        size="middle"
      />
    ),
    prev: images.length > 1 ? (
      <Button
        className="image-preview__nav image-preview__nav--prev"
        icon={<LeftOutlined />}
        onClick={handlePrev}
        shape="circle"
        size="middle"
      />
    ) : null,
    next: images.length > 1 ? (
      <Button
        className="image-preview__nav image-preview__nav--next"
        icon={<RightOutlined />}
        onClick={handleNext}
        shape="circle"
        size="middle"
      />
    ) : null,
    jumpToLast: currentIndex < images.length - 1 ? (
      <Button
        className="image-preview__floating-btn--jump"
        icon={<StepForwardOutlined />}
        onClick={handleJumpToLast}
        shape="circle"
        size="middle"
        title={t('image.jump_to_last')}
      />
    ) : null,
    clearAll: (
      <Button
        className="image-preview__floating-btn--clear"
        icon={<DeleteOutlined />}
        onClick={handleClearAll}
        shape="circle"
        size="middle"
        title={t('image.clear_all')}
      />
    ),
    sendToPS: (
      <Button
        className="image-preview__send-btn"
        type="primary"
        onClick={handleSendToPS}
        size="large"
      >
        <SendOutlined style={{ fontSize: '14px' }} />
      </Button>
    ),
    indicator: images.length > 1 ? (
      <div className="image-preview__indicator">
        {currentIndex + 1} / {images.length}
      </div>
    ) : null
  };

  return (
    <>
      <div className="image-preview">
        {actionButtons.close}
        
        <div className="image-preview__container">
          <ImagePreview 
            images={images}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
          />
          
          {actionButtons.prev}
          
          <div className="image-preview__right-buttons">
            {actionButtons.next}
            {actionButtons.jumpToLast}
          </div>
        </div>

        <div className="image-preview__floating-buttons">
          {actionButtons.clearAll}
        </div>

        {actionButtons.sendToPS}
        {actionButtons.indicator}
      </div>
      <Divider />
    </>
  );
}