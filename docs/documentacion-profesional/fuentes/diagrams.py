import math, os
from PIL import Image, ImageDraw, ImageFont

S = 2
FS = 1.45
OUT = os.path.join(os.path.dirname(__file__), 'img')
os.makedirs(OUT, exist_ok=True)
NAVY, BLUE, LBLUE, GREEN, LGREEN, ORANGE, LORANGE, GREY, LGREY, RED, TXT = (
    '#1F3A5F', '#2E75B6', '#DCE9F5', '#548235', '#E2F0D9', '#C55A11', '#FCE4D6', '#7F7F7F', '#F2F2F2', '#C00000', '#1E1E1E')


def font(sz, b=False, mono=False):
    p = 'C:/Windows/Fonts/consola.ttf' if mono else ('C:/Windows/Fonts/segoeuib.ttf' if b else 'C:/Windows/Fonts/segoeui.ttf')
    return ImageFont.truetype(p, int(sz * FS * S))


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGB', (w * S, h * S), 'white')
        self.d = ImageDraw.Draw(self.im)

    def rect(self, x, y, w, h, fill=LBLUE, out=BLUE, r=8, wd=2):
        self.d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=r * S, fill=fill, outline=out, width=int(wd * S))

    def text(self, x, y, t, sz=13, b=False, col=TXT, anchor='c', mono=False, lh=1.25, bg=False):
        lines = str(t).split('\n')
        f = font(sz, b, mono)
        if bg:
            wmax = max(self.d.textlength(l, font=f) for l in lines) / S
            hh = len(lines) * sz * FS * lh
            self.d.rectangle([(x - wmax / 2 - 3) * S, (y - hh / 2) * S, (x + wmax / 2 + 3) * S, (y + hh / 2) * S], fill='white')
        total = len(lines) * sz * FS * lh
        y0 = y - total / 2 + sz * FS * lh / 2
        for i, ln in enumerate(lines):
            a = {'c': 'mm', 'l': 'lm', 'r': 'rm'}[anchor]
            self.d.text((x * S, (y0 + i * sz * FS * lh) * S), ln, font=f, fill=col, anchor=a)

    def fit(self, t, sz, b, maxw, maxh=None, lh=1.25):
        lines = str(t).split('\n')
        while sz > 7:
            f = font(sz, b)
            ok = max(self.d.textlength(l, font=f) for l in lines) / S <= maxw
            if maxh is not None and len(lines) * sz * FS * lh > maxh:
                ok = False
            if ok:
                break
            sz -= 0.5
        return sz

    def box(self, x, y, w, h, t, fill=LBLUE, out=BLUE, sz=13, b=False, col=TXT, r=8):
        self.rect(x, y, w, h, fill, out, r)
        if t:
            sz = self.fit(t, sz, b, w - 16, h - 8)
        self.text(x + w / 2, y + h / 2, t, sz, b, col)

    def line(self, pts, col=TXT, wd=2, dash=False, head=None, tail=None):
        pts = [(px * S, py * S) for px, py in pts]
        for a, b in zip(pts, pts[1:]):
            if dash:
                L = math.hypot(b[0] - a[0], b[1] - a[1])
                n = int(L // (9 * S))
                for i in range(0, n, 2):
                    p1 = (a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)
                    p2 = (a[0] + (b[0] - a[0]) * min(i + 1, n) / n, a[1] + (b[1] - a[1]) * min(i + 1, n) / n)
                    self.d.line([p1, p2], fill=col, width=int(wd * S))
            else:
                self.d.line([a, b], fill=col, width=int(wd * S))
        if head:
            self._head(pts[-2], pts[-1], col, head)
        if tail:
            self._head(pts[1], pts[0], col, tail)

    def _head(self, a, b, col, kind):
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        L = 12 * S
        w = 0.42
        p1 = (b[0] - L * math.cos(ang - w), b[1] - L * math.sin(ang - w))
        p2 = (b[0] - L * math.cos(ang + w), b[1] - L * math.sin(ang + w))
        if kind == 'open':
            self.d.line([p1, b, p2], fill=col, width=int(2 * S))
        elif kind == 'tri':
            self.d.polygon([b, p1, p2], fill='white', outline=col)
        else:
            self.d.polygon([b, p1, p2], fill=col)

    def ellipse(self, cx, cy, rx, ry, t, fill=LBLUE, out=BLUE, sz=12):
        self.d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill, outline=out, width=2 * S)
        sz = self.fit(t, sz, False, rx * 1.65, ry * 1.5)
        self.text(cx, cy, t, sz)

    def actor(self, cx, cy, name, col=NAVY):
        r = 11
        self.d.ellipse([(cx - r) * S, (cy - 42) * S, (cx + r) * S, (cy - 20) * S], outline=col, width=2 * S, fill='white')
        for seg in [[(cx, cy - 20), (cx, cy + 12)], [(cx - 20, cy - 8), (cx + 20, cy - 8)], [(cx, cy + 12), (cx - 16, cy + 36)], [(cx, cy + 12), (cx + 16, cy + 36)]]:
            self.line(seg, col, 2)
        self.text(cx, cy - 66, name, 13, True, col)

    def save(self, name):
        self.im.save(os.path.join(OUT, name), dpi=(200, 200))


