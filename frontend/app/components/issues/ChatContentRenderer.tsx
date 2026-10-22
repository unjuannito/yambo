import React from "react";

interface ChatContentRendererProps {
    text: string;
    isRightSide?: boolean;
}

interface MatchEntry {
    index: number;
    length: number;
    element: React.ReactNode;
}

const LINK_CLASSES = (isRight: boolean) =>
    `underline font-semibold decoration-2 underline-offset-2 transition-colors break-all ${
        isRight ? "text-white hover:text-yambo-green-100" : "text-yambo-green-600 hover:text-yambo-green-700"
    }`;

const IMAGE_ELEMENT = (url: string, alt: string, key: number) => (
    <div key={key} className="my-3 group relative inline-block">
        <img
            src={url}
            alt={alt}
            className="rounded-xl max-w-full h-auto shadow-md border border-black/5 cursor-zoom-in transition-transform hover:scale-[1.01]"
            onClick={() => window.open(url, '_blank')}
        />
    </div>
);

function resolveUrl(url: string): string {
    return url.startsWith('/') ? `/api${url}` : url;
}

function handleHtmlLinks(text: string, isRightSide: boolean, regex: RegExp): MatchEntry[] {
    const matches: MatchEntry[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            index: match.index,
            length: match[0].length,
            element: (
                <a
                    key={match.index}
                    href={match[1]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASSES(isRightSide)}
                >
                    {match[2]}
                </a>
            ),
        });
    }
    return matches;
}

function handleHtmlImages(text: string, regex: RegExp): MatchEntry[] {
    const matches: MatchEntry[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        const finalUrl = resolveUrl(match[1]);
        matches.push({
            index: match.index,
            length: match[0].length,
            element: IMAGE_ELEMENT(finalUrl, "Shared", match.index),
        });
    }
    return matches;
}

function handleMdLinks(text: string, isRightSide: boolean, regex: RegExp, imageRegex: RegExp, existing: MatchEntry[]): MatchEntry[] {
    const matches: MatchEntry[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (existing.some(m => match!.index >= m.index && match!.index < m.index + m.length)) continue;
        const finalUrl = resolveUrl(match[2]);
        const isImage = match[2].split(/[#?]/)[0].match(imageRegex);
        matches.push({
            index: match.index,
            length: match[0].length,
            element: isImage
                ? IMAGE_ELEMENT(finalUrl, match[1], match.index)
                : (
                    <a
                        key={match.index}
                        href={finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={LINK_CLASSES(isRightSide)}
                    >
                        {match[1]}
                    </a>
                ),
        });
    }
    return matches;
}

function handlePlainUrls(text: string, isRightSide: boolean, regex: RegExp, imageRegex: RegExp, existing: MatchEntry[]): MatchEntry[] {
    const matches: MatchEntry[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (existing.some(m => match!.index >= m.index && match!.index < m.index + m.length)) continue;
        const finalUrl = resolveUrl(match[0]);
        const isImage = match[0].split(/[#?]/)[0].match(imageRegex);
        matches.push({
            index: match.index,
            length: match[0].length,
            element: isImage
                ? IMAGE_ELEMENT(finalUrl, "Shared", match.index)
                : (
                    <a
                        key={match.index}
                        href={finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline decoration-1 underline-offset-2 transition-colors break-all ${isRightSide ? "text-white hover:text-yambo-green-100" : "text-yambo-green-600 hover:text-yambo-green-700"}`}
                    >
                        {match[0]}
                    </a>
                ),
        });
    }
    return matches;
}

export const ChatContentRenderer: React.FC<ChatContentRendererProps> = ({ text, isRightSide }) => {
    const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/g;
    const htmlImgRegex = /<img\s+(?:[^>]*?\s+)?src="([^"]*)"[^>]*\/?>/g;
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|(?:\/uploads\/[^\s)]+))\)/g;
    const urlRegex = /(?<![\"(])https?:\/\/[^\s<)]+|(?<![\"(])\/uploads\/[^\s<)]+/g;
    const imageRegex = /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i;

    const htmlLinkMatches = handleHtmlLinks(text, !!isRightSide, htmlLinkRegex);
    const htmlImgMatches = handleHtmlImages(text, htmlImgRegex);
    const earlierMatches = [...htmlLinkMatches, ...htmlImgMatches];
    const mdLinkMatches = handleMdLinks(text, !!isRightSide, mdLinkRegex, imageRegex, earlierMatches);
    const urlMatches = handlePlainUrls(text, !!isRightSide, urlRegex, imageRegex, [...earlierMatches, ...mdLinkMatches]);

    const allMatches: MatchEntry[] = [...htmlLinkMatches, ...htmlImgMatches, ...mdLinkMatches, ...urlMatches];

    allMatches.sort((a, b) => a.index - b.index);
    const content: React.ReactNode[] = [];
    let pos = 0;
    allMatches.forEach(m => {
        if (m.index > pos) content.push(<span key={pos}>{text.substring(pos, m.index)}</span>);
        content.push(m.element);
        pos = m.index + m.length;
    });
    if (pos < text.length) content.push(<span key={pos}>{text.substring(pos)}</span>);

    return <div className="flex flex-col whitespace-pre-wrap break-words leading-relaxed">{content.length ? content : text}</div>;
};
