import { App, PluginSettingTab, Setting } from 'obsidian';
import SmartAttachmentsPlugin from './main';
import { LinkFormat } from './types';

export class SmartAttachmentsSettingTab extends PluginSettingTab {
    plugin: SmartAttachmentsPlugin;

    constructor(app: App, plugin: SmartAttachmentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Resource folder name setting
        new Setting(containerEl)
            .setName('Resource folder name')
            .setDesc('The name of the folder where attachments will be stored (will be created as sibling to your vault)')
            .addText(text => text
                .setPlaceholder('resources')
                .setValue(this.plugin.settings.resourceFolderName)
                .onChange((value) => {
                    this.plugin.settings.resourceFolderName = value || 'resources';
                    void this.plugin.saveSettings();
                }));

        // Link format setting
        new Setting(containerEl)
            .setName('Link format')
            .setDesc('How links to attachments should be formatted in your notes')
            .addDropdown(dropdown => dropdown
                .addOption(LinkFormat.WIKILINK, 'Wiki links (![[path/to/file.png]])')
                .addOption(LinkFormat.MARKDOWN, 'Markdown links (![alt](path/to/file.png))')
                .setValue(this.plugin.settings.linkFormat)
                .onChange((value) => {
                    this.plugin.settings.linkFormat = value as LinkFormat;
                    void this.plugin.saveSettings();
                }));

        // Auto rename duplicates setting
        new Setting(containerEl)
            .setName('Auto-rename duplicates')
            .setDesc('When a file with the same name exists, automatically rename it (e.g., image.png → image-1.png)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoRenameDuplicates)
                .onChange((value) => {
                    this.plugin.settings.autoRenameDuplicates = value;
                    void this.plugin.saveSettings();
                }));

        // Cleanup section
        new Setting(containerEl)
            .setName('Cleanup')
            .setHeading();

        // Show cleanup confirmation setting
        new Setting(containerEl)
            .setName('Show cleanup confirmation')
            .setDesc('Show a confirmation dialog before deleting orphaned attachments')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showCleanupConfirmation)
                .onChange((value) => {
                    this.plugin.settings.showCleanupConfirmation = value;
                    void this.plugin.saveSettings();
                }));

        // Manual cleanup button
        new Setting(containerEl)
            .setName('Clean up orphaned attachments')
            .setDesc('Scan and delete attachment files that are not referenced in any markdown file')
            .addButton(button => button
                .setButtonText('Clean up now')
                .setCta()
                .onClick(() => {
                    void this.plugin.cleanupOrphanedAttachments();
                }));

        // Information section
        new Setting(containerEl)
            .setName('How it works')
            .setHeading();

        const infoDiv = containerEl.createDiv();
        infoDiv.createEl('p', {
            text: 'When you paste or drop files into a markdown note, they will be organized in the following structure:'
        });

        const codeBlock = infoDiv.createEl('pre');
        codeBlock.createEl('code', {
            text: `your-vault/
├── notes/
│   └── project/
│       └── readme.md
└── .obsidian/

resources/                    (sibling to vault)
└── images/                   (organized by type)
    └── notes/
        └── project/
            └── image.png     (same relative path as markdown)`
        });

        infoDiv.createEl('p', {
            text: 'The plugin supports automatic organization by file type: images, audio, videos, documents, archives, and code files.'
        });
    }
}
