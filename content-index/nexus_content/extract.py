"""Page extraction usable by Nexus and Urbexa. Dependencies load only on demand."""
from dataclasses import dataclass
from pathlib import Path
import json


@dataclass(frozen=True)
class PageText:
    page: int
    text: str
    method: str


class PaddleEngine:
    def __init__(self, lang="pt", model_options=None):
        from paddleocr import PaddleOCR
        from importlib.metadata import version
        self.v3 = int(version("paddleocr").split(".")[0]) >= 3
        options = dict(model_options or {})
        if self.v3:
            options.update(use_doc_orientation_classify=False,
                           use_doc_unwarping=False, use_textline_orientation=False)
        else:
            options.update(use_angle_cls=True, show_log=False)
        self.model = PaddleOCR(lang=lang, **options)

    def __call__(self, rgb):
        if self.v3:
            texts = []
            for result in self.model.predict(rgb):
                # PaddleX Result.json is a dict (some releases expose JSON text).
                data = result.json
                if callable(data):
                    data = data()
                if isinstance(data, str):
                    data = json.loads(data)
                texts.extend(data.get("res", data).get("rec_texts", []))
            return "\n".join(texts)
        return "\n".join(line[1][0] for group in self.model.ocr(rgb, cls=True)
                         for line in (group or []))


class Extractor:
    def __init__(self, ocr=None, lang="pt", model_options=None, dpi=180,
                 max_pages=2000, max_pixels=30_000_000):
        self.ocr = ocr
        self.lang, self.model_options = lang, model_options
        self.dpi, self.max_pages, self.max_pixels = dpi, max_pages, max_pixels

    def __call__(self, filename):
        import pymupdf
        with pymupdf.open(filename) as doc:
            if doc.needs_pass or len(doc) > self.max_pages:
                raise ValueError("unsupported_document")
            for number, page in enumerate(doc, 1):
                text = page.get_text("text", sort=True).strip() if doc.is_pdf else ""
                method = "text"
                # OCR raster and mixed pages as well as pages without a text layer.
                if not text or not doc.is_pdf or page.get_images():
                    import numpy as np
                    if page.rect.width * page.rect.height * (self.dpi / 72) ** 2 > self.max_pixels:
                        raise ValueError("page_too_large")
                    pix = page.get_pixmap(dpi=self.dpi, colorspace=pymupdf.csRGB, alpha=False)
                    rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
                    if self.ocr is None:
                        self.ocr = PaddleEngine(self.lang, self.model_options)
                    # PaddleOCR expects OpenCV BGR arrays.
                    recognized = self.ocr(rgb[:, :, ::-1].copy()).strip()
                    text = "\n".join(dict.fromkeys(t for t in (text, recognized) if t))
                    method = "mixed" if method == "text" and page.get_text().strip() else "ocr"
                if len(text) > 2_000_000:
                    raise ValueError("page_text_too_large")
                yield PageText(number, text, method)