# ------------------------------------------------------------------ 1. Arquitectura
def arquitectura():
    c = Canvas(1240, 760)
    c.text(620, 28, 'Arquitectura lógica en capas de IT Incident Hub', 18, True, NAVY)
    # usuarios
    for i, (n, col) in enumerate([('Solicitante', GREEN), ('Técnico', BLUE), ('Administrador', ORANGE)]):
        c.box(30, 110 + i * 150, 130, 70, n, LGREY, GREY, 13, True)
    # navegador
    c.rect(210, 70, 290, 620, '#F7FAFD', BLUE, 12)
    c.text(355, 94, 'CAPA DE PRESENTACIÓN', 12, True, BLUE)
    c.text(355, 114, 'React 18 + Vite (SPA, :5173)', 11, False, GREY)
    comps = ['App  (sesión y navegación)', 'Login', 'IncidentList + Filters', 'IncidentForm', 'IncidentDetail', 'IncidentHistory', 'Dashboard', 'api.js · session.js · permissions.js']
    for i, t in enumerate(comps):
        c.box(235, 135 + i * 67, 240, 50, t, 'white', BLUE, 12)
    # backend
    c.rect(600, 70, 360, 620, '#F7FAFD', GREEN, 12)
    c.text(780, 94, 'CAPA DE NEGOCIO / API REST', 12, True, GREEN)
    c.text(780, 114, 'Node 22 + Express 4 (:3000)', 11, False, GREY)
    c.box(625, 135, 310, 50, 'middleware/auth.js  (requireAuth)', LGREEN, GREEN, 12)
    c.box(625, 202, 310, 50, 'routes/  auth · incidents · actions ·\nhistory · stats · catalogs · workflow', LGREEN, GREEN, 12)
    c.box(625, 269, 310, 50, 'access.js  (alcance y permisos por rol)', LGREEN, GREEN, 12)
    c.box(625, 336, 310, 50, 'assignment.js  (asignación automática)', LGREEN, GREEN, 12)
    c.box(625, 403, 310, 50, 'workflow.js  (ciclo de vida, fuente única)', LGREEN, GREEN, 12)
    c.box(625, 470, 310, 50, 'auth.js  (scrypt + token HS256)', LGREEN, GREEN, 12)
    c.box(625, 537, 310, 50, 'app.js · server.js · migrate.js', LGREEN, GREEN, 12)
    c.text(780, 625, 'createApp(db): la base de datos se inyecta\n(Pool en producción, pg-mem en pruebas)', 11, False, GREY)
    # datos
    c.rect(1040, 160, 170, 440, '#FFF8F2', ORANGE, 12)
    c.text(1125, 184, 'CAPA DE DATOS', 12, True, ORANGE)
    c.text(1125, 204, 'PostgreSQL 16 (:5432)', 11, False, GREY)
    for i, t in enumerate(['users', 'categories', 'tecnico_categorias', 'incidents', 'incident_events', 'schema_migrations']):
        c.box(1055, 225 + i * 56, 140, 42, t, 'white', ORANGE, 12)
    # flechas
    for i in range(3):
        c.line([(160, 145 + i * 150), (210, 145 + i * 150)], GREY, 2, head='open')
    c.line([(500, 330), (600, 330)], NAVY, 2.5, head='fill', tail='fill')
    c.text(550, 305, 'HTTPS/JSON', 10, True, NAVY)
    c.text(550, 355, 'Bearer\ntoken', 10, False, NAVY)
    c.line([(960, 380), (1040, 380)], NAVY, 2.5, head='fill', tail='fill')
    c.text(1000, 355, 'SQL\n(pg)', 10, True, NAVY)
    c.text(620, 725, 'Todas las rutas, salvo /health, /api/auth/login y /api/workflow, exigen el encabezado Authorization: Bearer <token>.', 11, False, GREY)
    c.save('01-arquitectura.png')


