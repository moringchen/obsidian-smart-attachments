# Smart Attachments for Obsidian

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/moringchen/obsidian-smart-attachments?style=for-the-badge&sort=semver)](https://github.com/moringchen/obsidian-smart-attachments/releases/latest)
[![License](https://img.shields.io/github/license/moringchen/obsidian-smart-attachments?style=for-the-badge)](LICENSE)

Automatically organize your attachments into a structured resources folder that mirrors your vault's directory structure.

![Demo](https://raw.githubusercontent.com/moringchen/obsidian-smart-attachments/main/demo.gif)

## Features

- **Automatic Organization**: Files are organized by type (images, audio, videos, documents, etc.)
- **Mirrored Structure**: Attachments follow the same relative path as the markdown file they belong to
- **Duplicate Handling**: Automatically renames duplicates (e.g., `image.png` → `image-1.png`)
- **Flexible Linking**: Choose between WikiLinks or standard Markdown link formats
- **External Resources**: Attachments are stored outside your vault (as sibling to vault root)
- **Move Sync**: Directory moves and renames keep managed resource directories aligned
- **Extensionless Notes**: Files without a suffix are treated like Markdown notes for paste/drop and move sync

## How It Works

When you paste or drop a file into a markdown note:

```
Your Vault:
├── notes/
│   └── projects/
│       └── readme.md
└── .obsidian/

Resources Folder (created as sibling to vault):
resources/
└── images/
    └── notes/
        └── projects/
            └── pasted-image.png
```

The resulting markdown link:
```markdown
![[resources/images/notes/projects/pasted-image.png]]
```

When a managed note directory is moved or renamed, the plugin also moves the corresponding resource directories and rewrites managed `resources/...` links inside affected notes. When a single managed note is moved to a new directory, resources are either moved with it or copied for that note depending on whether the source directory still contains other managed notes.

## Installation

1. Download the latest release
2. Extract to your vault's `.obsidian/plugins/` folder
3. Enable "Smart Attachments" in Obsidian's Community Plugins settings

## Configuration

Open Settings → Smart Attachments to customize:

- **Resource folder name**: Change the name of the resources folder (default: `resources`)
- **Link format**: Choose between WikiLinks or Markdown format
- **Auto-rename duplicates**: Toggle automatic renaming of duplicate files

## Supported File Types

The plugin automatically categorizes files into subfolders:

| Type | Extensions |
|------|------------|
| Images | jpg, jpeg, png, gif, webp, svg, bmp, ico |
| Audio | mp3, wav, ogg, flac, m4a |
| Videos | mp4, webm, mov, avi, mkv |
| Documents | pdf, doc, docx, xls, xlsx, ppt, pptx |
| Archives | zip, rar, 7z, tar, gz |
| Code | js, ts, py, java, cpp, c, go, rs, html, css, json, xml, yaml, yml, sql, sh, bat, ps1 |
| Other | All other files go to `files/` |

## Development

```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Build for production
npm run build
```

## License

MIT
