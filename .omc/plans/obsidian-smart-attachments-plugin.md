# Obsidian 智能附件管理插件开发计划

## 项目概述

创建一个 Obsidian 插件，当用户从网络或本地复制/粘贴文件到 Markdown 文件时，自动将文件组织到与 Vault 根目录同级的 `resources` 目录下，并保持与 Markdown 文件相同的相对目录结构。

## 需求摘要

### 核心功能
1. **文件类型**: 支持所有附件文件（图片、PDF、音频、视频等）
2. **目录结构**:
   - 资源目录: `{vault-root}/../resources/`
   - 子目录结构: `resources/{file-type}/{markdown-relative-path}/`
3. **链接格式**: Obsidian WikiLinks 格式 `![[resources/images/path/image.png]]`
4. **重复处理**: 自动重命名，添加数字后缀 (image.png → image-1.png)

### 示例
```
Vault 结构:
my-vault/
├── notes/
│   └── projects/
│       └── readme.md
└── .obsidian/

粘贴图片到 readme.md 后:
resources/
├── images/
│   └── notes/
│       └── projects/
│           └── image.png  ← 图片存放位置
```

Markdown 内容: `![[resources/images/notes/projects/image.png]]`

---

## 验收标准 (可测试)

### 功能验收
- [ ] 从剪贴板粘贴图片时，图片被正确保存到 `resources/images/{relative-path}/`
- [ ] 从本地拖拽文件时，文件被正确复制到对应资源目录
- [ ] Markdown 中自动插入正确的 WikiLinks 格式链接
- [ ] 重复文件名自动添加数字后缀 (image.png → image-1.png → image-2.png)
- [ ] 支持多种文件类型: jpg, png, gif, webp, svg, pdf, mp3, mp4 等
- [ ] 插件设置页面允许配置资源目录名称 (默认: resources)
- [ ] 插件设置页面允许配置链接格式 (WikiLinks / Standard Markdown)

### 边界情况
- [ ] 当 Markdown 文件位于根目录时，图片保存到 `resources/images/`
- [ ] 资源目录不存在时自动创建
- [ ] 文件名包含特殊字符时正确处理
- [ ] 大文件 (>100MB) 粘贴时有适当提示或限制

---

## 实现步骤

### Phase 1: 项目初始化
1. **创建插件结构**
   - 使用官方插件模板创建基础结构
   - 文件: `manifest.json`, `main.ts`, `styles.css`, `esbuild.config.mjs`

2. **配置开发环境**
   - TypeScript 配置
   - Obsidian API 类型定义
   - ESLint + Prettier

### Phase 2: 核心功能实现
3. **事件监听**
   - 监听粘贴事件 (`paste`)
   - 监听拖拽事件 (`drop`)
   - 拦截 Obsidian 默认的文件处理行为

4. **路径计算**
   - 获取当前 Markdown 文件路径
   - 计算相对于 Vault 根目录的相对路径
   - 构建目标资源目录路径

5. **文件处理**
   - 从剪贴板读取文件数据
   - 生成目标文件名 (处理重复)
   - 写入文件到目标目录
   - 在 Markdown 中插入链接

### Phase 3: 设置与配置
6. **设置界面**
   - 资源目录名称配置
   - 链接格式选择 (WikiLinks / Standard)
   - 文件类型白名单/黑名单
   - 重复文件处理策略

### Phase 4: 优化与测试
7. **错误处理**
   - 文件写入失败处理
   - 权限问题处理
   - 磁盘空间检查

8. **用户体验优化**
   - 添加进度提示
   - 大文件警告
   - 操作成功/失败通知

---

## 技术架构

