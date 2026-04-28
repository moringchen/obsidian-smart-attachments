import type { TFile, Vault } from 'obsidian';
import { rewriteManagedResourcePrefix } from '../utils/managed-link-utils';
import { isManagedNoteFile } from '../utils/managed-note-utils';
import { PathUtils } from '../utils/path-utils';
import { createEmptyResourceSyncSummary, ResourceMoveOperation } from '../utils/resource-sync-utils';

interface DirectoryMovePlanInput {
    oldDir: string;
    newDir: string;
    managedFiles: string[];
    availableResourceDirs: string[];
}

interface DirectoryMovePlan {
    directoryMoves: ResourceMoveOperation[];
    filesToRewrite: string[];
}

export function createDirectoryMovePlan(input: DirectoryMovePlanInput): DirectoryMovePlan {
    const wantedDirs = new Set(PathUtils.getManagedResourceDirPrefixes(input.oldDir));
    const directoryMoves = input.availableResourceDirs
        .filter(dir => wantedDirs.has(dir))
        .map(dir => ({
            from: dir,
            to: PathUtils.mapManagedResourceDir(dir, input.oldDir, input.newDir)
        }));

    return {
        directoryMoves,
        filesToRewrite: input.managedFiles
    };
}

export function rewriteDirectoryMoveContent(content: string, oldDir: string, newDir: string) {
    return rewriteManagedResourcePrefix(content, oldDir, newDir);
}

export async function syncMovedDirectory(
    vault: Vault,
    oldDir: string,
    newDir: string,
    resourceFolderName: string
) {
    const summary = createEmptyResourceSyncSummary();
    const managedFiles = vault.getFiles().filter(file => isManagedNoteFile(file) && file.path.startsWith(`${newDir}/`));
    const availableResourceDirs = PathUtils.getManagedResourceDirPrefixes(oldDir)
        .map(dir => ({ logical: dir, actual: PathUtils.resolveManagedResourcePath(vault, resourceFolderName, dir) }));

    for (const candidate of availableResourceDirs) {
        if (!(await vault.adapter.exists(candidate.actual))) {
            continue;
        }

        const targetLogical = PathUtils.mapManagedResourceDir(candidate.logical, oldDir, newDir);
        const targetActual = PathUtils.resolveManagedResourcePath(vault, resourceFolderName, targetLogical);
        await vault.adapter.rename(candidate.actual, targetActual);
        summary.movedDirectories.push({ from: candidate.logical, to: targetLogical });
    }

    for (const file of managedFiles as TFile[]) {
        const content = await vault.cachedRead(file);
        const rewrite = rewriteDirectoryMoveContent(content, oldDir, newDir);
        if (rewrite.updatedCount === 0) {
            continue;
        }

        await vault.modify(file, rewrite.content);
        summary.updatedLinks += rewrite.updatedCount;
    }

    return summary;
}