# ------------------------------------------------------------------ 2. Casos de uso
def casos_uso():
    c = Canvas(1240, 760)
    c.text(620, 26, 'Diagrama de casos de uso', 18, True, NAVY)
    c.rect(260, 56, 720, 660, '#FBFCFE', BLUE, 14, 2)
    c.text(620, 80, 'Sistema IT Incident Hub', 14, True, BLUE)
    A = [('CU-01  Iniciar sesión', 450, 150), ('CU-02  Registrar incidente', 450, 260), ('CU-03  Consultar y filtrar', 450, 370), ('CU-04  Ver detalle e historial', 450, 480), ('CU-05  Comentar incidente', 450, 590)]
    B = [('CU-09  Asignar automáticamente', 810, 150), ('CU-06  Cambiar estado', 810, 290), ('CU-07  Asignar / reasignar técnico', 810, 420), ('CU-08  Consultar dashboard', 810, 550)]
    for t, x, y in A + B:
        c.ellipse(x, y, 150, 40, t, LBLUE if 'CU-09' not in t else LORANGE, BLUE if 'CU-09' not in t else ORANGE, 12)
    c.actor(110, 210, 'Solicitante', GREEN)
    c.actor(110, 470, 'Técnico', BLUE)
    c.actor(1130, 360, 'Administrador', ORANGE)
    sol = [0, 1, 2, 3, 4]
    for i in sol:
        c.line([(130, 215), (300, A[i][2])], GREEN, 1.5)
    for i in [0, 1, 2, 3, 4]:
        c.line([(130, 475), (300, A[i][2])], BLUE, 1.5)
    c.line([(130, 475), (665, 290)], BLUE, 1.5)
    c.line([(130, 475), (665, 550)], BLUE, 1.5)
    c.line([(130, 215), (665, 550)], GREEN, 1.5)
    for t, x, y in B[1:]:
        c.line([(1110, 365), (x + 140, y)], ORANGE, 1.5)
    c.text(1130, 500, 'También ejecuta\nCU-01 a CU-05\nsin restricción\nde alcance', 11, False, ORANGE)
    # include
    c.line([(580, 240), (710, 175)], GREY, 1.8, dash=True, head='open')
    c.text(660, 190, '«include»', 11, False, GREY)
    c.text(620, 735, 'El «sistema» (asignación automática) interviene al crear un incidente; el solicitante accede a su alcance y el técnico al de sus categorías.', 11, False, GREY)
    c.save('02-casos-de-uso.png')


# ------------------------------------------------------------------ 3. ER
def tabla(c, x, y, w, nombre, cols, col=BLUE, fill=LBLUE):
    rh = 28
    h = 38 + rh * len(cols)
    c.rect(x, y, w, h, 'white', col, 6)
    c.d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + 38) * S], radius=6 * S, fill=col)
    c.text(x + w / 2, y + 19, nombre, 14, True, 'white')
    for i, (n, tipo, k) in enumerate(cols):
        yy = y + 38 + i * rh
        if i % 2:
            c.d.rectangle([(x + 2) * S, yy * S, (x + w - 2) * S, (yy + rh) * S], fill=fill)
        c.text(x + 10, yy + rh / 2, ('PK FK ' if k == 'PK FK' else 'PK    ' if 'PK' in k else 'FK    ' if 'FK' in k else 'UQ    ' if 'UQ' in k else '      ') + n, 12, 'PK' in k, TXT, 'l', mono=True)
        c.text(x + w - 10, yy + rh / 2, tipo, 11, False, GREY, 'r')
    return h


