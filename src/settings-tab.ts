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

        containerEl.createEl('h2', { text: 'Smart Attachments Settings' });

        // Resource folder name setting
        new Setting(containerEl)
            .setName('Resource folder name')
            .setDesc('The name of the folder where attachments will be stored (will be created as sibling to your vault)')
            .addText(text => text
                .setPlaceholder('resources')
                .setValue(this.plugin.settings.resourceFolderName)
                .onChange(async (value) => {
                    this.plugin.settings.resourceFolderName = value || 'resources';
                    await this.plugin.saveSettings();
                }));

        // Link format setting
        new Setting(containerEl)
            .setName('Link format')
            .setDesc('How links to attachments should be formatted in your notes')
            .addDropdown(dropdown => dropdown
                .addOption(LinkFormat.WIKILINK, 'WikiLinks (![[path/to/file.png]])')
                .addOption(LinkFormat.MARKDOWN, 'Markdown (![alt](path/to/file.png))')
                .setValue(this.plugin.settings.linkFormat)
                .onChange(async (value) => {
                    this.plugin.settings.linkFormat = value as LinkFormat;
                    await this.plugin.saveSettings();
                }));

        // Auto rename duplicates setting
        new Setting(containerEl)
            .setName('Auto-rename duplicates')
            .setDesc('When a file with the same name exists, automatically rename it (e.g., image.png → image-1.png)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoRenameDuplicates)
                .onChange(async (value) => {
                    this.plugin.settings.autoRenameDuplicates = value;
                    await this.plugin.saveSettings();
                }));

        // Information section
        containerEl.createEl('h3', { text: 'How it works' });

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
