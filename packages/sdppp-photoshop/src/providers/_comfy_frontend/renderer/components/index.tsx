import { Component, useEffect, useState } from "react";
import WorkflowList from "./workflow-list";
import { WorkflowDetail } from "./workflow-detail";
import { useStore } from "zustand";
import { sdpppSDK } from "../../../../sdk/sdppp-ps-sdk";
import { Alert } from "antd";
import ErrorBoundary from "antd/es/alert/ErrorBoundary";

export function ComfyFrontendRendererContent() {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [currentWorkflow, setCurrentWorkflow] = useState<string>('');
    const widgetablePath = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableStructure.widgetablePath.replace(/^workflows\//, ''));

    useEffect(() => {
        if (widgetablePath === currentWorkflow && currentWorkflow) {
            setView('detail');
        } else {
            setView('list');
        }
    }, [currentWorkflow, widgetablePath]);

    return (
        <SDPPPErrorBoundary>
            <WorkflowList hidden={view === 'detail'} currentWorkflow={currentWorkflow} setCurrentWorkflow={setCurrentWorkflow} />
            {view === "detail" && <WorkflowDetail currentWorkflow={currentWorkflow} setCurrentWorkflow={setCurrentWorkflow} />}
        </SDPPPErrorBoundary>
    );
}

class SDPPPErrorBoundary extends Component<any, any> {
    state = {
        error: undefined,
        info: { componentStack: '' }
    };
    componentDidCatch(error: Error | null, info: object): void {
        this.setState({ error, info });
    }
    render() {
        const error = this.state.error as Error | undefined;
        if (error) {
            return <Alert message={error.message} type="error" />
        }
        return this.props.children;
    }
}