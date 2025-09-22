import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button, Tooltip, Divider, Progress, Space, Typography, Alert } from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  PlayCircleFilled,
  ForwardOutlined,
  StopOutlined,
  ThunderboltFilled
} from '@ant-design/icons';
import { sdpppSDK } from '@sdppp/common';
import { useStore } from 'zustand';
import { WidgetableRenderer as WorkflowEdit } from '@sdppp/widgetable-ui';
import { useWidgetable } from '@sdppp/widgetable-ui';
import './workflow-detail.less';
import { MainStore } from '../../../../tsx/App.store';
import { comfyWorkflowStore } from '../comfy_frontend';
import { debug } from 'debug';
import { useTranslation } from '@sdppp/common';
import { ComfyTask } from '../../ComfyTask';
import { WorkBoundary } from '../../../base/components';

const log = debug('comfy-frontend:workflow-detail')
const { Text } = Typography; 

const WorkflowStatus: React.FC<{ currentWorkflow: string, uploading: boolean }> = ({ currentWorkflow, uploading }) => {
  const { t } = useTranslation()
  const comfyStore = useStore(sdpppSDK.stores.ComfyStore)
  const { lastError, progress, executingNodeTitle, queueSize } = comfyStore;
  const autoRunning = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyAutoRunning)

  if (uploading) {
    return <Alert type="info" message={t('comfy.uploading')} showIcon className="workflow-run-status" />;
  }
  if (lastError) {
    return <Alert type="error" message={lastError} showIcon className="workflow-run-status" />;
  }
  if (executingNodeTitle) {
    return (
      <div className="workflow-run-status">
        <Text ellipsis={{ tooltip: true }}>{t('comfy.queue_progress', { queueSize, progress, executingNodeTitle })}</Text>
        <Progress percent={progress} size="small" showInfo={false} />
      </div>
    );
  }
  if (autoRunning) {
    return <Text type="secondary" className="workflow-run-status">auto run workflow after change..</Text>;
  }
  if (currentWorkflow) {
    return <Text type="secondary" className="workflow-run-status">{currentWorkflow}</Text>;
  }
  return null;
};

const SaveButton = ({ currentWorkflow }: { currentWorkflow: string }) => {
  const { t } = useTranslation()
  return (
    <Tooltip title={t('comfy.save')}>
      <Button icon={<SaveOutlined />} onClick={() => {
        sdpppSDK.plugins.ComfyCaller.saveWorkflow({
          workflow_path: currentWorkflow,
        })
      }} />
    </Tooltip>
  );
};

const RefreshButton = ({ currentWorkflow }: { currentWorkflow: string }) => {
  const { t } = useTranslation()
  return (
    <Tooltip title={t('comfy.refresh')}>
      <Button icon={<ReloadOutlined />} onClick={() =>
        sdpppSDK.plugins.ComfyCaller.openWorkflow({
          workflow_path: currentWorkflow,
          reset: true
        })
      } />
    </Tooltip>
  );
};

const StopAndCancelButton = () => {
  const { t } = useTranslation()
  const onClearAndInterrupt = useCallback(async () => {
    sdpppSDK.plugins.ComfyCaller.stopAll({});
  }, []);
  return (
    <Tooltip title={t('comfy.stop_cancel_all')}>
      <Button icon={<CloseCircleOutlined />} danger onClick={onClearAndInterrupt} />
    </Tooltip>
  );
};

const AutoRunButton = ({ currentWorkflow, setUploading }: { currentWorkflow: string, setUploading: (uploading: boolean) => void }) => {
  const { t } = useTranslation()
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const canvasStateID = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.canvasStateID)
  const { waitAllUploadPasses } = useWidgetable();

  // Listen for canvasStateID changes and trigger run
  useEffect(() => {
    if (isAutoRunning && canvasStateID) {
      const doAutoRun = async () => {
        setUploading(true);
        await waitAllUploadPasses();
        setUploading(false);

        const task = await runAndWaitResult(1, currentWorkflow);
      };
      doAutoRun();
    }
  }, [canvasStateID, isAutoRunning, currentWorkflow, waitAllUploadPasses, setUploading]);

  return (
    <Tooltip title={isAutoRunning ? t('comfy.stop_auto_run') : t('comfy.start_auto_run')}>
      <Button
        icon={<ForwardOutlined />}
        type={isAutoRunning ? 'primary' : 'default'}
        className={isAutoRunning ? 'auto-run-active' : ''}
        onClick={() => {
          setIsAutoRunning(!isAutoRunning)
        }}
      />
    </Tooltip>
  );
};

