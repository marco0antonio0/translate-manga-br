from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "").strip() or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "").strip() or default)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name, "").strip().lower()
    if not value:
        return default
    return value in ("1", "true", "yes", "on")


def _env_tuple(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    value = os.getenv(name, "").strip()
    if not value:
        return default
    return tuple(v.strip() for v in value.split(",") if v.strip())


# Geracao dos modelos de OCR: "v5" (PP-OCRv5 mobile, multilingue EN/JP/CH + fallback
# latino para PT) ou "v4" (en_PP-OCRv3_det/en_PP-OCRv4_rec, somente ingles) para rollback.
_OCR_GENERATION = _env_str("OCR_MODEL_GENERATION", "v5").lower()

if _OCR_GENERATION == "v4":
    _OCR_DET_MODEL = "en_PP-OCRv3_det"
    _OCR_REC_MODEL = "en_PP-OCRv4_rec"
    _OCR_REC_FALLBACKS: tuple[str, ...] = ()
    _OCR_DET_ONNX = _PROJECT_ROOT / "models" / "paddleocr_det.onnx"
    _OCR_REC_ONNX = _PROJECT_ROOT / "models" / "paddleocr_rec.onnx"
    _OCR_REC_DICT = _PROJECT_ROOT / "models" / "paddleocr_dict.txt"
    _OCR_MAX_PAIRS = 1
else:
    _OCR_DET_MODEL = "PP-OCRv5_mobile_det"
    _OCR_REC_MODEL = "PP-OCRv5_mobile_rec"
    _OCR_REC_FALLBACKS = ("latin_PP-OCRv5_mobile_rec",)
    _OCR_DET_ONNX = _PROJECT_ROOT / "models" / "paddleocr_v5_det.onnx"
    _OCR_REC_ONNX = _PROJECT_ROOT / "models" / "paddleocr_v5_rec.onnx"
    _OCR_REC_DICT = _PROJECT_ROOT / "models" / "paddleocr_v5_dict.txt"
    _OCR_MAX_PAIRS = 2


@dataclass(frozen=True)
class Settings:
    project_root: Path = _PROJECT_ROOT

    # Caminho do modelo YOLO local.
    model_path: Path = field(
        default_factory=lambda: Path(_env_str("DETECT_MODEL_PATH", str(_PROJECT_ROOT / "models" / "yolo.onnx")))
    )

    target_class_name: str = "class_0"
    target_class_id: int | None = None

    # Falso negativo (balao perdido) custa caro; falso positivo e barato de descartar.
    conf: float = field(default_factory=lambda: _env_float("DETECT_CONF", 0.40))
    iou: float = field(default_factory=lambda: _env_float("DETECT_IOU", 0.60))
    min_box_area: int = field(default_factory=lambda: _env_int("DETECT_MIN_BOX_AREA", 400))
    margin: int = field(default_factory=lambda: _env_int("DETECT_MARGIN", 12))

    # OCR via PaddleOCR (ONNX local).
    hf_home: Path = _PROJECT_ROOT / "models" / ".hf-cache"
    huggingface_hub_cache: Path = _PROJECT_ROOT / "models" / ".hf-cache" / "hub"
    hf_hub_offline: bool = True
    ocr_use_local_onnx: bool = True

    ocr_model_generation: str = _OCR_GENERATION
    ocr_det_onnx_path: Path = _OCR_DET_ONNX
    ocr_rec_onnx_path: Path = _OCR_REC_ONNX
    ocr_rec_dict_path: Path = _OCR_REC_DICT
    # Fallback latino (acentos PT: a~, o~, c-cedilha...) fora do dict principal do v5.
    ocr_rec_fallback_onnx_path: Path = _PROJECT_ROOT / "models" / "paddleocr_v5_latin_rec.onnx"
    ocr_rec_fallback_dict_path: Path = _PROJECT_ROOT / "models" / "paddleocr_v5_latin_dict.txt"

    ocr_timeout_sec: int = field(default_factory=lambda: _env_int("OCR_TIMEOUT_SEC", 120))
    ocr_det_model: str = _OCR_DET_MODEL
    ocr_rec_model: str = _OCR_REC_MODEL
    ocr_det_model_fallbacks: tuple[str, ...] = ()
    ocr_rec_model_fallbacks: tuple[str, ...] = _OCR_REC_FALLBACKS
    ocr_variants: tuple[str, ...] = field(default_factory=lambda: _env_tuple("OCR_VARIANTS", ("raw",)))
    ocr_max_model_pairs: int = field(default_factory=lambda: _env_int("OCR_MAX_MODEL_PAIRS", _OCR_MAX_PAIRS))
    ocr_early_exit_score: float = field(default_factory=lambda: _env_float("OCR_EARLY_EXIT_SCORE", 28.0))
    # Abaixo deste score, variantes extras de preprocess (adaptive_inv/clahe) entram como resgate.
    ocr_variant_rescue_score: float = field(default_factory=lambda: _env_float("OCR_VARIANT_RESCUE_SCORE", 20.0))
    ocr_warmup_on_startup: bool = field(default_factory=lambda: _env_bool("OCR_WARMUP_ON_STARTUP", True))
    ocr_keepalive_enabled: bool = field(default_factory=lambda: _env_bool("OCR_KEEPALIVE_ENABLED", True))
    ocr_keepalive_interval_sec: int = field(default_factory=lambda: _env_int("OCR_KEEPALIVE_INTERVAL_SEC", 90))
    ocr_keepalive_timeout_sec: float = field(default_factory=lambda: _env_float("OCR_KEEPALIVE_TIMEOUT_SEC", 8.0))
    ocr_parallelism: int = field(default_factory=lambda: _env_int("OCR_PARALLELISM", 0))
    # 0 = auto: divide os cores do CPU entre os workers de OCR para evitar oversubscription.
    ocr_intra_op_threads: int = field(default_factory=lambda: _env_int("OCR_INTRA_OP_THREADS", 0))
    ocr_heat_threshold: float = field(default_factory=lambda: _env_float("OCR_HEAT_THRESHOLD", 0.25))
    ocr_box_threshold: float = field(default_factory=lambda: _env_float("OCR_BOX_THRESHOLD", 0.50))
    ocr_unclip_ratio: float = field(default_factory=lambda: _env_float("OCR_UNCLIP_RATIO", 2.3))
    ocr_max_candidates: int = field(default_factory=lambda: _env_int("OCR_MAX_CANDIDATES", 1200))
    # Caixas com score de reconhecimento abaixo disso são ruído de borda/retícula.
    ocr_min_rec_score: float = field(default_factory=lambda: _env_float("OCR_MIN_REC_SCORE", 0.60))

    # Reconhecimento funciona melhor com caractere/linha em ~25-48px de altura.
    ocr_target_line_height: int = field(default_factory=lambda: _env_int("OCR_TARGET_LINE_HEIGHT", 44))
    ocr_max_scale: float = field(default_factory=lambda: _env_float("OCR_MAX_SCALE", 3.0))
    ocr_max_side: int = field(default_factory=lambda: _env_int("OCR_MAX_SIDE", 1600))
    ocr_border_px: int = field(default_factory=lambda: _env_int("OCR_BORDER_PX", 12))

    # API key opcional.
    # Vazio => autenticação desabilitada para uso local.
    api_key: str = os.getenv("TRANSLATE_API_KEY", "").strip()

    enable_cors: bool = True


settings = Settings()
