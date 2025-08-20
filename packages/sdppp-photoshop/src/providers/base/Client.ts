import { WidgetableNode } from "@sdppp/common/schemas/schemas";
import type { Task } from "./Task";

export abstract class Client<T> {
    protected readonly config: T

    constructor(config: T) {
        this.config = config
    }

    abstract getNodes(model: string): Promise<{
        widgetableNodes: WidgetableNode[],  
        defaultInput: Record<string, any>,
        rawData: any
    }>;
    abstract run(model: string, input: any): Promise<Task<any>>;
    abstract uploadImage(type: 'token' | 'buffer', image: ArrayBuffer | string, format: 'png' | 'jpg' | 'jpeg' | 'webp'): Promise<string>;
}