# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OOXML/ODF Viewer & Editor is a web-based application (and Chrome extension) for viewing and editing the internal XML structure of Microsoft Office (OOXML) and OpenOffice/LibreOffice (ODF) files. It supports .docx, .xlsx, .pptx, .odt, .ods, and .odp formats.

The application is built with:
- TypeScript + Vite (no framework - vanilla TypeScript)
- JSZip for handling compressed Office files
- Monaco Editor for XML editing (the same editor that powers VS Code)
- xml-formatter for XML pretty-printing

## Development Commands

```bash
# Install dependencies
npm install

# Development server (GitHub Pages mode, base: '/ooxml-odf-viewer/')
npm run dev

# Build for GitHub Pages (base: '/ooxml-odf-viewer/')
npm run build

# Build for Chrome Extension (base: './')
npm run build:extension

# Lint
npm run lint

# Preview production build
npm preview
```

**Important**: Use `npm run build:extension` when building for Chrome extension installation, NOT `npm run build`. The difference is the base path configuration in Vite.

## Architecture

### Entry Point & Core Flow

`src/main.ts` is the application entry point and orchestrates the entire UI:
- Initializes Monaco Editor theme and configuration
- Initializes `ZipHandler` for managing the zip file structure
- Initializes `Editor` for XML editing with Monaco Editor
- Handles file upload (input and drag & drop)
- Manages sidebar resizing (mouse and touch events)
- Coordinates between file tree selection and editor display

### Three-Layer Architecture

**1. ZIP Layer (`src/utils/zipHandler.ts`)**
- `ZipHandler` class wraps JSZip for file operations
- `loadAsync(file)`: Loads OOXML/ODF file (which is a ZIP)
- `getFileTree()`: Builds hierarchical tree structure from flat ZIP entries
- `getFileContent(path)`: Returns string for XML/text, Blob for images
- `updateFile(path, content)`: Updates file in memory
- `generateZip()`: Generates modified ZIP as Blob for download

**2. UI Layer - Tree View (`src/ui/treeView.ts`)**
- `renderFileTree()`: Renders collapsible file tree from ZipNode array
- `highlightTreeNode()`: Highlights target file when hovering over rId in XML
- `createTreeNode()`: Recursively creates tree nodes with toggle/icons
- Uses emoji icons (📁 📂 📄) and SVG for XML files

**3. UI Layer - Editor (`src/ui/editor.ts`)**
- `Editor` class manages Monaco Editor instance
- `loadFile(node)`: Loads and formats XML, displays images, auto-opens find widget
- `loadRelsFile()`: Parses relationship files (*.rels) for rId resolution
- `relationshipTooltip`: Monaco hover provider showing target file for rId references
- `save()`: Updates zip in memory via ZipHandler
- Custom dark theme and syntax highlighting for XML
- Find widget auto-opens on desktop (>768px width) with built-in match counter
- Keyboard shortcuts: Ctrl/Cmd+S (save), Ctrl/Cmd+F (find)

### Key Features Implementation

**Relationship Tooltip (rId hover)**
- When loading an XML file, Editor loads corresponding `_rels/*.xml.rels` file
- Parses `<Relationship Id="rId1" Target="...">` entries into a Map
- Monaco hover provider detects word under cursor
- If word matches rId, displays target path and highlights in tree via `highlightTreeNode()`

**Find Widget**
- Monaco's built-in find widget with match counter (e.g., "3/15")
- Auto-opens on file load (desktop only)
- Next/previous navigation, case-sensitive, whole word, regex support

**Real-time Save**
- "Save" button stores changes in memory (JSZip instance)
- "Download" button generates and downloads modified file
- All changes are in-memory until download

### Chrome Extension vs Web Version

The application supports two deployment modes controlled by Vite config:

- **Web Version** (`npm run build`): Base path `/ooxml-odf-viewer/` for GitHub Pages
- **Extension** (`npm run build:extension`): Base path `./` with manifest.json

The `manifest.json` in root and `public/manifest.json` define the Chrome extension metadata. `public/background.js` is a minimal service worker for the extension.

## File Structure

```
src/
  main.ts              # Entry point, orchestrates UI
  style.css            # Global styles (dark theme)
  lib/
    monaco.ts          # Monaco Editor configuration and theme
  ui/
    baseEditor.ts      # Shared logic for XML/rels parsing and hover providers
    editor.ts          # Single file Monaco editor with rId tooltips
    diffEditor.ts      # Diff editor for comparing two files
    treeView.ts        # File tree rendering and highlighting
  utils/
    zipHandler.ts      # JSZip wrapper for OOXML/ODF files
  assets/              # Static assets if any

public/
  icon*.png            # Extension icons
  manifest.json        # Chrome extension manifest
  background.js        # Minimal service worker
```

## Common Tasks

### Modifying Monaco Editor Options
Edit `getCommonEditorOptions()` in `src/lib/monaco.ts` to change editor behavior (line numbers, word wrap, font size, etc.).

### Modifying Theme
Edit `monacoTheme` in `src/lib/monaco.ts` for UI styling and syntax colors. Use Monaco's theme format (base: 'vs-dark', rules, colors).

### Changing Tree Icons
Modify `getIcon()` function in `treeView.ts:154`.

### Adding New File Type Support
Update `getFileContent()` in `zipHandler.ts:63` to handle new extensions.

## Known Limitations

- No backend - all processing client-side
- Large files may impact performance (Monaco is optimized but still client-side)
- Chrome extension requires manual installation (not on Chrome Web Store)
- Mobile support limited due to Monaco Editor complexity (designed for desktop)
