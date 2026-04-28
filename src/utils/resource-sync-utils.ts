export interface ResourceMoveOperation {
    from: string;
    to: string;
}

export interface ResourceCopyOperation {
    from: string;
    to: string;
}

export interface ResourceSyncSummary {
    movedDirectories: ResourceMoveOperation[];
    copiedFiles: ResourceCopyOperation[];
    updatedLinks: number;
    missingResources: string[];
    failedTargets: string[];
}

export function createEmptyResourceSyncSummary(): ResourceSyncSummary {
    return {
        movedDirectories: [],
        copiedFiles: [],
        updatedLinks: 0,
        missingResources: [],
        failedTargets: []
    };
}

export function formatResourceSyncSummary(summary: ResourceSyncSummary): string {
    const parts: string[] = [];

    if (summary.movedDirectories.length > 0) {
        parts.push(`已移动 ${summary.movedDirectories.length} 个资源目录`);
    }
    if (summary.copiedFiles.length > 0) {
        parts.push(`已复制 ${summary.copiedFiles.length} 个资源`);
    }
    if (summary.updatedLinks > 0) {
        parts.push(`已更新 ${summary.updatedLinks} 个链接`);
    }
    if (summary.missingResources.length > 0) {
        parts.push(`${summary.missingResources.length} 个资源缺失`);
    }
    if (summary.failedTargets.length > 0) {
        parts.push(`${summary.failedTargets.length} 个目标处理失败`);
    }

    return parts.join('，');
}
