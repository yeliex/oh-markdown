import { toHtml } from 'hast-util-to-html';
import { Processor } from 'unified';
import { visit } from 'unist-util-visit';
import handlers from '../handlers/index.js';
import { type Component } from '../index.js';
import kebabcase from 'lodash.kebabcase';

export interface HtmlNodeItem {
    type: 'html';
    content: string;
}

export interface ComponentNode extends Omit<Component, 'children'> {
    children?: HtmlNode[];
}

export type HtmlNode = HtmlNodeItem | ComponentNode;

declare module 'unified' {
    interface CompileResultMap {
        htmlNodes: HtmlNode[];
    }
}

const treeToHtmlGroup = (tree: any[]) => {
    const group: any[] = [];

    let currentItem: any = undefined;

    tree.forEach((item: any) => {
        if (item.type === 'component') {
            currentItem && group.push(currentItem);
            group.push(item);
            currentItem = undefined;
        } else {
            currentItem = currentItem || [];
            currentItem.push(item);
        }
    });

    currentItem && group.push(currentItem);

    return group;
};

function rehypeCompileHtml(this: Processor) {
    const walkThroughNodes = (tree: any[]): HtmlNode[] => {
        const groups = treeToHtmlGroup(tree);

        return groups.map((group) => {
            if (Array.isArray(group)) {
                return {
                    type: 'html',
                    content: toHtml(group),
                };
            }

            return {
                ...group,
                children: group.children ? walkThroughNodes(group.children) : undefined,
            };
        });
    };

    function compiler(tree: any) {
        visit(tree, (node, ...args) => {
            if ('properties' in node && typeof node.properties?.style === 'object') {
                node.properties.style = Object.entries(node.properties.style as any)
                    .map(([key, value]) => `${kebabcase(key)}: ${value}`)
                    .join('; ');
            }

            handlers(node, ...args);
        });

        return walkThroughNodes(tree.children);
    }

    this.compiler = compiler;
}

export default rehypeCompileHtml;
