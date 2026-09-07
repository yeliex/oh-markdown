import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { mdxMd } from 'micromark-extension-mdx-md';
import { combineExtensions } from 'micromark-util-combine-extensions';
import { mdxFromMarkdown, mdxToMarkdown } from 'mdast-util-mdx';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { Processor } from 'unified';

declare module 'unified' {
    interface Data {
        toMarkdownExtensions?: Array<ReturnType<typeof mdxToMarkdown>>;
    }
}

export default function remarkJSX(this: Processor) {
    const data = this.data();

    (data.micromarkExtensions ??= []).push(combineExtensions([
        mdxJsx({
            acorn: Parser.extend(acornJsx()),
            acornOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            addResult: true,
        }),
        mdxMd(),
    ]));

    (data.fromMarkdownExtensions ??= []).push(mdxFromMarkdown());
    (data.toMarkdownExtensions ??= []).push(mdxToMarkdown());
}
