import React, { useState, useEffect } from 'react';
import { Tooltip, Popover } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useStore } from 'zustand';
import { sdpppSDK } from '@sdppp/common';
import { useTranslation } from '@sdppp/common';
import './WorkBoundary.less';

interface WorkBoundaryProps {
  className?: string;
}

export const WorkBoundary: React.FC<WorkBoundaryProps> = ({ className }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const canvasStateID = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.canvasStateID);
  const activeDocumentID = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.activeDocumentID);
  const workBoundaries = useStore(sdpppSDK.stores.WebviewStore, (state) => state.workBoundaries);

  // Get boundary name display text
  const getBoundaryName = (): string => {
    const boundary = workBoundaries[activeDocumentID];
    if (!boundary || (boundary.width >= 999999 && boundary.height >= 999999)) {
      return t('boundary.current_canvas', { defaultMessage: 'Entire Canvas' });
    }
    // Display as (leftDistance, topDistance, rightDistance, bottomDistance)
    return `(${boundary.leftDistance}, ${boundary.topDistance}, ${boundary.width}, ${boundary.height})`;
  };

  // Cleanup guides on component unmount
  useEffect(() => {
    return () => {
      // Clear guides when component unmounts
      sdpppSDK.plugins.photoshop.manageGuides({ action: "clear" }).catch(console.error);
    };
  }, []);

  const handleClick = async () => {
    try {
      // 0. 清理之前的guide
      await sdpppSDK.plugins.photoshop.manageGuides({ action: "clear" });

      // 1. 调用新的 showImageSelectionDialog 弹窗获取用户选择
      const { boundary } = await sdpppSDK.plugins.photoshop.showImageSelectionDialog({
        dialogType: 'boundary'
      });

      // 2. 更新当前边界类型
      const activeDocId = activeDocumentID;
      const currentBoundaries = sdpppSDK.stores.WebviewStore.getState().workBoundaries;
      // 3. 如果选择的是 curlayer 或 selection，获取具体的矩形
      if (boundary === 'curlayer' || boundary === 'selection') {
        const boundaryResult = await sdpppSDK.plugins.photoshop.getBoundary({ type: boundary });

        // 4. 直接存储 BoundaryRect 数据（不需要转换）
        sdpppSDK.stores.WebviewStore.setState({
          workBoundaries: {
            ...currentBoundaries,
            [activeDocId]: boundaryResult.boundary
          }
        });

        // 5. 设置缩略图URL
        if (boundaryResult.thumbnail) {
          setThumbnailUrl(boundaryResult.thumbnail);
        }
      } else {
        sdpppSDK.stores.WebviewStore.setState({
          workBoundaries: {
            ...currentBoundaries,
            [activeDocId]: {
              leftDistance: 0,
              topDistance: 0,
              rightDistance: 999999,
              bottomDistance: 999999,
              width: 999999,
              height: 999999
            }
          }
        });
        // 清除缩略图
        setThumbnailUrl(null);
      }
    } catch (error) {
      console.error('Failed to update boundary:', error);
    }
  };

  // Handle mouse enter - show guides and hover state
  const handleMouseEnter = async () => {
    setIsHovered(true);

    try {
      const boundary = workBoundaries[activeDocumentID];
      if (boundary) {
        // BoundaryRect format is already correct for guides
        await sdpppSDK.plugins.photoshop.manageGuides({
          action: "create",
          rect: boundary
        });
      }
    } catch (error) {
      console.error('Failed to create guides:', error);
    }
  };

  // Handle mouse leave - clear guides and hover state
  const handleMouseLeave = async () => {
    setIsHovered(false);

    try {
      await sdpppSDK.plugins.photoshop.manageGuides({
        action: "clear"
      });
    } catch (error) {
      console.error('Failed to clear guides:', error);
    }
  };


  return (
    <Tooltip title={t('boundary.tooltip', { defaultMessage: 'AI Boundary' })}>
      <div
        className={`work-boundary ${className || ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="work-boundary-label">
          AI Boundary
        </div>
        <div className="work-boundary-right">
          {isHovered && (
            <div className="work-boundary-edit-icon">
              <EditOutlined />
            </div>
          )} 
          {thumbnailUrl ? (
            <Popover
              content={
                <div className="work-boundary-large-preview">
                  <img src={thumbnailUrl} alt="Large boundary preview" />
                </div>
              }
              trigger="hover"
              placement="top"
              zIndex={9999}
              overlayStyle={{ zIndex: 9999 }}
              getPopupContainer={() => document.body}
            >
              <div className="work-boundary-thumbnail">
                <img src={thumbnailUrl} alt="Boundary thumbnail" />
              </div>
            </Popover>
          ) : (
            <div className="work-boundary-name">
              {getBoundaryName()}
            </div>
          )}

        </div>
      </div>
    </Tooltip>
  );
};