import React, { ReactNode, useMemo, useState } from "react";

import type { WidgetableNode, WidgetableStructure, WidgetableValues, WidgetableWidget } from "@sdppp/common/schemas/schemas";
import { computeUIWeightCSS } from "./utils.js";

import './index.less'
import { useWidgetableRenderer } from "./widgetable-web/main.jsx";
import { useWidgetable } from "./context.jsx";
import { Alert } from "antd";

interface WorkflowEditApiFormatProps {
    modelName: string;
    nodes: WidgetableNode[];
    values: Record<string, any>;
    errors: Record<string, string>;
    onWidgetChange: (widgetIndex: number, value: any, fieldInfo: WidgetableNode) => void;
}

export function WorkflowEditApiFormat({
    modelName,
    nodes,
    values,
    errors,

    onWidgetChange

}: WorkflowEditApiFormatProps) {
    const widgetableStructure = useMemo(() => {
        return {
            widgetableID: modelName,
            widgetablePath: modelName,
            nodes: nodes.reduce((nodes, node, index) => {
                nodes[node.id] = {
                    id: node.id,
                    title: node.title,
                    widgets: node.widgets,
                    uiWeightSum: node.uiWeightSum,
                }
                return nodes;
            }, {} as Record<string, WidgetableNode>),
            nodeIndexes: nodes.map((node) => node.id),
            options: {},
        }
    }, [nodes, modelName]);
    const widgetableValues = Object.keys(values).reduce((acc, key) => {
        acc[key] = [values[key as keyof typeof values]];
        return acc;
    }, {} as Record<string, any>);

    return <WorkflowEdit
        widgetableStructure={widgetableStructure}
        widgetableValues={widgetableValues}
        widgetableErrors={errors}
        onWidgetChange={(nodeID, widgetIndex, value, fieldInfo) => {
            onWidgetChange(widgetIndex, value, fieldInfo)
        }}
        onTitleChange={() => { }}
    />
}

interface WorkflowEditProps {
    widgetableStructure: WidgetableStructure;
    widgetableValues: WidgetableValues;
    widgetableErrors: Record<string, string>;
    selectedItem?: any;
    onWidgetChange: (nodeID: string, widgetIndex: number, value: any, fieldInfo: WidgetableNode) => void;
    onTitleChange: (nodeID: string, title: string) => void;
}

export default function WorkflowEdit({
    widgetableStructure,
    widgetableValues,
    widgetableErrors,

    onWidgetChange,
    onTitleChange
}: WorkflowEditProps) {
    useWidgetable();

    const { renderWidget, renderTitle } = useWidgetableRenderer({
        widgetableValues: widgetableValues,
        onWidgetChange,
        onTitleChange,
        extraOptions: widgetableStructure.options
    });

    const allRenderedFields = useMemo(() => {
        return widgetableStructure.nodeIndexes.map(nodeID => {
            const fieldInfo = widgetableStructure.nodes[nodeID]

            const useShortTitle = fieldInfo.widgets.length == 1 && ((fieldInfo.uiWeightSum <= 8 && (
                fieldInfo.widgets[0].outputType !== 'number'
            )))
            return (
                <div className="workflow-edit-field param-row" key={fieldInfo.id}>
                    <div className="workflow-edit-field-title param-label" title={fieldInfo.title} style={{
                        ...computeUIWeightCSS(useShortTitle ? 4 : 12),
                    }}>
                        <WidgetTitleRenderErrorBoundary title={fieldInfo.title}>
                            {renderTitle(fieldInfo.title, fieldInfo)}
                        </WidgetTitleRenderErrorBoundary>
                    </div>
                    {
                        fieldInfo.widgets.map((widget, widgetIndex) => {
                            try {
                                const renderedWidget = renderWidget(fieldInfo, widget, widgetIndex);
                                if (renderedWidget) {
                                    return <WidgetRenderErrorBoundary key={widgetIndex}>{renderedWidget}</WidgetRenderErrorBoundary>;
                                }
                                return null;
                            } catch (error: any) {
                                return <WidgetRenderErrorBoundary key={widgetIndex}>{error.stack || error.message || error.toString()}</WidgetRenderErrorBoundary>;
                            }
                        })
                    }
                    {
                        widgetableErrors[fieldInfo.id] ?
                            <span className="list-error-label">{widgetableErrors[fieldInfo.id]}</span> : ''
                    }
                </div>
            )
        }).filter(Boolean)
    }, [widgetableStructure, widgetableValues, widgetableErrors, renderWidget, renderTitle])

    const [
        nodeErrorsInWidgetTable,
        nodeErrorsNotInWidgetTable
    ] = useMemo(() => {
        return [
            Object.keys(widgetableErrors).filter((key: any) => widgetableStructure.nodes[parseInt(key)]),
            Object.keys(widgetableErrors).filter((key: any) => !widgetableStructure.nodes[parseInt(key)])
        ]
    }, [widgetableErrors, widgetableStructure]);
    let errorLabel: ReactNode | null = null;
    if (nodeErrorsNotInWidgetTable.length > 0) {
        errorLabel = <span className="list-error-label">{widgetableErrors[+nodeErrorsNotInWidgetTable[0]]}</span>
    } else if (nodeErrorsInWidgetTable.length > 0) {
        errorLabel = <span className="list-error-label">{widgetableErrors[+nodeErrorsInWidgetTable[0]]}</span>
    }

    return (
        <>
            <div className="params-section workflow-edit-content">
                {
                    errorLabel
                }
                {allRenderedFields}
            </div>
        </>
    );
}

class WidgetTitleRenderErrorBoundary extends React.Component<{
    children: React.ReactNode;
    title: string;
}, {
    hasError: boolean;
    error: Error | null;
}> {
    constructor(props: {
        children: React.ReactNode;
        title: string;
    }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ hasError: true, error });
    }

    render() {
        if (this.state.hasError) {
            return <span>{this.props.title}</span>
        }
        return this.props.children;
    }
}
class WidgetRenderErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, {
    hasError: boolean;
    error: Error | null;
}> {
    constructor(props: {
        children: React.ReactNode;
    }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ hasError: true, error });
    }

    render() {
        if (this.state.hasError) {
            return <Alert message={this.state.error?.stack || this.state.error?.message || this.state.error?.toString()} type="error" />
        }
        return this.props.children;
    }
}
