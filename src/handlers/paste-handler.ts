import { Editor, Notice, TFile, Vault } from 'obsidian';
import { PathUtils } from '../utils/path-utils';
import { LinkUtils } from '../utils/link-utils';
import { SmartAttachmentsSettings } from '../types';

export class PasteHandler {
    constructor(
        private vault: Vault,
        private settings: SmartAttachmentsSettings
    ) {}

    /**
     * Handle paste event
     * Returns true if handled, false to let default handler process
     */
    async handle(evt: ClipboardEvent, editor: Editor, mdFile: TFile): Promise<boolean> {
        const files = evt.clipboardData?.files;
        if (!files || files.length === 0) {
            return false;
        }

        const supportedFiles = Array.from(files);
        if (supportedFiles.length === 0) {
            return false;
        }

        evt.preventDefault();
        evt.stopPropagation();

        try {
            for (const file of supportedFiles) {
                await this.processFile(file, editor, mdFile);
            }
            new Notice(`Successfully processed ${supportedFiles.length} file(s)`);
            return true;
        } catch (error) {
            console.error('Error processing pasted files:', error);
            new Notice(`Error processing files: ${(error as Error).message}`, 5000);
            return true;
        }
    }

    /**
     * Process a single file: save to resources and insert link
     */
    private async processFile(file: File, editor: Editor, mdFile: TFile): Promise<void> {
        const extension = PathUtils.getFileExtension(file.name);
        const sanitizedName = PathUtils.sanitizeFileName(file.name);

        // Build resource paths
        const resourceDir = PathUtils.buildResourcePath(
            this.vault,
            mdFile,
            extension,
            this.settings.resourceFolderName
        );

        const resourceLinkPath = PathUtils.buildResourceLinkPath(
            mdFile,
            extension,
            this.settings.resourceFolderName
        );

        // Ensure directory exists
        await this.ensureDirectoryExists(resourceDir);

        // Get unique filename
        const finalFileName = this.settings.autoRenameDuplicates
            ? await this.getUniqueFileName(resourceDir, sanitizedName)
            : sanitizedName;

        // Full path for saving
        const fullPath = `${resourceDir}/${finalFileName}`;

        // Save file
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await this.vault.adapter.writeBinary(fullPath, uint8Array);

        // Generate and insert link
        const fullResourcePath = `${resourceLinkPath}/${finalFileName}`;
        const link = LinkUtils.generateLink(
            this.settings.linkFormat,
            fullResourcePath,
            finalFileName
        );

        // Insert at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(link, cursor);

        // Move cursor to end of inserted link
        const newCursor = {
            line: cursor.line,
            ch: cursor.ch + link.length
        };
        editor.setCursor(newCursor);

        // Add newline after image for better formatting
        editor.replaceRange('\n', newCursor);
        editor.setCursor({
            line: newCursor.line + 1,
            ch: 0
        });
    }

    /**
     * Ensure the resource directory exists
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            const exists = await this.vault.adapter.exists(dirPath);
            if (!exists) {
                await this.vault.adapter.mkdir(dirPath);
            }
        } catch (error) {
            console.error('Error creating directory:', error);
            throw new Error(`Failed to create directory: ${dirPath}`);
        }
    }

    /**
     * Get a unique filename by checking existing files
     */
    private async getUniqueFileName(dirPath: string, fileName: string): Promise<string> {
        try {
            const list = await this.vault.adapter.list(dirPath);
            const existingFiles = new Set(list.files.map(f => {
                const parts = f.split('/');
                return parts[parts.length - 1];
            }));
            return PathUtils.generateUniqueFileName(fileName, existingFiles);
        } catch {
            // If directory doesn't exist yet, no duplicates possible
            return fileName;
        }
    }
}
