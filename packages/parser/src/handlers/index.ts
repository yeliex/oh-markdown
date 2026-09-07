import { type Content, type Parent, type Root } from 'hast';

import mdxJsxFlowElement from './mdxJsxFlowElement.js';
import mdxJsxTextElement from './mdxJsxTextElement.js';
import text from './text.js';

const Handlers = {
    mdxJsxFlowElement,
    mdxJsxTextElement,
    text,
};

const handler = (node: Content | Root, index: number | undefined, parent: Parent | undefined) => {
    if (node.position) {
        delete node.position;
    }

    if (parent && index !== undefined && node.type in Handlers) {
        (Handlers[node.type as keyof typeof Handlers] as any)(node, index, parent);
    }
};

export default handler;
