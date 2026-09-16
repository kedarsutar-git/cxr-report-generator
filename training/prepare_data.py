"""
prepare_data.py
Converts IU X-Ray CSVs into train.json / val.json / test.json

Run from project root:
    python training/prepare_data.py
"""

import json
import re
import random
from pathlib import Path

import pandas as pd

# ------------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------------
DATA_DIR = Path("Data/iu_xray")
REPORTS_CSV = DATA_DIR / "indiana_reports.csv"
PROJECTIONS_CSV = DATA_DIR / "indiana_projections.csv"
IMAGES_DIR = DATA_DIR / "images"
OUT_DIR = DATA_DIR / "annotations"

CHEXPERT_LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass",
    "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema",
    "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia",
]

# ------------------------------------------------------------------
# FIX #3 — Narrower keyword list (removed over-broad terms)
# ------------------------------------------------------------------
LABEL_KEYWORDS = {
    "Atelectasis": ["atelecta", "collapse"],
    "Cardiomegaly": ["cardiomegaly", "enlarged heart", "heart size is enlarged"],
    "Effusion": ["effusion", "pleural fluid"],
    "Infiltration": ["infiltrat"],
    "Mass": ["mass"],
    "Nodule": ["nodule", "nodular"],
    "Pneumonia": ["pneumonia"],
    "Pneumothorax": ["pneumothorax"],
    "Consolidation": ["consolidat"],
    "Edema": ["edema"],
    "Emphysema": ["emphysema", "hyperinflat"],
    "Fibrosis": ["fibrosis", "fibrotic"],
    "Pleural_Thickening": ["pleural thickening"],
    "Hernia": ["hernia", "hiatal"],
}

NORMAL_PATTERNS = [
    "no acute", "no focal", "within normal", "unremarkable",
    "clear", "no evidence of", "normal",
]


def clean_text(text):
    """Remove anonymisation tokens and clean whitespace."""
    if pd.isna(text):
        return ""
    text = str(text).strip()
    # Remove XXXX anonymisation tokens
    text = re.sub(r"\bX{2,}\b", "", text)              # XXXX, XXX, XX
    text = re.sub(r"\bXXXX\w*\b", "", text)            # XXXXcystoscopy etc.
    text = re.sub(r"\bXXX\w*\b", "", text)
    # Remove leading/trailing punctuation and whitespace
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"^\s*[.\-:;,]+", "", text)
    text = re.sub(r"[\s.\-:;,]+$", "", text)
    # Remove double spaces
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ------------------------------------------------------------------
# FIX #1 — Negation-aware label extraction
# ------------------------------------------------------------------
def _is_negated(text_lower, kw_start):
    """Look back up to 60 chars for negation words before a keyword."""
    window = text_lower[max(0, kw_start - 60):kw_start]
    patterns = [
        r"\bno\b", r"\bnot\b", r"\bwithout\b", r"\babsent\b",
        r"\bfree of\b", r"\bnegative for\b", r"\bno evidence of\b",
        r"\bno significant\b", r"\bno acute\b", r"\bno focal\b",
        r"\bno new\b", r"\brule out\b", r"\bresolved\b",
    ]
    return any(re.search(p, window) for p in patterns)


def _has_positive_finding(text_lower, keyword):
    """True if keyword appears at least once in a NON-negated context."""
    for m in re.finditer(re.escape(keyword), text_lower):
        if not _is_negated(text_lower, m.start()):
            return True
    return False


def extract_labels(text):
    text_lower = text.lower()
    labels = []
    for label in CHEXPERT_LABELS:
        keywords = LABEL_KEYWORDS.get(label, [])
        positive = any(_has_positive_finding(text_lower, kw) for kw in keywords)
        labels.append(1 if positive else 0)
    return labels


