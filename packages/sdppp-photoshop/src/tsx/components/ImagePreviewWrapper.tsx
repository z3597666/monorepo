import React from 'react';
import { Button, Divider, Dropdown, Space } from 'antd';
import { CloseOutlined, DeleteOutlined, StepForwardOutlined, SendOutlined, LeftOutlined, RightOutlined, MoreOutlined, SaveOutlined } from '@ant-design/icons';
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
  const [sending, setSending] = React.useState(false);
  const [sendingAll, setSendingAll] = React.useState(false);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleSendToPS = async () => {
    setSending(true);
    try {
      const res = await sdpppSDK.plugins.photoshop.requestImageSend({
        url: images[currentIndex].url,
        source: images[currentIndex].source
      });
      if ('sendImageParams' in res && res.sendImageParams) {
        await sdpppSDK.plugins.photoshop.doSendImage({
          ...res.sendImageParams,
          url: images[currentIndex].nativePath ? 'file://' + images[currentIndex].nativePath : images[currentIndex].url
        });
      } else {
        throw new Error(res.error || 'Failed to send image to Photoshop');
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    MainStore.setState({ showingPreview: false });
  };

  const handleDeleteCurrent = () => {
    const newImages = images.filter((_, index) => index !== currentIndex);
    MainStore.setState({ previewImageList: newImages });
    if (currentIndex >= newImages.length && newImages.length > 0) {
      setCurrentIndex(newImages.length - 1);
    }
  };

  const handleClearAll = () => {
    MainStore.setState({ previewImageList: [] });
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      const res = await sdpppSDK.plugins.photoshop.requestImageSend({
        url: images[currentIndex].url,
        source: images[currentIndex].source
      });
      if ('sendImageParams' in res && res.sendImageParams) {
        const promises = [];
        for (const image of images) {
          promises.push(sdpppSDK.plugins.photoshop.doSendImage({
            ...res.sendImageParams,
            url: image.nativePath ? 'file://' + image.nativePath : image.url,
            source: image.source
          }))
        }
        await Promise.all(promises)
        
      } else {
        throw new Error(res.error || 'Failed to send image to Photoshop');
      }
    } finally {
      setSendingAll(false);
    }
  };

  const handleSaveAll = () => {
    sdpppSDK.plugins.photoshop.requestAndDoSaveImage({
      nativePaths: images.map(image => image.nativePath)
    });
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
    deleteCurrent: (
      <Button
        className="image-preview__floating-btn--delete"
        icon={<DeleteOutlined />}
        onClick={handleDeleteCurrent}
        shape="circle"
        size="middle"
        title={t('image.delete_current')}
      />
    ),
    moreActions: (
      <Dropdown
        menu={{
          items: [
            {
              key: 'sendAll',
              label: sendingAll ? t('image.sending_all') : t('image.send_all'),
              icon: <SendOutlined />,
              onClick: handleSendAll,
              disabled: sending || sendingAll
            },
            {
              key: 'saveAll',
              label: t('image.save_all'),
              icon: <SaveOutlined />,
              onClick: handleSaveAll
            },
            {
              key: 'clearAll',
              label: t('image.clear_all'),
              icon: <DeleteOutlined />,
              onClick: handleClearAll
            }
          ]
        }}
        placement="topLeft"
        trigger={['hover']}
        overlayStyle={{ minWidth: 'auto', width: 'max-content' }}
      >
        <Button
          className="image-preview__floating-btn--more"
          icon={<MoreOutlined />}
          shape="circle"
          size="middle"
          title={t('image.more_actions')}
        />
      </Dropdown>
    ),
    sendToPS: (
      <Button
        className="image-preview__send-btn"
        type="primary"
        onClick={handleSendToPS}
        size="large"
        loading={sending}
        disabled={sending || sendingAll}
      >
        {sending ? t('image.sending') : <SendOutlined style={{ fontSize: '14px' }} />}
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
          <Space>
            {actionButtons.moreActions}
            {actionButtons.deleteCurrent}
          </Space>
        </div>

        {actionButtons.sendToPS}
        {actionButtons.indicator}
      </div>
      <Divider />
    </>
  );
}