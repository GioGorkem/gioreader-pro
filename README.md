# GioReader Pro

An open-source, local-first academic desktop reading studio engineered for university engineering coursework, technical PDFs, and mathematical LaTeX documents.

Built with **Electron**, **PDF.js**, and **MathJax v3**, GioReader Pro provides a distraction-free, high-performance study environment optimized for reading dense proofs, lecture notes, and engineering slides side-by-side.

---

## Key Capabilities

* **High-DPI PDF Rendering:** Device-pixel-ratio supersampling via PDF.js web workers, delivering crisp vector text and diagrams even at 500%+ zoom levels.
* **Native Mathematical Typesetting:** Inline (`$...$`) and display (`$$...$$`) LaTeX equation rendering powered by MathJax v3.
* **Local-First Architecture:** Operates entirely offline on your local file system with zero cloud tracking or telemetry.
* **Gesture & Shortcut Navigation:** Fluid touchpad pan, cursor-anchored zoom, and keyboard shortcuts tailored for rapid document exploration.
* **Hierarchical Course Organization:** Structured navigation across course units, lecture modules, and supplementary problem sets.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Storage["Local File System"]
        FS[("Lecture Markdown Notes
& Course Problem Set PDFs")]
    end

    subgraph MainProcess["Electron Main Process"]
        IPC[IPC Bridge & System Dialogs]
        FSSync[Local File Access Layer]
    end

    subgraph RendererProcess["Reading Studio Interface"]
        Store[Local View State]
        MDParser[Markdown Document Parser]
        MathEngine[MathJax v3 LaTeX Engine]
        PDFCanvas[PDF.js Canvas Renderer (HiDPI)]
        UI[Minimalist Reading View]
    end

    FS <--> FSSync
    FSSync <--> IPC
    IPC <--> Store
    Store --> MDParser --> MathEngine --> UI
    Store --> PDFCanvas --> UI
```

---

## Installation & Setup

### Running from Source

#### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* `npm` (included with Node.js)

#### Quickstart
```bash
# 1. Clone the repository
git clone https://github.com/GioGorkem/gioreader-pro.git
cd gioreader-pro

# 2. Install dependencies
npm install

# 3. Launch the desktop application
npm start
```

### Building Standalone Executables
```bash
# Package the application for Windows (x64)
npm run build
```

---

## Keyboard Shortcuts & Gestures

| Command / Gesture | Action |
| :--- | :--- |
| `Ctrl + +` / `Ctrl + -` | Zoom in / Zoom out |
| `Ctrl + 0` | Reset zoom to 100% |
| `Ctrl + Wheel` / `Pinch` | Smooth cursor-anchored zoom |
| `Alt + Left` / `Alt + Right` | Navigate to Previous / Next lecture unit |
| `Ctrl + F` | Search within open document |

---

## Tech Stack
* **Runtime:** Electron
* **Engines:** PDF.js (Mozilla), MathJax v3
* **Frontend:** Modern Vanilla JavaScript (ES6+), CSS3 Grid & Flexbox
* **Target OS:** Windows, macOS, Linux

---

## License
Distributed under the [MIT License](LICENSE).

## Author
**Görkem Akbulut**  
Department of Computer Engineering, Middle East Technical University (METU / ODTÜ)  
* GitHub: [@GioGorkem](https://github.com/GioGorkem)  
* LinkedIn: [linkedin.com/in/gorkem-akbulutt](https://www.linkedin.com/in/gorkem-akbulutt)
