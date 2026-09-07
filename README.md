# Oh! Markdown~
parse and recompile markdown for render by js, support jsx, dom-tree or html.

## Install
```bash
pnpm add oh-markdown
# OR
npm install oh-markdown --save
```

## 开发

开发建议使用 Node.js 24，启用 Corepack 后，在仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

工作区使用 TypeScript 6 和 pkgroll，按依赖顺序构建两个包，输出 ESM 和类型声明到各自的 `es/` 目录。
`pnpm test` 包含构建、类型检查和单元测试；`pnpm clean` 清理构建产物。

## 升级兼容性

新版解析器使用 MDX 3、unified 11，运行环境要求 Node.js 20.19 或更高版本。
使用 MDX provider 时需安装 `@mdx-js/react` 3；`@oh-markdown/react` 的类型声明引用 `oh-markdown`，两者需要配套升级。
使用 React 17/18 的 TypeScript 项目需将 `@types/react` 分别更新至 17.0.93/18.3.31 或更高补丁版本；React 19 的类型已适配。
正文中的 import/export 和 JavaScript 表达式继续作为文本处理，组件属性继续使用已有的受限解析规则。
