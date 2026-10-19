"""Módulo de OCR: detección de texto con EasyOCR."""
import easyocr
from sympy import false, true

# Variable global independiente con el texto detectado
texto_detectado = ""

_reader = None


def iniciar_ocr(idiomas=("es", "en"), gpu: bool = False):
    """Inicializa el lector OCR (se hace una sola vez)."""
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(list(idiomas), gpu=gpu) #///////////////////////////////////////////////////////////////
    return _reader


def detectar_texto(frame, confianza_min: float = 0.4):
    """Ejecuta OCR y actualiza la variable global texto_detectado."""
    global texto_detectado
    if _reader is None:
        iniciar_ocr()
    resultados = _reader.readtext(frame, detail=1, paragraph=False)
    textos = [t for _, t, conf in resultados if conf >= confianza_min]
    texto_detectado = " ".join(textos)
    return resultados


def obtener_texto() -> str:
    """Devuelve el último texto detectado."""
    return texto_detectado
