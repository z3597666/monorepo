import React, { useCallback, useEffect, useState, createContext, useContext, ReactNode } from "react";
import { sdpppSDK } from "../../../sdk/sdppp-ps-sdk";
import { createStore } from "zustand";
import { createJSONStorage } from "zustand/middleware";
import { persist } from "zustand/middleware";

export const comfyWorkflowStore = createStore<{
    historyValues: Record<string, Record<string, any>>,
    setHistoryValues: (values: Record<string, Record<string, any>>) => void
}>()(persist((set) => ({
    historyValues: {},
    setHistoryValues: (values) => set({ historyValues: values })
}), {
    name: 'comfy-workflow-values',
    storage: createJSONStorage(() => {
        return {
            getItem: async (key) => {
                const result = await sdpppSDK.plugins.photoshop.getStorage({ key: key });
                return result.error ? null : result.value;
            },
            setItem: (key, value) => {
                sdpppSDK.plugins.photoshop.setStorage({ key: key, value: value });
            },
            removeItem: (key) => {
                sdpppSDK.plugins.photoshop.removeStorage({ key: key });
            }
        }
    }),
    partialize: (state) => ({
        historyValues: state.historyValues
    })
}));

export interface Workflow {
    path: string;
    isDir: boolean;
    isFavorite: boolean;
    isVip: boolean;
    thumbnailPath?: string;
    size?: number;
}

export interface WorkflowDataSource {
    listWorkflows(): Promise<Workflow[]>;
}

class ComfyWorkflowDataSource implements WorkflowDataSource {
    async listWorkflows(): Promise<Workflow[]> {
        const listResult = await sdpppSDK.plugins.ComfyCaller.listWorkflows({});
        return listResult.workflows.map((workflow: string) => ({
            path: workflow,
            isFavorite: false,
            isVip: false,
            isDir: false
        }));
    }
}

const defaultComfyDataSource = new ComfyWorkflowDataSource();

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
        ...showingDirs.sort((a, b) => a.localeCompare(b)).map((path) => ({ path: path, isDir: true, isFavorite: false, isVip: false })),
        ...showingFiles.map((path) => ({ path: path, isDir: false, isFavorite: false, isVip: false }))
    ].filter(
        (item, index, self) => self.findIndex((t) => t.path == item.path) === index
    );

    return {
        showingWorkflowList: showingList,
        currentViewingDirectory,
        setCurrentViewingDirectory,

        loading,
        error,
        refetch: () => {
            doFetchWorkflowList();
        },

        allWorkflowList: allWorkflowList,
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
