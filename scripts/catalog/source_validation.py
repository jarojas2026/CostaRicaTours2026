"""Strict checks for dated research batches; legacy batches retain their review date."""
from datetime import date
import math
import re
from urllib.parse import urlparse

CATEGORIES = set("volcanoes wildlife canopy beaches rafting culture multiday combos adventure nature hiking waterfalls rural gastronomy surf snorkeling diving whale_watching kayak fishing family services".split())
REGIONS = set("arenal monteverde manuel_antonio guanacaste tortuguero pacuare san_jose sjo caribe caribe_sur osa marino_ballena perez_zeledon dominical uvita puerto_viejo cahuita jaco cartago turrialba corcovado golfo_dulce central_pacific sarapiqui los_santos golfito".split())


def validate_dated_row(row, today=None):
    """Reject invalid rows before any generated files are written. No network calls."""
    if "revisado_el" not in row:
        return
    for field in ("id_slug", "titulo_es", "titulo_en", "operador", "lugar",
                  "descripcion_es", "descripcion_en", "url_fuente", "revisado_el"):
        if not (row.get(field) or "").strip():
            raise ValueError(f"missing {field}")
    if None in row or any(value is None for value in row.values()):
        raise ValueError("CSV column count mismatch")
    reviewed = row["revisado_el"]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", reviewed):
        raise ValueError("revisado_el must use YYYY-MM-DD")
    if date.fromisoformat(reviewed) > (today or date.today()):
        raise ValueError("revisado_el cannot be in the future")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", row["id_slug"]):
        raise ValueError("invalid id_slug")
    url = urlparse(row["url_fuente"])
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        raise ValueError("source must be a public HTTPS URL without credentials")
    if row.get("categoria") not in CATEGORIES or row.get("region") not in REGIONS:
        raise ValueError("unknown category or region")
    if row.get("dificultad") not in {"fácil", "moderado", "exigente", "por_confirmar"}:
        raise ValueError("unknown difficulty")
    for field, low, high in (("lat", -90, 90), ("lng", -180, 180)):
        value = float(row[field])
        if not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f"invalid {field}")
    for field in ("precio_usd_adulto", "precio_usd_nino", "duracion_horas", "edad_minima"):
        if row.get(field):
            value = float(row[field])
            if not math.isfinite(value) or value < 0:
                raise ValueError(f"invalid {field}")
    state = row.get("estado_precio", "")
    if state not in {"", "por_confirmar"}:
        raise ValueError("unknown estado_precio")
    if state == "por_confirmar" and (row.get("precio_usd_adulto") or row.get("precio_usd_nino")):
        raise ValueError("unconfirmed prices must remain blank")