### 文件结构
```
obsidian-smart-attachments/
├── src/
│   ├── main.ts              # 插件入口
│   ├── settings.ts          # 设置定义
│   ├── settings-tab.ts      # 设置界面
│   ├── handlers/
│   │   ├── paste-handler.ts # 粘贴事件处理
│   │   └── drop-handler.ts  # 拖拽事件处理
│   ├── utils/
│   │   ├── path-utils.ts    # 路径计算工具
│   │   ├── file-utils.ts    # 文件操作工具
│   │   └── link-utils.ts    # 链接格式工具
│   └── types.ts             # 类型定义
├── manifest.json            # 插件清单
├── package.json             # 依赖配置
├── tsconfig.json            # TypeScript 配置
└── esbuild.config.mjs       # 构建配置
```

### 关键依赖
- `obsidian`: Obsidian API
- `@types/node`: Node.js 类型
- `esbuild`: 构建工具

### 核心类设计

```typescript
// main.ts
export default class SmartAttachmentsPlugin extends Plugin {
  settings: SmartAttachmentsSettings;

  async onload() {
    // 初始化设置
    // 注册事件处理器
  }

  // 处理文件粘贴
  async handlePaste(evt: ClipboardEvent, editor: Editor): Promise<boolean>

  // 处理文件拖拽
  async handleDrop(evt: DragEvent, editor: Editor): Promise<boolean>
}

// handlers/paste-handler.ts
export class PasteHandler {
  async handle(evt: ClipboardEvent): Promise<FileAttachment | null>
}

// utils/path-utils.ts
export class PathUtils {
  // 计算资源目录路径
  static getResourcePath(vault: Vault, mdFile: TFile): string

  // 获取唯一文件名
  static getUniqueFileName(dir: string, baseName: string): string
}

// utils/link-utils.ts
export class LinkUtils {
  // 生成 WikiLink
  static toWikiLink(resourcePath: string): string

  // 生成标准 Markdown 链接
  static toMarkdownLink(resourcePath: string, alt?: string): string
}
```

---

## 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Obsidian API 变化 | 中 | 使用官方稳定 API，定期更新测试 |
| 文件权限问题 | 高 | 添加权限检查和用户友好错误提示 |
| 大文件导致性能问题 | 中 | 添加文件大小限制配置，异步处理 |
| 与其他插件冲突 | 中 | 提供禁用选项，遵循 Obsidian 插件最佳实践 |
| 路径分隔符跨平台问题 | 低 | 使用 Node.js path 模块处理路径 |

---

## 验证步骤

### 手动测试清单
1. 创建新的 Obsidian Vault
2. 安装插件并启用
3. 测试用例:
   - [ ] 复制网络图片到 Markdown (根目录)
   - [ ] 复制网络图片到子目录 Markdown
   - [ ] 拖拽本地图片文件
   - [ ] 拖拽 PDF 文件
   - [ ] 粘贴同名图片 (检查重命名)
   - [ ] 检查生成的链接格式
   - [ ] 修改设置后测试

### 自动化测试
- 单元测试: 路径计算、文件名生成
- 集成测试: 文件操作、事件处理

---

## 发布准备

### 清单
- [ ] 版本号更新 (manifest.json, versions.json, package.json)
- [ ] 更新 README.md (安装说明、功能介绍、截图)
- [ ] 创建 release 标签
- [ ] 提交到社区插件列表 (可选)

---

## 时间估算

| 阶段 | 预计时间 |
|------|----------|
| Phase 1: 项目初始化 | 30 分钟 |
| Phase 2: 核心功能 | 2-3 小时 |
| Phase 3: 设置与配置 | 1 小时 |
| Phase 4: 优化与测试 | 1-2 小时 |
| **总计** | **4-6 小时** |

---

## 扩展功能 (未来版本)

- [ ] 支持自定义资源子目录命名规则
- [ ] 图片压缩/优化选项
- [ ] 批量移动现有附件到资源目录
- [ ] 云存储集成 (S3, etc.)
- [ ] 附件引用统计和管理

---

## 参考资源

- [Obsidian 插件开发文档](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API 参考](https://docs.obsidian.md/Reference/TypeScript+API/)
- [示例插件](https://github.com/obsidianmd/obsidian-sample-plugin)
