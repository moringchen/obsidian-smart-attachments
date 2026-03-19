import { LinkFormat } from '../types';

export class LinkUtils {
    /**
     * Generate WikiLink format: ![[path/to/file.png]]
     */
    static toWikiLink(resourcePath: string, altText?: string): string {
        return `![[${resourcePath}]]`;
    }

    /**
     * Generate standard Markdown format: ![alt](path/to/file.png)
     */
    static toMarkdownLink(resourcePath: string, altText: string = ''): string {
        return `![${altText}](${resourcePath})`;
    }

    /**
     * Generate link based on configured format
     */
    static generateLink(
        format: LinkFormat,
        resourcePath: string,
        fileName: string
    ): string {
        const altText = fileName.replace(/\.[^/.]+$/, ''); // Remove extension for alt text

        switch (format) {
            case LinkFormat.WIKILINK:
                return this.toWikiLink(resourcePath);
            case LinkFormat.MARKDOWN:
                return this.toMarkdownLink(resourcePath, altText);
            default:
                return this.toWikiLink(resourcePath);
        }
    }
}
