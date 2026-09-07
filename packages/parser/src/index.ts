export * from './Processor.js';

export { default as Processor } from './Processor.js';

import type { Element } from 'hast';

export interface Component extends Omit<Element, 'type' | 'tagName' | 'content'> {
    type: 'component';
    name: string;
}

declare module 'hast' {
    interface ElementContentMap {
        component: Component;
    }
    interface RootContentMap {
        component: Component;
    }
}

/* eslint-enable @typescript-eslint/consistent-type-definitions */
