import { TFile, Vault, FileSystemAdapter } from 'obsidian';
import { FILE_TYPE_MAP } from '../types';

export class PathUtils {
    /**
     * Get the file extension from a filename
     */
    static getFileExtension(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
    }

    /**
     * Get the subfolder name based on file type
     */
    static getSubFolderByType(extension: string): string {
        return FILE_TYPE_MAP[extension] || 'files';
    }

    /**
     * Get the relative path of a markdown file from vault root
     */
    static getRelativePathFromVault(file: TFile): string {
        const path = file.path;
        const lastSlash = path.lastIndexOf('/');
        return lastSlash === -1 ? '' : path.substring(0, lastSlash);
    }

    /**
     * Build the resource directory path
     * Returns: {vault-parent}/resources/{file-type}/{md-relative-path}/
     */
    static buildResourcePath(
        vault: Vault,
        mdFile: TFile,
        fileExtension: string,
        resourceFolderName: string
    ): string {
        // Get vault root
        const vaultRoot = this.getVaultRoot(vault);
        const subFolder = this.getSubFolderByType(fileExtension);
        const relativePath = this.getRelativePathFromVault(mdFile);

        // Build path: vault-parent/resources/file-type/relative-path
        const parts = [vaultRoot, '..', resourceFolderName, subFolder];
        if (relativePath) {
            parts.push(relativePath);
        }

        return parts.join('/');
    }

    /**
     * Get vault root path using FileSystemAdapter
     */
    private static getVaultRoot(vault: Vault): string {
        // Check if we're on desktop with FileSystemAdapter
        if (vault.adapter instanceof FileSystemAdapter) {
            return vault.adapter.getBasePath();
        }

        // Mobile fallback: use vault name to construct path
        // On mobile, we can't access the file system directly
        // so we'll store resources inside the vault
        return vault.getName();
    }

    /**
     * Build the relative resource path for linking in markdown
     * Returns: resources/file-type/relative-path/filename
     */
    static buildResourceLinkPath(
        mdFile: TFile,
        fileExtension: string,
        resourceFolderName: string
    ): string {
        const subFolder = this.getSubFolderByType(fileExtension);
        const relativePath = this.getRelativePathFromVault(mdFile);

        const parts = [resourceFolderName, subFolder];
        if (relativePath) {
            parts.push(relativePath);
        }

        return parts.join('/');
    }

    /**
     * Generate a unique filename by adding numeric suffix if file exists
     * e.g., image.png -> image-1.png -> image-2.png
     */
    static generateUniqueFileName(
        baseName: string,
        existingFiles: Set<string>
    ): string {
        if (!existingFiles.has(baseName)) {
            return baseName;
        }

        const lastDot = baseName.lastIndexOf('.');
        const name = lastDot === -1 ? baseName : baseName.substring(0, lastDot);
        const ext = lastDot === -1 ? '' : baseName.substring(lastDot);

        let counter = 1;
        let newName = `${name}-${counter}${ext}`;

        while (existingFiles.has(newName)) {
            counter++;
            newName = `${name}-${counter}${ext}`;
        }

        return newName;
    }

    /**
     * Sanitize filename to remove invalid characters
     */
    static sanitizeFileName(fileName: string): string {
        // Replace invalid characters with underscore
        return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
    }
}
