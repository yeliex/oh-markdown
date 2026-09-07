import {
    unified,
    type PluggableList,
} from 'unified';
import { type ElementContent } from 'hast';
import { type Root as MdastRoot } from 'mdast';
import remarkParse from 'remark-parse';
import remarkBreaks from 'remark-breaks';
import remarkJSX from './plugins/remark-jsx.js';
import remarkUnwrapJSX from './plugins/remark-unwrap-jsx.js';
import remarkRehype from 'remark-rehype';
import { createProcessor as createMdxProcessor, nodeTypes } from '@mdx-js/mdx';
import rehypeRaw from 'rehype-raw';
import remarkFrontmatter from 'remark-frontmatter';
import { optionsToString } from './utils.js';
import { type Compatible as VFileCompatible } from 'vfile';
import { SourceMapGenerator } from 'source-map';
import remarkGfm from 'remark-gfm';
import rehypeToc from './plugins/rehype-toc.js';
import rehypeCompileNode from './plugins/rehype-compile-node.js';
import rehypeCompileHtml, { type HtmlNode } from './plugins/rehype-compile-html.js';
import rehypeTitle from './plugins/rehype-title.js';
import rehypeRemoveLineBreak from './plugins/rehype-remove-line-break.js';
import remarkMeta from './plugins/remark-meta.js';
import rehypeCustomProperties from './plugins/rehype-custom-properties.js';
import jsxMetaOutput from './plugins/jsx-meta-output.js';

export { type HtmlNode };

export interface ProcessorOptions {
    debug: boolean;
}

export const AvailableJSXOutput = ['preserve', 'react', 'preact', 'vue', 'svelte', 'solid'] as const;

type AvailableJSXOutputType = typeof AvailableJSXOutput[number];

export type OutputOptions = {
    toc?: boolean;
    removeTitle?: boolean;
}

interface InnerJsxStringifyOptions {
    sourceMap?: boolean;
    // todo: output = 'component'
    jsx?: AvailableJSXOutputType,
    provider?: boolean | string;
}

export interface HtmlOutputOptions extends OutputOptions {
    pretty?: boolean;
}

export type JSXStringifyOptions =
    InnerJsxStringifyOptions
    & OutputOptions;

export type TransformResult<Data = unknown> = {
    data: Data;
    title?: string;
    toc?: Array<{
        title: string;
        level: 1 | 2 | 3 | 4 | 5 | 6;
        id: string;
    }>;
    sourceMap?: string;
    meta?: unknown;
};

const JSXPresets: Partial<Record<AvailableJSXOutputType, {
    source?: string;
    provider?: string;
    preserve?: boolean;
}>> = {
    react: { source: 'react', provider: '@mdx-js/react' },
    preact: { source: 'preact', provider: '@mdx-js/preact' },
    vue: { provider: '@mdx-js/vue', preserve: true },
    preserve: { preserve: true },
    svelte: { source: 'svelte-jsx' },
    solid: { source: 'solid-jsx' },
};

type GetProcessorOptions = OutputOptions & (
    { type: 'node'; } |
    { type: 'html' } & HtmlOutputOptions |
    ({ type: 'jsx' } & JSXStringifyOptions));

const remarkPlugins: PluggableList = [
    remarkBreaks,
    remarkGfm,
    remarkJSX,
    [remarkFrontmatter, ['yaml', 'toml']],
    remarkMeta,
];

export default class Processor {
    private readonly processor = unified()
        .use(remarkParse)
        .use(remarkPlugins)
        .use(remarkUnwrapJSX)
        .use(remarkRehype, { allowDangerousHtml: true, passThrough: [...nodeTypes] })
        .use(rehypeRaw, { passThrough: [...nodeTypes] })
        .freeze();

    private readonly PROCESSORS = new Map<string, ReturnType<typeof createMdxProcessor> | typeof this.processor>();

    private readonly options: ProcessorOptions;

    constructor(options: Partial<ProcessorOptions> = {}) {
        this.options = { debug: options.debug ?? false };
    }

