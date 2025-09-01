import React, { useCallback, useEffect, useState, createContext, useContext, ReactNode } from "react";
import { defaultComfyDataSource } from "./comfy-workflow-datasource";

export interface Workflow {
    path: string;
    isDir: boolean;
    thumbnailPath?: string;
    meta: Record<string, any>; 
}

export interface WorkflowDataSource {
    listWorkflows(): Promise<Workflow[]>;
    getWorkflowJSON(workflowPath: string): Promise<any>;
}

function useWorkflowList(dataSource: WorkflowDataSource = defaultComfyDataSource) {
    const [allWorkflowList, setAllWorkflowList] = useState<Record<string, Workflow>>({});
    const [currentViewingDirectory, setCurrentViewingDirectory] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const doFetchWorkflowList = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            setCurrentViewingDirectory('');
            setAllWorkflowList({});
            
            const workflows = await dataSource.listWorkflows();
            const workflowList: Record<string, Workflow> = workflows
                .reduce((acc: Record<string, Workflow>, workflow: Workflow) => {
                    acc[workflow.path] = workflow;
                    return acc;
                }, {} as Record<string, Workflow>);

            setAllWorkflowList(workflowList);

        } catch (error: any) {
            setError(error.stack || error.message || error.toString());

        } finally {
            setLoading(false);
        }
    }, [dataSource, setAllWorkflowList, setLoading, setError]);

    const getWorkflowJSON = useCallback(async (workflowPath: string) => {
        return await dataSource.getWorkflowJSON(workflowPath);
    }, [dataSource]);

    useEffect(() => {
        doFetchWorkflowList();
    }, [doFetchWorkflowList]);

    let showingList: Workflow[] = [];

    let showingFiles: string[] = [];
    let showingDirs: string[] = [];
    Object.keys(allWorkflowList).forEach((path) => {
        if (path.startsWith(currentViewingDirectory)) {
            const relativePath = path.slice(currentViewingDirectory.length).split('://').pop();

            if (!relativePath) {
            } else if (relativePath.indexOf('/') == -1) {
                showingFiles.push(path)
            } else {
                showingDirs.push(path.slice(0, path.lastIndexOf('/') + 1))
            }
        }
    })
    showingList = [
        ...showingDirs.sort((a, b) => a.localeCompare(b)).map((path) => ({ path: path, isDir: true, meta: {} })),
        ...showingFiles.map((path) => ({ path: path, isDir: false, meta: {} }))
    ].filter(
        (item, index, self) => self.findIndex((t) => t.path == item.path) === index
    );

    return {
        // 文件夹式视图会用到
        showingWorkflowList: showingList,
        currentViewingDirectory,
        setCurrentViewingDirectory,

        loading,
        error,
        refetch: () => {
            doFetchWorkflowList();
        },

        // 全量数据
        allWorkflowList: allWorkflowList,
        
        // 获取工作流JSON内容
        getWorkflowJSON,
    };
}

interface WorkflowListContextType {
    showingWorkflowList: Workflow[];
    currentViewingDirectory: string;
    setCurrentViewingDirectory: (directory: string) => void;
    loading: boolean;
    error: string | null;
    refetch: () => void;
    allWorkflowList: Record<string, Workflow>;
    getWorkflowJSON: (workflowPath: string) => Promise<any>;
}

const WorkflowListContext = createContext<WorkflowListContextType | undefined>(undefined);

export function WorkflowListProvider({ children, dataSource }: { children: ReactNode; dataSource?: WorkflowDataSource }) {
    const workflowListValue = useWorkflowList(dataSource);
    
    return React.createElement(WorkflowListContext.Provider, { value: workflowListValue }, children);
}

export function useWorkflowListContext() {
    const context = useContext(WorkflowListContext);
    if (context === undefined) {
        throw new Error('useWorkflowListContext must be used within a WorkflowListProvider');
    }
    return context;
}