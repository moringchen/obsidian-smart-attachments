import { Plugin, MarkdownView, Editor, Notice, TAbstractFile, TFile, TFolder } from 'obsidian';
import { SmartAttachmentsSettings, DEFAULT_SETTINGS } from './settings';
import { SmartAttachmentsSettingTab } from './settings-tab';
import { PasteHandler } from './handlers/paste-handler';
import { DropHandler } from './handlers/drop-handler';
import { CleanupUtils, CleanupConfirmModal, CleanupResultModal, CleanupResult } from './utils/cleanup-utils';
import { isManagedNoteFile, isManagedNoteLikePath } from './utils/managed-note-utils';
import { PathUtils } from './utils/path-utils';
import { syncMovedDirectory } from './services/directory-move-sync';
import { syncMovedManagedNote } from './services/note-move-sync';
import { formatResourceSyncSummary } from './utils/resource-sync-utils';

export { isManagedNoteLikePath } from './utils/managed-note-utils';
export {
    extractManagedResourceLinks,
    listManagedResourcePaths,
    rewriteManagedResourcePrefix
} from './utils/managed-link-utils';
export const getManagedResourceDirPrefixes = PathUtils.getManagedResourceDirPrefixes;
export const mapManagedResourceDir = PathUtils.mapManagedResourceDir;
export { createDirectoryMovePlan, rewriteDirectoryMoveContent } from './services/directory-move-sync';
export { createNoteMovePlan } from './services/note-move-sync';
export { formatResourceSyncSummary } from './utils/resource-sync-utils';

export default class SmartAttachmentsPlugin extends Plugin {
    settings: SmartAttachmentsSettings;
    private pasteHandler: PasteHandler;
    private dropHandler: DropHandler;

    async onload() {
        await this.loadSettings();

        // Initialize handlers
        this.pasteHandler = new PasteHandler(this.app.vault, this.settings);
        this.dropHandler = new DropHandler(this.app.vault, this.settings);

        // Register paste event handler
        this.registerEvent(
            this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor, view: MarkdownView) => {
                void this.handlePaste(evt, editor, view);
            })
        );

        // Register drop event handler
        this.registerEvent(
            this.app.workspace.on('editor-drop', (evt: DragEvent, editor: Editor, view: MarkdownView) => {
                void this.handleDrop(evt, editor, view);
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
                void this.handleVaultRename(file, oldPath);
            })
        );

        // Add command for cleaning up orphaned attachments
        this.addCommand({
            id: 'cleanup-orphaned-attachments',
            name: '清理孤立附件',
            callback: () => {
                void this.cleanupOrphanedAttachments();
            }
        });

        // Add settings tab
        this.addSettingTab(new SmartAttachmentsSettingTab(this.app, this));

        console.debug('Smart Attachments plugin loaded');
    }

    onunload() {
        console.debug('Smart Attachments plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Update handlers with new settings
        this.pasteHandler = new PasteHandler(this.app.vault, this.settings);
        this.dropHandler = new DropHandler(this.app.vault, this.settings);
    }

    /**
     * Handle paste event
     */
    private async handlePaste(evt: ClipboardEvent, editor: Editor, view: MarkdownView): Promise<void> {
        const noteFile = view.file;
        if (!noteFile) {
            return;
        }

        if (!isManagedNoteFile(noteFile)) {
            return;
        }

        const handled = await this.pasteHandler.handle(evt, editor, noteFile);
        if (handled) {
            // Event was handled by our plugin
            return;
        }
        // Let default handler process if not handled
    }

    /**
     * Handle drop event
     */
    private async handleDrop(evt: DragEvent, editor: Editor, view: MarkdownView): Promise<void> {
        const noteFile = view.file;
        if (!noteFile) {
            return;
        }

        if (!isManagedNoteFile(noteFile)) {
            return;
        }

        const handled = await this.dropHandler.handle(evt, editor, noteFile);
        if (handled) {
            // Event was handled by our plugin
            return;
        }
        // Let default handler process if not handled
    }

    private async handleVaultRename(file: TAbstractFile, oldPath: string): Promise<void> {
        if (file instanceof TFolder) {
            const result = await syncMovedDirectory(this.app.vault, oldPath, file.path, this.settings.resourceFolderName);
            if (result.movedDirectories.length > 0 || result.updatedLinks > 0) {
                new Notice(formatResourceSyncSummary(result), 5000);
            }
            return;
        }

        if (file instanceof TFile && isManagedNoteFile(file)) {
            const oldDir = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : '';
            const newDir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
            if (oldDir === newDir) {
                return;
            }

            const result = await syncMovedManagedNote(this.app.vault, file, oldPath, this.settings.resourceFolderName);
            if (result.movedDirectories.length > 0 || result.copiedFiles.length > 0 || result.updatedLinks > 0 || result.missingResources.length > 0) {
                new Notice(formatResourceSyncSummary(result), 5000);
            }
        }
    }

    /**
     * Clean up orphaned attachment files
     */
    async cleanupOrphanedAttachments(): Promise<void> {
        const cleanupUtils = new CleanupUtils(this.app.vault, this.settings);

        new Notice('正在扫描孤立附件...', 3000);

        try {
            const result = await cleanupUtils.scanOrphanedFiles();

            if (result.orphanedFiles.length === 0) {
                new Notice('没有发现孤立附件！', 3000);
                return;
            }

            if (this.settings.showCleanupConfirmation) {
                new CleanupConfirmModal(
                    this.app,
                    result.orphanedFiles,
                    result.totalSize,
                    () => {
                        void this.finishCleanup(cleanupUtils, result);
                    }
                ).open();
                return;
            }

            await this.finishCleanup(cleanupUtils, result);
        } catch (err) {
            console.error('Error cleaning up orphaned attachments:', err);
            new Notice('清理失败: ' + (err as Error).message, 5000);
        }
    }

    private async finishCleanup(cleanupUtils: CleanupUtils, result: CleanupResult): Promise<void> {
        const deleteResult = await cleanupUtils.deleteOrphanedFiles(result.orphanedFiles);

        if (this.settings.showCleanupConfirmation) {
            new CleanupResultModal(this.app, {
                ...result,
                deletedCount: deleteResult.deletedCount,
                deletedSize: deleteResult.deletedSize
            }).open();
        }

        if (deleteResult.deletedCount > 0) {
            const message = this.settings.showCleanupConfirmation
                ? `已清理 ${deleteResult.deletedCount} 个孤立附件，释放 ${CleanupUtils.formatFileSize(deleteResult.deletedSize)}`
                : `已自动清理 ${deleteResult.deletedCount} 个孤立附件，释放 ${CleanupUtils.formatFileSize(deleteResult.deletedSize)}`;

            new Notice(message, 5000);
        }
    }
}
