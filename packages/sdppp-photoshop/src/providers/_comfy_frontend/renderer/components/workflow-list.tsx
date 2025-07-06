import React from "react";
import { List, Alert, Divider, Typography } from "antd";
import {
  SpecialWorkflowItem,
  DirectoryItem,
  WorkflowItem
} from "./workflow-item";
import { useWorkflowList, Workflow } from "../comfy_frontend";
import { t } from "@sdppp/common/i18n_next";

interface WorkflowListProps {
  setCurrentWorkflow: (workflow: string) => void;
  currentWorkflow: string;
}

const WorkflowList: React.FC<WorkflowListProps> = ({
  setCurrentWorkflow, currentWorkflow
}) => {
  const {
    showingWorkflowList,
    currentViewingDirectory,
    setCurrentViewingDirectory,

    loading,
    error: workflowsError,
    refetch

  } = useWorkflowList();

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
    <div className="workflow-list">
      <Typography.Title level={5}>
        你的工作流
      </Typography.Title>

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
            />
          );
        })}
      </List>

      <Typography.Title level={5}>
        示例工作流
      </Typography.Title>

      <List className="workflow-list__special">
        {/* <SpecialWorkflowItem
        setEditorMode={setEditorMode}
        path={''}
        title={i18n('### Active Workflow ###')}
        onRun={async () => {
          // await runPage(workflowAgentSID);
        }}
      /> */}
        <SpecialWorkflowItem
          currentWorkflow={currentWorkflow}
          setCurrentWorkflow={setCurrentWorkflow}
          path={'sdppp://Sample_SDXL.json'}
          title={t('### Example SDXL ###')}
          onRun={async () => {
            // await runPage(workflowAgentSID);
          }}
        />
      </List>
    </div>
  );
};

export default WorkflowList;
