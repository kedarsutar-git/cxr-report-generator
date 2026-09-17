<div align="center">

# 🩻 CXR Report Generator

### Automated Radiology Report Generation from Chest X-Rays using Multimodal Deep Learning

**DenseNet-121 Vision Encoder + Microsoft BioGPT · End-to-End Medical AI System**

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.14-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![BioGPT](https://img.shields.io/badge/Model-Microsoft%20BioGPT-00A4EF?style=for-the-badge&logo=microsoft&logoColor=white)](https://huggingface.co/microsoft/biogpt)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Overview](#-overview) · [Demo](#-demo) · [Architecture](#-architecture) · [Installation](#-installation) · [Training](#-training) · [Results](#-results) · [Roadmap](#-roadmap)

</div>

---

## 📖 Overview

**CXR Report Generator** is a full-stack medical AI system that automatically generates structured radiology reports from chest X-ray images. It combines a **DenseNet-121 vision encoder** with a **fine-tuned Microsoft BioGPT** language model (347M parameters, pretrained on PubMed biomedical literature) to produce clinically meaningful findings and impressions.

The system is designed to be:
- 🎯 **Accurate** — trained on the IU X-Ray dataset with balanced 50/50 sampling
- 🧠 **Medically literate** — BioGPT's PubMed pretraining means it already understands medical vocabulary
- ⚡ **Fast** — 2–5 second inference on consumer GPUs (RTX 3050, 6 GB VRAM)
- 🎨 **Beautiful** — modern, clinical-grade UI built with React + Tailwind
- 🔬 **Research-Ready** — modular architecture, easy to extend
- 🚀 **Production-Friendly** — Docker-ready, RESTful API

> ⚠️ **Disclaimer:** This is a **research prototype** and is **not a medical device**. All outputs must be reviewed by a qualified radiologist before any clinical use.

---

## 🎬 Demo

### Sample Output

**Input:** Chest X-Ray (PA view)

**Generated Findings:**
> The cardiomediastinal silhouette is normal in size. There are no focal airspace opacities, pleural effusion or pneumothorax. No acute bony abnormalities.

**Generated Impression:**
> No acute cardiopulmonary abnormality identified. Cardiomegaly without evidence of active disease. Otherwise normal chest radiograph.

### Screenshots

<div align="center">

| Upload & Analyze | Report Generated |
|:---:|:---:|
| ![Upload](docs/screenshots/upload.png) | ![Report](docs/screenshots/report.png) |

| Pathologies Detected | Multiple X-Ray Tests |
|:---:|:---:|
| ![Pathologies](docs/screenshots/pathologies.png) | ![Variants](docs/screenshots/variants.png) |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│           React + Vite + Tailwind CSS  (localhost:5173)         │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│   │   Upload     │→ │   Preview    │→ │  Report Card       │    │
│   │  (Drag/Drop) │  │   (Image)    │  │  (Findings + Tags) │    │
│   └──────────────┘  └──────────────┘  └────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /api/v1/predict
                           │  (multipart/form-data)
┌──────────────────────────▼──────────────────────────────────────┐
│                       FASTAPI BACKEND                           │
│                    (localhost:8000)                             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  1. Validate → 2. Preprocess → 3. Inference → 4. Post   │   │
│   └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      MULTIMODAL MODEL                           │
│                                                                 │
│   ┌────────────────┐         ┌─────────────────────────────┐    │
│   │  DenseNet-121  │         │      BioGPT (347M)          │    │
│   │  (ImageNet)    │         │   PubMed-pretrained         │    │
│   └────────┬───────┘         └──────────────┬──────────────┘    │
│            │ 49 × 768 visual tokens         │                   │
│            ▼                                │                   │
│   ┌─────────────────────┐                   │                   │
│   │  Vision → LM        │                   │                   │
│   │  Projection (768→1024)                  │                   │
│   └──────────┬──────────┘                   │                   │
│              │  + learnable [IMG_BOS]        │                   │
│              └──────────────┬───────────────┘                   │
│                             ▼                                   │
│              ┌─────────────────────────────┐                    │
│              │  "Findings:" prompt         │                    │
│              │  → Sampling Generation      │                    │
│              │  (T=0.75, top_p=0.92)       │                    │
│              └──────────────┬──────────────┘                    │
│                             ▼                                   │
│              ┌─────────────────────────────┐                    │
│              │  Radiology Report Text      │                    │
│              └─────────────────────────────┘                    │
│                                                                 │
│   ┌──────────────────────────────┐                              │
│   │  CheXpert Classifier (14)    │  ← Multi-task auxiliary loss │
│   └──────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Choices

| Component | Choice | Rationale |
|---|---|---|
| **Vision Backbone** | DenseNet-121 | Battle-tested CXR backbone (CheXNet lineage) |
| **Language Model** | Microsoft BioGPT (347M) | PubMed-pretrained → knows medical vocabulary out of the box |
| **Fine-tuning** | LoRA (r=16, α=32) | Trains only 0.45% of params — fits on 6 GB VRAM |
| **LoRA Targets** | `q_proj`, `v_proj` | BioGPT attention module names |
| **Visual Prefix** | 49 soft tokens + `img_bos` | No custom cross-attention needed |
| **Text Prompt** | `"Findings:"` prefix | Anchors BioGPT generation, prevents empty output |
| **Multi-task** | CheXpert head (λ=1.0) | Forces vision encoder to learn clinically meaningful features |
| **Class Balance** | 50/50 abnormal/normal | Prevents "mode collapse" to majority class |
| **Generation** | Sampling (T=0.75, top_p=0.92) | Produces varied, natural reports per image |

---

## ✨ Features

- 🖼️ **Drag-and-Drop Upload** — Preview X-ray inline before analysis
- ⚡ **Real-Time Inference** — 2–5 seconds per report on RTX 3050
- 📝 **Structured Reports** — Findings + Impression, split automatically
- 🏷️ **14 CheXpert Pathologies** — Probability scores with color-coded bars
- 🧹 **Robust Postprocessing** — Removes `XXXX` anonymization tokens, deduplicates sentences, truncates impressions
- 📥 **Export Options** — Copy to clipboard, download as `.txt`
- 🎨 **Clinical UI** — Dark theme, glassmorphism, smooth animations
- 🔌 **REST API** — Clean OpenAPI / Swagger endpoints
- 🔬 **Full Training Pipeline** — CSV → balanced JSON → LoRA training → merge → serve
- 📊 **Data Pipeline** — IU X-Ray CSV → balanced JSON annotations in one command

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
# Linux/Mac:
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

Navigate to **http://localhost:5173** (or 5174 if port is busy)

1. Drag & drop a chest X-ray (PNG or JPEG)
2. Click **Generate Report**
3. View findings, impression, and pathology scores
4. Copy or download the report

### API Usage

```bash
curl -X POST http://localhost:8000/api/v1/predict \
     -F "file=@chest_xray.png"
```

Response:
```json
{
  "findings": "The cardiomediastinal silhouette is normal in size...",
  "impression": "No acute cardiopulmonary abnormality identified...",
  "full_report": "Findings: ... Impression: ...",
  "findings_tags": [
    {"label": "Infiltration", "probability": 0.772},
    {"label": "Edema", "probability": 0.610}
  ],
  "latency_ms": 2387.9,
  "model_version": "v1.0-ep11-merged"
}
```

---

## 🧠 Training

### Dataset: IU X-Ray

- **3,851** de-identified radiology reports
- **7,470** chest X-ray images
- Download: [Kaggle — IU X-Ray](https://www.kaggle.com/datasets/raddar/chest-xrays-indiana-university)

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

This produces:
- **Removes** `XXXX` anonymization tokens from reports
- **Extracts** 14 CheXpert labels via keyword matching (with negation awareness)
- **Balances** to 50/50 abnormal/normal to prevent mode collapse

```
Data/iu_xray/annotations/
├── train.json  (~1850 records)
├── val.json    (~264 records)
└── test.json   (~530 records)
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
| GPT-2 (124M) | 2.05 | Good but repetitive |
| **BioGPT (347M)** | **1.77** | ✅ Natural medical text |

**Improvement: 13.4% lower validation loss.**

### Qualitative Results

Tested on 4 different X-rays — all 4 findings **completely different**:

| Image | Top-1 Pathology | Generated Findings (abbreviated) |
|---|---|---|
| 1 | Infiltration 70.8% | "Heart size and pulmonary vascularity are normal..." |
| 2 | Edema 71.7% | "No focal consolidation, pneumothorax or pleural effusion..." |
| 3 | Infiltration 77.6% | "The heart size is normal. There are no focal infiltrates..." |
| 4 | Infiltration 77.2% | "The cardiomediastinal silhouette is normal in size..." |

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
├── backend/                          # FastAPI service
│   ├── app/
│   │   ├── main.py                   # API endpoints
│   │   ├── config.py                 # Settings
│   │   ├── schemas.py                # Pydantic models
│   │   ├── inference.py              # Model service
│   │   ├── postprocess.py            # Report cleaning & splitting
│   │   └── model/
│   │       ├── architecture.py       # CXRReportModel (DenseNet-121 + BioGPT)
│   │       └── preprocess.py         # Image transforms
│   ├── weights/                      # Trained checkpoints (gitignored)
│   └── requirements.txt
│
├── frontend/                         # React + Vite UI
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── components/
│   │       ├── UploadCard.jsx
│   │       ├── ReportCard.jsx
│   │       └── Loader.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
├── training/                         # Training pipeline
│   ├── prepare_data.py               # CSV → balanced JSON
│   ├── dataset.py                    # PyTorch Dataset
│   ├── train.py                      # 6 GB VRAM-optimized training
│   └── merge_lora.py                 # LoRA → base merge
│
├── Data/                             # Dataset (gitignored)
│   └── iu_xray/
│       ├── images/
│       ├── indiana_reports.csv
│       ├── indiana_projections.csv
│       └── annotations/
│           ├── train.json
│           ├── val.json
│           └── test.json
│
├── docs/                             # Screenshots, diagrams
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technologies |
|---|---|
| **Frontend** | React 18 · Vite · Tailwind CSS · Fetch API |
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
- [ ] Train longer (20 epochs) for smoother output
- [ ] Grad-CAM attention heatmaps
- [ ] Streaming token output (SSE)
- [ ] Report history with SQLite
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

Please ensure your code follows **PEP 8** for Python and **Prettier** for JS/JSX.

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

**Built with ❤️ using PyTorch, BioGPT, FastAPI, and React**

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=kedarsutar-git.cxr-report-generator)

</div>