// const EditButton = () => {
//   // Mocked logic for edit
//   return (
//     <Tooltip title="ComfyUI 编辑">
//       <Button icon={<EditOutlined />} />
//     </Tooltip>
//   );
// };
async function runAndWaitResult(multi: number, currentWorkflow: string): Promise<ComfyTask> {
  // 获取当前文档ID和边界信息
  const activeDocumentID = sdpppSDK.stores.PhotoshopStore.getState().activeDocumentID;
  const boundary = sdpppSDK.stores.WebviewStore.getState().workBoundaries[activeDocumentID];

  const task = new ComfyTask({ size: multi }, currentWorkflow, activeDocumentID, boundary);

  // 返回 task 以便外部可以跟踪状态
  task.promise.catch(error => {
    console.error('ComfyUI task failed:', error);
  });

  return task;
}

const RunButton = ({ currentWorkflow, setUploading }: { currentWorkflow: string, setUploading: (uploading: boolean) => void }) => {
  const { t } = useTranslation();
  const { waitAllUploadPasses } = useWidgetable();
  const [isDisabled, setIsDisabled] = useState(false);

  const doRun = useCallback(async () => {
    setIsDisabled(true);
    setTimeout(() => setIsDisabled(false), 500);

    setUploading(true);
    await waitAllUploadPasses();
    setUploading(false);

    const task = await runAndWaitResult(1, currentWorkflow);
  }, [waitAllUploadPasses, setUploading, currentWorkflow]);

  return (
    <Tooltip title={t('comfy.run')}>
      <Button
        type="primary"
        icon={<PlayCircleFilled />}
        onClick={doRun}
        disabled={isDisabled}
      />
    </Tooltip>
  );
};

const RunMultiButtons = ({ currentWorkflow, setUploading }: { currentWorkflow: string, setUploading: (uploading: boolean) => void }) => {
  const { waitAllUploadPasses } = useWidgetable();
  const [disabledButtons, setDisabledButtons] = useState<Set<number>>(new Set());

  const doRun = useCallback(async (multi: number) => {
    setDisabledButtons(prev => new Set(prev).add(multi));
    setTimeout(() => {
      setDisabledButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(multi);
        return newSet;
      });
    }, 500);

    setUploading(true);
    await waitAllUploadPasses();
    setUploading(false);
    const task = await runAndWaitResult(multi, currentWorkflow);
    // 任务完成后清理
    task.promise.finally(() => {
      // 多任务不需要特殊状态跟踪，直接执行即可
    });
  }, [waitAllUploadPasses, currentWorkflow]);

  return (
    <>
      <Button size="small" onClick={() => doRun(2)} disabled={disabledButtons.has(2)}>x2</Button>
      <Button size="small" onClick={() => doRun(5)} disabled={disabledButtons.has(5)}>x5</Button>
      <Button size="small" onClick={() => doRun(9)} disabled={disabledButtons.has(9)}>x9</Button>
    </>
  );
};

const BackButton = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation()
  return (
    <Tooltip title={t('comfy.back')}>
      <Button icon={<ArrowLeftOutlined />} onClick={onBack} />
    </Tooltip>
  )
};

// 渲染计数器
let workflowDetailRenderCount = 0;

