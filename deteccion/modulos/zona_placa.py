"""Módulo de zona de placa: localiza automáticamente dónde está la placa
en el frame para que el OCR solo lea ese recorte.

Usa visión clásica (OpenCV): realce de texto con morfología, gradientes,
contornos y filtros por tamaño y proporción. No requiere modelos extra.
"""
import cv2
import numpy as np


def _mascara_candidatos(frame):
    """Devuelve una máscara binaria con las regiones que parecen texto agrupado."""
    gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gris = cv2.bilateralFilter(gris, 9, 75, 75)

    alto, ancho = gris.shape
    k_ancho = max(15, ancho // 50)
    k_alto = max(5, ancho // 180)
    kernel_rect = cv2.getStructuringElement(cv2.MORPH_RECT, (k_ancho, k_alto))

    # Texto oscuro sobre fondo claro (blackhat) y texto claro sobre oscuro (tophat)
    blackhat = cv2.morphologyEx(gris, cv2.MORPH_BLACKHAT, kernel_rect)
    tophat = cv2.morphologyEx(gris, cv2.MORPH_TOPHAT, kernel_rect)
    realce = cv2.max(blackhat, tophat)

    # Los caracteres generan muchos bordes verticales
    grad = cv2.Sobel(realce, cv2.CV_32F, 1, 0, ksize=-1)
    grad = np.absolute(grad)
    minimo, maximo = grad.min(), grad.max()
    if maximo - minimo < 1e-6:
        return np.zeros_like(gris)
    grad = (255 * (grad - minimo) / (maximo - minimo)).astype("uint8")

    # Unir caracteres vecinos en un solo bloque
    grad = cv2.morphologyEx(grad, cv2.MORPH_CLOSE, kernel_rect)
    _, binaria = cv2.threshold(grad, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    kernel_cuadrado = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binaria = cv2.erode(binaria, kernel_cuadrado, iterations=2)
    binaria = cv2.dilate(binaria, kernel_cuadrado, iterations=4)
    return binaria


def detectar_zona_placa(frame,
                        area_min=0.005,
                        area_max=0.5,
                        proporcion_min=1.2,
                        proporcion_max=5.5):
    """Busca la zona más probable de placa.

    Devuelve (x, y, w, h) o None si no encuentra ninguna.
    area_min / area_max: fracción del área del frame.
    proporcion_*: ancho/alto permitido (placas de auto ~2, motos ~1.3).
    """
    alto, ancho = frame.shape[:2]
    area_frame = alto * ancho

    mascara = _mascara_candidatos(frame)
    contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    mejor, mejor_puntaje = None, 0.0
    for c in contornos:
        x, y, w, h = cv2.boundingRect(c)
        if h == 0:
            continue

        area_caja = w * h
        if not (area_min * area_frame <= area_caja <= area_max * area_frame):
            continue

        proporcion = w / h
        if not (proporcion_min <= proporcion <= proporcion_max):
            continue

        # Qué tan "rectangular" es el contorno (una placa llena su caja)
        relleno = cv2.contourArea(c) / area_caja
        if relleno < 0.4:
            continue

        # Preferir cajas rectangulares, grandes y cerca del centro vertical
        centro_y = (y + h / 2) / alto
        penal_centro = 1.0 - abs(centro_y - 0.5) * 0.5
        puntaje = relleno * (area_caja / area_frame) ** 0.5 * penal_centro

        if puntaje > mejor_puntaje:
            mejor, mejor_puntaje = (x, y, w, h), puntaje

    return mejor


def recortar_zona(frame, caja, margen=0.08):
    """Recorta la caja del frame agregando un pequeño margen alrededor."""
    if caja is None:
        return None
    alto, ancho = frame.shape[:2]
    x, y, w, h = caja
    mx, my = int(w * margen), int(h * margen)
    x1, y1 = max(0, x - mx), max(0, y - my)
    x2, y2 = min(ancho, x + w + mx), min(alto, y + h + my)
    return frame[y1:y2, x1:x2]
