export interface ManagedResourceLinkMatch {
    fullMatch: string;
    resourcePath: string;
}

const WIKI_LINK_REGEX = /!?(\[\[(resources\/[^\]]+)\]\])/g;
const MARKDOWN_LINK_REGEX = /!?(\[[^\]]*\]\((resources\/[^)]+)\))/g;

export function extractManagedResourceLinks(content: string): ManagedResourceLinkMatch[] {
    const matches: ManagedResourceLinkMatch[] = [];

    for (const regex of [WIKI_LINK_REGEX, MARKDOWN_LINK_REGEX]) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
            matches.push({
                fullMatch: match[1],
                resourcePath: match[2]
            });
        }
    }

    return matches;
}

export function listManagedResourcePaths(content: string): string[] {
    return extractManagedResourceLinks(content).map(link => link.resourcePath);
}

export function rewriteManagedResourcePrefix(content: string, oldDir: string, newDir: string): { content: string; updatedCount: number } {
    const resourceTypes = ['images', 'audio', 'videos', 'documents', 'archives', 'code', 'files'];
    let updatedCount = 0;
    let nextContent = content;

    for (const type of resourceTypes) {
        const from = `resources/${type}${oldDir ? `/${oldDir}` : ''}`;
        const to = `resources/${type}${newDir ? `/${newDir}` : ''}`;
        if (!nextContent.includes(from)) {
            continue;
        }

        const occurrences = nextContent.split(from).length - 1;
        nextContent = nextContent.split(from).join(to);
        updatedCount += occurrences;
    }

    return { content: nextContent, updatedCount };
}
