import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Tooltip, Divider, Progress, Space, Typography, Alert } from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  PlayCircleFilled,
  ForwardOutlined
} from '@ant-design/icons';
import { sdpppSDK } from '../../../../sdk/sdppp-ps-sdk';
import { useStore } from 'zustand';
import WorkflowEdit from '../../../../tsx/widgetable';
import { useWidgetable } from '../../../../tsx/widgetable/context';
import './workflow-detail.less';
import { MainStore } from '../../../../tsx/App.store';
import { comfyWorkflowStore } from '../comfy_frontend';
import { debug } from 'debug';

const log = debug('comfy-frontend:workflow-detail')
const { Text } = Typography;

const WorkflowStatus: React.FC<{ currentWorkflow: string }> = ({ currentWorkflow }) => {
  const comfyStore = useStore(sdpppSDK.stores.ComfyStore)
  const { lastError, progress, executingNodeTitle, queueSize } = comfyStore;
  const autoRunning = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyAutoRunning)

  if (lastError) {
    return <Alert type="error" message={lastError} showIcon className="workflow-run-status" />;
  }
  if (executingNodeTitle) {
    return (
      <div className="workflow-run-status">
        <Text ellipsis={{ tooltip: true }}>{`(队列:${queueSize}) ${progress}% ${executingNodeTitle}...`}</Text>
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
  return (
    <Tooltip title="保存">
      <Button icon={<SaveOutlined />} onClick={() => {
        sdpppSDK.plugins.ComfyCaller.saveWorkflow({
          workflow_path: currentWorkflow,
        })
      }} />
    </Tooltip>
  );
};

const RefreshButton = ({ currentWorkflow }: { currentWorkflow: string }) => {
  return (
    <Tooltip title="刷新">
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
  const onClearAndInterrupt = useCallback(async () => {
    sdpppSDK.plugins.ComfyCaller.stopAll({});
  }, []);
  return (
    <Tooltip title="停止并取消全部">
      <Button icon={<CloseCircleOutlined />} danger onClick={onClearAndInterrupt} />
    </Tooltip>
  );
};

const AutoRunButton = () => {
  const autoRunning = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyAutoRunning)
  return (
    <Tooltip title={autoRunning ? '停止自动运行' : '开启自动运行'}>
      <Button
        icon={<ForwardOutlined />}
        type={autoRunning ? 'primary' : 'default'}
        onClick={() => {
          // if (autoRunning) {
          //   sdpppSDK.plugins.photoshop.setComfyAutoRunning({ autoRunning: false })
          // } else {
          //   sdpppSDK.plugins.photoshop.setComfyAutoRunning({ autoRunning: true })
          // }
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
async function runAndWaitResult(multi: number, currentWorkflow: string) {
  const result = await sdpppSDK.plugins.ComfyCaller.run({ size: multi })
  for await (const item of result) {
    if (item.images) {
      item.images.forEach(image => {
        MainStore.getState().setPreviewImageList([...MainStore.getState().previewImageList, {
          url: image.url,
          source: currentWorkflow
        }])
      })
    }
  }
}

const RunButton = ({ currentWorkflow }: { currentWorkflow: string }) => {
  const { waitAllUploadPasses } = useWidgetable();

  const doRun = useCallback(async () => {
    log('waiting for upload passes')
    await waitAllUploadPasses();
    log('upload passes done')
    runAndWaitResult(1, currentWorkflow)
  }, [waitAllUploadPasses])
  return (
    <Tooltip title="运行">
      <Button type="primary" icon={<PlayCircleFilled />} onClick={doRun} />
    </Tooltip>
  );
};

const RunMultiButtons = ({ currentWorkflow }: { currentWorkflow: string }) => {
  const { waitAllUploadPasses } = useWidgetable();

  const doRun = useCallback(async (multi: number) => {
    await waitAllUploadPasses();
    runAndWaitResult(multi, currentWorkflow)
  }, [waitAllUploadPasses])
  return (
    <>
      <Button size="small" onClick={() => doRun(2)}>x2</Button>
      <Button size="small" onClick={() => doRun(5)}>x5</Button>
      <Button size="small" onClick={() => doRun(9)}>x9</Button>
    </>
  );
};

const BackButton = ({ onBack }: { onBack: () => void }) => (
  <Tooltip title="返回">
    <Button icon={<ArrowLeftOutlined />} onClick={onBack} />
  </Tooltip>
);

export function WorkflowDetail({ currentWorkflow, setCurrentWorkflow }: { currentWorkflow: string, setCurrentWorkflow: (workflow: string) => void }) {
  const widgetableValues = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableValues)
  const widgetableStructure = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableStructure)
  const widgetableErrors = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableErrors)
  const comfyURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyURL)
  const [hasRecoverHistory, setHasRecoverHistory] = useState<boolean>(false);
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
        <div className="workflow-edit-controls workflow-edit-controls-grid">
          <div className="workflow-edit-controls-main">
            <div className="workflow-edit-controls-main-top">
              <div className="workflow-edit-controls-left">
                <BackButton onBack={() => setCurrentWorkflow('')} />
                <SaveButton currentWorkflow={currentWorkflow} />
                <RefreshButton currentWorkflow={currentWorkflow} />
              </div>
              <div className="workflow-edit-controls-right">
                <StopAndCancelButton />
                {/* <AutoRunButton /> */}
              </div>
            </div>
            <div className="workflow-edit-controls-main-bottom">
              <WorkflowStatus currentWorkflow={currentWorkflow} />
            </div>
          </div>
          <div className="workflow-edit-controls-center">
            <RunButton currentWorkflow={currentWorkflow} />
          </div>
          <div className="workflow-edit-multibuttons-vertical">
            <RunMultiButtons currentWorkflow={currentWorkflow} />
          </div>
        </div>
      </div>
      <WorkflowEdit
        widgetableStructure={widgetableStructure}
        widgetableValues={widgetableValues}
        widgetableErrors={widgetableErrors}
        onWidgetChange={(nodeID, widgetIndex, value, fieldInfo) => {
          sdpppSDK.plugins.ComfyCaller.setWidgetValue({
            values: [{
              nodeID,
              widgetIndex,
              value
            }]
          })
        }}
        onTitleChange={(nodeID, title) => {
          sdpppSDK.plugins.ComfyCaller.setNodeTitle({
            title,
            node_id: nodeID
          })
        }}
      />
    </div>
  );
};