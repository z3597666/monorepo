import { useEffect, useState } from "react";
import WorkflowList from "./workflow-list";
import { WorkflowDetail } from "./workflow-detail";
import { useStore } from "zustand";
import { sdpppSDK } from "../../../../sdk/sdppp-ps-sdk";
import { Alert } from "antd";

export function ComfyFrontendRendererContent() {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [currentWorkflow, setCurrentWorkflow] = useState<string>('');
    const widgetablePath = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableStructure.widgetablePath.replace(/^workflows\//, ''));
    const comfyWebviewConnectStatus = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyWebviewConnectStatus);

    useEffect(() => {
        if (widgetablePath === currentWorkflow) {
            setView('detail');
        } else {
            setView('list');
        }
    }, [currentWorkflow, widgetablePath]);

    if (comfyWebviewConnectStatus === 'timedout') {
        return <Alert message="连接超时" type="error" />
    }
    if (comfyWebviewConnectStatus === 'connecting') {
        return <Alert message="连接中..." type="info" />
    }

    return (
        view === 'list' ?
            <WorkflowList currentWorkflow={currentWorkflow} setCurrentWorkflow={setCurrentWorkflow} /> :
            <WorkflowDetail currentWorkflow={currentWorkflow} setCurrentWorkflow={setCurrentWorkflow} />
    );
}