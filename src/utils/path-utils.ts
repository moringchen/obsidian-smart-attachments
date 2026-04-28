import type { TFile, Vault } from 'obsidian';
import { FILE_TYPE_MAP } from '../types';

const MANAGED_RESOURCE_TYPES = ['images', 'audio', 'videos', 'documents', 'archives', 'code', 'files'] as const;

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
        const resourceRoot = this.getResourceRoot(vault, resourceFolderName);
        const subFolder = this.getSubFolderByType(fileExtension);
        const relativePath = this.getRelativePathFromVault(mdFile);

        const parts = [resourceRoot, subFolder];
        if (relativePath) {
            parts.push(relativePath);
        }

        return parts.join('/');
    }

    /**
     * Get vault root path using FileSystemAdapter
     */
    static getVaultRoot(vault: Vault): string {
        const adapter = vault.adapter as { getBasePath?: () => string };
        if (typeof adapter.getBasePath === 'function') {
            return adapter.getBasePath();
        }

        return vault.getName();
    }

    static getResourceRoot(vault: Vault, resourceFolderName: string): string {
        const vaultRoot = this.getVaultRoot(vault);
        const absoluteResourceRoot = `${vaultRoot}/../${resourceFolderName}`;
        return vaultRoot.includes(`/${resourceFolderName}`) ? vaultRoot : absoluteResourceRoot;
    }

    static resolveManagedResourcePath(vault: Vault, resourceFolderName: string, resourcePath: string): string {
        const vaultRoot = this.getVaultRoot(vault);
        const resourceRelativePath = resourcePath.replace(/^resources\//, `${resourceFolderName}/`);
        return vaultRoot.includes(`/${resourceFolderName}`)
            ? `${vaultRoot}/${resourceRelativePath}`
            : `${vaultRoot}/../${resourceRelativePath}`;
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

    static getManagedResourceTypes(): readonly string[] {
        return MANAGED_RESOURCE_TYPES;
    }

    static getManagedResourceDirPrefixes(relativeDir: string): string[] {
        return MANAGED_RESOURCE_TYPES.map(type => `resources/${type}${relativeDir ? `/${relativeDir}` : ''}`);
    }

    static mapManagedResourceDir(resourceDir: string, oldDir: string, newDir: string): string {
        const oldSuffix = oldDir ? `/${oldDir}` : '';
        const newSuffix = newDir ? `/${newDir}` : '';
        return resourceDir.endsWith(oldSuffix)
            ? `${resourceDir.slice(0, resourceDir.length - oldSuffix.length)}${newSuffix}`
            : resourceDir;
    }
}
