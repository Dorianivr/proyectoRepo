"""Módulo principal: orquesta cámara, OCR, interfaz y clasificación de placas."""
from modulos import camara
from modulos import ocr
from modulos import interfaz
from modulos  import zona_placa
from modulos.placas import extraer_placa
 
 #sedrcfvtgbyhnumj
def main():
    ocr.iniciar_ocr()
    cap = camara.abrir_camara(indice=1)
 
    mensaje = ""  # lo que se muestra en pantalla (placa reconocida)
    print("ESPACIO -> detectar texto | q / ESC -> salir")
 
    while True:
        ret, frame = camara.leer_frame(cap)
        if not ret:
            break
 
        # Localiza la placa automáticamente en cada frame
        zona = zona_placa.detectar_zona_placa(frame)
 
        interfaz.dibujar_frame(frame, mensaje, zona)
        tecla = interfaz.leer_tecla()
 
        if interfaz.es_detectar(tecla):
            recorte = zona_placa.recortar_zona(frame, zona)
            if recorte is None:
                print("No se encontró ninguna zona de placa en el frame")
                continue
 
            ocr.detectar_texto(recorte)  # OCR solo dentro de la zona
            texto = ocr.obtener_texto()
            print("Texto detectado:", texto)
 
            # Elige del texto la parte que realmente es una placa
            placa, tipo = extraer_placa(texto)
            if placa:
                mensaje = f"{placa} - {tipo}"
                print(f"Placa: {placa} | Tipo: {tipo}")
            else:
                mensaje = "Placa no reconocida"
                print("No se reconoció una placa válida en el texto")
        elif interfaz.es_salir(tecla):
            break
 
    camara.cerrar_camara(cap)
    print("Último texto guardado:", ocr.obtener_texto())
 
 
if __name__ == "__main__":
    main()