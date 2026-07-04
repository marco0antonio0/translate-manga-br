"""Baixa os modelos ONNX do PP-OCRv5 mobile usados pelo pipeline de OCR.

Uso:
    python scripts/fetch_ocr_models.py

Os arquivos vao para python-api/models/. Fontes: repositorios ONNX oficiais da
PaddlePaddle no Hugging Face. Os dicts sao extraidos do inference.yml de cada rec.
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"

HF = "https://huggingface.co"
DOWNLOADS: list[tuple[str, str]] = [
    (f"{HF}/PaddlePaddle/PP-OCRv5_mobile_det_onnx/resolve/main/inference.onnx", "paddleocr_v5_det.onnx"),
    (f"{HF}/PaddlePaddle/PP-OCRv5_mobile_rec_onnx/resolve/main/inference.onnx", "paddleocr_v5_rec.onnx"),
    (f"{HF}/PaddlePaddle/latin_PP-OCRv5_mobile_rec_onnx/resolve/main/inference.onnx", "paddleocr_v5_latin_rec.onnx"),
]
DICT_SOURCES: list[tuple[str, str]] = [
    (f"{HF}/PaddlePaddle/PP-OCRv5_mobile_rec_onnx/resolve/main/inference.yml", "paddleocr_v5_dict.txt"),
    (f"{HF}/PaddlePaddle/latin_PP-OCRv5_mobile_rec_onnx/resolve/main/inference.yml", "paddleocr_v5_latin_dict.txt"),
]


def _download(url: str, dest: Path) -> None:
    print(f"-> {dest.name}")
    with urllib.request.urlopen(url, timeout=120) as resp, dest.open("wb") as out:
        while chunk := resp.read(1 << 20):
            out.write(chunk)


def _extract_dict(yml_url: str, dest: Path) -> None:
    import yaml

    print(f"-> {dest.name} (extraido de inference.yml)")
    with urllib.request.urlopen(yml_url, timeout=120) as resp:
        cfg = yaml.safe_load(resp.read())
    chars = cfg["PostProcess"]["character_dict"]
    if not isinstance(chars, list) or not chars:
        raise RuntimeError(f"character_dict ausente/invalido em {yml_url}")
    dest.write_text("\n".join(str(c) for c in chars) + "\n", encoding="utf-8")


def main() -> int:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for url, name in DOWNLOADS:
        dest = MODELS_DIR / name
        if dest.exists() and dest.stat().st_size > 1024:
            print(f"ok {name} (ja existe)")
            continue
        _download(url, dest)
    for url, name in DICT_SOURCES:
        dest = MODELS_DIR / name
        if dest.exists() and dest.stat().st_size > 100:
            print(f"ok {name} (ja existe)")
            continue
        _extract_dict(url, dest)
    print("Concluido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