def er():
    c = Canvas(1400, 920)
    c.text(700, 28, 'Modelo entidad-relación (PostgreSQL)', 18, True, NAVY)
    tabla(c, 60, 70, 340, 'users', [('id', 'SERIAL', 'PK'), ('nombre', 'VARCHAR(120)', ''), ('email', 'VARCHAR(160)', 'UQ'), ('rol', '3 valores (CHECK)', ''), ('password_hash', 'VARCHAR(200)', ''), ('created_at', 'TIMESTAMPTZ', '')])
    tabla(c, 540, 70, 290, 'tecnico_categorias', [('user_id', 'INTEGER', 'PK FK'), ('category_id', 'INTEGER', 'PK FK')], GREEN, LGREEN)
    tabla(c, 1000, 70, 340, 'categories', [('id', 'SERIAL', 'PK'), ('nombre', 'VARCHAR(120)', ''), ('parent_id', 'INTEGER', 'FK')])
    tabla(c, 500, 330, 400, 'incidents', [('id', 'SERIAL', 'PK'), ('titulo', 'VARCHAR(200)', ''), ('descripcion', 'TEXT', ''), ('category_id', 'INTEGER', 'FK'), ('prioridad', '5 valores (CHECK)', ''), ('estado', '5 valores (CHECK)', ''), ('solicitante_id', 'INTEGER', 'FK'), ('tecnico_id', 'INTEGER NULL', 'FK'), ('created_at', 'TIMESTAMPTZ', ''), ('updated_at', 'TIMESTAMPTZ', '')], ORANGE, LORANGE)
    tabla(c, 1000, 470, 340, 'incident_events', [('id', 'SERIAL', 'PK'), ('incident_id', 'INTEGER', 'FK'), ('autor_id', 'INTEGER', 'FK'), ('tipo', '3 valores (CHECK)', ''), ('detalle', 'TEXT', ''), ('created_at', 'TIMESTAMPTZ', '')], NAVY, LBLUE)
    k = GREY
    # users -> tecnico_categorias
    c.line([(400, 130), (540, 130)], k, 2)
    c.text(412, 118, '1', 12, True); c.text(528, 118, 'N', 12, True)
    c.text(470, 148, 'atiende', 11, False, GREEN)
    c.line([(830, 130), (1000, 130)], k, 2)
    c.text(842, 118, 'N', 12, True); c.text(988, 118, '1', 12, True)
    # categories self
    c.line([(1340, 190), (1370, 190), (1370, 105), (1340, 105)], k, 2)
    c.text(1355, 205, 'parent_id', 10, False, GREY)
    # users -> incidents
    c.line([(290, 276), (290, 400), (500, 400)], k, 2)
    c.text(302, 296, '1', 12, True); c.text(485, 388, 'N', 12, True)
    c.text(395, 388, 'solicitante_id', 11, False, ORANGE)
    c.line([(200, 276), (200, 470), (500, 470)], k, 2)
    c.text(212, 296, '1', 12, True); c.text(485, 458, 'N', 12, True)
    c.text(330, 458, 'tecnico_id (0..1)', 11, False, ORANGE)
    c.line([(110, 276), (110, 810), (1170, 810), (1170, 676)], k, 2)
    c.text(122, 296, '1', 12, True); c.text(1182, 690, 'N', 12, True)
    c.text(640, 796, 'autor_id (autor de cada evento de bitácora)', 11, False, NAVY)
    # categories -> incidents
    c.line([(1100, 192), (1100, 330), (900, 400)], k, 2)
    c.text(1112, 210, '1', 12, True); c.text(912, 388, 'N', 12, True)
    c.text(1170, 300, 'category_id', 11, False, ORANGE)
    # incidents -> events
    c.line([(900, 560), (1000, 560)], k, 2)
    c.text(912, 548, '1', 12, True); c.text(988, 548, 'N', 12, True)
    c.text(950, 580, 'bitácora', 11, False, NAVY)
    c.text(120, 880, 'Restricciones CHECK: rol, prioridad, estado y tipo de evento. Índices: estado, prioridad, tecnico_id, tecnico_categorias(category_id), incident_events(incident_id).', 11, False, GREY, 'l')
    c.save('03-modelo-er.png')


