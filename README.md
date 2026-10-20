# GioReader Pro 📖⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/GioGorkem/gioreader-pro)
[![Electron](https://img.shields.io/badge/Electron-Desktop_App-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![LaTeX](https://img.shields.io/badge/MathJax-v3%20LaTeX-00599C?logo=latex&logoColor=white)](https://www.mathjax.org/)
[![PDF.js](https://img.shields.io/badge/PDF.js-Ultra--HD%20Canvas-E0234E)](https://mozilla.github.io/pdf.js/)

> **An AI-assisted, local-first academic desktop reader designed to organize and study intensive university engineering coursework, LaTeX mathematical derivations, and high-DPI PDF problem sets.**

---

## 🎯 Background & Motivation

Studying core Computer Engineering courses at **METU (ODTÜ)**—such as *Data Structures (`CENG213`), Discrete Computational Structures (`CENG223`), Differential Equations (`MATH219`), Electrical Circuits (`EE281`), and Economics (`ECON210`)*—requires juggling hundreds of pages of mathematical proofs, C/C++ implementations, and vector PDF problem sets.

**GioReader Pro** was created through **AI-assisted rapid prototyping** as a personal desktop study environment to solve practical reading and organization challenges:
* **Seamless Markdown + LaTeX:** Reading structured lecture notes with native MathJax v3 equation rendering.
* **Crisp PDF Exploration:** Viewing supplementary problem sets and slides with high-DPI canvas supersampling (up to 800% zoom without blur) and smooth touchpad pan/zoom.
* **Hierarchical Course Tree:** Organizing courses into Units $\to$ Lecture Parts $\to$ Supplementary Problem Set PDFs.
* **Local-First Storage:** Keeping all study notes and JSON indices locally on disk with zero cloud dependency.

---

## ✨ Key Capabilities

1. **Ultra-HD HiDPI PDF Canvas:** Custom device-pixel-ratio supersampling over PDF.js with dedicated Web Workers and anchor-point touchpad zoom.
2. **Academic Mathematical Typesetting:** Native inline (`$...$`) and block (`$$...$$`) LaTeX rendering powered by MathJax v3.
3. **Structured Course & Unit Hierarchy:** Clean separation between linear lecture parts and tree-structured supplementary exercise PDFs.
4. **Offline-First File System Sync:** Instantaneous indexing and retrieval across 380+ lecture parts and 800,000+ words of study material.

---

## 🏛️ System Overview

```mermaid
flowchart TD
    subgraph Host["Local File System (.gioreader-pro)"]
        FS[("Markdown Study Notes\n& JSON Metadata Index")]
    end

    subgraph ElectronMain["Electron Main Process"]
        IPC[IPC Bridge & Native File Dialogs]
        FSApi[Local File System Sync]
    end

    subgraph Renderer["GioReader Study Interface"]
        Store[Local State Store]
        MDParser[Markdown & LaTeX Parser]
        MathJax[MathJax v3 TeX Engine]
        PDFWorker[PDF.js HiDPI Canvas Renderer]
        UI[Minimalist Reading Stage]
    end

    FS <--> FSApi
    FSApi <--> IPC
    IPC <--> Store
    Store --> MDParser --> MathJax --> UI
    Store --> PDFWorker --> UI
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)

### Running Locally

```bash
# Clone the repository
git clone https://github.com/GioGorkem/gioreader-pro.git
cd gioreader-pro

# Install dependencies
npm install

# Start the desktop application
npm start
```

---

## ⌨️ Reading Controls

| Shortcut / Gesture | Action |
| :--- | :--- |
| `Ctrl + +` / `Ctrl + -` | Zoom in / Zoom out |
| `Ctrl + 0` | Reset zoom to 100% |
| `Ctrl + Wheel` / `Pinch` | Smooth cursor-anchored zoom |
| `Alt + Left` / `Alt + Right` | Previous / Next lecture part |
| `Ctrl + F` | In-document search |

---

## 📄 License

Licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Görkem Akbulut**  
* Computer Engineering Student @ Middle East Technical University (METU)  
* GitHub: [@GioGorkem](https://github.com/GioGorkem)  
* LinkedIn: [linkedin.com/in/gorkem-akbulutt](https://www.linkedin.com/in/gorkem-akbulutt)
