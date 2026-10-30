import type { Root } from 'mdast';
import type { Parent } from 'unist';
import { visit, type VisitorResult } from 'unist-util-visit';

export default function remarkUnwrapJSX() {
    return (tree: Root) => {
        visit(tree, 'paragraph', (node, index, parent: Parent | undefined): VisitorResult => {
            if (!parent || index === undefined) return;

            const hasJSX = node.children.some((child) => child.type === 'mdxJsxTextElement');
            const onlyJSX = node.children.every((child) => child.type === 'mdxJsxTextElement' ||
                (child.type === 'text' && /^[\t\r\n ]+$/.test(child.value)));

            // 独占段落的 JSX 应作为块输出，避免组件外多包一层 p。
            if (hasJSX && onlyJSX) {
                parent.children.splice(index, 1, ...node.children.map((child) =>
                    child.type === 'mdxJsxTextElement' ? { ...child, type: 'mdxJsxFlowElement' as const } : child));
                return index;
            }
        });
    };
}
