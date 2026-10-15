"""Módulo principal: orquesta cámara, OCR, interfaz y clasificación de placas."""
import camara
import ocr
import interfaz
from placas import clasificar_placa


def main():
    ocr.iniciar_ocr()
    cap = camara.abrir_camara(indice=1)

    print("ESPACIO -> detectar texto | q / ESC -> salir")

    while True:
        ret, frame = camara.leer_frame(cap)
        if not ret:
            break

        interfaz.dibujar_frame(frame, ocr.obtener_texto())
        tecla = interfaz.leer_tecla()

        if interfaz.es_detectar(tecla):
            ocr.detectar_texto(frame)
            texto = ocr.obtener_texto()
            print("Texto detectado:", texto)
            print(clasificar_placa(texto))
        elif interfaz.es_salir(tecla):
            break

    camara.cerrar_camara(cap)
    print("Último texto guardado:", ocr.obtener_texto())


if __name__ == "__main__":
    main()
