import { type MdxJsxAttribute } from 'mdast-util-mdx';
import * as AllowedStatements from '../statements/index.js';
import { VFileMessage } from 'vfile-message';

const mdxJsxAttributeHandler = (node: MdxJsxAttribute): unknown => {
    if (typeof node.value === 'object' && node.value !== null && node.value.type === 'mdxJsxAttributeValueExpression') {

        // filer illegal characters
        if (node.value.data?.estree) {
            const statement = node.value.data.estree.body[0];

            if (statement.type === 'ExpressionStatement' && statement.expression.type in AllowedStatements) {
                return AllowedStatements[statement.expression.type as keyof typeof AllowedStatements](statement.expression as any);
            }

            throw new VFileMessage(`Unsupported mdxJsxAttributeValueExpression type: ${statement.type}`, statement.loc!);
        }

        throw new VFileMessage(`Unsupported JSX Attribute Value Expression: ${node.name} type: ${node.type}`, node.value.data!.estree!.loc!);
    }

    return node.value;
};

export default mdxJsxAttributeHandler;
