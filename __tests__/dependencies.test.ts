import { createElement, forwardRef, memo } from 'react';
import { MDComponent } from '@oh-markdown/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Processor } from 'oh-markdown';
import toModule from './helpers/toModule.js';

describe('依赖升级兼容性', () => {
    const processor = new Processor();

    test.each([
        ['函数组件', () => createElement('span', null, 'Widget')],
        ['memo', memo(() => createElement('span', null, 'Widget'))],
        ['forwardRef', forwardRef<HTMLSpanElement>((_, ref) => createElement('span', { ref }, 'Widget'))],
    ])('React 19 支持 %s 组件映射', (_, Widget) => {
        const nodes = processor.toNodeSync('<Widget />').data;
        expect(renderToStaticMarkup(createElement(MDComponent, { nodes, components: { Widget } })))
            .toBe('<span>Widget</span>');
    });

    test('不能将嵌套组件映射对象作为 React 组件渲染', () => {
        const nodes = processor.toNodeSync('<Widget />').data;
        expect(() => renderToStaticMarkup(createElement(MDComponent, {
            nodes,
            components: { Widget: { Inner: () => null } },
        }))).toThrow('组件映射必须是有效的 React 组件');
    });

    test.each(['__proto__', 'constructor.prototype'])('自定义属性不能通过 %s 污染原型', (path) => {
        try {
            processor.toNodeSync(`# Title {${path}.ohMarkdownPolluted=yes}`);
            expect(Reflect.get(Object.prototype, 'ohMarkdownPolluted')).toBeUndefined();
        } finally {
            Reflect.deleteProperty(Object.prototype, 'ohMarkdownPolluted');
        }
    });

    test.each([
        'export const value = (globalThis.ohMarkdownExecuted = true)',
        '{globalThis.ohMarkdownExecuted = true}',
        'import component from "unavailable-module"',
    ])('JSX 输出仍将受限语法作为文本：%s', async (content) => {
        try {
            const result = processor.toJsxSync(content);
            const component = await toModule(result.data);
            const html = renderToStaticMarkup(createElement(component));
            expect(html).toContain(content.replaceAll('"', '&quot;'));
            expect(Reflect.get(globalThis, 'ohMarkdownExecuted')).toBeUndefined();
        } finally {
            Reflect.deleteProperty(globalThis, 'ohMarkdownExecuted');
        }
    });

    test('仍拒绝组件属性中的调用表达式和展开表达式', () => {
        expect(() => processor.toNodeSync('<Widget value={run()} />')).toThrow();
        expect(() => processor.toNodeSync('<Widget {...props} />')).toThrow();
    });

    test.each([
        ['---', 'title: Example\ncount: 3\nnested:\n  enabled: true'],
        ['+++', 'title = "Example"\ncount = 3\n[nested]\nenabled = true'],
    ])('保留 %s frontmatter 的值和嵌套结构', (fence, content) => {
        const result = processor.toNodeSync(`${fence}\n${content}\n${fence}\n\n# Heading`);
        expect(result.meta).toEqual({ title: 'Example', count: 3, nested: { enabled: true } });
        expect(result.title).toBe('Heading');
    });

    test('GFM 表格、任务列表和脚注仍可输出 HTML', () => {
        const result = processor.toHtmlSync('| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n\nText[^a]\n\n[^a]: Note');
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({ type: 'html', content: expect.stringContaining('<table>') });
        expect(result.data[0]).toMatchObject({ content: expect.stringContaining('type="checkbox"') });
        expect(result.data[0]).toMatchObject({ content: expect.stringContaining('data-footnotes') });
    });

    test('保留 JSX、禁用 provider 和调试输出选项', () => {
        expect(processor.toJsxSync('# Title', { jsx: 'preserve' }).data).toMatch(/<[\w.]+ id="title">/);
        expect(processor.toJsxSync('# Title', { provider: false }).data).not.toContain('@mdx-js/react');
        expect(new Processor({ debug: true }).toJsxSync('# Title').data).toContain('jsx-dev-runtime');
    });

    test('JSX 元数据中的 __proto__ 使用普通属性语义', () => {
        const result = processor.toJsxSync('---\npayload:\n  __proto__:\n    polluted: yes\n---\n\n# Title');
        expect(result.data).toContain('["__proto__"]');
    });
});
