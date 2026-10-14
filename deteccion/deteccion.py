import cv2
import easyocr
import re
# Variable global independiente con el texto detectado
texto_detectado = ""
 
reader = easyocr.Reader(['es', 'en'], gpu=False)
 
cap = cv2.VideoCapture(1)  # 0 = cámara por defecto
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
 
if not cap.isOpened():
    raise RuntimeError("No se pudo abrir la cámara")
 
 
def detectar_texto(frame):
    """Ejecuta OCR y actualiza la variable global texto_detectado."""
    global texto_detectado
    resultados = reader.readtext(frame, detail=1, paragraph=False)
    textos = [t for _, t, conf in resultados if conf >= 0.4]
    texto_detectado = " ".join(textos)
    return resultados





def clasificar_placa(placa: str) -> str:
    placa = re.sub(r"[^A-Z0-9]", "", placa.strip().upper())
    LETRAS = r"[A-HJ-NP-Z]"
    NUMEROS = r"\d"
    patron_moto  = rf"^Y{NUMEROS}{{3}}{LETRAS}{{2}}$"
    patron_auto  = rf"^{LETRAS}{{3}}{NUMEROS}{{3,4}}$"
    patron_camion= rf"^{LETRAS}{{2}}{NUMEROS}{{4,5}}$"

    if re.fullmatch(patron_moto, placa):  return "Motocicleta"
    if re.fullmatch(patron_auto, placa):  return "Automóvil"
    if re.fullmatch(patron_camion, placa):return "Camión"
    return "Inválida"



 


 
print("ESPACIO -> detectar texto | q / ESC -> salir")
 
while True:
    ret, frame = cap.read()
    if not ret:
        break
 
    display = frame.copy()
    cv2.putText(display, "ESPACIO=OCR  Q=salir", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    # Muestra el último texto detectado en pantalla
    cv2.putText(display, texto_detectado[:80], (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    cv2.imshow("OCR simple", display)
 
    key = cv2.waitKey(1) & 0xFF
    if key == ord(' '):
        detectar_texto(frame)
        print("Texto detectado:", texto_detectado)
        print(clasificar_placa(texto_detectado))

    elif key == ord('q') or key == 27:
        break
 
cap.release()
cv2.destroyAllWindows()
 
# Aquí puedes usar la variable global después de cerrar la cámara
print("Último texto guardado:", texto_detectado)