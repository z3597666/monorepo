import React from 'react';
import { Button, Upload, Row, Col, Tooltip, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useTranslation } from '@sdppp/common/i18n/react';
import { sdpppSDK } from '../../../sdk/sdppp-ps-sdk';
import type { RenderActionButtonsFunction, RenderActionButtonsParams } from '../../../tsx/widgetable/context';

export const photoshopRenderActionButtons: RenderActionButtonsFunction = ({
    name,
    widget,
    value,
    onValueChange,
    isUploading,
    onUploadStart,
    onUploadComplete,
    onUploadError,
    abortController
}: RenderActionButtonsParams) => {
    const { t } = useTranslation();

    if (widget.widgetType !== 'images' || !Array.isArray(value)) {
        return null;
    }

    const handleAddPsImage = async (content: 'canvas' | 'curlayer' | 'selection', boundary: 'canvas' | 'curlayer' | 'selection') => {
        try {
            onUploadStart?.();
            
            const source = JSON.stringify({ content, boundary });
            const result = await sdpppSDK.plugins.photoshop.doGetImage({
                content,
                boundary,
                imageSize: 1024,
                imageQuality: 1,
                cropBySelection: 'no'
            });
            
            const newItem = {
                url: result.url,
                source: source,
                thumbnail: result.thumbnail
            };
            
            const newValue = [...value, newItem];
            onValueChange(newValue);
            onUploadComplete?.();
        } catch (error) {
            console.error('添加PS图像失败:', error);
            onUploadError?.(error instanceof Error ? error : new Error('添加PS图像失败'));
        }
    };

    const handleAddPsMask = async (content: 'canvas' | 'curlayer' | 'selection', reverse: boolean = false) => {
        try {
            onUploadStart?.();
            
            const source = JSON.stringify({ content, reverse });
            const result = await sdpppSDK.plugins.photoshop.doGetMask({
                content,
                reverse,
                imageSize: 1024
            });
            
            const newItem = {
                url: result.url,
                source: source,
                thumbnail: result.thumbnail
            };
            
            const newValue = [...value, newItem];
            onValueChange(newValue);
            onUploadComplete?.();
        } catch (error) {
            console.error('添加PS蒙版失败:', error);
            onUploadError?.(error instanceof Error ? error : new Error('添加PS蒙版失败'));
        }
    };

    const handleDeleteImage = (index: number) => {
        const newValue = value.filter((_: any, i: number) => i !== index);
        onValueChange(newValue);
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        showUploadList: false,
        beforeUpload: () => false,
        onChange: async (info) => {
            if (info.fileList.length === 0) return;
            
            try {
                onUploadStart?.();
                
                for (const file of info.fileList) {
                    if (file.originFileObj) {
                        const buffer = await file.originFileObj.arrayBuffer();
                        const result = await sdpppSDK.plugins.photoshop.uploadImage({
                            type: 'buffer',
                            tokenOrBuffer: buffer
                        });
                        
                        const newItem = {
                            url: result.url,
                            source: 'disk',
                            thumbnail: result.thumbnail
                        };
                        
                        const currentValue = Array.isArray(value) ? value : [];
                        const newValue = [...currentValue, newItem];
                        onValueChange(newValue);
                    }
                }
                
                onUploadComplete?.();
            } catch (error) {
                console.error('上传文件失败:', error);
                onUploadError?.(error instanceof Error ? error : new Error('上传文件失败'));
            }
        }
    };

    return (
        <>
            <Row gutter={[4, 4]}>
                <Col>
                    <Tooltip title={t('ps.get_canvas_image')}>
                        <Button
                            size="small"
                            onClick={() => handleAddPsImage('canvas', 'canvas')}
                            disabled={isUploading}
                        >
                            {t('ps.canvas')}
                        </Button>
                    </Tooltip>
                </Col>
                <Col>
                    <Tooltip title={t('ps.get_layer_image')}>
                        <Button
                            size="small"
                            onClick={() => handleAddPsImage('curlayer', 'curlayer')}
                            disabled={isUploading}
                        >
                            {t('ps.layer')}
                        </Button>
                    </Tooltip>
                </Col>
                <Col>
                    <Tooltip title={t('ps.get_selection_image')}>
                        <Button
                            size="small"
                            onClick={() => handleAddPsImage('selection', 'selection')}
                            disabled={isUploading}
                        >
                            {t('ps.selection')}
                        </Button>
                    </Tooltip>
                </Col>
                <Col>
                    <Tooltip title={t('ps.get_layer_mask')}>
                        <Button
                            size="small"
                            onClick={() => handleAddPsMask('curlayer')}
                            disabled={isUploading}
                        >
                            {t('ps.mask')}
                        </Button>
                    </Tooltip>
                </Col>
                <Col>
                    <Upload {...uploadProps}>
                        <Tooltip title={t('upload.from_disk')}>
                            <Button
                                size="small"
                                icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />}
                                disabled={isUploading}
                            >
                                {t('upload.disk')}
                            </Button>
                        </Tooltip>
                    </Upload>
                </Col>
            </Row>
            {Array.isArray(value) && value.length > 0 && (
                <Row gutter={[4, 4]} style={{ marginTop: 8 }}>
                    {value.map((item: any, index: number) => (
                        <Col key={index}>
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteImage(index)}
                                disabled={isUploading}
                            >
                                {index + 1}
                            </Button>
                        </Col>
                    ))}
                </Row>
            )}
            {isUploading && (
                <Alert
                    message={
                        <Spin indicator={<LoadingOutlined spin />} size="small">
                            {t('upload.uploading')}
                        </Spin>
                    }
                    type="info"
                    showIcon={false}
                    style={{ marginTop: 8 }}
                />
            )}
        </>
    );
};