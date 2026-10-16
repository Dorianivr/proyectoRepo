"""Módulo de cámara: apertura, lectura y cierre."""
import cv2


def abrir_camara(indice: int = 1, ancho: int = 1280, alto: int = 720):
    """Abre la cámara y devuelve el objeto VideoCapture."""
    cap = cv2.VideoCapture(indice)  # 0 = cámara por defecto
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, ancho)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, alto)

    if not cap.isOpened():
        raise RuntimeError("No se pudo abrir la cámara")
    return cap


def leer_frame(cap):
    """Devuelve (ok, frame) de la cámara."""
    return cap.read()


def cerrar_camara(cap):
    """Libera la cámara y cierra las ventanas."""
    cap.release()
    cv2.destroyAllWindows()
