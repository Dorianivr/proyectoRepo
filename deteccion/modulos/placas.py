"""Módulo de placas: limpieza, clasificación y extracción de la placa
a partir del texto que devuelve el OCR."""
import re
 
LETRAS = r"[A-HJ-NP-Z]"
NUMEROS = r"\d"
 
PATRON_MOTO = rf"^Y{NUMEROS}{{3}}{LETRAS}{{2}}$"
PATRON_AUTO = rf"^{LETRAS}{{3}}{NUMEROS}{{3,4}}$"
PATRON_CAMION = rf"^{LETRAS}{{2}}{NUMEROS}{{4,5}}$"
 
# Formas posibles de una placa: L = letra, N = número, otro = literal
PLANTILLAS = (
    "YNNNLL",
    "LLLNNN", "LLLNNNN",
    "LLNNNN", "LLNNNNN",
)
 
# Confusiones típicas del OCR según la posición esperada
DIGITO_A_LETRA = {"0": "D", "1": "L", "2": "Z", "4": "A",
                  "5": "S", "6": "G", "8": "B"}
LETRA_A_DIGITO = {"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1",
                  "Z": "2", "S": "5", "B": "8", "G": "6", "A": "4"}
 
 
def limpiar_placa(placa: str) -> str:
    """Normaliza el texto: mayúsculas y solo letras/números."""
    return re.sub(r"[^A-Z0-9]", "", placa.strip().upper())
 
 
def clasificar_placa(placa: str) -> str:
    placa = limpiar_placa(placa)
 
    if re.fullmatch(PATRON_MOTO, placa):
        return "Motocicleta"
    if re.fullmatch(PATRON_AUTO, placa):
        return "Automóvil"
    if re.fullmatch(PATRON_CAMION, placa):
        return "Camión"
    return "Inválida"
 
 
def _ajustar(candidata: str, plantilla: str):
    """Ajusta la candidata a la plantilla corrigiendo confusiones del OCR.
 
    Devuelve (texto_corregido, numero_de_correcciones) o None si no encaja.
    """
    if len(candidata) != len(plantilla):
        return None
 
    salida, cambios = [], 0
    for c, p in zip(candidata, plantilla):
        if p == "N":
            if c.isdigit():
                salida.append(c)
            elif c in LETRA_A_DIGITO:
                salida.append(LETRA_A_DIGITO[c])
                cambios += 1
            else:
                return None
        elif p == "L":
            if re.fullmatch(LETRAS, c):
                salida.append(c)
            elif c in DIGITO_A_LETRA:
                salida.append(DIGITO_A_LETRA[c])
                cambios += 1
            else:
                return None
        else:  # carácter fijo (la 'Y' de las motos)
            if c != p:
                return None
            salida.append(c)
    return "".join(salida), cambios
 
 
def _ventanas(candidata: str, max_correcciones: int):
    """Genera (fragmento, correcciones_permitidas) a probar dentro de la candidata."""
    if len(candidata) in (6, 7):
        yield candidata, max_correcciones
    elif len(candidata) > 7:
        # Texto pegado (p. ej. "TPCH9604"): solo coincidencias exactas
        for largo in (6, 7):
            for k in range(len(candidata) - largo + 1):
                yield candidata[k:k + largo], 0
 
 
def extraer_placa(texto: str, max_correcciones: int = 2):
    """Busca en el texto del OCR la placa válida.
 
    Prueba tokens sueltos y grupos de hasta 4 tokens seguidos (el OCR suele
    partir "PCH-96-04" en "PCH", "96", "04"), ignora el resto ("EDOMEX", "T"...)
    y corrige confusiones comunes (O/0, S/5, B/8...).
 
    Devuelve (placa, tipo) o (None, "Inválida").
    """
    tokens = [t for t in (limpiar_placa(p) for p in texto.split()) if t]
 
    mejor = None  # (correcciones, -largo, posicion, placa, tipo)
    for i in range(len(tokens)):
        for j in range(i, min(len(tokens), i + 4)):
            candidata = "".join(tokens[i:j + 1])
            for fragmento, permitidas in _ventanas(candidata, max_correcciones):
                for plantilla in PLANTILLAS:
                    ajuste = _ajustar(fragmento, plantilla)
                    if ajuste is None or ajuste[1] > permitidas:
                        continue
                    placa, correcciones = ajuste
                    tipo = clasificar_placa(placa)
                    if tipo == "Inválida":
                        continue
                    # Menos correcciones primero; a igualdad, la placa más larga
                    clave = (correcciones, -len(placa), i)
                    if mejor is None or clave < mejor[:3]:
                        mejor = (*clave, placa, tipo)
 
    if mejor is None:
        return None, "Inválida"
    return mejor[3], mejor[4]
 