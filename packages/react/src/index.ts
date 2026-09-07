import * as React from 'react';

// MDX 的 JSX 类型跟随 React，兼容 React 19 移除全局 JSX 命名空间的变化。
declare module 'mdx/types.js' {
    export import JSX = React.JSX;
}

export * from '@mdx-js/react';
export { default as MDComponent } from './MDComponent.js';