# ------------------------------------------------------------------ 4. Estados
def estados():
    c = Canvas(1240, 470)
    c.text(620, 28, 'Diagrama de estados del incidente', 18, True, NAVY)
    xs = [150, 400, 650, 900, 1130]
    names = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']
    fills = [(LGREY, GREY), (LBLUE, BLUE), (LORANGE, ORANGE), (LGREEN, GREEN), ('#D9D9D9', NAVY)]
    for x, n, (f, o) in zip(xs, names, fills):
        c.box(x - 70, 150, 140, 60, n, f, o, 14, True)
    c.d.ellipse([(40 - 11) * S, (180 - 11) * S, (40 + 11) * S, (180 + 11) * S], fill=NAVY)
    c.line([(51, 180), (80, 180)], NAVY, 2, head='fill')
    c.d.ellipse([(1215 - 13) * S, (180 - 13) * S, (1215 + 13) * S, (180 + 13) * S], outline=NAVY, width=2 * S, fill='white')
    c.d.ellipse([(1215 - 7) * S, (180 - 7) * S, (1215 + 7) * S, (180 + 7) * S], fill=NAVY)
    c.line([(1200, 180), (1202, 180)], NAVY, 1)
    c.line([(1200, 180), (1200, 180)], NAVY, 1)
    labels = ['asignar\n(automático al crear\no por el administrador)', 'iniciar atención\n(técnico asignado\no administrador)', 'resolver', 'cerrar']
    for i in range(4):
        c.line([(xs[i] + 70, 180), (xs[i + 1] - 70, 180)], NAVY, 2.2, head='fill')
        c.text((xs[i] + xs[i + 1]) / 2, 105, labels[i], 11, False, NAVY)
    c.line([(1200, 180), (1202, 180)], NAVY, 1)
    # reabrir
    c.line([(870, 210), (870, 300), (680, 300), (680, 214)], RED, 2, head='fill', dash=True)
    c.text(775, 322, 'reabrir (RESUELTO → EN_PROCESO)', 11, True, RED)
    c.text(620, 390, 'Reglas: no se puede avanzar sin técnico asignado · se reasigna solo en NUEVO, ASIGNADO y EN_PROCESO, y solo a técnicos de la categoría ·\nCERRADO es terminal y no admite comentarios · una transición inválida responde 409 con los estados permitidos.', 11, False, GREY)
    c.save('04-estados.png')


# ------------------------------------------------------------------ 5. Secuencia
def secuencia():
    c = Canvas(1240, 800)
    c.text(620, 26, 'Diagrama de secuencia: iniciar sesión y registrar un incidente con asignación automática', 17, True, NAVY)
    P = [('Usuario\n(navegador SPA)', 120, LGREY, GREY), ('API Express\n(routes)', 380, LGREEN, GREEN), ('middleware\nauth.js', 620, LBLUE, BLUE), ('assignment.js', 860, LORANGE, ORANGE), ('PostgreSQL', 1100, '#E4DFEC', NAVY)]
    for t, x, f, o in P:
        c.box(x - 80, 52, 160, 54, t, f, o, 12, True)
        c.line([(x, 106), (x, 770)], GREY, 1.4, dash=True)
    X = {i: p[1] for i, p in enumerate(P)}
    msgs = [
        (0, 1, 140, '1  POST /api/auth/login {email, password}', False),
        (1, 4, 190, '2  SELECT usuario por correo', False),
        (4, 1, 225, '   fila (hash scrypt, rol)', True),
        (1, 0, 275, '3  200 {token HS256 (8 h), user}', True),
        (0, 1, 340, '4  POST /api/incidents  Authorization: Bearer', False),
        (1, 2, 385, '5  requireAuth(token)', False),
        (2, 4, 420, '6  SELECT rol y categorías (cada petición)', False),
        (2, 1, 455, '   req.user cargado', True),
        (1, 1, 495, '7  validar título, descripción, categoría', False),
        (1, 3, 540, '8  autoAssign(category_id)', False),
        (3, 4, 575, '9  técnico de la categoría con menos abiertos', False),
        (3, 1, 610, '   tecnico_id (o null)', True),
        (1, 4, 655, '10  INSERT incidente (ASIGNADO) + evento ASIGNACION', False),
        (1, 0, 715, '11  201 {incidente, asignado a «técnico»}', True),
    ]
    for a, b, y, t, ret in msgs:
        if a == b:
            c.line([(X[a], y - 12), (X[a] + 60, y - 12), (X[a] + 60, y + 8), (X[a] + 4, y + 8)], NAVY, 1.8, head='fill')
            c.text(X[a] + 70, y - 2, t, 11, False, NAVY, 'l')
            continue
        c.line([(X[a], y), (X[b], y)], GREY if ret else NAVY, 1.8, dash=ret, head='open' if ret else 'fill')
        c.text((X[a] + X[b]) / 2 + (0 if X[a] < X[b] else 0), y - 14, t, 11, False, NAVY if not ret else GREY, bg=True)
    c.save('05-secuencia.png')