def main():
    print("Loading CSVs...")
    reports = pd.read_csv(REPORTS_CSV)
    projections = pd.read_csv(PROJECTIONS_CSV)

    print(f"  reports:     {len(reports)} rows")
    print(f"  projections: {len(projections)} rows")

    reports.columns = [c.strip().lower() for c in reports.columns]
    projections.columns = [c.strip().lower() for c in projections.columns]

    # ---- Normalise uid to string BEFORE any join/lookup ----
    reports["uid"] = reports["uid"].astype(str).str.strip().str.replace(r"\.0$", "", regex=True)
    projections["uid"] = projections["uid"].astype(str).str.strip().str.replace(r"\.0$", "", regex=True)

    # ---- Keep only frontal images ----
    projections = projections[projections["projection"].str.lower() == "frontal"].copy()
    print(f"  frontal images: {len(projections)}")

    # ---- Build image lookup (both keys and lookups are now strings) ----
    projections["filename"] = projections["filename"].str.strip()
    image_lookup = projections.groupby("uid")["filename"].apply(list).to_dict()

    print(f"  unique frontal uids: {len(image_lookup)}")
    if image_lookup:
        sample_key = next(iter(image_lookup))
        print(f"  sample uid key: {sample_key!r} (type={type(sample_key).__name__})")

    records = []
    skipped_missing_img = 0
    skipped_empty_report = 0

    for _, row in reports.iterrows():
        uid = row["uid"]
        filenames = image_lookup.get(uid, [])
        if not filenames:
            skipped_missing_img += 1
            continue

        fname = filenames[0]
        img_path = IMAGES_DIR / fname
        if not img_path.exists():
            found = False
            for ext in [".png", ".jpg", ".jpeg", ".dcm.png"]:
                alt = IMAGES_DIR / (Path(fname).stem + ext)
                if alt.exists():
                    img_path = alt
                    fname = alt.name
                    found = True
                    break
            if not found:
                skipped_missing_img += 1
                continue

        findings = clean_text(row.get("findings", ""))
        impression = clean_text(row.get("impression", ""))

        if not findings and not impression:
            skipped_empty_report += 1
            continue

        report_text = ""
        if findings:
            report_text += f"Findings: {findings} "
        if impression:
            report_text += f"Impression: {impression}"
        report_text = report_text.strip()

        labels = extract_labels(report_text)

        records.append({
            "id": uid,
            "image": fname,
            "report": report_text,
            "labels": labels,
        })

    print(f"\n  usable records: {len(records)}")
    print(f"  skipped (no image): {skipped_missing_img}")
    print(f"  skipped (empty report): {skipped_empty_report}")

    # ==============================================================
    # FIX #2 — 50/50 BALANCED SAMPLING
    # Forces the model to see equal numbers of normal + abnormal cases
    # ==============================================================
    abnormal = [r for r in records if sum(r["labels"]) > 0]
    normal   = [r for r in records if sum(r["labels"]) == 0]

    print(f"\n  Before rebalance: {len(abnormal)} abnormal, {len(normal)} normal")

    random.seed(42)
    target = min(len(abnormal), len(normal))
    abnormal_bal = random.sample(abnormal, target)
    normal_bal   = random.sample(normal,   target)

    records = abnormal_bal + normal_bal

    print(f"  After rebalance:  {len(abnormal_bal)} abnormal, {len(normal_bal)} normal")
    print(f"  Total records:    {len(records)}")
    # ==============================================================

    random.seed(42)
    random.shuffle(records)

    n = len(records)
    n_train = int(n * 0.70)
    n_val = int(n * 0.10)

    train = records[:n_train]
    val = records[n_train:n_train + n_val]
    test = records[n_train + n_val:]

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, split in [("train", train), ("val", val), ("test", test)]:
        out_path = OUT_DIR / f"{name}.json"
        out_path.write_text(json.dumps(split, indent=2, ensure_ascii=False))
        print(f"  wrote {out_path} ({len(split)} records)")

    print("\nDone. Ready for training.")


if __name__ == "__main__":
    main()