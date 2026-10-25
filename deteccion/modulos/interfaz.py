"""Módulo de interfaz: dibujo en pantalla y lectura de teclas."""
import unicodedata
 
import cv2
import numpy as np
 
TECLA_ESPACIO = ord(' ')
TECLA_Q = ord('q')
TECLA_ESC = 27
 
 
def _a_poligono(zona):
    """Convierte la zona a un arreglo (N, 1, 2) int32 que OpenCV puede dibujar.
 
    Acepta las 4 esquinas [[x, y], ...] o una caja (x, y, w, h).
    """
    zona = np.asarray(zona)
    if zona.shape == (4,):  # caja (x, y, w, h)
        x, y, w, h = zona
        zona = np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
    return zona.astype(np.int32).reshape(-1, 1, 2)
 
 
def dibujar_frame(frame, texto: str, zona=None, titulo: str = "OCR simple"):
    """Dibuja las instrucciones, la zona de placa (4 esquinas) y el último texto."""
    display = frame.copy()
    if zona is not None:
        cv2.polylines(display, [_a_poligono(zona)], True, (0, 255, 255), 2)
    cv2.putText(display, "ESPACIO=OCR  Q=salir", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    # La fuente de OpenCV no dibuja acentos: se quitan solo para mostrar
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    cv2.putText(display, texto[:80], (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    cv2.imshow(titulo, display)
 
 
def leer_tecla() -> int:
    return cv2.waitKey(1) & 0xFF
 
 
def es_salir(tecla: int) -> bool:
    return tecla in (TECLA_Q, TECLA_ESC)
 
 
def es_detectar(tecla: int) -> bool:
    return tecla == TECLA_ESPACIO