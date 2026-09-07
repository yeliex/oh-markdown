import type { Processor } from 'oh-markdown';
import { useMDXComponents } from '@mdx-js/react';
import { useMemo, type ReactNode, createElement } from 'react';

interface IProps {
    nodes: Array<
        ReturnType<Processor['toNodeSync']>['data'][0] |
        ReturnType<Processor['toHtmlSync']>['data'][0]
    >;
    components?: Parameters<typeof useMDXComponents>[0];
}

const renderNode = (node: IProps['nodes'][0], components: ReturnType<typeof useMDXComponents>, index: number, prefix?: string): ReactNode => {
    if (node.type === 'text') {
        return node.value;
    }

    if (node.type === 'comment') {
        return null;
    }

    // todo: use RawHtml or more smooth way https://github.com/reactjs/rfcs/pull/129
    if (node.type === 'html') {
        return (
            <script
                key={`${prefix || ''}_html[${index}]`}
                dangerouslySetInnerHTML={{ __html: `</script>${node.content}<script>` }}
            />
        );
    }

    let component;

    if (node.type === 'element') {
        component = node.tagName;
    } else if (node.type === 'component') {
        component = node.name;
    } else {
        process.env.NODE_ENV !== 'production' &&
        console.warn(`Unsupported node type: ${node['type']}, node: (${prefix})${JSON.stringify(node)}`);
    }

    if (!component) {
        process.env.NODE_ENV !== 'production' &&
        console.warn(`Component is undefined, node: (${prefix})${JSON.stringify(node)}`);

        return null;
    }

    const key = `${prefix || ''}${component}[${index}]`;

    if (components[component] !== undefined) {
        component = components[component];
    }

    return createElement(component, {
            key,
            ...node.properties,
        }, node.children?.length ?
            node.children.map((child, index) => renderNode(child, components, index, `${key}_`))
            : undefined,
    );
};

const MDComponent = (props: IProps) => {
    const { components: inputComponents, nodes } = props;

    const allComponents = useMDXComponents(inputComponents);

    const { wrapper: MDXLayout } = allComponents;

    const children = useMemo(() => {
        return nodes.map((node, index) => renderNode(node, allComponents, index));
    }, [nodes, allComponents]);

    return MDXLayout ? (
        <MDXLayout>{children}</MDXLayout>
    ) : (
        <>
            {children}
        </>
    );
};

export default MDComponent;
