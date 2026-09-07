import { type Parent } from 'hast';
import { type MdxJsxFlowElement } from 'mdast-util-mdx';
import mdxJsxAttributeHandler from './mdxJsxAttribute.js';
import mdxJsxExpressionAttributeHandler from './mdxJsxExpressionAttribute.js';
import { html } from 'parse5';

const AttributeHandlers = {
    mdxJsxAttribute: mdxJsxAttributeHandler,
    mdxJsxExpressionAttribute: mdxJsxExpressionAttributeHandler,
};

const HTMLTagNames = new Set<string>(Object.values(html.TAG_NAMES));

export const attributeHandler = (attributes: MdxJsxFlowElement['attributes']): Record<string, any> => {
    return attributes.reduce((acc: any, attr: any) => {
        // todo: if attr is style and in react, transform to object
        acc[attr.name] = AttributeHandlers[attr.type as keyof typeof AttributeHandlers](attr);

        return acc;
    }, {});
};

const mdxJsxFlowElementHandler = (node: MdxJsxFlowElement, index: number, parent: Parent) => {
    if (node.name && HTMLTagNames.has(node.name)) {
        parent.children[index] = {
            type: 'element',
            tagName: node.name!,
            properties: attributeHandler(node.attributes),
            children: node.children as any[],
        };

        return;
    }

    parent.children[index] = node.name ? {
        type: 'component',
        name: node.name,
        properties: attributeHandler(node.attributes),
        children: node.children as any,
    } : {
        type: 'element',
        tagName: 'fragment',
        properties: {},
        children: node.children as any,
    };
};

export default mdxJsxFlowElementHandler;
