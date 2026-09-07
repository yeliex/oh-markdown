import {
    unified,
    type Processor as UnifiedProcessor,
} from 'unified';
import { type ElementContent } from 'hast';
import remarkParse from 'remark-parse';
import remarkBreaks from 'remark-breaks';
import remarkJSX from './plugins/remark-jsx.js';
import { remarkMarkAndUnravel } from '@mdx-js/mdx/lib/plugin/remark-mark-and-unravel.js';
import remarkRehype from 'remark-rehype';
import { nodeTypes } from '@mdx-js/mdx';
import rehypeRaw from 'rehype-raw';
import remarkFrontmatter from 'remark-frontmatter';
import { optionsToString } from './utils.js';
import { type VFileCompatible } from 'vfile';
import { SourceMapGenerator } from 'source-map';
import remarkGfm from 'remark-gfm';
import rehypeToc from './plugins/rehype-toc.js';
import { rehypeRecma } from '@mdx-js/mdx/lib/plugin/rehype-recma.js';
import { recmaDocument } from '@mdx-js/mdx/lib/plugin/recma-document.js';
import { recmaJsxRewrite } from '@mdx-js/mdx/lib/plugin/recma-jsx-rewrite.js';
import { recmaJsxBuild } from '@mdx-js/mdx/lib/plugin/recma-jsx-build.js';
import { recmaStringify } from '@mdx-js/mdx/lib/plugin/recma-stringify.js';
import { CACHE_KEY_DEFAULT } from './consts.js';
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

export default class Processor {
    private readonly PROCESSORS = new Map<string, UnifiedProcessor>();

    private readonly options: ProcessorOptions;

    constructor(options: Partial<ProcessorOptions> = {}) {
        const { debug = false } = options;

        this.options = { debug };

        const processor = unified();

        processor.use(remarkParse);

        processor.use(remarkBreaks);

        processor.use(remarkGfm);

        // for security purpose, don't support mdx (import/export, js expression)
        processor.use(remarkJSX);
        processor.use(remarkMarkAndUnravel);

        processor.use(remarkFrontmatter, ['yaml', 'toml']);
        processor.use(remarkMeta);

        processor.use(remarkRehype, {
            allowDangerousHtml: true,
            passThrough: [...nodeTypes],
        });

        processor.use(rehypeRaw, {
            passThrough: [...nodeTypes],
        });

        processor.freeze();

        this.PROCESSORS.set(CACHE_KEY_DEFAULT, processor);
    }

    private get processor() {
        return this.PROCESSORS.get(CACHE_KEY_DEFAULT)!;
    }

    public getProcessor(options: GetProcessorOptions) {
        const cacheKey = optionsToString(options);

        if (this.PROCESSORS.has(cacheKey)) {
            return this.PROCESSORS.get(cacheKey)!;
        }

        const processor = this.processor();

        const { toc = false, removeTitle = false } = options;

        processor.use(rehypeTitle, {
            removeTitle,
        });

        processor.use(rehypeRemoveLineBreak);

        processor.use(rehypeCustomProperties);

        if (toc) {
            processor.use(rehypeToc);
        }

        if (options.type === 'node') {
            processor.use(rehypeCompileNode);
        } else if (options.type === 'html') {
            processor.use(rehypeCompileHtml);
        } else if (options.type === 'jsx') {
            const {
                sourceMap = false,
                jsx = 'react',
                provider = true,
            } = options;

            const JSXPreset = JSXPresets[jsx] || {};

            processor.use(jsxMetaOutput);

            processor.use(rehypeRecma);

            processor.use(recmaDocument, {
                outputFormat: 'program',
                jsxRuntime: 'automatic',
                jsxImportSource: JSXPreset.source,
            });

            processor.use(recmaJsxRewrite, {
                development: this.options.debug,
                outputFormat: 'program',
                providerImportSource: !provider ? undefined :
                    (typeof provider === 'string' ? provider : JSXPreset.provider),
            });

            if (!JSXPreset.preserve) {
                processor.use(recmaJsxBuild, { outputFormat: 'program' });
            }

            processor.use(recmaStringify, {
                SourceMapGenerator: sourceMap ? SourceMapGenerator : undefined,
            });
        }

        processor.freeze();

        this.PROCESSORS.set(cacheKey, processor);

        return processor;
    }

    public parse(content: VFileCompatible): ReturnType<UnifiedProcessor['parse']> {
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
