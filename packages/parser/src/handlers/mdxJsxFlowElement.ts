import { type Parent } from 'hast';
import { type MdxJsxFlowElement } from 'mdast-util-mdx';
import mdxJsxAttributeHandler from './mdxJsxAttribute.js';
import mdxJsxExpressionAttributeHandler from './mdxJsxExpressionAttribute.js';
// @ts-ignore
import { TAG_NAMES } from 'parse5/lib/common/html.js';

const AttributeHandlers = {
    mdxJsxAttribute: mdxJsxAttributeHandler,
    mdxJsxExpressionAttribute: mdxJsxExpressionAttributeHandler,
};

const HTMLTagNames = Object.values(TAG_NAMES);

export const attributeHandler = (attributes: MdxJsxFlowElement['attributes']): Record<string, any> => {
    return attributes.reduce((acc: any, attr: any) => {
        // todo: if attr is style and in react, transform to object
        acc[attr.name] = AttributeHandlers[attr.type as keyof typeof AttributeHandlers](attr);

        return acc;
    }, {});
};

const mdxJsxFlowElementHandler = (node: MdxJsxFlowElement, index: number, parent: Parent) => {
    if (HTMLTagNames.includes(node.name)) {
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