export function WorkflowDetail({ currentWorkflow, setCurrentWorkflow }: { currentWorkflow: string, setCurrentWorkflow: (workflow: string) => void }) {
  workflowDetailRenderCount++;
  const widgetableValues = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableValues)
  const widgetableStructure = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableStructure)
  const widgetableErrors = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableErrors)

  // console.log(`🔧 WorkflowDetail render #${workflowDetailRenderCount}`, {
  //   currentWorkflow,
  //   setCurrentWorkflowType: typeof setCurrentWorkflow,
  //   valuesJSON: JSON.stringify(widgetableValues).slice(0, 100) + '...',
  //   structureNodesCount: widgetableStructure?.nodeIndexes?.length,
  //   errorsCount: Object.keys(widgetableErrors || {}).length
  // });
  const [hasRecoverHistory, setHasRecoverHistory] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  useEffect(() => {
    if (currentWorkflow === widgetableStructure.widgetablePath.replace(/^workflows\//, '') && !hasRecoverHistory) {
      const historyValues = comfyWorkflowStore.getState().historyValues[currentWorkflow]
      if (historyValues) {
        const values = Object.entries(historyValues)
          .reduce((acc, [nodeID, values]) => {
            return acc.concat(values.map((value: any, widgetIndex: number) => ({
              nodeID,
              widgetIndex,
              value
            })))
          }, [])
        sdpppSDK.plugins.ComfyCaller.setWidgetValue({ values })
      }
      setHasRecoverHistory(true)
    } else {
      setHasRecoverHistory(false)
    }
  }, [currentWorkflow, widgetableStructure.widgetablePath])

  const [prevWidgetableValues, setPrevWidgetableValues] = useState<Record<string, any>>(widgetableValues)

  // 稳定的回调函数
  const handleWidgetChange = useCallback((nodeID: string, widgetIndex: number, value: any, fieldInfo: any) => {
    sdpppSDK.plugins.ComfyCaller.setWidgetValue({
      values: [{
        nodeID,
        widgetIndex,
        value
      }]
    })
  }, []);

  const handleTitleChange = useCallback((nodeID: string, title: string) => {
    sdpppSDK.plugins.ComfyCaller.setNodeTitle({
      title,
      node_id: nodeID
    })
  }, []);
  useEffect(() => {
    if (JSON.stringify(prevWidgetableValues) !== JSON.stringify(widgetableValues)) {
      comfyWorkflowStore.getState().setHistoryValues({
        ...comfyWorkflowStore.getState().historyValues,
        [currentWorkflow]: widgetableValues
      })
      setPrevWidgetableValues(widgetableValues)
    }
  }, [widgetableValues, currentWorkflow])

  return (
    <div className="workflow-edit-wrap">
      <div className="workflow-edit-top">
        <div className="workflow-edit-controls">
          <div className="workflow-edit-controls-grid">
          <div className="workflow-edit-controls-main">
            <div className="workflow-edit-controls-main-top">
              <div className="workflow-edit-controls-left">
                <BackButton onBack={() => setCurrentWorkflow('')} />
                <SaveButton currentWorkflow={currentWorkflow} />
                <RefreshButton currentWorkflow={currentWorkflow} />
              </div>
              <div className="workflow-edit-controls-right">
                <StopAndCancelButton />
                <AutoRunButton currentWorkflow={currentWorkflow} setUploading={setUploading} />
              </div>
            </div>
            <div className="workflow-edit-controls-main-bottom">
              <WorkflowStatus currentWorkflow={currentWorkflow} uploading={uploading} />
            </div>
          </div>
          <div className="workflow-edit-controls-center">
            <RunButton currentWorkflow={currentWorkflow} setUploading={setUploading} />
          </div>
          <div className="workflow-edit-multibuttons-vertical">
            <RunMultiButtons currentWorkflow={currentWorkflow} setUploading={setUploading} />
          </div>
          </div>
          <WorkBoundary />
        </div>
      </div>
      <WorkflowEdit
        widgetableStructure={widgetableStructure}
        widgetableValues={widgetableValues}
        widgetableErrors={widgetableErrors}
        onWidgetChange={handleWidgetChange}
        onTitleChange={handleTitleChange}
      />
    </div>
  );
};