    public getProcessor(options: GetProcessorOptions) {
        const cacheKey = optionsToString(options);

        if (this.PROCESSORS.has(cacheKey)) {
            return this.PROCESSORS.get(cacheKey)!;
        }

        const { toc = false, removeTitle = false } = options;
        const rehypePlugins: PluggableList = [
            [rehypeTitle, { removeTitle }],
            rehypeRemoveLineBreak,
            rehypeCustomProperties,
        ];

        if (toc) {
            rehypePlugins.push(rehypeToc);
        }

        let processor: ReturnType<typeof createMdxProcessor> | typeof this.processor;

        if (options.type === 'jsx') {
            const { sourceMap = false, jsx = 'react', provider = true } = options;
            const preset = JSXPresets[jsx] || {};

            processor = createMdxProcessor({
                // 只启用 remarkJSX 的受限语法，不启用 MDX 的 import/export 和正文表达式。
                format: 'md',
                remarkPlugins,
                rehypePlugins: [
                    [rehypeRaw, { passThrough: [...nodeTypes] }],
                    ...rehypePlugins,
                    jsxMetaOutput,
                ],
                outputFormat: 'program',
                jsxRuntime: 'automatic',
                jsx: preset.preserve,
                jsxImportSource: preset.source,
                providerImportSource: !provider ? undefined :
                    (typeof provider === 'string' ? provider : preset.provider),
                development: this.options.debug,
                SourceMapGenerator: sourceMap ? SourceMapGenerator : undefined,
            });
        } else {
            processor = this.processor().use(rehypePlugins);
            processor.use(options.type === 'node' ? rehypeCompileNode : rehypeCompileHtml);
        }

        processor.freeze();

        this.PROCESSORS.set(cacheKey, processor);

        return processor;
    }

    public parse(content: VFileCompatible): MdastRoot {
        return this.processor.parse(content);
    }

    public toNodeSync = (
        file: VFileCompatible,
        options: OutputOptions = {} as any,
    ): TransformResult<ElementContent[]> => {
        const processor = this.getProcessor({ type: 'node', ...options });

        const data: any = processor.processSync(file);

        return {
            title: data.title,
            data: data.result.children,
            toc: data.toc,
            meta: data.meta,
        };
    };

    public toNode = async (
        file: VFileCompatible,
        options: OutputOptions = {} as any,
    ): Promise<TransformResult<ElementContent[]>> => {
        const processor = this.getProcessor({ type: 'node', ...options });

        const data: any = await processor.process(file);

        return {
            title: data.title,
            data: data.result.children,
            toc: data.toc,
            meta: data.meta,
        };
    };

    public toHtmlSync(file: VFileCompatible, options: HtmlOutputOptions = {} as any): TransformResult<HtmlNode[]> {
        const processor = this.getProcessor({ type: 'html', ...options });

        const data: any = processor.processSync(file);

        return {
            title: data.title,
            data: data.result,
            toc: data.toc,
            meta: data.meta,
        };
    }

    public toHtml = async (
        file: VFileCompatible,
        options: HtmlOutputOptions = {} as any,
    ): Promise<TransformResult<HtmlNode[]>> => {
        const processor = this.getProcessor({ type: 'html', ...options });

        const data: any = await processor.process(file);

        return {
            title: data.title,
            data: data.result,
            toc: data.toc,
            meta: data.meta,
        };
    };

    // todo: implement toComponent for run in app

    public toJsxSync = (
        file: VFileCompatible,
        options: InnerJsxStringifyOptions & OutputOptions = {},
    ): TransformResult<string> => {
        const processor = this.getProcessor({
            ...options,
            type: 'jsx',
        });

        const result: any = processor.processSync(file);

        return {
            title: result.title,
            data: result.value,
            toc: options.toc ? result.toc : undefined,
            sourceMap: result.map,
            meta: result.meta,
        };
    };

    public toJsx = async (
        file: VFileCompatible,
        options: InnerJsxStringifyOptions & OutputOptions = {},
    ): Promise<TransformResult<string>> => {
        const processor = this.getProcessor({
            ...options,
            type: 'jsx',
        });

        const result: any = await processor.process(file);

        return {
            title: result.title,
            data: result.value,
            toc: options.toc ? result.toc : undefined,
            sourceMap: result.map,
            meta: result.meta,
        };
    };
}
