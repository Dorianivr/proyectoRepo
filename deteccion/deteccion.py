import cv2
import easyocr
import numpy as np

# Inicializa el lector OCR (español + inglés)
# gpu=True si tienes CUDA disponible, si no, déjalo en False
reader = easyocr.Reader(['es', 'en'], gpu=False)

# Abre la cámara (0 = cámara por defecto)
cap = cv2.VideoCapture(1)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

if not cap.isOpened():
    raise RuntimeError("No se pudo abrir la cámara")

# Variables de control
ocr_activo = False       # Se activa con la tecla ESPACIO
modo_region = False      # 'r' para activar/desactivar región
roi = None               # Región de interés (x, y, w, h)
drawing = False
ix, iy = -1, -1

# Cache de resultados para no re-ejecutar OCR cada frame
resultados = []


def preprocesar(img):
    """Mejora la imagen para OCR: escala de grises + contraste + umbral adaptativo."""
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gris = cv2.bilateralFilter(gris, 9, 75, 75)
    # Umbral adaptativo: bueno con iluminación variable
    umbral = cv2.adaptiveThreshold(
        gris, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )
    return umbral


def ejecutar_ocr(frame, region=None):
    """Ejecuta OCR sobre la imagen completa o sobre la región indicada."""
    if region is not None:
        x, y, w, h = region
        recorte = frame[y:y + h, x:x + w]
    else:
        recorte = frame

    # Opcional: preprocesar. EasyOCR suele ir bien sin preprocesar,
    # pero puedes probar con la versión preprocesada para documentos.
   #img_proc = preprocesar(recorte)

   #resultados_local = reader.readtext(img_proc, detail=1, paragraph=False)
    resultados_local = reader.readtext(recorte, detail=1, paragraph=False)
    # Devuelve lista de (bbox, texto, confianza) en coordenadas globales
    salida = []
    for bbox, texto, conf in resultados_local:
        if conf < 0.4:  # filtra detecciones poco fiables
            continue
        if region is not None:
            bbox = [[p[0] + x, p[1] + y] for p in bbox]
        salida.append((bbox, texto, conf))
    return salida


def mouse_callback(event, x, y, flags, param):
    """Permite dibujar la región de interés con el ratón."""
    global ix, iy, drawing, roi
    if not modo_region:
        return
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        ix, iy = x, y
        roi = None
    elif event == cv2.EVENT_MOUSEMOVE and drawing:
        roi = (min(ix, x), min(iy, y), abs(x - ix), abs(y - iy))
    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        roi = (min(ix, x), min(iy, y), abs(x - ix), abs(y - iy))


cv2.namedWindow("OCR en tiempo real")
cv2.setMouseCallback("OCR en tiempo real", mouse_callback)

print("Controles:")
print("  ESPACIO -> ejecutar OCR")
print("  r       -> activar/desactivar modo selección de región")
print("  c       -> limpiar región y resultados")
print("  q / ESC -> salir")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    #frame = cv2.flip(frame, 1)  # espejo (opcional)
    display = frame.copy()

    # Dibuja la región seleccionada
    if roi is not None:
        x, y, w, h = roi
        cv2.rectangle(display, (x, y), (x + w, y + h), (0, 255, 255), 2)

    # Dibuja los resultados del último OCR
    for bbox, texto, conf in resultados:
        pts = np.array(bbox, dtype=np.int32)
        cv2.polylines(display, [pts], True, (0, 255, 0), 2)
        # Etiqueta con el texto
        x0, y0 = pts[0]
        cv2.putText(display, f"{texto} ({conf:.2f})",
                    (x0, max(y0 - 8, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    # Info en pantalla
    info = "MODO: " + ("REGION" if modo_region else "COMPLETO")
    cv2.putText(display, info, (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (255, 255, 255), 2)
    cv2.putText(display, "ESPACIO=OCR  R=region  C=limpiar  Q=salir",
                (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

    cv2.imshow("OCR en tiempo real", display)

    key = cv2.waitKey(1) & 0xFF

    if key == ord(' '):  # Ejecutar OCR
        region = roi if (modo_region and roi is not None) else None
        resultados = ejecutar_ocr(frame, region)
        print(f"\n--- OCR ({len(resultados)} detecciones) ---")
        for _, texto, conf in resultados:
            print(f"  [{conf:.2f}] {texto}")

    elif key == ord('r'):
        modo_region = not modo_region
        if not modo_region:
            roi = None

    elif key == ord('c'):
        roi = None
        resultados = []

    elif key == ord('q') or key == 27:
        break

cap.release()
cv2.destroyAllWindows()