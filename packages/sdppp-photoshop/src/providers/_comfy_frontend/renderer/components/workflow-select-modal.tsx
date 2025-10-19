import React, { useCallback } from 'react';
import { Modal } from 'antd';
import { WorkflowList } from './workflow-list';

export interface WorkflowSelectModalProps {
    open: boolean;
    currentWorkflow: string;
    onSelect: (workflowPath: string) => void | Promise<void>;
    onCancel: () => void;
    title?: React.ReactNode;
}

export const WorkflowSelectModal: React.FC<WorkflowSelectModalProps> = ({
    open,
    currentWorkflow,
    onSelect,
    onCancel,
    title
}) => {
    const handleSelect = useCallback(async (workflowPath: string) => {
        await onSelect(workflowPath);
    }, [onSelect]);

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            footer={null}
            title={title}
            destroyOnClose
            width={480}
        >
            <WorkflowList
                currentWorkflow={currentWorkflow}
                onWorkflowChange={handleSelect}
                style={{ maxHeight: 360, overflow: 'auto' }}
            />
        </Modal>
    );
};
