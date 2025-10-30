import React, { CSSProperties, useCallback, useEffect } from "react";
import { Tree, Alert, Typography, Button, Flex } from "antd";
import { ReloadOutlined, FileOutlined, FolderOutlined } from "@ant-design/icons";
import { useWorkflowListContext } from "../comfy_frontend";
import { useTranslation, sdpppSDK } from '@sdppp/common';
import './workflow-item.less';

const { DirectoryTree } = Tree;

const log = sdpppSDK.logger.extend('workflow-list');

export interface WorkflowListProps {
  currentWorkflow: string;
  onWorkflowChange?: (workflow: string) => void | Promise<void>;
  autoRefetch?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
  onWorkflowChange,
  autoRefetch = true,
  className,
  style
}) => {
  const { t } = useTranslation()
  const {
    treeData,
    expandedKeys,
    onExpand,
    loading,
    error: workflowsError,
    refetch
  } = useWorkflowListContext();

  useEffect(() => {
    if (autoRefetch) {
      refetch();
    }
  }, [autoRefetch, refetch]);

  // Show error if workflows failed to load
  if (workflowsError) {
    return (
      <div className={['workflow-list', className].filter(Boolean).join(' ')} style={style}>
        <Alert
          message={t('common.error')}
          description={workflowsError}
          type="error"
          showIcon
        />
      </div>
    );
  }

  const handleNodeClick = async (_event: any, node: any) => {
    if (node.isLeaf && node.workflow) {
      try {
        await onWorkflowChange?.(node.key);
      } catch (error: any) {
        log('[Error] onWorkflowChange failed:', error);
      }
    }
  };

  const renderTreeIcon = (props: any) => {
    if (props.isLeaf) {
      return <FileOutlined />;
    }
    return <FolderOutlined />;
  };

  return (
    <div className={['workflow-list', className].filter(Boolean).join(' ')} style={style}>
      <Flex align="center" gap={8} style={{ margin: '8px 0' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('comfy.your_workflows')}
        </Typography.Title>
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={refetch}
          loading={loading}
          size="small"
          title={t('comfy.refresh_workflows')}
        />
      </Flex>

      <DirectoryTree
        className="workflow-list__main"
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        onClick={handleNodeClick}
        selectable={false}
        showIcon
        icon={renderTreeIcon}
        expandAction="click"
      />
    </div>
  );
};

interface WorkflowListPanelProps {
  setCurrentWorkflow: (workflow: string) => void;
  currentWorkflow: string;
  hidden: boolean;
}

const WorkflowListPanel: React.FC<WorkflowListPanelProps> = ({
  setCurrentWorkflow,
  currentWorkflow,
  hidden
}) => {
  const handleWorkflowChange = useCallback(async (workflowPath: string) => {
    setCurrentWorkflow(workflowPath);
    try {
      await sdpppSDK.plugins.ComfyCaller.openWorkflow({
        workflow_path: workflowPath,
        reset: false
      });
    } catch (error: any) {
      log('[Error] Failed to open workflow:', error);
    }
  }, [setCurrentWorkflow]);

  return (
    <WorkflowList
      currentWorkflow={currentWorkflow}
      onWorkflowChange={handleWorkflowChange}
      style={hidden ? { display: 'none' } : undefined}
    />
  );
};

export default WorkflowListPanel;
