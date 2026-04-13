import { Vault, TFile, Notice, Modal, App, FileSystemAdapter } from 'obsidian';
import { SmartAttachmentsSettings } from '../types';

/**
 * Information about an orphaned file
 */
export interface OrphanedFile {
    path: string;
    name: string;
    size: number;
    lastModified: number;
}

/**
 * Cleanup result statistics
 */
export interface CleanupResult {
    orphanedFiles: OrphanedFile[];
    totalSize: number;
    deletedCount: number;
    deletedSize: number;
}

/**
 * Utility class for cleaning up orphaned attachments
 */
export class CleanupUtils {
    constructor(
        private vault: Vault,
        private settings: SmartAttachmentsSettings
    ) {}

    /**
     * Scan for orphaned attachment files
     */
    async scanOrphanedFiles(): Promise<CleanupResult> {
        const orphanedFiles: OrphanedFile[] = [];

        // Get all markdown files
        const markdownFiles = this.vault.getMarkdownFiles();

        // Get all referenced resource files
        const referencedFiles = await this.getAllReferencedFiles(markdownFiles);

        // Get all resource files
        const resourceFiles = await this.getAllResourceFiles();

        // Find orphaned files
        for (const resourceFile of resourceFiles) {
            if (!referencedFiles.has(resourceFile)) {
                const stat = await this.vault.adapter.stat(resourceFile);
                if (stat) {
                    orphanedFiles.push({
                        path: resourceFile,
                        name: resourceFile.split('/').pop() || resourceFile,
                        size: stat.size,
                        lastModified: stat.ctime
                    });
                }
            }
        }

        const totalSize = orphanedFiles.reduce((sum, f) => sum + f.size, 0);

        return {
            orphanedFiles,
            totalSize,
            deletedCount: 0,
            deletedSize: 0
        };
    }

    /**
     * Delete orphaned files
     */
    async deleteOrphanedFiles(files: OrphanedFile[]): Promise<{ deletedCount: number; deletedSize: number }> {
        let deletedCount = 0;
        let deletedSize = 0;

        for (const file of files) {
            try {
                await this.vault.adapter.remove(file.path);
                deletedCount++;
                deletedSize += file.size;
            } catch (error) {
                console.error(`Failed to delete ${file.path}:`, error);
            }
        }

        return { deletedCount, deletedSize };
    }

    /**
     * Get all resource files in the resources directory
     */
    private async getAllResourceFiles(): Promise<string[]> {
        const resourceFiles: string[] = [];
        const vaultRoot = this.getVaultRoot();
        const resourceDir = `${vaultRoot}/../${this.settings.resourceFolderName}`;

        try {
            await this.collectFilesRecursive(resourceDir, resourceFiles);
        } catch (error) {
            console.log('Resource directory not found or empty:', error);
        }

        return resourceFiles;
    }

    /**
     * Recursively collect files from directory
     */
    private async collectFilesRecursive(dir: string, files: string[]): Promise<void> {
        try {
            const list = await this.vault.adapter.list(dir);

            // Add files
            for (const file of list.files) {
                files.push(file);
            }

            // Recurse into subdirectories
            for (const folder of list.folders) {
                await this.collectFilesRecursive(folder, files);
            }
        } catch (error) {
            // Directory might not exist
        }
    }

    /**
     * Get all files referenced in markdown files
     */
    private async getAllReferencedFiles(markdownFiles: TFile[]): Promise<Set<string>> {
        const referencedFiles = new Set<string>();

        for (const mdFile of markdownFiles) {
            const content = await this.vault.cachedRead(mdFile);

            // Match WikiLinks: ![[resources/...]] or [[resources/...]]
            const wikiLinkRegex = /!?\[\[(resources\/[^\]]+)\]\]/g;
            let match;
            while ((match = wikiLinkRegex.exec(content)) !== null) {
                const resourcePath = match[1];
                const fullPath = this.resolveResourcePath(resourcePath);
                if (fullPath) {
                    referencedFiles.add(fullPath);
                }
            }

            // Match Markdown links: ![](resources/...) or [alt](resources/...)
            const markdownLinkRegex = /!?\[[^\]]*\]\((resources\/[^)]+)\)/g;
            while ((match = markdownLinkRegex.exec(content)) !== null) {
                const resourcePath = match[1];
                const fullPath = this.resolveResourcePath(resourcePath);
                if (fullPath) {
                    referencedFiles.add(fullPath);
                }
            }
        }

        return referencedFiles;
    }

    /**
     * Get vault root path
     */
    private getVaultRoot(): string {
        if (this.vault.adapter instanceof FileSystemAdapter) {
            return this.vault.adapter.getBasePath();
        }
        return '';
    }

    /**
     * Resolve resource path to full file system path
     */
    private resolveResourcePath(resourcePath: string): string | null {
        const vaultRoot = this.getVaultRoot();
        const fullPath = `${vaultRoot}/../${resourcePath}`;
        return fullPath;
    }

    /**
     * Format file size for display
     */
    static formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
}

/**
 * Modal dialog for confirming orphaned file deletion
 */
export class CleanupConfirmModal extends Modal {
    result: boolean = false;

    constructor(
        app: App,
        private orphanedFiles: OrphanedFile[],
        private totalSize: number,
        private onConfirm: () => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: '清理孤立附件' });

        contentEl.createEl('p', {
            text: `发现 ${this.orphanedFiles.length} 个未被引用的附件文件，占用空间 ${CleanupUtils.formatFileSize(this.totalSize)}。`
        });

        // Create file list
        const listContainer = contentEl.createDiv();
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflow = 'auto';
        listContainer.style.border = '1px solid var(--background-modifier-border)';
        listContainer.style.padding = '10px';
        listContainer.style.marginBottom = '20px';

        for (const file of this.orphanedFiles) {
            const item = listContainer.createDiv();
            item.style.marginBottom = '5px';
            item.style.fontSize = '12px';
            item.createSpan({
                text: `${file.name} (${CleanupUtils.formatFileSize(file.size)})`,
                cls: 'cleanup-file-item'
            });
        }

        // Warning
        contentEl.createEl('p', {
            text: '⚠️ 这些文件在您的笔记中未被引用。删除后将无法恢复。',
            cls: 'cleanup-warning'
        });

        // Buttons
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '20px';

        const cancelButton = buttonContainer.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const confirmButton = buttonContainer.createEl('button', {
            text: `删除 ${this.orphanedFiles.length} 个文件`,
            cls: 'mod-warning'
        });
        confirmButton.style.backgroundColor = 'var(--background-modifier-error)';
        confirmButton.addEventListener('click', () => {
            this.result = true;
            this.onConfirm();
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Modal for showing cleanup results
 */
export class CleanupResultModal extends Modal {
    constructor(
        app: App,
        private result: CleanupResult
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: '清理完成' });

        if (this.result.deletedCount === 0) {
            contentEl.createEl('p', { text: '没有文件被删除。' });
        } else {
            contentEl.createEl('p', {
                text: `成功删除 ${this.result.deletedCount} 个文件，释放 ${CleanupUtils.formatFileSize(this.result.deletedSize)} 空间。`
            });
        }

        const okButton = contentEl.createEl('button', { text: '确定', cls: 'mod-cta' });
        okButton.style.marginTop = '20px';
        okButton.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
