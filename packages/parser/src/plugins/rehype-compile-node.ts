import camelCase from 'lodash.camelcase';
import { Processor } from 'unified';
import { visit } from 'unist-util-visit';
import handlers from '../handlers/index.js';

function rehypeCompileNode(this: Processor) {
    function compiler(tree: any) {
        visit(tree, (node, ...args) => {
            if ('properties' in node && typeof node.properties?.style === 'object') {
                node.properties.style = Object.fromEntries(Object.entries(node.properties.style as any)
                    .map(([key, value]) => [camelCase(key), value]));
            }

            handlers(node, ...args);
        });

        return tree;
    }

    this.compiler = compiler;
}

export default rehypeCompileNode;
