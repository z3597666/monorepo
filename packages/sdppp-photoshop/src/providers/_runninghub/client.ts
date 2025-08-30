import { WidgetableNode, WidgetableWidget } from '@sdppp/common/schemas/schemas';
import { sdpppSDK } from '../../sdk/sdppp-ps-sdk';
import { Client } from '../base/Client';
import { Task } from '../base/Task';
import { t } from '@sdppp/common';

const log = sdpppSDK.logger.extend('runninghub')

sdpppSDK.plugins.fetchProxy.registerProxyDomains('runninghub.cn');

export class SDPPPRunningHub extends Client<{
  apiKey: string
}> {
  constructor(config: { apiKey: string }) {
    super(config);
  }

  async getAccountStatus(): Promise<{
    remainCoins: number;
    currentTaskCounts: number;
  }> {
    try {
      const response = await fetch('https://www.runninghub.cn/uc/openapi/accountStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.config.apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Failed to fetch account status');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching account status:', error);
      throw error;
    }
  }

  async getNodes(webappId: string): Promise<{
    widgetableNodes: WidgetableNode[],
    defaultInput: Record<string, any>,
    rawData: any
  }> {
    try {
      const response = await fetch(`https://www.runninghub.cn/api/webapp/apiCallDemo?apiKey=${this.config.apiKey}&webappId=${webappId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const formData = await response.json();

      if (formData.code !== 0) {
        throw new Error(formData.msg || 'Failed to fetch form data');
      }
      // {"code":0,"msg":"success","data":{"curl":"curl --location --request POST 'https://www.runninghub.cn/task/openapi/ai-app/run' \\\n--header 'Host: www.runninghub.cn' \\\n--header 'Content-Type: application/json' \\\n--data-raw '{\n    \"webappId\": \"null\",\n    \"apiKey\": \"4b80b05c1f724f8fb3958333a982ad58\",\n    \"nodeInfoList\": [\n        {\n            \"nodeId\": \"39\",\n            \"fieldName\": \"image\",\n            \"fieldValue\": \"a293d89506f9c484f4ea5695f93024a80cd62ef98f4ee4543faba357536b37ec.jpg\",\n            \"description\": \"上传图像\"\n        },\n        {\n            \"nodeId\": \"37\",\n            \"fieldName\": \"model\",\n            \"fieldValue\": \"flux-kontext-pro\",\n            \"description\": \"模型切换\"\n        },\n        {\n            \"nodeId\": \"37\",\n            \"fieldName\": \"aspect_ratio\",\n            \"fieldValue\": \"match_input_image\",\n            \"description\": \"输出比例\"\n        },\n        {\n            \"nodeId\": \"52\",\n            \"fieldName\": \"prompt\",\n            \"fieldValue\": \"给这个女人的发型变成齐耳短发,\",\n            \"description\": \"图像编辑文本输入框\"\n        }\n    ]\n}'","nodeInfoList":[{"nodeId":"39","nodeName":"LoadImage","fieldName":"image","fieldValue":"a293d89506f9c484f4ea5695f93024a80cd62ef98f4ee4543faba357536b37ec.jpg","fieldData":"[[\"bd7129b7707661dc1f37ec6a00af5605cca6d18ea51d0d37e26e3ff0d3bdb515.png\", \"e8db2c11b83f0698ff0afcae9fbb802fa038ec228ba4ee84b7f25cbacc673321.png\", \"example.png\", \"keep_this_dic\"], {\"image_upload\": true}]","fieldType":"IMAGE","description":"上传图像","descriptionEn":"Upload image"},{"nodeId":"37","nodeName":"RH_ComfyFluxKontext","fieldName":"model","fieldValue":"flux-kontext-pro","fieldData":"[{\"name\":\"flux-kontext-pro\",\"index\":\"flux-kontext-pro\",\"description\":\"flux-kontext-pro 模型（默认）\"},{\"name\":\"flux-kontext-max\",\"index\":\"flux-kontext-max\",\"description\":\"flux-kontext-maX 模型\"},{\"default\":\"flux-kontext-pro\",\"description\":\"忽略\"}]","fieldType":"LIST","description":"模型切换","descriptionEn":"Model switch"},{"nodeId":"37","nodeName":"RH_ComfyFluxKontext","fieldName":"aspect_ratio","fieldValue":"match_input_image","fieldData":"[{\"name\":\"match_input_image\",\"index\":\"match_input_image\",\"description\":\"匹配上传图像比例\"},{\"name\":\"1:1\",\"index\":\"1:1\",\"description\":\"1:1 正方形，适配社交媒体图文 （Instagram/小红书）\"},{\"name\":\"16:9\",\"index\":\"16:9\",\"description\":\"16:9 横版宽屏，主流视频平台（电视 / YouTube）\"},{\"name\":\"9:16\",\"index\":\"9:16\",\"description\":\"9:16 竖版长屏，适配抖音等短视频竖屏\"},{\"name\":\"4:3\",\"index\":\"4:3\",\"description\":\"4:3 传统比例，老式屏幕 / 教育课件\"},{\"name\":\"3:4\",\"index\":\"3:4\",\"description\":\"3:4 竖版构图，人像摄影 / 竖版海报\"},{\"name\":\"3:2\",\"index\":\"3:2\",\"description\":\"3:2 胶片经典比例，人文风景摄影\"},{\"name\":\"2:3\",\"index\":\"2:3\",\"description\":\"2:3 纵向延伸，书籍封面 / 长图设计\"},{\"name\":\"4:5\",\"index\":\"4:5\",\"description\":\"4:5 手机竖屏适配，移动端拍摄 / 广告\"},{\"name\":\"5:4\",\"index\":\"5:4\",\"description\":\"5:4 横向拓展，艺术摄影 / 杂志封面\"},{\"name\":\"21:9\",\"index\":\"21:9\",\"description\":\"21:9 超宽屏，电影 / 游戏全景场景\"},{\"name\":\"9:21\",\"index\":\"9:21\",\"description\":\"9:21 极端竖版，短视频创意分镜\"},{\"name\":\"2:1\",\"index\":\"2:1\",\"description\":\"2:1 横向长条，横幅海报 / 网页 Banner\"},{\"name\":\"1:2\",\"index\":\"1:2\",\"description\":\"1:2 纵向长条，垂直网页 / 手机长图\"},{\"default\":\"match_input_image\",\"description\":\"忽略\"}]","fieldType":"LIST","description":"输出比例","descriptionEn":"Output ratio"},{"nodeId":"52","nodeName":"RH_Translator","fieldName":"prompt","fieldValue":"给这个女人的发型变成齐耳短发,","fieldData":"[\"STRING\", {\"default\": \"\", \"multiline\": true}]","fieldType":"STRING","description":"图像编辑文本输入框","descriptionEn":"Image editing text input box"}]}}
      const { widgetableNodes, defaultInput } = this.convertFormDataToNodes(formData.data);

      return {
        widgetableNodes,
        defaultInput,
        rawData: formData
      };
    } catch (error) {
      console.error('Error fetching widgets:', error);
      throw error;
    }
  }

  private mergeInputWithNodeInfoList(nodeInfoList: any[], input: Record<string, any>): any[] {
    return nodeInfoList.map(node => {
      const nodeKey = `${node.nodeId}_${node.fieldName}`;
      return {
        ...node,
        fieldValue: input[nodeKey] !== undefined ? input[nodeKey] : node.fieldValue
      };
    });
  }

  private mapStatusToChineseMessage(status: string): string {
    switch (status) {
      case 'QUEUED':
        return t('runninghub.status.waiting');
      case 'RUNNING':
        return t('runninghub.status.running');
      case 'FAILED':
        return t('runninghub.status.failed');
      case 'SUCCESS':
        return t('runninghub.status.success');
      default:
        return status;
    }
  }

  async run(webappId: string, input: any): Promise<Task<any>> {
    try {
      // 动态导入store以避免循环依赖
      const { runninghubStore } = await import('./renderer/runninghub.store');
      const { currentNodeInfoList } = runninghubStore.getState();
      
      if (!currentNodeInfoList || currentNodeInfoList.length === 0) {
        throw new Error('nodeInfoList is required for task execution');
      }

      const mergedNodeInfoList = this.mergeInputWithNodeInfoList(currentNodeInfoList, input);

      // Submit task to RunningHub
      const response = await fetch(`https://www.runninghub.cn/task/openapi/ai-app/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.config.apiKey,
          webappId: webappId,
          nodeInfoList: mergedNodeInfoList,
          instanceType: 'default'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Task execution failed');
      }

      const taskId = result.data.taskId;

      return new Task(taskId, {
        statusGetter: async (id: string) => {
          const statusResponse = await fetch(`https://www.runninghub.cn/task/openapi/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey: this.config.apiKey,
              taskId: id
            })
          });
          //   export interface ApifoxModel {
          //     /**
          //      * 返回标记：成功标记=0，非0失败，或者是功能码
          //      */
          //     code?: number;
          //     /**
          //      * ["QUEUED","RUNNING","FAILED","SUCCESS"]
          //      */
          //     data?: string;
          //     /**
          //      * 返回信息
          //      */
          //     msg?: string;
          //     [property: string]: any;
          // }

          if (!statusResponse.ok) {
            throw new Error(`HTTP error! status: ${statusResponse.status}`);
          }

          const statusData = await statusResponse.json();

          if (statusData.code !== 0) {
            throw new Error(statusData.msg || 'Failed to get task status');
          }

          const status = statusData.data;

          return {
            isCompleted: status === 'SUCCESS' || status === 'FAILED',
            progress: status === 'SUCCESS' ? 100 : status === 'FAILED' ? 100 : status === 'RUNNING' ? 50 : status === 'QUEUED' ? 0 : 0,
            progressMessage: this.mapStatusToChineseMessage(status),
            rawData: statusData
          };
        },
        resultGetter: async (id: string, lastStatusResult: any) => {
          if (lastStatusResult.rawData.data === 'SUCCESS') {
            // 调用outputs接口获取结果
            const outputsResponse = await fetch(`https://www.runninghub.cn/task/openapi/outputs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                apiKey: this.config.apiKey,
                taskId: id
              })
            });

            if (!outputsResponse.ok) {
              throw new Error(`HTTP error! status: ${outputsResponse.status}`);
            }

            const outputsData = await outputsResponse.json();
            
            if (outputsData.code !== 0) {
              throw new Error(t('runninghub.error.get_result_failed', { error: outputsData.msg || '未知错误' }));
            }

            // 根据API返回格式处理结果
            const outputs = outputsData.data || [];
            return outputs.map((output: any) => ({
              url: output.fileUrl,
              rawData: output
            }));
          } else if (lastStatusResult.rawData.data === 'FAILED') {
            throw new Error(t('runninghub.error.task_failed', { error: lastStatusResult.rawData.msg || '未知错误' }));
          } else {
            throw new Error(t('runninghub.error.task_incomplete', { status: this.mapStatusToChineseMessage(lastStatusResult.rawData.data) }));
          }
        },
        canceler: async (id: string) => {
          await fetch(`https://www.runninghub.cn/task/openapi/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey: this.config.apiKey,
              taskId: id
            })
          });
        }
      });
    } catch (error) {
      console.error('Error running task:', error);
      throw error;
    }
  }

  async uploadImage(type: 'token' | 'buffer', image: ArrayBuffer | string, format: 'png' | 'jpg' | 'jpeg' | 'webp', signal?: AbortSignal): Promise<string> {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }

      const filename = `runninghub_${Math.random().toString(36).substring(2, 8)}_${Date.now()}.${format}`;

      // Create form data for file upload
      const formData = new FormData();
      const blob = new Blob([image], {
        type: `image/${type === 'token' ? 'uxp' : format}`,
      });
      formData.append('file', blob, filename);
      formData.append('fileType', 'image');
      formData.append('apiKey', this.config.apiKey);

      const response = await fetch('https://www.runninghub.cn/task/openapi/upload', {
        method: 'POST',
        body: formData,
        signal: signal
      });
      // {
      //   "code": 0,
      //   "msg": "success",
      //   "data": {
      //     "fileName": "api/9d77b8530f8b3591edc5c4e8f3f55b2cf0960bb2ca35c04e32c1677687866576.png",
      //     "fileType": "image"
      //   }
      // }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'File upload failed');
      }

      return result.data.fileName;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  private convertFormDataToNodes(formData: any): {
    widgetableNodes: WidgetableNode[],
    defaultInput: Record<string, any>
  } {
    const widgetableNodes: WidgetableNode[] = [];
    const defaultInput: Record<string, any> = {};

    if (formData.nodeInfoList && Array.isArray(formData.nodeInfoList)) {
      formData.nodeInfoList.forEach((node: any, index: number) => {
        const widget: WidgetableWidget = {
          name: '',
          uiWeight: 12,
          outputType: this.mapFieldTypeToOutputType(node.fieldType) as any,
          options: this.createFieldOptions(node)
        };

        const widgetableNode: WidgetableNode = {
          id: `${node.nodeId}_${node.fieldName}`,
          title: node.description || node.fieldName || `field_${index}`,
          widgets: [widget],
          uiWeightSum: widget.uiWeight,
        };

        widgetableNodes.push(widgetableNode);
        defaultInput[widgetableNode.id] = widget.outputType === 'images' ? null : node.fieldValue || this.getDefaultValueForType(widget.outputType);
      });
    }

    return { widgetableNodes, defaultInput };
  }

  private mapFieldTypeToOutputType(fieldType: string): string {
    switch (fieldType?.toLowerCase()) {
      case 'text':
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
      case 'int':
      case 'float':
        return 'number';
      case 'list':
      case 'select':
      case 'dropdown':
        return 'combo';
      case 'image':
      case 'file':
        return 'images';
      case 'boolean':
        return 'boolean';
      default:
        return 'string';
    }
  }

  private createFieldOptions(node: any): any {
    const options: any = {
      required: node.required || false
    };
    let fieldData = null
    try {
      fieldData = JSON.parse(node.fieldData || '[]');
    } catch (e) {
      fieldData = [];
    }

    if (node.fieldType === 'FLOAT' || node.fieldType === 'INT') {
      options.min = fieldData[1].min;
      options.max = fieldData[1].max;
      options.step = node.fieldType === 'INT' ? 1 : 0.01;
      if (options.max - options.min < 1000) {
        options.slider = true;
      } else {
        options.slider = false;
      }
    }

    if (node.fieldType === 'LIST' || node.fieldType === 'select' || node.fieldType === 'dropdown') {
      if (fieldData[0] && Array.isArray(fieldData[0])) {
        options.values = fieldData[0];
      } else if (Array.isArray(fieldData)) {
        options.values = fieldData.filter(item => item.name && item.index).map(item => item.name);
        options.labels = fieldData.filter(item => item.name && item.index).map(item => item.description || item.name);
      } else {
        options.values = [];
      }
    }

    if (node.fieldType === 'IMAGE' || node.fieldType === 'file') {
      options.maxCount = node.maxCount || 1;
    }
    return options;
  }

  private getDefaultValueForType(outputType: string): any {
    switch (outputType) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'combo':
        return null;
      case 'images':
        return [];
      default:
        return null;
    }
  }
}
