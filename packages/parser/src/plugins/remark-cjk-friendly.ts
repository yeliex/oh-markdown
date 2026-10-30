/*
 * CJK 边界规则移植自 micromark-extension-cjk-friendly 2.0.1。
 * 保留 micromark 3 的强调节点解析，以兼容 unified 10 和 MDX 2。
 *
 * Copyright (c) 2025 Tatsunori Uchino <tats.u@live.jp>
 * Copyright (c) Titus Wormer <tituswormer@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { attention } from 'micromark-core-commonmark';
import {
    TwoPreviousCode,
    classifyCharacter,
    classifyPrecedingCharacter,
    isCjk,
    isCjkOrIvs,
    isCodeHighSurrogate,
    isCodeLowSurrogate,
    isNonCjkPunctuation,
    isSpaceOrPunctuation,
    isUnicodeWhitespace,
    tryGetGenuineNextCode,
    tryGetGenuinePreviousCode,
} from 'micromark-extension-cjk-friendly-util';
import type { Code, Construct, Extension, State, Tokenizer } from 'micromark-util-types';
import type { Processor } from 'unified';

const tokenizeAttention: Tokenizer = function (effects, ok) {
    const attentionMarkers = this.parser.constructs.attentionMarkers.null || [];
    const { now, sliceSerialize, previous: tentativePrevious } = this;
    const previous = isCodeLowSurrogate(tentativePrevious)
        ? tryGetGenuinePreviousCode(tentativePrevious, now(), sliceSerialize)
        : tentativePrevious;
    const before = classifyCharacter(previous);
    const twoPrevious = previous === null ? undefined : new TwoPreviousCode(previous, now(), sliceSerialize);
    const beforePrimary = classifyPrecedingCharacter(before, () => twoPrevious?.value() ?? null, previous);
    let marker: Code;

    return (code) => {
        marker = code;
        effects.enter('attentionSequence');
        return inside(code);
    };

    function inside(code: Code): ReturnType<State> {
        if (code === marker) {
            effects.consume(code);
            return inside;
        }

        const token = effects.exit('attentionSequence');
        const after = classifyCharacter(isCodeHighSurrogate(code)
            ? tryGetGenuineNextCode(code, now(), sliceSerialize)
            : code);
        const beforeNonCjkPunctuation = isNonCjkPunctuation(beforePrimary);
        const beforeSpaceOrNonCjkPunctuation = beforeNonCjkPunctuation || isUnicodeWhitespace(beforePrimary);
        const afterNonCjkPunctuation = isNonCjkPunctuation(after);
        const afterSpaceOrNonCjkPunctuation = afterNonCjkPunctuation || isUnicodeWhitespace(after);
        const open = !afterSpaceOrNonCjkPunctuation
            || afterNonCjkPunctuation && (beforeSpaceOrNonCjkPunctuation || isCjkOrIvs(beforePrimary))
            || code !== null && attentionMarkers.includes(code);
        const close = !beforeSpaceOrNonCjkPunctuation
            || beforeNonCjkPunctuation && (afterSpaceOrNonCjkPunctuation || isCjk(after))
            || previous !== null && attentionMarkers.includes(previous);

        token._open = Boolean(marker === 42 ? open : open && (isSpaceOrPunctuation(beforePrimary) || !close));
        token._close = Boolean(marker === 42 ? close : close && (isSpaceOrPunctuation(after) || !open));
        return ok(code);
    }
};

const cjkAttention: Construct = { ...attention, tokenize: tokenizeAttention };
const extension: Extension = {
    text: { 42: cjkAttention, 95: cjkAttention },
    insideSpan: { null: [cjkAttention] },
};

export default function remarkCjkFriendly(this: Processor) {
    const extensions = this.data('micromarkExtensions');
    this.data('micromarkExtensions', [...(Array.isArray(extensions) ? extensions : []), extension]);
}
