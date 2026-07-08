# LiteMD

LiteMD is a lightweight, high-performance desktop Markdown editor and reader designed for speed, safety, and a distraction-free writing experience. Built on top of **Tauri v2** and **Rust**, it combines the rendering speed of native desktop architectures with a highly responsive, modern interface.

---

## Key Features

- **Dual-Mode Editing Interface**:
  - *WYSIWYG Rich Text*: Interactive rich text editor (Notion-style auto-formatting shortcuts) for visual writing.
  - *Raw Markdown / Split View*: Standard monospace plain-text Markdown editing on the left with real-time HTML rendering on the right.
- **Bidirectional Scroll Sync**: Latency-free scroll synchronization between the editor and preview panels.
- **Native File Drag & Drop**: Instantly open `.md`, `.markdown`, or `.txt` documents by dragging them from the file system directly onto the application window.
- **Optional Auto-Save**: Configurable automatic background save function (saves 1.5 seconds after typing ceases) with titlebar status badges (*Editing, Saving, Saved*).
- **Code Block Copy Button**: Floating copy buttons on all syntax-highlighted code blocks for easy one-click clipboards.
- **Advanced Export Formats**:
  - *Print-to-PDF*: Custom print stylesheets tailored for A4 pagination, preventing split tables, orphan headers, and wrapping long code blocks.
  - *Export to HTML*: Compiles Markdown into an independent HTML5 document template styled with a professional typographic layout.
  - *Plain Text*: Save directly as standard `.txt` text files.
- **File System Integration**: Native file associations to open Markdown documents by default, window maximize/restore toggling, and recent files list history.

---

## Installation (Windows SmartScreen Notice)

LiteMD is published as an unsigned executable to remain 100% free and open-source. Because buying digital code signing certificates costs hundreds of dollars annually, web browsers and Windows Defender SmartScreen might flag the installer as "unknown" or "unsafe" upon downloading.

**To install and run LiteMD safely:**
- **On Web Browsers (Chrome/Edge):** Click on the download options menu and select **Keep** -> **Keep anyway**.
- **On Windows Defender:** Click **More info** (Más información) on the warning popup, then click **Run anyway** (Ejecutar de todas formas).

Once the application gains usage reputation, these safety flags will disappear automatically.

---

## Technology Stack

- **Backend / Core**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://v2.tauri.app/) (native filesystem operations, Win32 window APIs, security boundaries, and command-line arguments injection).
- **Frontend / Client**: Plain HTML5, CSS3, and Vanilla JavaScript.
- **Third-Party Libraries**:
  - [Marked.js](https://marked.js.org/) (High-speed GFM Markdown parser).
  - [PrismJS](https://prismjs.com/) (Extensible syntax highlighting for code blocks).
  - [Turndown](https://github.com/mixmark-io/turndown) (HTML-to-Markdown parser for WYSIWYG translations).
  - [Lucide](https://lucide.dev/) (Modern vector iconography).

---

## Project Structure

```
├── docs/                # Promotional landing page (GitHub Pages)
│   ├── assets/          # Landing page graphic assets
│   ├── index.html       # Landing page HTML
│   └── styles.css       # Landing page CSS
├── src/                 # Frontend application sources
│   ├── assets/          # Static icons & SVGs
│   ├── lib/             # Third-party client dependencies (Prism, Marked, etc.)
│   ├── index.html       # Client shell layout
│   ├── main.js          # Core frontend application logic
│   └── styles.css       # Client styles & color themes
├── src-tauri/           # Rust backend sources
│   ├── src/             # Rust source code
│   ├── capabilities/    # Tauri security policies
│   ├── icons/           # App installation icons
│   ├── Cargo.toml       # Cargo package manifest
│   └── tauri.conf.json  # Tauri app window & bundle settings
├── package.json         # Node scripts & dependencies
└── README.md            # Project documentation
```

---

## Developer Guide

### Prerequisites

To run and build this application locally, you must install the following compile dependencies on your system:

1. **Node.js** (LTS version recommended).
2. **Rustup** (Rust compiler toolchain).
3. **Microsoft C++ Build Tools** (MSVC compiler required on Windows).

### Getting Started

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/adriandepool/LiteMD.git
   cd LiteMD
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

4. Compile the optimized standalone executable and installer for your OS:
   ```bash
   npm run tauri build
   ```

The compiled binaries will be output to:
`src-tauri/target/release/bundle/`

---

## License

This project is open-source and licensed under the MIT License.