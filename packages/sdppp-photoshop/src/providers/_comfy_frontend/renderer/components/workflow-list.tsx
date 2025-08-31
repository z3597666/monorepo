import React, { useEffect, useState } from "react";
import { List, Alert, Divider, Typography, Button, Flex } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  SpecialWorkflowItem,
  DirectoryItem,
  WorkflowItem
} from "./workflow-item";
import { useWorkflowListContext, Workflow } from "../comfy_frontend";
import { useTranslation } from '@sdppp/common';

interface WorkflowListProps {
  setCurrentWorkflow: (workflow: string) => void;
  currentWorkflow: string;
  hidden: boolean;
}

const WorkflowList: React.FC<WorkflowListProps> = ({
  setCurrentWorkflow, currentWorkflow, hidden
}) => {
  const { t } = useTranslation()
  const {
    showingWorkflowList,
    currentViewingDirectory,
    setCurrentViewingDirectory,

    loading,
    error: workflowsError,
    refetch

  } = useWorkflowListContext();
  const [openWorkflowError, setOpenWorkflowError] = useState<string | null>(null);
  useEffect(() => {
    refetch();
  }, []);
 
  // Show error if workflows failed to load
  if (workflowsError) {
    return (
      <div className="workflow-list">
        <Alert
          message="Error"
          description={workflowsError}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="workflow-list" style={{ display: hidden ? 'none' : 'block' }}>
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
      {openWorkflowError && (
        <Alert
          message="Error"
          description={openWorkflowError}
          type="error"
          showIcon
        />
      )}

      <List className="workflow-list__main">
        {/* Directory navigation item */}
        {currentViewingDirectory && (
          <DirectoryItem
            key={currentViewingDirectory}
            path="../"
            dirname={currentViewingDirectory.slice(0, -1)}
            onDirectorySet={(dirname: string) => {
              setCurrentViewingDirectory(dirname);
            }}
          />
        )}

        {/* Workflow and directory items */}
        {showingWorkflowList.map((workflow: Workflow) => {
          const path = workflow.path;

          if (workflow.isDir) {
            return (
              <DirectoryItem
                key={path}
                path={path}
                dirname={currentViewingDirectory.slice(0, -1)}
                onDirectorySet={(dirname: string) => {
                  setCurrentViewingDirectory(dirname);
                }}
              />
            );
          }

          return (
            <WorkflowItem
              currentWorkflow={currentWorkflow}
              setCurrentWorkflow={setCurrentWorkflow}
              key={path}
              isChecked={false}
              workflow={workflow}
              onRun={async (path: string) => {
                // await runWorkflow(path);
              }}
              setOpenWorkflowError={setOpenWorkflowError}
            />
          );
        })}
      </List>
    </div>
  );
};

export default WorkflowList;
