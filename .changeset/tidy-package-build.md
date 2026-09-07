---
"oh-markdown": major
"@oh-markdown/react": major
---

使用 pnpm 管理工作区并替代 Turbo 任务编排，改用 pkgroll 生成 ESM 和类型声明，升级至 TypeScript 6。

升级至 MDX 3、unified 11 及新版 Markdown 解析依赖，通过 MDX 公开接口编译 JSX，并保留受限输入语法。替换存在原型污染问题的 lodash.set，升级 YAML/TOML 和 ESTree 工具。

运行环境最低要求变为 Node.js 20.19，MDX provider 需要 @mdx-js/react 3。开发和测试使用 React 19、Jest 30、Changesets 3 和 Husky 9。

适配 React 19 的 JSX 类型命名空间，并检查构建后的声明文件。React 渲染包最低要求 React 18，以支持原生 ESM 的 JSX runtime 解析；React 18 的 TypeScript 项目需要使用 @types/react 18.3.31 或更高补丁版本。
