import React, { ReactNode, FC, useCallback } from "react";
import { WidgetableNode, WidgetableValues, WidgetableWidget } from "@sdppp/common/schemas/schemas";
import { useWidgetable } from "../context";

interface UseWidgetableRendererProps {
    widgetableValues: WidgetableValues;
    onWidgetChange: (nodeID: string, widgetIndex: number, value: any, fieldInfo: WidgetableNode) => void;
    onTitleChange: (nodeID: string, title: string) => void;
    extraOptions?: any;
}

interface RenderFunctions {
    renderWidget: (fieldInfo: WidgetableNode, widget: WidgetableWidget, widgetIndex: number) => React.ReactElement | null;
    renderTitle: (title: string, fieldInfo: WidgetableNode) => ReactNode;
}

// 渲染计数器
let useWidgetableRendererCount = 0;

export const useWidgetableRenderer = ({
    widgetableValues,
    onWidgetChange,
    onTitleChange,
    extraOptions
}: UseWidgetableRendererProps): RenderFunctions => {
    useWidgetableRendererCount++;

    const { getWidgetRenderer } = useWidgetable();

    // 检查依赖项是否变化
    const prevDeps = React.useRef<any>(null);
    const currentDeps = [widgetableValues, onWidgetChange, getWidgetRenderer, extraOptions];
    if (prevDeps.current) {
        const changes = [];
        if (prevDeps.current[0] !== widgetableValues) changes.push('widgetableValues');
        if (prevDeps.current[1] !== onWidgetChange) changes.push('onWidgetChange');
        if (prevDeps.current[2] !== getWidgetRenderer) changes.push('getWidgetRenderer');
        if (prevDeps.current[3] !== extraOptions) changes.push('extraOptions');
        if (changes.length > 0) {
            // console.log(`🔄 renderWidget useCallback deps changed:`, changes);
            // 详细分析每个变化的依赖
            // changes.forEach(change => {
            //     const index = ['widgetableValues', 'onWidgetChange', 'getWidgetRenderer', 'extraOptions'].indexOf(change);
            //     console.log(`   - ${change}:`, {
            //         prev: prevDeps.current[index],
            //         current: currentDeps[index],
            //         equal: prevDeps.current[index] === currentDeps[index]
            //     });
            // });
        }
    }
    prevDeps.current = currentDeps;

    const renderWidget = useCallback((fieldInfo: WidgetableNode, widget: WidgetableWidget, widgetIndex: number): React.ReactElement | null => {
        // console.log(`🔧 renderWidget called for ${fieldInfo.id}[${widgetIndex}] (${widget.outputType})`);
        const widgetType = widget.outputType as string;
        const renderer = getWidgetRenderer(widgetType);

        if (!renderer) {
            return null;
        }

        const value = widgetableValues[fieldInfo.id]?.[widgetIndex];
        const onValueChange = (newValue: any) => {
            onWidgetChange(fieldInfo.id, widgetIndex, newValue, fieldInfo);
        };

        return renderer({
            fieldInfo,
            widget,
            widgetIndex,
            value,
            onValueChange,
            extraOptions
        });
    }, [widgetableValues, onWidgetChange, getWidgetRenderer, extraOptions]);

    const renderTitle = useCallback((title: string, fieldInfo: WidgetableNode): ReactNode => {
        // return <EditableTitle title={title} onTitleChange={(newTitle) => {
        //     onTitleChange(fieldInfo.id, newTitle);
        // }} />;
        return <div>{title} {fieldInfo.widgets[0]?.options?.required ? <span style={{ color: 'lightcoral' }}>*</span> : null}</div>;
    }, []);

    return {
        renderWidget,
        renderTitle
    };
};

// // 保持原有的组件接口以向后兼容
// interface WidgetableRendererWebProps {
//     widgetableValue: WidgetableValues;
//     onWidgetChange: (nodeID: number, widgetIndex: number, value: any, fieldInfo: WidgetableNode) => void;
//     onTitleRender?: (title: string, fieldInfo: WidgetableNode) => ReactNode;
//     extraOptions?: any;
//     fieldInfo: WidgetableNode;
//     widget: WidgetableNode['widgets'][0];
//     widgetIndex: number;
// }