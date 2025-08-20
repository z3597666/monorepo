# SD-PPP 2.0 前端代码仓库

### 如何开发：
- 准备工作
1. clone该仓库，记得`git submodule update --init --recursive`
2. 安装nodejs23+, 并安装pnpm`npm install -g pnpm`
3. 在本仓库`pnpm install`
4. 使用UXP Devtool添加插件，路径选择`<仓库根目录>/packages/sdppp-photoshop/plugins/manifest.json`

- 开始开发
1. 仓库目录运行 `npm run dev`
2. UXP Devtool里点`Load`

### 代码说明

项目采用react+less+antd.

入口文件在`packages/sdppp-photoshop/src/index.tsx`.

剩余问AI应该够了