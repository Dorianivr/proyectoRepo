"""Módulo de placas: clasificación del tipo de vehículo."""
import re

LETRAS = r"[A-HJ-NP-Z]"
NUMEROS = r"\d"

PATRON_MOTO = rf"^Y{NUMEROS}{{3}}{LETRAS}{{2}}$"
PATRON_AUTO = rf"^{LETRAS}{{3}}{NUMEROS}{{3,4}}$"
PATRON_CAMION = rf"^{LETRAS}{{2}}{NUMEROS}{{4,5}}$"


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
