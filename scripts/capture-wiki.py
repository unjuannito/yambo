#!/usr/bin/env python3
"""
Captura pantallas reales de la app con Playwright y mide las posiciones de los
elementos para anotar la wiki (guías con callouts numerados).

Flujo por escena:
  1. Login (API) para obtener el JWT del administrador.
  2. Lanzar Chromium con el viewport de la escena (escritorio o móvil).
  3. Inyectar el token en localStorage y desactivar animaciones/transiciones
     (para que los rects sean estables y no midamos una animación a medias).
  4. Navegar a la URL (con deep-link si procede) y realizar la acción que abre
     el modal (p. ej. pulsar «Editar»).
  5. Capturar la PANTALLA COMPLETA (viewport) y medir getBoundingClientRect()
     de los targets respecto a la pantalla.
  6. Guardar el PNG en frontend/public/images/wiki/ y los callouts en rects.json.

IMPORTANTE (por qué viewport y no elemento):
  * El screenshot de ELEMENTO (element.screenshot()) con modales position:fixed
    + deviceScaleFactor>1 produce un RECORTE del render a resolución completa:
    sale la tarjeta ampliada 2x, sin el contexto de la web, como un zoom.
  * Capturar page.screenshot() (viewport completo) muestra la web tal como se
    ve en pantalla, y los callouts apuntan a elementos dentro de esa pantalla.
  * dpr=1 por defecto → la imagen sale a tamaño CSS exacto (ancho del viewport).
    Con --dpr 2 la imagen sale al doble de píxeles (retina); el JSON guarda el
    dpr para que el paso de dibujo escale correctamente.

Uso:
  python scripts/capture-wiki.py                    # captura todas las escenas
  python scripts/capture-wiki.py --scene editor     # solo una escena
  python scripts/capture-wiki.py --list             # lista las escenas
  python scripts/capture-wiki.py --headed           # navegador visible (debug)
  python scripts/capture-wiki.py --dpr 2            # captura retina (2x)
  YAMBO_BASE_URL=http://127.0.0.1 \
  YAMBO_ADMIN_PASSWORD='...' \
  python scripts/capture-wiki.py                    # apuntar a otro entorno

Requiere: pip install playwright && playwright install chromium

Notas / trampas conocidas:
  * Hay que medir DESPUÉS de desactivar animaciones (DISABLE_ANIM_CSS) y esperar
    a que el modal esté montado; si no, los rects salen de una posición intermedia.
  * Los targets se buscan con get_by_text(exact=True) para NO casar «Total» con
    «Subtotal» (el text= clásico hace substring case-insensitive). Si un target
    no casa exacto, se reintenta con text= como fallback (último recurso).
  * Los callouts fuera del viewport (x/y fuera de 0..100) se descartan: una
    flecha al vacío es peor que ninguna.
  * Los rects se miden en píxeles CSS relativos al viewport; con dpr=2 hay que
    multiplicar por dpr para los píxeles reales del PNG.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from playwright.sync_api import Page, sync_playwright, expect

# ── Configuración ─────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("YAMBO_BASE_URL", "http://127.0.0.1").rstrip("/")
ADMIN_EMAIL = os.environ.get("YAMBO_ADMIN_EMAIL", "admin@yambo.com")
ADMIN_PASSWORD = os.environ.get("YAMBO_ADMIN_PASSWORD", "")
ORDER_ID = os.environ.get("YAMBO_ORDER_ID", "z9BTryiW")

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "frontend" / "public" / "images" / "wiki"
RECTS_FILE = OUT_DIR / "rects.json"

# Desactiva animaciones/transiciones para que los rects sean estables.
DISABLE_ANIM_CSS = "*,*::before,*::after{animation:none!important;transition:none!important}"
# Tarjeta del modal (para acotar la búsqueda de targets y evitar falsos positivos).
CARD_SELECTOR = "div.bg-white.rounded-t-3xl"
# Esperas (ms). Ajustables por entorno para apps lentas.
WAIT_NAV_MS = int(os.environ.get("YAMBO_WAIT_NAV_MS", "2000"))
WAIT_MODAL_MS = int(os.environ.get("YAMBO_WAIT_MODAL_MS", "1500"))
CLICK_RETRIES = int(os.environ.get("YAMBO_CLICK_RETRIES", "3"))


@dataclass
class Scene:
    name: str
    url: str
    viewport: tuple[int, int]
    targets: list[str]
    # Nombre del botón que hay que pulsar para abrir el modal (None si se abre solo).
    open_action: str | None = None
    # Selector CSS que delimita dónde buscar los targets (None = toda la página).
    scope: str | None = CARD_SELECTOR


SCENES: list[Scene] = [
    Scene(
        name="pedido-detalle-desktop",
        url=f"/mi-espacio/admin/pedidos?orderId={ORDER_ID}",
        viewport=(1440, 900),
        targets=[
            "Detalles del Pedido", "Cliente", "Estado", "Productos",
            "Total del pedido:", "Historial", "Editar", "Cancelar pedido",
        ],
    ),
    Scene(
        name="pedido-detalle-mobile",
        url=f"/mi-espacio/admin/pedidos?orderId={ORDER_ID}",
        viewport=(390, 844),
        targets=[
            "Detalles del Pedido", "Productos", "+ Nueva incidencia",
            "Total del pedido", "Editar pedido",
        ],
    ),
    Scene(
        name="pedido-editor",
        url=f"/mi-espacio/admin/pedidos?orderId={ORDER_ID}",
        viewport=(1440, 900),
        targets=[
            "Editar pedido", "Tipo de incidencia", "Nueva incidencia",
            "Incidencia existente", "Justificación", "Productos",
            "Precio unitario", "Total", "Guardar cambios",
        ],
        open_action="Editar",
    ),
    Scene(
        name="pedido-historial",
        url=f"/mi-espacio/admin/pedidos?orderId={ORDER_ID}",
        viewport=(1440, 900),
        targets=["Historial de cambios del pedido", "Añadido", "Modificado", "Eliminado"],
        open_action="Historial",
    ),
    # ── Páginas reales documentadas por las guías ──────────────────────────────
    Scene(
        name="guia-configuracion",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración General", "OAuth / Inicio de Sesión", "Configuración de la Organización", "Guardar Configuración de la Organización"],
        scope="main",
    ),
    Scene(
        name="guia-pagina-principal",
        url="/mi-espacio/admin/pagina-principal",
        viewport=(1440, 900),
        targets=["Editor de Página Principal", "Secciones", "Configuración de Secciones"],
        scope="main",
    ),
    Scene(
        name="guia-invitaciones",
        url="/mi-espacio/admin/invitaciones",
        viewport=(1440, 900),
        targets=["Gestión de invitaciones", "+ Nueva Invitación", "Invitaciones nominativas"],
        scope="main",
    ),
    Scene(
        name="guia-perfiles",
        url="/mi-espacio/admin/perfiles",
        viewport=(1440, 900),
        targets=["Perfiles", "+ Nuevo Perfil"],
        scope="main",
    ),
    Scene(
        name="guia-seo",
        url="/mi-espacio/admin/seo",
        viewport=(1440, 900),
        targets=["SEO", "Generar faltantes", "Filtrar"],
        scope="main",
    ),
    Scene(
        name="guia-oauth-google",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["OAuth / Inicio de Sesión", "Google", "Client ID", "Guardar configuración OAuth"],
        open_action="OAuth / Inicio de Sesión",
        scope="main",
    ),
    # ── Subpestañas / secciones de las páginas documentadas ─────────────────────
    # Configuración: resto de pestañas
    Scene(
        name="configuracion-aplicacion",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración de la Aplicación", "Guardar Configuración de la Aplicación"],
        open_action="Aplicación",
        scope="main",
    ),
    Scene(
        name="configuracion-banco",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración Bancaria", "Guardar Configuración Bancaria"],
        open_action="Banco",
        scope="main",
    ),
    Scene(
        name="configuracion-email",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración de Correo Electrónico", "Guardar Configuración de Email"],
        open_action="Email",
        scope="main",
    ),
    Scene(
        name="configuracion-contacto",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración de Contacto", "Guardar Configuración de Contacto"],
        open_action="Contacto",
        scope="main",
    ),
    Scene(
        name="configuracion-archivos",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración de Archivos", "Guardar Configuración de Archivos"],
        open_action="Archivos",
        scope="main",
    ),
    Scene(
        name="configuracion-ia",
        url="/mi-espacio/admin/configuracion",
        viewport=(1440, 900),
        targets=["Configuración de IA (Ollama)", "Guardar Configuración de IA"],
        open_action="IA",
        scope="main",
    ),
    # Página principal: pestañas Hero y Sobre Nosotros
    Scene(
        name="pagina-principal-hero",
        url="/mi-espacio/admin/pagina-principal",
        viewport=(1440, 900),
        targets=["Sección Hero", "Guardar Hero"],
        open_action="Hero",
        scope="main",
    ),
    Scene(
        name="pagina-principal-sobre-nosotros",
        url="/mi-espacio/admin/pagina-principal",
        viewport=(1440, 900),
        targets=["Sección Sobre Nosotros", "Guardar Sobre Nosotros"],
        open_action="Sobre Nosotros",
        scope="main",
    ),
    # Invitaciones: pestaña nominativas
    Scene(
        name="invitaciones-nominativas",
        url="/mi-espacio/admin/invitaciones",
        viewport=(1440, 900),
        targets=["Invitaciones nominativas", "Nueva Invitación Nominativa"],
        open_action="Invitaciones nominativas",
        scope="main",
    ),
    # Pedidos: listado general
    Scene(
        name="pedidos-lista",
        url="/mi-espacio/admin/pedidos",
        viewport=(1440, 900),
        targets=["Pedidos", "Nuevo pedido", "Exportar a Excel"],
        scope="main",
    ),
]


def login() -> str:
    """Obtiene el JWT del administrador vía POST /api/auth/login."""
    if not ADMIN_PASSWORD:
        sys.exit("Falta YAMBO_ADMIN_PASSWORD. Exponla en el entorno (no la hardcodees).")
    payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"Login HTTP {e.code}: {e.read().decode(errors='replace')[:200]}")
    except urllib.error.URLError as e:
        sys.exit(f"No se pudo contactar con {BASE_URL}: {e.reason}")
    token = data.get("token")
    if not token:
        sys.exit(f"Login fallido (sin token): {data}")
    return token


def prepare_page(page: Page, token: str) -> None:
    """Carga el origen e inyecta el token para que la app arranque autenticada."""
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.evaluate("t => localStorage.setItem('auth_token', t)", token)


def click_button(page: Page, label: str) -> None:
    """Pulsa un botón por su texto exacto (el primero visible), con reintentos."""
    last_err: Exception | None = None
    for attempt in range(1, CLICK_RETRIES + 1):
        try:
            btn = page.get_by_role("button", name=label, exact=True).first
            btn.scroll_into_view_if_needed(timeout=3000)
            btn.click(timeout=5000)
            return
        except Exception as e:  # noqa: BLE001 — reintentar y reportar
            last_err = e
            if attempt < CLICK_RETRIES:
                time.sleep(1.0)
    raise RuntimeError(f"No se pudo pulsar «{label}» tras {CLICK_RETRIES} intentos: {last_err}")


def find_target(page: Page, label: str, scope: str | None = CARD_SELECTOR):
    """Localiza un target DENTRO del contenedor indicado (modal o artículo).

    Buscar en toda la página (page.get_by_text) hace que un texto genérico como
    «Productos» case con el enlace del menú lateral en vez del encabezado del
    modal. Acotar la búsqueda a un contenedor (CARD_SELECTOR para modales,
    «article» para las guías) elimina esos falsos positivos; el bounding_box
    devuelto sigue en píxeles CSS del viewport.

    Prioridad:
      1. get_by_text(exact=True) → evita que «Total» case con «Subtotal».
      2. Fallback: locator(text=label) (substring, case-insensitive) — último recurso.
    """
    root = page.locator(scope).last if scope else page
    # 1) exacto
    try:
        loc = root.get_by_text(label, exact=True).first
        box = loc.bounding_box()
        if box:
            return box
    except Exception:  # noqa: BLE001
        pass
    # 2) fallback substring
    try:
        loc = root.locator(f"text={label}").first
        box = loc.bounding_box()
        if box:
            return box
    except Exception:  # noqa: BLE001
        pass
    return None


def capture_scene(page: Page, scene: Scene, dpr: int) -> dict:
    print(f"▸ {scene.name} ({scene.viewport[0]}x{scene.viewport[1]} @{dpr}x)")
    page.goto(f"{BASE_URL}{scene.url}", wait_until="domcontentloaded")
    page.add_style_tag(content=DISABLE_ANIM_CSS)
    page.wait_for_timeout(WAIT_NAV_MS)

    if scene.open_action:
        click_button(page, scene.open_action)
        page.wait_for_timeout(WAIT_MODAL_MS)

    # Captura del VIEWPORT completo: la web tal como se ve en pantalla.
    path = OUT_DIR / f"{scene.name}.png"
    page.screenshot(path=str(path), animations="disabled")

    # Dimensiones reales del PNG (con dpr aplicado por Playwright)
    img_w = scene.viewport[0] * dpr
    img_h = scene.viewport[1] * dpr

    callouts = []
    for i, label in enumerate(scene.targets, start=1):
        b = find_target(page, label, scene.scope)
        if not b:
            print(f"  – target '{label}' no encontrado (se omite)")
            continue
        # píxeles CSS relativos al viewport (0..100)
        x_pct = round((b["x"] + b["width"] / 2) / scene.viewport[0] * 100)
        y_pct = round((b["y"] + b["height"] / 2) / scene.viewport[1] * 100)
        if 0 <= x_pct <= 100 and 0 <= y_pct <= 100:
            callouts.append({
                "n": i,
                "label": label,
                "xPct": x_pct,
                "yPct": y_pct,
                # Coordenadas en píxeles CSS; multiplicar por dpr para los px reales del PNG.
                "vp": {"x": round(b["x"]), "y": round(b["y"]), "w": round(b["width"]), "h": round(b["height"])},
            })
        else:
            print(f"  – target '{label}' fuera del viewport (x={x_pct},y={y_pct}); se omite")

    result = {
        "name": scene.name,
        "viewport": {"w": scene.viewport[0], "h": scene.viewport[1], "dpr": dpr},
        "image": {"w": img_w, "h": img_h},  # tamaño real del PNG
        "callouts": callouts,
    }
    print(f"  ✓ {path.name} ({img_w}x{img_h}), {len(callouts)} callouts")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Captura pantallas reales para la wiki.")
    parser.add_argument("--scene", help="Solo una escena (por nombre)")
    parser.add_argument("--list", action="store_true", help="Lista las escenas y sale")
    parser.add_argument("--headed", action="store_true", help="Navegador visible (debug)")
    parser.add_argument("--dpr", type=int, default=1,
                        help="deviceScaleFactor (1 = tamaño CSS exacto; 2 = retina)")
    args = parser.parse_args()

    if args.list:
        for s in SCENES:
            print(f"  {s.name:28} {s.viewport[0]}x{s.viewport[1]}"
                  f"{'  [abre: ' + s.open_action + ']' if s.open_action else ''}")
        return

    token = login()
    print(f"✓ login OK ({ADMIN_EMAIL})")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    scenes = [s for s in SCENES if args.scene is None or s.name == args.scene]
    if not scenes:
        sys.exit(f"Escena desconocida: {args.scene} (usa --list)")

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        try:
            for scene in scenes:
                context = browser.new_context(
                    viewport={"width": scene.viewport[0], "height": scene.viewport[1]},
                    device_scale_factor=args.dpr,
                )
                page = context.new_page()
                try:
                    prepare_page(page, token)
                    results.append(capture_scene(page, scene, args.dpr))
                except Exception as e:  # noqa: BLE001 — ver el error y continuar
                    print(f"  ✗ {scene.name} falló: {e}")
                    results.append({"name": scene.name, "error": str(e)})
                finally:
                    context.close()
        finally:
            browser.close()

    RECTS_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    ok = sum(1 for r in results if "error" not in r)
    print(f"\n✓ {ok}/{len(results)} escenas OK → {RECTS_FILE}")


if __name__ == "__main__":
    main()
