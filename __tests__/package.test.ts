import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('构建产物支持解析、JSX 生成和 React 渲染', () => {
    // 独立 Node 进程通过包入口加载产物，避免 Jest resolver 将导入重定向到源码。
    execFileSync(process.execPath, ['--input-type=module', '--eval', `
        import assert from 'node:assert/strict';
        import { Processor } from 'oh-markdown';
        import { MDComponent } from '@oh-markdown/react';
        import { createElement } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';

        const processor = new Processor();
        const nodes = processor.toNodeSync('# Hello World').data;
        assert.equal(
            renderToStaticMarkup(createElement(MDComponent, { nodes })),
            '<h1 id="hello-world">Hello World</h1>',
        );
        assert.equal(
            processor.toHtmlSync('# Hello World').data[0].content,
            '<h1 id="hello-world">Hello World</h1>',
        );

        const jsx = processor.toJsxSync('# Hello World', { sourceMap: true });
        assert.match(jsx.data, /export default/);
        assert.ok(jsx.sourceMap);

        const component = processor.toNodeSync('<Widget data={{ nested: ["value"] }} />').data[0];
        assert.equal(component.type, 'component');
        assert.deepEqual(component.properties.data, { nested: ['value'] });
    `], {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        stdio: 'pipe',
    });
});
