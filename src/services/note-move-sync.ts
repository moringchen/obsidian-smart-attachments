import type { TFile, Vault } from 'obsidian';
import { listManagedResourcePaths, rewriteManagedResourcePrefix } from '../utils/managed-link-utils';
import { countSiblingManagedNotes } from '../utils/managed-note-utils';
import { PathUtils } from '../utils/path-utils';
import { createEmptyResourceSyncSummary } from '../utils/resource-sync-utils';

interface NoteMovePlanInput {
    oldDir: string;
    newDir: string;
    currentFileLinks: string[];
    siblingManagedNoteCount: number;
}

interface NoteMovePlan {
    mode: 'move-directory' | 'copy-links';
    copyOperations: Array<{ from: string; to: string }>;
}

export function createNoteMovePlan(input: NoteMovePlanInput): NoteMovePlan {
    if (input.siblingManagedNoteCount === 0) {
        return {
            mode: 'move-directory',
            copyOperations: []
        };
    }

    return {
        mode: 'copy-links',
        copyOperations: input.currentFileLinks.map(link => {
            const firstSlash = link.indexOf('/', 'resources/'.length);
            const resourceTypePrefix = firstSlash === -1 ? link : link.slice(0, firstSlash);
            const resourceRelativePath = firstSlash === -1 ? '' : link.slice(firstSlash);
            const oldDirSuffix = input.oldDir ? `/${input.oldDir}` : '';

            return {
                from: link,
                to: resourceRelativePath.startsWith(`${oldDirSuffix}/`)
                    ? `${resourceTypePrefix}/${input.newDir}${resourceRelativePath.slice(oldDirSuffix.length)}`
                    : link
            };
        })
    };
}

async function ensureDirectoryExists(vault: Vault, dirPath: string): Promise<void> {
    if (await vault.adapter.exists(dirPath)) {
        return;
    }
    await vault.adapter.mkdir(dirPath);
}

async function moveDirectory(vault: Vault, fromDir: string, toDir: string): Promise<void> {
    if (!(await vault.adapter.exists(toDir))) {
        await ensureDirectoryExists(vault, toDir.slice(0, toDir.lastIndexOf('/')));
        await vault.adapter.rename(fromDir, toDir);
        return;
    }

    const entries = await vault.adapter.list(fromDir);
    for (const file of entries.files) {
        const target = `${toDir}/${file.slice(file.lastIndexOf('/') + 1)}`;
        await vault.adapter.rename(file, target);
    }

    for (const folder of entries.folders) {
        const target = `${toDir}/${folder.slice(folder.lastIndexOf('/') + 1)}`;
        await moveDirectory(vault, folder, target);
    }

    await vault.adapter.rmdir(fromDir, false);
}

export async function syncMovedManagedNote(
    vault: Vault,
    file: TFile,
    oldPath: string,
    resourceFolderName: string
) {
    const summary = createEmptyResourceSyncSummary();
    const oldDir = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : '';
    const newDir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
    const siblingManagedNoteCount = countSiblingManagedNotes(vault.getFiles().map(item => item.path), oldPath);
    const content = await vault.cachedRead(file);
    const currentFileLinks = listManagedResourcePaths(content);
    const plan = createNoteMovePlan({ oldDir, newDir, currentFileLinks, siblingManagedNoteCount });

    if (plan.mode === 'move-directory') {
        for (const resourceDir of PathUtils.getManagedResourceDirPrefixes(oldDir)) {
            const from = PathUtils.resolveManagedResourcePath(vault, resourceFolderName, resourceDir);
            if (!(await vault.adapter.exists(from))) {
                continue;
            }

            const targetLogical = PathUtils.mapManagedResourceDir(resourceDir, oldDir, newDir);
            const to = PathUtils.resolveManagedResourcePath(vault, resourceFolderName, targetLogical);
            await moveDirectory(vault, from, to);
            summary.movedDirectories.push({ from: resourceDir, to: targetLogical });
        }

        const rewrite = rewriteManagedResourcePrefix(content, oldDir, newDir);
        if (rewrite.updatedCount > 0) {
            await vault.modify(file, rewrite.content);
            summary.updatedLinks += rewrite.updatedCount;
        }
        return summary;
    }

    let nextContent = content;
    for (const operation of plan.copyOperations) {
        const from = PathUtils.resolveManagedResourcePath(vault, resourceFolderName, operation.from);
        const to = PathUtils.resolveManagedResourcePath(vault, resourceFolderName, operation.to);
        if (!(await vault.adapter.exists(from))) {
            summary.missingResources.push(operation.from);
            continue;
        }

        const parent = to.slice(0, to.lastIndexOf('/'));
        await ensureDirectoryExists(vault, parent);

        const bytes = await vault.adapter.readBinary(from);
        await vault.adapter.writeBinary(to, bytes);
        summary.copiedFiles.push(operation);
        nextContent = nextContent.split(operation.from).join(operation.to);
        summary.updatedLinks += 1;
    }

    if (summary.updatedLinks > 0) {
        await vault.modify(file, nextContent);
    }

    return summary;
}
