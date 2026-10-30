import { Processor } from 'oh-markdown';
import { MDComponent } from '@oh-markdown/react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import toModule from './helpers/toModule.js';

const cases = [
    ['**重要提示：**请注意', '<p><strong>重要提示：</strong>请注意</p>'],
    ['这是**（重点）**说明', '<p>这是<strong>（重点）</strong>说明</p>'],
    ['*重要提示：*请注意', '<p><em>重要提示：</em>请注意</p>'],
    ['请看**“重点”**说明', '<p>请看<strong>“重点”</strong>说明</p>'],
    ['**日本語。**続き', '<p><strong>日本語。</strong>続き</p>'],
    ['**한국어(설명)**입니다', '<p><strong>한국어(설명)</strong>입니다</p>'],
    ['𠮷**（重点）**𠮷', '<p>𠮷<strong>（重点）</strong>𠮷</p>'],
    ['***重要：***继续', '<p><em><strong>重要：</strong></em>继续</p>'],
    ['**[重点：](https://example.com)**继续', '<p><strong><a href="https://example.com">重点：</a></strong>继续</p>'],
    ['这是**重点**说明', '<p>这是<strong>重点</strong>说明</p>'],
    ['English **bold** and *italic*', '<p>English <strong>bold</strong> and <em>italic</em></p>'],
    ['foo_bar_baz', '<p>foo_bar_baz</p>'],
    ['`**重要提示：**请注意`', '<p><code>**重要提示：**请注意</code></p>'],
    ['\\*\\*重点：\\*\\*继续', '<p>**重点：**继续</p>'],
];

describe('CJK 强调兼容', () => {
    const processor = new Processor();

    test.each(cases)('节点和 HTML：%s', async (markdown, html) => {
        const nodes = await processor.toNode(markdown);
        expect(renderToStaticMarkup(createElement(MDComponent, { nodes: nodes.data }))).toBe(html);
        expect(processor.toNodeSync(markdown)).toEqual(nodes);

        const result = await processor.toHtml(markdown);
        expect(result.data).toEqual([{ type: 'html', content: html }]);
        expect(processor.toHtmlSync(markdown)).toEqual(result);
    });

    test.each(cases)('JSX 样例 %#', async (markdown, html) => {
        const result = await processor.toJsx(markdown);
        const component = await toModule(result.data);
        expect(renderToStaticMarkup(createElement(component))).toBe(html);
        expect(processor.toJsxSync(markdown).data).toBe(result.data);
    });

    test('AST 中产生强调节点', () => {
        expect(processor.parse('**重要：**继续')).toMatchObject({
            children: [{
                type: 'paragraph',
                children: [
                    { type: 'strong', children: [{ type: 'text', value: '重要：' }] },
                    { type: 'text', value: '继续' },
                ],
            }],
        });
    });

    test('代码块保留原文', async () => {
        const result = await processor.toHtml('```text\n**重要：**继续\n```');
        expect(result.data).toEqual([{
            type: 'html',
            content: '<pre><code class="language-text">**重要：**继续\n</code></pre>',
        }]);
    });

    test('保留组件、目录与标题处理', async () => {
        const result = await processor.toNode('# 标题\n\n## **注意：**说明\n\n<Card>\n\n**重点：**继续\n\n</Card>', {
            toc: true,
            removeTitle: true,
        });
        expect(result.title).toBe('标题');
        expect(result.toc).toEqual(expect.arrayContaining([expect.objectContaining({ title: '注意：说明' })]));
        expect(JSON.stringify(result.data)).toContain('"name":"Card"');
        expect(JSON.stringify(result.data)).toContain('"tagName":"strong"');
    });
});
