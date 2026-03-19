// Type definitions for Smart Attachments plugin

export enum LinkFormat {
    WIKILINK = 'wikilink',
    MARKDOWN = 'markdown'
}

export interface SmartAttachmentsSettings {
    resourceFolderName: string;
    linkFormat: LinkFormat;
    autoRenameDuplicates: boolean;
    imageSubFolder: string;
    otherFilesSubFolder: string;
}

export const DEFAULT_SETTINGS: SmartAttachmentsSettings = {
    resourceFolderName: 'resources',
    linkFormat: LinkFormat.WIKILINK,
    autoRenameDuplicates: true,
    imageSubFolder: 'images',
    otherFilesSubFolder: 'files'
};

export interface FileTypeConfig {
    [key: string]: string;
}

export const FILE_TYPE_MAP: FileTypeConfig = {
    // Images
    'jpg': 'images',
    'jpeg': 'images',
    'png': 'images',
    'gif': 'images',
    'webp': 'images',
    'svg': 'images',
    'bmp': 'images',
    'ico': 'images',
    // Audio
    'mp3': 'audio',
    'wav': 'audio',
    'ogg': 'audio',
    'flac': 'audio',
    'm4a': 'audio',
    // Video
    'mp4': 'videos',
    'webm': 'videos',
    'mov': 'videos',
    'avi': 'videos',
    'mkv': 'videos',
    // Documents
    'pdf': 'documents',
    'doc': 'documents',
    'docx': 'documents',
    'xls': 'documents',
    'xlsx': 'documents',
    'ppt': 'documents',
    'pptx': 'documents',
    // Archives
    'zip': 'archives',
    'rar': 'archives',
    '7z': 'archives',
    'tar': 'archives',
    'gz': 'archives',
    // Code
    'js': 'code',
    'ts': 'code',
    'py': 'code',
    'java': 'code',
    'cpp': 'code',
    'c': 'code',
    'go': 'code',
    'rs': 'code',
    'html': 'code',
    'css': 'code',
    'json': 'code',
    'xml': 'code',
    'yaml': 'code',
    'yml': 'code',
    'sql': 'code',
    'sh': 'code',
    'bat': 'code',
    'ps1': 'code'
};
