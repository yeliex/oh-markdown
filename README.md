# Oh! Markdown~
parse and recompile markdown for render by js, support jsx, dom-tree or html.

## Install
```bash
pnpm add oh-markdown
# OR
npm install oh-markdown --save
```

## 开发

启用 Corepack 后，在仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

工作区使用 TypeScript 6 和 pkgroll，按依赖顺序构建两个包，输出 ESM 和类型声明到各自的 `es/` 目录。
`pnpm test` 包含构建、类型检查和单元测试；`pnpm clean` 清理构建产物。
