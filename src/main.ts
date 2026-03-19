import { Plugin, TFile, MarkdownView, Editor } from 'obsidian';
import { SmartAttachmentsSettings, DEFAULT_SETTINGS } from './settings';
import { SmartAttachmentsSettingTab } from './settings-tab';
import { PasteHandler } from './handlers/paste-handler';
import { DropHandler } from './handlers/drop-handler';

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
                this.handlePaste(evt, editor, view);
            })
        );

        // Register drop event handler
        this.registerEvent(
            this.app.workspace.on('editor-drop', (evt: DragEvent, editor: Editor, view: MarkdownView) => {
                this.handleDrop(evt, editor, view);
            })
        );

        // Add settings tab
        this.addSettingTab(new SmartAttachmentsSettingTab(this.app, this));

        console.log('Smart Attachments plugin loaded');
    }

    onunload() {
        console.log('Smart Attachments plugin unloaded');
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
}
