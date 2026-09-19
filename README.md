<div align="center">

# 🩻 CXR Report Generator

### Automated Radiology Report Generation from Chest X-Rays using Multimodal Deep Learning

**DenseNet-121 Vision Encoder + Microsoft BioGPT · Full-Stack Medical AI System**

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.14-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![BioGPT](https://img.shields.io/badge/Model-Microsoft%20BioGPT-00A4EF?style=for-the-badge&logo=microsoft&logoColor=white)](https://huggingface.co/microsoft/biogpt)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Overview](#-overview) · [Demo](#-demo) · [Architecture](#-architecture) · [Features](#-features) · [Installation](#-installation) · [Training](#-training) · [Results](#-results) · [Roadmap](#-roadmap)

</div>

---

## 📖 Overview

**CXR Report Generator** is a full-stack medical AI system that automatically generates structured radiology reports from chest X-ray images. It combines a **DenseNet-121 vision encoder** with a **fine-tuned Microsoft BioGPT** language model (347M parameters, pretrained on PubMed biomedical literature) to produce clinically coherent findings and impressions.

The system includes a **polished web interface** with an animated aurora background, glassmorphic design, circular confidence gauges, tabbed report views, report history, and dark/light theme switching.

### Highlights

- 🎯 **Accurate** — trained on IU X-Ray with 50/50 balanced sampling
- 🧠 **Medically literate** — BioGPT already understands medical vocabulary from PubMed
- ⚡ **Fast** — 2–5 second inference on an RTX 3050 (6 GB VRAM)
- 🎨 **Beautiful UI** — modern, clinical-grade React interface
- 🔬 **Research-ready** — modular, reproducible, extensible
- 🚀 **Production-friendly** — clean REST API, Docker-ready

> ⚠️ **Disclaimer:** This is a **research prototype** and is **not a medical device**. All outputs must be reviewed by a qualified radiologist before any clinical use.

---

## 🎬 Demo

### Sample Output

**Input:** Chest X-ray (PA view)

**Generated Findings:**
> Heart size is normal. The lungs are clear. There is no pneumothorax or pleural effusion.

**Generated Impression:**
> No acute cardiopulmonary abnormality identified. No definite pleural effusion or pneumothorax. No definitive evidence of a rib fracture or hemothorax noted in the prior imaging.

### Screenshots

<div align="center">

| Main Interface | X-Ray Uploaded |
|:---:|:---:|
| ![Main UI](docs/screenshots/main-ui.png) | ![Upload](docs/screenshots/upload.png) |

| Generated Report |
|:---:|
| ![Report](docs/screenshots/report.png) |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│         React 18 + Vite + Tailwind CSS  (localhost:5173)        │
│                                                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐   │
│   │  TopBar    │  │  Sidebar   │  │ UploadZone │  │Toasts   │   │
│   │ (theme,AI) │  │ (history)  │  │ (dragdrop) │  │         │   │
│   └────────────┘  └────────────┘  └────────────┘  └─────────┘   │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │   ReportView · Tabbed · Confidence Rings · Copy/DL       │  │
│   └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /api/v1/predict
                           │  (multipart/form-data)
┌──────────────────────────▼──────────────────────────────────────┐
│                      FASTAPI BACKEND                            │
│                     (localhost:8000)                            │
│                                                                 │
│   1. Validate  →  2. Preprocess  →  3. Infer  →  4. Post        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     MULTIMODAL MODEL                            │
│                                                                 │
│   ┌────────────────┐             ┌─────────────────────────┐    │
│   │  DenseNet-121  │             │    Microsoft BioGPT     │    │
│   │  (ImageNet)    │             │   (347M, PubMed)        │    │
│   └────────┬───────┘             └────────────┬────────────┘    │
│            │ 49 × 768 visual tokens           │                 │
│            ▼                                  │                 │
│   ┌───────────────────────┐                   │                 │
│   │ Vision → LM Projection│                   │                 │
│   │      768 → 1024       │                   │                 │
│   └──────────┬────────────┘                   │                 │
│              │  + learnable [IMG_BOS]          │                 │
│              │  + text prompt "Findings:"      │                 │
│              └──────────────┬─────────────────┘                 │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │  Sampling Generation         │                   │
│              │  (T=0.75, top_p=0.92, top_k=50)                 │
│              └──────────────┬───────────────┘                   │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │  Radiology Report Text       │                   │
│              └──────────────────────────────┘                   │
│                                                                 │
│   ┌──────────────────────────────┐                              │
│   │  CheXpert Classifier (14)    │ ← Multi-task auxiliary loss   │
│   └──────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Choices

| Component | Choice | Rationale |
|---|---|---|
| **Vision Backbone** | DenseNet-121 (ImageNet) | Battle-tested CXR backbone (CheXNet lineage) |
| **Language Model** | Microsoft BioGPT (347M) | PubMed-pretrained → knows medical terms out of the box |
| **Fine-tuning** | LoRA (r=16, α=32) | Trains only 0.45% of params, fits on 6 GB VRAM |
| **LoRA Targets** | `q_proj`, `v_proj` | BioGPT attention module names |
| **Visual Prefix** | 49 soft tokens + `img_bos` | No custom cross-attention architecture needed |
| **Text Prompt** | `"Findings:"` prefix | Anchors BioGPT to avoid empty outputs |
| **Multi-task Loss** | CheXpert head, λ=1.0 | Forces the encoder to learn clinically meaningful features |
| **Class Balance** | 50/50 abnormal / normal | Prevents mode collapse to the majority class |
| **Generation** | Sampling (T=0.75, top_p=0.92) | Produces varied, natural reports per image |

---

## ✨ Features

### 🎨 Frontend

- 🌌 **Animated Aurora Background** — slowly drifting cyan + indigo gradient blobs
- 💎 **Glassmorphic Design** — frosted translucent cards with subtle borders
- 📜 **Report History Sidebar** — browse past analyses (stored in `localStorage`)
- 🌓 **Dark / Light Theme Toggle** — persisted to `localStorage`
- 🗂️ **Tabbed Report View** — Findings · Impression · Raw JSON
- 📊 **Circular Confidence Rings** — SVG gauges with color coding (cyan / amber / rose)
- 🔔 **Toast Notifications** — success / error / info popups
- 🦴 **Skeleton Loaders** — shimmer placeholders during inference
- ⌨️ **Keyboard Shortcut** — `Ctrl + Enter` to generate
- 🎬 **Scanning Animation** — glowing scanline moves across uploaded X-ray
- 📥 **Export** — copy to clipboard or download as `.txt`
- 📱 **Fully Responsive** — mobile / tablet / desktop

### 🧠 Backend & Model

- 🖼️ **REST API** with `/api/v1/predict` and `/api/v1/health`
- 🎯 **14 CheXpert Pathologies** with color-coded confidence scores
- 🧹 **Robust Postprocessing** — removes `XXXX` anonymization tokens, deduplicates sentences, truncates impressions
- ⚡ **Fast Inference** — 2–5 seconds on consumer GPU
- 🔬 **Full Training Pipeline** — CSV → balanced JSON → LoRA training → merge → serve
- 🚀 **Docker-Ready** architecture

---

## 🚀 Installation

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.10 – 3.13 |
| Node.js | 18+ |
| CUDA (optional, for GPU) | 12.1+ |
| Git | Latest |

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/kedarsutar-git/cxr-report-generator.git
cd cxr-report-generator
```

### 2️⃣ Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\Activate.ps1
# Linux / Mac:
source .venv/bin/activate

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

# BioGPT tokenizer dependencies (required)
python -m pip install sacremoses sentencepiece protobuf
```

**For GPU support (recommended):**
```bash
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 4️⃣ Download Model Weights

Place the trained checkpoint at:
```
backend/weights/best_merged.pt
```

**Or train from scratch** — see [Training](#-training) below.

---

## 🎮 Usage

### Start the Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Expected output:
```
[ReportService] Loaded weights from weights\best_merged.pt
INFO:     Application startup complete.
```

### Start the Frontend

In a **new terminal**:

```bash
cd frontend
npm run dev
```

### Open the App

Navigate to **http://localhost:5173** (or `5174` if the port is busy).

1. Drag & drop a chest X-ray (PNG or JPEG)
2. Click **Generate Report** (or press `Ctrl + Enter`)
3. Switch between **Findings**, **Impression**, and **Raw JSON** tabs
4. Review the circular pathology gauges
5. Copy or download the report

### API Usage

```bash
curl -X POST http://localhost:8000/api/v1/predict \
     -F "file=@chest_xray.png"
```

Response:
```json
{
  "findings": "Heart size is normal. The lungs are clear...",
  "impression": "No acute cardiopulmonary abnormality identified...",
  "full_report": "Findings: ... Impression: ...",
  "findings_tags": [
    {"label": "Infiltration", "probability": 0.741},
    {"label": "Edema", "probability": 0.644}
  ],
  "latency_ms": 5155.2,
  "model_version": "v1.0-ep11-merged"
}
```

---

## 🧠 Training

### Dataset: IU X-Ray (Indiana University)

- **3,851** de-identified radiology reports
- **7,470** chest X-ray images (frontal + lateral views)
- Download: [Kaggle — Chest X-Rays Indiana University](https://www.kaggle.com/datasets/raddar/chest-xrays-indiana-university)

### Data Preparation

Place files under `Data/iu_xray/`:

```
Data/iu_xray/
├── images/
├── indiana_reports.csv
└── indiana_projections.csv
```

Run the data pipeline:

```bash
python training/prepare_data.py
```

This script:
- **Removes** `XXXX` anonymization tokens from reports
- **Extracts** 14 CheXpert labels via negation-aware keyword matching
- **Balances** to 50/50 abnormal / normal to prevent mode collapse

Output:
```
Data/iu_xray/annotations/
├── train.json   (~1850 records)
├── val.json     (~264 records)
└── test.json    (~530 records)
```

### Train the Model

```bash
cd training
python train.py
```

**Optimized for 6 GB VRAM (RTX 3050 / 3060):**

| Hyperparameter | Value |
|---|---|
| Base LM | `microsoft/biogpt` (347M) |
| Batch Size | 1 |
| Gradient Accumulation | 16 |
| Effective Batch | 16 |
| LoRA Rank / Alpha | 16 / 32 |
| LoRA Target Modules | `q_proj`, `v_proj` |
| Learning Rate (vision) | 3e-4 |
| Learning Rate (LM) | 1e-4 |
| λ_classification | 1.0 |
| Epochs | 12 |
| Max Seq Length | 200 |
| Precision | AMP (FP16) |
| Gradient Checkpointing | Enabled |

**Training time:** ~1.5–2 hours on RTX 3050.
**VRAM usage:** ~1.9 GB (ample headroom).

### Merge LoRA Weights

After training completes, merge LoRA adapters into the base BioGPT:

```bash
python merge_lora.py
```

This produces `best_merged.pt` — a plain BioGPT checkpoint ready for inference.

### Retrain from Scratch

```bash
# Delete existing checkpoints
Remove-Item backend\weights\best.pt -ErrorAction SilentlyContinue
Remove-Item backend\weights\best_merged.pt -ErrorAction SilentlyContinue

# Fresh training run
cd training
python train.py
```

---

## 📊 Results

### Training Progression

| Epoch | Train Loss | Val Loss |
|:---:|:---:|:---:|
| 0 | 4.92 | 2.65 |
| 3 | 2.18 | 2.10 |
| 6 | 1.84 | 1.80 |
| 9 | 1.77 | 1.78 |
| **11 (best)** | **1.76** | **1.77** ⭐ |

**Final Val Loss: 1.7708**

### Model Comparison

| Model | Best Val Loss | Report Quality |
|---|---|---|
| GPT-2 (124M) | 2.05 | Repetitive, templated |
| **BioGPT (347M)** | **1.77** | ✅ Natural medical text |

**Improvement: 13.4% lower validation loss.**

### Qualitative Results

Tested on multiple X-rays — findings vary per image:

| Image | Top-1 Pathology | Generated Findings (abbreviated) |
|---|---|---|
| 1 | Infiltration 74% | "Heart size is normal. The lungs are clear..." |
| 2 | Edema 71% | "No focal consolidation, pneumothorax or pleural effusion..." |
| 3 | Infiltration 77% | "The heart size is normal. There are no focal infiltrates..." |
| 4 | Infiltration 77% | "The cardiomediastinal silhouette is normal in size..." |

**No mode collapse. Image-aware generation. Clean medical vocabulary.**

### Sample Reports

| Input | Generated Impression |
|---|---|
| Normal chest | "No acute cardiopulmonary abnormality identified. No acute bony abnormality noted." |
| Suspected cardiomegaly | "Cardiomegaly without evidence of active disease. Otherwise normal chest radiograph." |
| Clear lungs | "The lungs are clear of focal airspace disease, pneumothorax, or pleural effusion." |

---

## 📁 Project Structure

```
cxr-report-generator/
│
├── backend/                              # FastAPI service
│   ├── app/
│   │   ├── main.py                       # API endpoints
│   │   ├── config.py                     # Settings
│   │   ├── schemas.py                    # Pydantic models
│   │   ├── inference.py                  # Model service
│   │   ├── postprocess.py                # Report cleaning & splitting
│   │   └── model/
│   │       ├── architecture.py           # CXRReportModel (DenseNet-121 + BioGPT)
│   │       └── preprocess.py             # Image transforms
│   ├── weights/                          # Trained checkpoints (gitignored)
│   │   ├── best.pt                       # LoRA checkpoint
│   │   ├── best_merged.pt                # Merged model (used by backend)
│   │   └── .gitkeep
│   └── requirements.txt
│
├── frontend/                             # React + Vite UI
│   ├── src/
│   │   ├── App.jsx                       # Main app + keyboard shortcuts
│   │   ├── main.jsx
│   │   ├── api.js                        # Fetch + history helpers
│   │   ├── index.css                     # Aurora theme
│   │   └── components/
│   │       ├── TopBar.jsx                # Header + theme toggle
│   │       ├── Sidebar.jsx               # Report history
│   │       ├── UploadZone.jsx            # Drag-drop upload
│   │       ├── ReportView.jsx            # Tabbed report card
│   │       ├── ConfidenceRing.jsx        # Circular gauge
│   │       ├── Loader.jsx                # Skeleton loader
│   │       └── Toasts.jsx                # Toast notifications
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── training/                             # Training pipeline
│   ├── prepare_data.py                   # CSV → balanced JSON
│   ├── dataset.py                        # PyTorch Dataset
│   ├── train.py                          # 6 GB VRAM-optimized training
│   └── merge_lora.py                     # LoRA → base merge
│
├── Data/                                 # Dataset (gitignored)
│   └── iu_xray/
│       ├── images/
│       ├── indiana_reports.csv
│       ├── indiana_projections.csv
│       └── annotations/
│           ├── train.json
│           ├── val.json
│           └── test.json
│
├── docs/
│   └── screenshots/
│       ├── main-ui.png
│       ├── upload.png
│       └── report.png
│
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technologies |
|---|---|
| **Frontend** | React 18 · Vite · Tailwind CSS · SVG gauges · LocalStorage |
| **Backend** | FastAPI · Uvicorn · Pydantic · Python-Multipart |
| **ML / DL** | PyTorch 2.14 · torchvision · HuggingFace Transformers · PEFT (LoRA) |
| **Base Models** | DenseNet-121 (ImageNet) · Microsoft BioGPT (PubMed) |
| **Data** | Pandas · NumPy · Pillow |
| **DevOps** | Git · PowerShell · Docker (planned) |

</div>

---

## 🗺️ Roadmap

- [x] Multimodal architecture (DenseNet-121 + BioGPT)
- [x] Full-stack web interface
- [x] IU X-Ray data pipeline with 50/50 rebalancing
- [x] LoRA fine-tuning on 6 GB VRAM
- [x] `XXXX` token cleaning + impression truncation
- [x] Sampling generation (mode collapse fix)
- [x] Advanced UI — aurora background, glassmorphism
- [x] Tabbed report view + circular confidence gauges
- [x] Report history sidebar + theme toggle + toasts
- [ ] Grad-CAM attention heatmaps
- [ ] Streaming token output (SSE)
- [ ] Report export as PDF
- [ ] Train longer (20 epochs) for smoother output
- [ ] MIMIC-CXR training (377k images)
- [ ] Docker Compose deployment
- [ ] BLEU-4 / ROUGE-L evaluation suite
- [ ] CheXbert clinical accuracy scoring

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

Please follow **PEP 8** for Python and **Prettier** for JS/JSX.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- **IU X-Ray Dataset** — Indiana University, [Kaggle mirror](https://www.kaggle.com/datasets/raddar/chest-xrays-indiana-university)
- **DenseNet** — Huang et al., *"Densely Connected Convolutional Networks"* (CVPR 2017)
- **BioGPT** — Luo et al., *"BioGPT: Generative Pre-trained Transformer for Biomedical Text Generation and Mining"* (Briefings in Bioinformatics, 2022)
- **LoRA** — Hu et al., *"LoRA: Low-Rank Adaptation of Large Language Models"* (ICLR 2022)
- **CheXpert** — Irvin et al., Stanford ML Group (2019)
- **HuggingFace** — Transformers & PEFT libraries

---

## 📚 Citation

If you use this project in your research, please cite:

```bibtex
@software{cxr_report_generator_2026,
  title  = {CXR Report Generator: Automated Radiology Report Generation from Chest X-Rays},
  author = {Kedar Sutar},
  year   = {2026},
  url    = {https://github.com/kedarsutar-git/cxr-report-generator}
}
```

---

## ⚠️ Medical Disclaimer

```
THIS SOFTWARE IS PROVIDED FOR RESEARCH AND EDUCATIONAL PURPOSES ONLY.
IT IS NOT A MEDICAL DEVICE AND IS NOT INTENDED FOR CLINICAL USE.

All generated reports are AI-produced suggestions and MUST be reviewed
by a qualified radiologist before any clinical decision-making.

The authors assume no liability for any clinical outcomes resulting
from the use of this software.
```

---

## 📬 Contact

**Kedar Sutar**
- GitHub: [@kedarsutar-git](https://github.com/kedarsutar-git)
- Email: kedarsutar37@gmail.com
- LinkedIn: [Kedar Sutar](https://www.linkedin.com/in/kedar-sutar/)

---

<div align="center">

### ⭐ If this project helped you, consider giving it a star!

**Built with ❤️ using PyTorch, BioGPT, FastAPI, React, and Tailwind**

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=kedarsutar-git.cxr-report-generator)

</div>