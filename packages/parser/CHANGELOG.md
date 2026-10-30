# oh-markdown

## 1.3.0

### Minor Changes

- 使用官方 remark-cjk-friendly 插件处理中文、日文和韩文强调，替换本地分词实现；升级所需的 unified、remark、micromark 和 MDX 解析依赖，保持 Node 18 兼容性。

## 1.2.3

### Patch Changes

- 修复中文、日文和韩文中紧邻标点、括号及引号的加粗和斜体解析，统一覆盖 AST、节点、HTML 和 JSX 输出。保留 unified 10、MDX 2 和现有调用方式，支持 Node.js 18。

## 1.2.2

### Patch Changes

- 19f774d: fix: fix custom properties for block

## 1.2.1

### Patch Changes

- c1a60e1: fix: custom properties support link and image

## 1.2.0

### Minor Changes

- 74a5670: feat: support custom properties

## 1.1.3

### Patch Changes

- 7f8ed21: chore: update deps

## 1.1.2

### Patch Changes

- 0f6f9f2: fix: remove process

## 1.1.1

### Patch Changes

- 48d8fef: chore: update package deps to avoid conflict

## 1.1.0

### Minor Changes

- suppoer custom provider and react render