# ------------------------------------------------------------------ 6. CI/CD
def cicd():
    c = Canvas(1240, 780)
    c.text(620, 26, 'Flujo de integración y entrega continua (Azure DevOps + GitHub Actions)', 18, True, NAVY)
    c.box(30, 70, 170, 64, 'Azure Boards\nWork Item (AB#ID)', LBLUE, BLUE, 12, True)
    c.box(260, 70, 190, 64, 'Rama feature/fix/\nrefactor + commits AB#ID', LBLUE, BLUE, 12, True)
    c.box(510, 70, 190, 64, 'Pull Request\n(Azure Repos)', LBLUE, BLUE, 12, True)
    c.box(760, 70, 190, 64, 'Revisión + evidencia\n+ aprobación', LBLUE, BLUE, 12, True)
    c.box(1010, 70, 200, 64, 'Merge a main\n(noFastForward)', LGREEN, GREEN, 12, True)
    for a, b in [(200, 260), (450, 510), (700, 760), (950, 1010)]:
        c.line([(a, 102), (b, 102)], NAVY, 2.2, head='fill')
    # pipeline
    c.rect(30, 190, 1180, 190, '#F7FAFD', BLUE, 12)
    c.text(50, 210, 'Azure Pipelines · incident-hub-ci', 13, True, BLUE, 'l')
    c.text(1190, 210, 'pool Default · agente-local-01 (autohospedado)', 11, False, GREY, 'r')
    st = ['1 Escáner de\nsecretos + DevOps', '2 Backend:\nnpm ci y build', '3 Pruebas\nbackend (108)', '4 npm audit\nbackend', '5 Frontend: build\ny pruebas (67)', '6 npm audit\nfrontend', '7 Empaquetar y\npublicar artefacto']
    w = 140
    for i, t in enumerate(st):
        x = 50 + i * 166
        c.box(x, 245, w, 70, t, 'white', BLUE, 12)
        if i:
            c.line([(x - 26, 280), (x, 280)], NAVY, 2, head='fill')
    c.text(620, 350, 'Si un paso falla, los siguientes se omiten y no se publica el artefacto (fallos demostrados: corridas #6, #34, #38, #39, #48).', 11, False, GREY)
    c.line([(1110, 134), (1110, 190)], NAVY, 2.2, head='fill')
    # ambientes
    c.text(290, 425, 'Solo la rama main promueve el mismo artefacto:', 13, True, NAVY, 'l')
    envs = [('dev', 'Despliegue\nautomático', LGREEN, GREEN), ('staging', 'Aprobación\nmanual', LORANGE, ORANGE), ('prod', 'Aprobación\nmanual', LORANGE, RED)]
    for i, (n, d, f, o) in enumerate(envs):
        x = 120 + i * 330
        c.box(x, 450, 230, 90, '', f, o, 12)
        c.text(x + 115, 478, n.upper(), 16, True, o)
        c.text(x + 115, 515, d, 12, False, TXT)
        if i:
            c.line([(x - 100, 495), (x, 495)], NAVY, 2.4, head='fill')
    c.line([(1110, 380), (1110, 400), (235, 400), (235, 450)], NAVY, 2, head='fill')
    c.text(620, 580, 'Cada ambiente: carpeta versionada con current.json, validación posterior y rollback al release anterior.', 11, False, GREY)
    # GitHub
    c.rect(30, 620, 1180, 130, '#FFFBF5', ORANGE, 12)
    c.text(50, 642, 'GitHub Actions · .github/workflows/ci.yml (complementario)', 13, True, ORANGE, 'l')
    g = ['push / PR\na GitHub', 'Escáner de\nsecretos', 'Pruebas\nbackend/frontend', 'npm audit', 'Verificación de\nsecretos (main)']
    for i, t in enumerate(g):
        x = 60 + i * 230
        c.box(x, 668, 170, 62, t, 'white', ORANGE, 12)
        if i:
            c.line([(x - 60, 699), (x, 699)], NAVY, 2, head='fill')
    c.text(1190, 642, 'Espejo: Azure Repos → GitHub (mismo repositorio)', 11, False, GREY, 'r')
    c.save('06-cicd.png')


