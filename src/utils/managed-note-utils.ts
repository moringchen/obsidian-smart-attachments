import type { TAbstractFile, TFile } from 'obsidian';

export function isManagedNoteLikePath(path: string): boolean {
    const lastSlash = path.lastIndexOf('/');
    const fileName = lastSlash === -1 ? path : path.slice(lastSlash + 1);
    const lastDot = fileName.lastIndexOf('.');

    if (lastDot === -1) {
        return fileName.length > 0;
    }

    return fileName.slice(lastDot + 1).toLowerCase() === 'md';
}

export function isManagedNoteFile(file: TFile): boolean {
    return isManagedNoteLikePath(file.path);
}

export function isManagedNoteAbstractFile(file: TAbstractFile | null): file is TFile {
    return !!file && typeof (file as { path?: unknown }).path === 'string' && isManagedNoteFile(file as TFile);
}

export function countSiblingManagedNotes(paths: string[], currentPath: string): number {
    const currentDir = currentPath.includes('/') ? currentPath.slice(0, currentPath.lastIndexOf('/')) : '';

    return paths.filter(path => {
        if (path === currentPath || !isManagedNoteLikePath(path)) {
            return false;
        }

        const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
        return dir === currentDir;
    }).length;
}
