import { Plugin, MarkdownView, Editor, Notice } from 'obsidian';
import { SmartAttachmentsSettings, DEFAULT_SETTINGS } from './settings';
import { SmartAttachmentsSettingTab } from './settings-tab';
import { PasteHandler } from './handlers/paste-handler';
import { DropHandler } from './handlers/drop-handler';
import { CleanupUtils, CleanupConfirmModal, CleanupResultModal } from './utils/cleanup-utils';

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

        // Add command for cleaning up orphaned attachments
        this.addCommand({
            id: 'cleanup-orphaned-attachments',
            name: '清理孤立附件',
            callback: () => {
                this.cleanupOrphanedAttachments();
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
        const mdFile = view.file;
        if (!mdFile) {
            return;
        }

        // Only process markdown files
        if (mdFile.extension !== 'md') {
            return;
        }

        const handled = await this.pasteHandler.handle(evt, editor, mdFile);
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
        const mdFile = view.file;
        if (!mdFile) {
            return;
        }

        // Only process markdown files
        if (mdFile.extension !== 'md') {
            return;
        }

        const handled = await this.dropHandler.handle(evt, editor, mdFile);
        if (handled) {
            // Event was handled by our plugin
            return;
        }
        // Let default handler process if not handled
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

            // Show confirmation modal
            if (this.settings.showCleanupConfirmation) {
                new CleanupConfirmModal(
                    this.app,
                    result.orphanedFiles,
                    result.totalSize,
                    async () => {
                        // User confirmed, delete files
                        const deleteResult = await cleanupUtils.deleteOrphanedFiles(result.orphanedFiles);

                        new CleanupResultModal(this.app, {
                            ...result,
                            deletedCount: deleteResult.deletedCount,
                            deletedSize: deleteResult.deletedSize
                        }).open();

                        if (deleteResult.deletedCount > 0) {
                            new Notice(
                                `已清理 ${deleteResult.deletedCount} 个孤立附件，释放 ${CleanupUtils.formatFileSize(deleteResult.deletedSize)}`,
                                5000
                            );
                        }
                    }
                ).open();
            } else {
                // Auto delete without confirmation
                const deleteResult = await cleanupUtils.deleteOrphanedFiles(result.orphanedFiles);

                if (deleteResult.deletedCount > 0) {
                    new Notice(
                        `已自动清理 ${deleteResult.deletedCount} 个孤立附件，释放 ${CleanupUtils.formatFileSize(deleteResult.deletedSize)}`,
                        5000
                    );
                }
            }
        } catch (err) {
            console.error('Error cleaning up orphaned attachments:', err);
            new Notice('清理失败: ' + (err as Error).message, 5000);
        }
    }
}