# ------------------------------------------------------------------ 7. Ramas
def ramas():
    c = Canvas(1240, 540)
    c.text(620, 26, 'Estrategia de ramas y versionado (SemVer)', 18, True, NAVY)
    Y = {'main': 120, 'rel': 220, 'feat': 320, 'int': 420}
    for n, y, col in [('main  (siempre estable)', Y['main'], NAVY), ('release/*', Y['rel'], GREEN), ('feature/*  ·  fix/*  ·  refactor/*', Y['feat'], BLUE), ('feature/login-roles  (rama de integración)', Y['int'], ORANGE)]:
        c.text(30, y + 24, n, 12, True, col, 'l')
        c.line([(30, y), (1210, y)], col, 2.5)
    def dot(x, y, col, r=8):
        c.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=col, outline='white', width=2 * S)
    tags = [(300, 'v0.1.0'), (420, 'v0.5.0'), (540, 'v0.9.0'), (660, 'v0.9.1'), (800, 'v1.0.0'), (920, 'v1.0.1'), (1150, 'v1.1.0')]
    for x, t in tags:
        dot(x, Y['main'], NAVY)
        c.box(x - 32, 62, 64, 24, t, LBLUE, BLUE, 11, True, r=4)
        c.line([(x, 86), (x, Y['main'] - 9)], BLUE, 1.2)
    for x in [300, 420, 540, 660, 920]:
        x0 = x - 70
        c.line([(x0, Y['main']), (x0 + 22, Y['feat'])], BLUE, 1.4, dash=True)
        dot(x0 + 22, Y['feat'], BLUE)
        c.line([(x0 + 22, Y['feat']), (x, Y['main'] + 8)], BLUE, 2.2, head='fill')
    c.line([(715, Y['main']), (740, Y['rel'])], GREEN, 1.4, dash=True)
    dot(755, Y['rel'], GREEN)
    c.line([(740, Y['rel']), (800, Y['main'] + 8)], GREEN, 2.2, head='fill')
    c.line([(960, Y['main']), (985, Y['int'])], ORANGE, 1.4, dash=True)
    for x, t in [(990, 'AB#379'), (1065, 'AB#381'), (1140, 'AB#384')]:
        dot(x, Y['int'], ORANGE)
        c.text(x, Y['int'] + 26, t, 11, False, ORANGE)
    c.line([(1140, Y['int']), (1150, Y['main'] + 8)], ORANGE, 2.5, head='fill')
    c.text(620, 380, 'PR + revisión + pipeline en verde  →  merge noFastForward a main (conserva la autoría de cada integrante)', 11, False, GREY)
    c.text(620, 505, 'Convención: ramas feature/<AB#ID>-descripción · commits «feat: … AB#ID» · tags anotados vMAJOR.MINOR.PATCH sobre main (13 tags hasta v1.1.0).', 11, False, GREY)
    c.save('07-ramas.png')


if __name__ == '__main__':
    arquitectura(); casos_uso(); er(); estados(); secuencia(); cicd(); ramas()
    print('ok')
