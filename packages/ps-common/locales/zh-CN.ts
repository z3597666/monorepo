export default {
  // App.tsx 相关
  'preview.show': '显示预览框 ({{count}}张图片)',
  
  // Gateway 相关
  'gateway.select_ai_service': '请选择AI服务',
  
  // ImagePreview 相关
  'image.jump_to_last': '跳转到最后一个',
  'image.clear_all': '清空所有图片',
  'image.send_to_ps': '发送到PS',
  'image.download': '下载',
  'image.copy': '复制',
  
  // Task Executor 相关
  'task.waiting_upload': '正在等待图片上传...',
  'task.creating_task': '正在创建任务...',
  'task.running_duration': '运行了 {{duration}} 秒，{{message}}',
  
  // ComfyUI 前端相关
  'comfy.connect': '连接',
  'comfy.load_failed': 'ComfyUI加载失败，HTTP状态码：{{code}}',
  'comfy.loading': 'ComfyUI加载中...',
  'comfy.channel_connecting': '通道连接中...',
  'comfy.server_reconnecting': 'ComfyUI服务器重连中',
  'comfy.version_mismatch': 'Comfy侧SDPPP版本({{comfyVersion}})与插件({{pluginVersion}})不匹配，运行可能有问题',
  'comfy.cloud_recommend': '云端推荐：',
  'comfy.your_workflows': '你的工作流',
  'comfy.refresh_workflows': '刷新工作流列表',
  'comfy.queue_progress': '(队列:{{queueSize}}) {{progress}}% {{executingNodeTitle}}...',
  'comfy.save': '保存',
  'comfy.refresh': '刷新',
  'comfy.stop_cancel_all': '停止并取消全部',
  'comfy.stop_auto_run': '停止自动运行',
  'comfy.start_auto_run': '开启自动运行',
  'comfy.run': '运行',
  'comfy.back': '返回',
  
  // HTTP 错误码
  'http.404': 'SDPPP可能未安装或和插件版本不匹配 (404)',
  'http.401': '未授权 (401)',
  'http.403': '禁止访问 (403)',
  'http.408': '请求超时 (408)',
  'http.500': '服务器错误 (500)',
  'http.501': '未实现 (501)',
  'http.502': '网关错误 (502)',
  'http.503': '服务不可用 (503)',
  'http.504': '网关超时 (504)',
  'http.unknown': '未知错误（{{code}}）',
  
  // RunningHub 相关
  'runninghub.get_apikey': '点此获取RunningHub APIKey',
  'runninghub.app_id': '应用ID:',
  'runninghub.webapp_id_placeholder': '此处粘贴 WebApp ID',
  'runninghub.open_app': '按回车打开应用： {{appName}}',
  'runninghub.execute': '执行',
  'runninghub.rh_coins': 'RH币:',
  'runninghub.current_tasks': '当前任务数:',
  'runninghub.status.waiting': '排队等待',
  'runninghub.status.running': '正在运行',
  'runninghub.status.failed': '执行失败',
  'runninghub.status.success': '执行成功',
  'runninghub.error.get_result_failed': '获取结果失败: {{error}}',
  'runninghub.error.task_failed': '任务执行失败: {{error}}',
  'runninghub.error.task_incomplete': '任务未完成，当前状态: {{status}}',
  
  // Replicate 相关
  'replicate.get_apikey': '如何获取APIKey',
  'replicate.execute': '执行',
  'replicate.model_placeholder': '粘贴你的模型名称',
  
  // LibLib 相关
  'liblib.get_apikey': '如何获取APIKey和API Secret',
  'liblib.execute': '执行',
  
  // 通用
  'common.close': '关闭',
  'common.save_and_run': '保存并立即执行',
  'common.loading': '加载中...',
  'common.error': '错误',
  'common.success': '成功',
  'common.cancel': '取消',
  'common.confirm': '确认',
}