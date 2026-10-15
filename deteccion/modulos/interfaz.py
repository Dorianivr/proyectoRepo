"""Módulo de interfaz: dibujo en pantalla y lectura de teclas."""
import cv2

TECLA_ESPACIO = ord(' ')
TECLA_Q = ord('q')
TECLA_ESC = 27


def dibujar_frame(frame, texto: str, titulo: str = "OCR simple"):
    """Dibuja las instrucciones y el último texto detectado."""
    display = frame.copy()
    cv2.putText(display, "ESPACIO=OCR  Q=salir", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(display, texto[:80], (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    cv2.imshow(titulo, display)


def leer_tecla() -> int:
    return cv2.waitKey(1) & 0xFF


def es_salir(tecla: int) -> bool:
    return tecla in (TECLA_Q, TECLA_ESC)


def es_detectar(tecla: int) -> bool:
    return tecla == TECLA_ESPACIO
