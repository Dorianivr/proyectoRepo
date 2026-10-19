"""Módulo detector_placa: entrena y usa un detector de UNA sola clase ("placa")
para localizar el panel de la placa en una imagen.

No lee ni reconoce el contenido de la placa: solo aprende cómo se ve el
panel (forma, bordes, color) para devolver su caja. El texto lo lee el OCR.

Requiere:  pip install ultralytics

Estructura esperada del banco de imágenes (formato YOLO):

    banco/
        imagenes/   foto1.jpg, foto2.jpg, ...
        etiquetas/  foto1.txt, foto2.txt, ...   (una línea por placa)

Cada .txt contiene:  0 x_centro y_centro ancho alto   (valores entre 0 y 1)
Se pueden generar con LabelImg, Roboflow o CVAT (exportando en formato YOLO).

Uso típico:
    python -m modulos.detector_placa entrenar banco      # una sola vez
    # luego, en main.py:
    from modulos import detector_placa
    zona = detector_placa.detectar_zona_placa(frame)     # (x, y, w, h) o None
"""
import random
import shutil
import sys
from pathlib import Path

import cv2

RUTA_MODELO = Path(__file__).resolve().parent.parent / "modelos" / "placa.pt"
_modelo = None


# --------------------------------------------------------------------------
# Entrenamiento
# --------------------------------------------------------------------------
def _preparar_dataset(banco: Path, salida: Path, prop_val: float = 0.2):
    """Divide el banco en train/val y crea el data.yaml que pide YOLO."""
    imagenes = sorted(p for p in (banco / "imagenes").iterdir()
                      if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"))
    imagenes = [p for p in imagenes if (banco / "etiquetas" / f"{p.stem}.txt").exists()]
    if len(imagenes) < 10:
        raise RuntimeError(
            f"Solo hay {len(imagenes)} imágenes con etiqueta; se recomiendan 30+.")

    random.seed(0)
    random.shuffle(imagenes)
    n_val = max(1, int(len(imagenes) * prop_val))
    partes = {"val": imagenes[:n_val], "train": imagenes[n_val:]}

    if salida.exists():
        shutil.rmtree(salida)
    for nombre, lista in partes.items():
        (salida / nombre / "images").mkdir(parents=True)
        (salida / nombre / "labels").mkdir(parents=True)
        for img in lista:
            shutil.copy(img, salida / nombre / "images" / img.name)
            shutil.copy(banco / "etiquetas" / f"{img.stem}.txt",
                        salida / nombre / "labels" / f"{img.stem}.txt")

    yaml = salida / "data.yaml"
    yaml.write_text(
        f"path: {salida.resolve().as_posix()}\n"
        "train: train/images\n"
        "val: val/images\n"
        "names:\n  0: placa\n",
        encoding="utf-8")
    return yaml


def entrenar(banco: str = "banco", epocas: int = 80, tam: int = 640):
    """Entrena (fine-tuning) a partir de un modelo YOLO pequeño preentrenado."""
    from ultralytics import YOLO

    yaml = _preparar_dataset(Path(banco), Path("dataset_yolo"))
    modelo = YOLO("yolov8n.pt")
    modelo.train(
        data=str(yaml), epochs=epocas, imgsz=tam, batch=8,
        patience=20,
        degrees=8, translate=0.1, scale=0.4, shear=2.0,
        hsv_h=0.015, hsv_s=0.5, hsv_v=0.4,
        fliplr=0.0,
        mosaic=1.0,
        project="runs", name="placa", exist_ok=True,
    )

    mejor = Path(modelo.trainer.best)
    RUTA_MODELO.parent.mkdir(exist_ok=True)
    shutil.copy(mejor, RUTA_MODELO)
    print(f"Modelo guardado en {RUTA_MODELO}")


# --------------------------------------------------------------------------
# Uso en tiempo real
# --------------------------------------------------------------------------
def cargar_modelo(ruta=RUTA_MODELO):
    """Carga el modelo entrenado (una sola vez)."""
    global _modelo
    if _modelo is None:
        from ultralytics import YOLO
        if not Path(ruta).exists():
            raise FileNotFoundError(
                f"No existe {ruta}. Entrena primero: "
                "python -m modulos.detector_placa entrenar banco")
        _modelo = YOLO(str(ruta))
    return _modelo


def detectar_zona_placa(frame, confianza_min: float = 0.4):
    """Devuelve (x, y, w, h) de la placa más segura, o None.

    Mismo formato que zona_placa.detectar_zona_placa, así que sirve con
    interfaz.dibujar_frame y zona_placa.recortar_zona sin cambios.
    """
    modelo = cargar_modelo()
    resultado = modelo.predict(frame, conf=confianza_min, verbose=False)[0]
    if len(resultado.boxes) == 0:
        return None

    i = int(resultado.boxes.conf.argmax())          # la de mayor confianza
    x1, y1, x2, y2 = resultado.boxes.xyxy[i].tolist()
    return int(x1), int(y1), int(x2 - x1), int(y2 - y1)


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "entrenar":
        entrenar(sys.argv[2] if len(sys.argv) > 2 else "banco")
    elif len(sys.argv) >= 3 and sys.argv[1] == "probar":
        img = cv2.imread(sys.argv[2])
        print("Zona detectada:", detectar_zona_placa(img))
    else:
        print("Uso:\n  python -m modulos.detector_placa entrenar [carpeta_banco]\n"
              "  python -m modulos.detector_placa probar imagen.jpg")
