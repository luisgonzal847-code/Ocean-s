const API = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';
    
let tabActivo = 'sencillas';

// ============================================================
// NAVEGACION
// ============================================================
function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('activa');
    const btns    = document.querySelectorAll('.nav-btn');
    const indices = { estructura: 0, abc: 1, consultas: 2 };
    btns[indices[id]].classList.add('active');
    if (id === 'consultas') mostrarTab(tabActivo);
    if (id === 'estructura') cargarTablasEstructura();
}

// ============================================================
// ESTRUCTURA - TARJETAS DE TABLAS
// ============================================================
const tablas = {
    Categoria: ['IdCategoria (PK)', 'Nombre', 'Descripcion'],
    Producto:  ['IdProducto (PK)', 'Nombre', 'Precio', 'Estado', 'CategoriaIdCategoria (FK)'],
    Cliente:   ['IdCliente (PK)', 'Nombre', 'Telefono', 'Correo (UNIQUE)', 'Fecha_Registro'],
    Pedido:    ['IdPedido (PK)', 'Fecha', 'Total (calculado)', 'Estado', 'ClienteIdCliente (FK)'],
    Contiene:  ['PedidoIdPedido (PK/FK)', 'ProductoIdProducto (PK/FK)', 'Cantidad', 'PrecioUnitario', 'Subtotal (derivado)'],
    Envio:     ['IdEnvio (PK)', 'Paqueteria', 'NoGuia', 'Estado', 'FechaEntrega', 'DireccionEnvio', 'PedidoIdPedido (FK)'],
    Pago:      ['IdPago (PK)', 'FechaPago', 'Monto', 'MetodoDePago', 'Estado', 'PedidoIdPedido (FK)']
};

function cargarTablasEstructura() {
    const grid = document.getElementById('grid-tablas');
    grid.innerHTML = '';
    Object.entries(tablas).forEach(([nombre, campos]) => {
        const card = document.createElement('div');
        card.className = 'card-tabla';
        card.innerHTML = `<h4>${nombre}</h4><ul>${campos.map(c => `<li>${c}</li>`).join('')}</ul>`;
        grid.appendChild(card);
    });
}

// ============================================================
// ESTRUCTURA - SCRIPT SQL COMPLETO
// ============================================================
function verScriptSQL() {
    const script = `-- ============================================================
-- CREACION DE LA BASE DE DATOS
-- ============================================================
CREATE DATABASE IF NOT EXISTS tienda_online;
USE tienda_online;

CREATE TABLE Categoria (
  IdCategoria  TINYINT(3)   NOT NULL AUTO_INCREMENT,
  Nombre       VARCHAR(50)  NOT NULL,
  Descripcion  VARCHAR(255) NOT NULL,
  PRIMARY KEY (IdCategoria)
);

CREATE TABLE Producto (
  IdProducto           TINYINT(3)  NOT NULL AUTO_INCREMENT,
  Nombre               VARCHAR(50) NOT NULL,
  Precio               DOUBLE(5,2) NOT NULL,
  Estado               VARCHAR(15) NOT NULL CHECK (Estado IN ('Disponible','No disponible')),
  CategoriaIdCategoria TINYINT(3)  NOT NULL,
  PRIMARY KEY (IdProducto),
  FOREIGN KEY (CategoriaIdCategoria) REFERENCES Categoria(IdCategoria)
);

CREATE TABLE Cliente (
  IdCliente      TINYINT(3)  NOT NULL AUTO_INCREMENT,
  Nombre         VARCHAR(50) NOT NULL,
  Telefono       VARCHAR(10) NOT NULL,
  Correo         VARCHAR(50) NOT NULL UNIQUE,
  Fecha_Registro DATE        NOT NULL,
  PRIMARY KEY (IdCliente)
);

CREATE TABLE Pedido (
  IdPedido         TINYINT(3)    NOT NULL AUTO_INCREMENT,
  Fecha            DATE          NOT NULL,
  Total            DOUBLE(10,2)  NOT NULL DEFAULT 0,
  Estado           VARCHAR(15)   NOT NULL CHECK (Estado IN ('Pendiente','Confirmado','Pagado','Cancelado')),
  ClienteIdCliente TINYINT(3)    NOT NULL,
  PRIMARY KEY (IdPedido),
  FOREIGN KEY (ClienteIdCliente) REFERENCES Cliente(IdCliente)
);

-- IC-6: Cantidad debe ser entero mayor a 0.
-- IC-7: Subtotal es derivado (Cantidad x PrecioUnitario); nunca se captura directamente.
-- IC-4: Un pedido debe tener al menos un producto (validado en la aplicacion).
CREATE TABLE Contiene (
  PedidoIdPedido     TINYINT(3)   NOT NULL,
  ProductoIdProducto TINYINT(3)   NOT NULL,
  Cantidad           INTEGER(10)  NOT NULL CHECK (Cantidad > 0),
  PrecioUnitario     DOUBLE(5,2)  NOT NULL,
  Subtotal           DOUBLE(10,2) NOT NULL,
  PRIMARY KEY (PedidoIdPedido, ProductoIdProducto),
  FOREIGN KEY (PedidoIdPedido)     REFERENCES Pedido(IdPedido),
  FOREIGN KEY (ProductoIdProducto) REFERENCES Producto(IdProducto)
);

CREATE TABLE Envio (
  IdEnvio        TINYINT(3)   NOT NULL AUTO_INCREMENT,
  Paqueteria     VARCHAR(20)  NOT NULL,
  NoGuia         VARCHAR(20)  NOT NULL,
  Estado         VARCHAR(15)  NOT NULL CHECK (Estado IN ('En camino','Entregado','Retrasado')),
  FechaEntrega   DATE         NOT NULL,
  DireccionEnvio VARCHAR(255) NOT NULL,
  PedidoIdPedido TINYINT(3)   NOT NULL,
  PRIMARY KEY (IdEnvio),
  FOREIGN KEY (PedidoIdPedido) REFERENCES Pedido(IdPedido)
);

CREATE TABLE Pago (
  IdPago         TINYINT(3)  NOT NULL AUTO_INCREMENT,
  FechaPago      DATE        NOT NULL,
  Monto          DOUBLE(5,2) NOT NULL,
  MetodoDePago   VARCHAR(15) NOT NULL CHECK (MetodoDePago IN ('Tarjeta','Transferencia')),
  Estado         VARCHAR(15) NOT NULL CHECK (Estado IN ('Pendiente','Completado','Rechazado')),
  PedidoIdPedido TINYINT(3)  NOT NULL,
  PRIMARY KEY (IdPago),
  FOREIGN KEY (PedidoIdPedido) REFERENCES Pedido(IdPedido)
);`;
    mostrarResultado('resultado-estructura', script);
}

// ============================================================
// ABC - HELPERS: cargar datos reales de la BD para selects
// ============================================================
async function cargarClientes() {
    try { const r = await fetch(`${API}/cliente`); return r.ok ? await r.json() : []; }
    catch { return []; }
}
async function cargarProductos() {
    try { const r = await fetch(`${API}/producto`); return r.ok ? await r.json() : []; }
    catch { return []; }
}
async function cargarPedidos() {
    try { const r = await fetch(`${API}/pedido`); return r.ok ? await r.json() : []; }
    catch { return []; }
}
async function cargarCategorias() {
    try { const r = await fetch(`${API}/categoria`); return r.ok ? await r.json() : []; }
    catch { return []; }
}

// ============================================================
// ABC - CAMPOS POR TABLA
// Nota: Total ya NO aparece en Pedido (es calculado).
// Las FKs se manejan con selects dinamicos en mostrarOperacion.
// ============================================================
const camposPorTabla = {
    Categoria: [
        { name: 'Nombre',      label: 'Nombre',      type: 'text', required: true },
        { name: 'Descripcion', label: 'Descripcion', type: 'text', required: true }
    ],
    Producto: [
        { name: 'Nombre', label: 'Nombre',     type: 'text',   required: true },
        { name: 'Precio', label: 'Precio ($)', type: 'number', required: true },
        { name: 'Estado', label: 'Estado',     type: 'select', options: ['Disponible', 'No disponible'], required: true }
        // CategoriaIdCategoria → select dinamico
    ],
    Cliente: [
        { name: 'Nombre',         label: 'Nombre',         type: 'text',  required: true },
        { name: 'Telefono',       label: 'Telefono',       type: 'text',  required: true },
        { name: 'Correo',         label: 'Correo',         type: 'email', required: true },
        { name: 'Fecha_Registro', label: 'Fecha Registro', type: 'date',  required: true }
    ],
    Pedido: [
        { name: 'Fecha',  label: 'Fecha',  type: 'date',   required: true },
        { name: 'Estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmado', 'Pagado', 'Cancelado'], required: true }
        // ClienteIdCliente → select dinamico
        // Total → calculado automaticamente desde Contiene
    ],
    Contiene: [
        { name: 'Cantidad',       label: 'Cantidad',            type: 'number', required: true },
        { name: 'PrecioUnitario', label: 'Precio Unitario ($)', type: 'number', required: true }
        // PedidoIdPedido y ProductoIdProducto → selects dinamicos
    ],
    Envio: [
        { name: 'Paqueteria',     label: 'Paqueteria',        type: 'text',   required: true },
        { name: 'NoGuia',         label: 'No. Guia',           type: 'text',   required: true },
        { name: 'Estado',         label: 'Estado',             type: 'select', options: ['En camino', 'Entregado', 'Retrasado'], required: true },
        { name: 'FechaEntrega',   label: 'Fecha Entrega',      type: 'date',   required: true },
        { name: 'DireccionEnvio', label: 'Direccion de Envio', type: 'text',   required: true }
        // PedidoIdPedido → select dinamico
    ],
    Pago: [
        { name: 'FechaPago',    label: 'Fecha de Pago',  type: 'date',   required: true },
        { name: 'Monto',        label: 'Monto ($)',       type: 'number', required: true },
        { name: 'MetodoDePago', label: 'Metodo de Pago', type: 'select', options: ['Tarjeta', 'Transferencia'], required: true },
        { name: 'Estado',       label: 'Estado',          type: 'select', options: ['Pendiente', 'Completado', 'Rechazado'], required: true }
        // PedidoIdPedido → select dinamico
    ]
};

// ============================================================
// ABC - CARGAR FORMULARIO
// ============================================================
function cargarFormularioABC() {
    const tabla = document.getElementById('tablaSeleccionada').value;
    document.getElementById('formulario-abc').innerHTML = '';
    document.getElementById('resultado-abc').classList.remove('visible');
    document.getElementById('mensaje-abc').className = 'mensaje';
    document.getElementById('mensaje-abc').textContent = '';
    document.getElementById('selector-operacion').style.display = tabla ? 'flex' : 'none';
}

// ============================================================
// ABC - MOSTRAR OPERACION
// ============================================================
async function mostrarOperacion(operacion) {
    const tabla      = document.getElementById('tablaSeleccionada').value;
    const campos     = camposPorTabla[tabla];
    const contenedor = document.getElementById('formulario-abc');
    contenedor.innerHTML = `<div class="card"><p style="color:var(--azul-mar);padding:10px;">Cargando datos...</p></div>`;

    // ------------------------------------------------------------
    // Carga de datos auxiliares
    // Solo se piden al servidor las listas que la tabla seleccionada
    // realmente necesita para llenar sus selects (FKs dinamicas).
    // ------------------------------------------------------------
    let clientes   = [];
    let productos  = [];
    let pedidos    = [];
    let categorias = [];

    if (tabla === 'Pedido' || tabla === 'Pago' || tabla === 'Envio') {
        clientes = await cargarClientes();
        pedidos  = await cargarPedidos();
    }
    if (tabla === 'Contiene') {
        pedidos   = await cargarPedidos();
        productos = await cargarProductos();
    }
    if (tabla === 'Producto') {
        categorias = await cargarCategorias();
    }

    const titulos = {
        alta:   `Alta — Nuevo registro en ${tabla}`,
        baja:   `Baja — Eliminar registro de ${tabla}`,
        cambio: `Cambio — Modificar registro de ${tabla}`
    };

    // ------------------------------------------------------------
    // Selects dinamicos (FKs)
    // Cada helper genera un <select> ya poblado con los datos
    // reales de la BD. 'opcional' agrega "-- Sin cambio --" para
    // los formularios de Cambio, donde el campo puede omitirse.
    // ------------------------------------------------------------

    // Select de Cliente
    const selectCliente = (id, opcional = false) => `
        <div class="form-grupo">
            <label>Cliente</label>
            <select id="${id}">
                ${opcional ? '<option value="">-- Sin cambio --</option>' : ''}
                ${clientes.length === 0
                    ? '<option value="">⚠ Sin clientes registrados</option>'
                    : clientes.map(c => `<option value="${c.IdCliente}">[${c.IdCliente}] ${c.Nombre} — ${c.Correo}</option>`).join('')}
            </select>
        </div>`;

    // Select de Pedido
    const selectPedido = (id, opcional = false) => `
        <div class="form-grupo">
            <label>Pedido</label>
            <select id="${id}">
                ${opcional ? '<option value="">-- Sin cambio --</option>' : ''}
                ${pedidos.length === 0
                    ? '<option value="">⚠ Sin pedidos registrados</option>'
                    : pedidos.map(p => `<option value="${p.IdPedido}">[${p.IdPedido}] ${p.Cliente} — ${p.Estado} — Total: $${parseFloat(p.Total).toFixed(2)}</option>`).join('')}
            </select>
        </div>`;

    // Select de Producto (solo se listan los Disponibles, ver
    // Server/Routes/producto.js -> GET '/')
    const selectProducto = (id, opcional = false) => `
        <div class="form-grupo">
            <label>Producto (solo disponibles)</label>
            <select id="${id}">
                ${opcional ? '<option value="">-- Sin cambio --</option>' : ''}
                ${productos.length === 0
                    ? '<option value="">⚠ Sin productos disponibles</option>'
                    : productos.map(p => `<option value="${p.IdProducto}" data-precio="${p.Precio}">[${p.IdProducto}] ${p.Nombre} — $${parseFloat(p.Precio).toFixed(2)}</option>`).join('')}
            </select>
        </div>`;

    // Select de Categoria
    const selectCategoria = (id, opcional = false) => `
        <div class="form-grupo">
            <label>Categoria</label>
            <select id="${id}">
                ${opcional ? '<option value="">-- Sin cambio --</option>' : ''}
                ${categorias.length === 0
                    ? '<option value="">⚠ Sin categorias registradas</option>'
                    : categorias.map(c => `<option value="${c.IdCategoria}">[${c.IdCategoria}] ${c.Nombre}</option>`).join('')}
            </select>
        </div>`;

    // ------------------------------------------------------------
    // Construccion del formulario HTML
    // A partir de aqui se arma el bloque segun la operacion elegida:
    // ALTA (crear), BAJA (eliminar) o CAMBIO (actualizar).
    // Cada tabla puede añadir avisos o selects extra antes de los
    // campos genericos definidos en camposPorTabla.
    // ------------------------------------------------------------
    let html = `<div class="card"><h3>${titulos[operacion]}</h3>`;

    // ── ALTA ─────────────────────────────────────────────────
    if (operacion === 'alta') {

        // Pedido: el Total no se pide, se calcula con Contiene
        if (tabla === 'Pedido') {
            html += `<p style="font-size:0.82rem;color:var(--azul-mar);margin-bottom:12px;border-left:3px solid var(--azul-mar);padding-left:8px;">
                El <strong>Total se calcula automaticamente</strong> al agregar productos en Contiene. No es necesario ingresarlo.
            </p>`;
            html += selectCliente('campo-ClienteIdCliente');
        }

        // Contiene: agrega un producto a un pedido existente
        if (tabla === 'Contiene') {
            html += `<p style="font-size:0.82rem;color:var(--azul-mar);margin-bottom:12px;border-left:3px solid var(--azul-mar);padding-left:8px;">
                Al insertar este item, el <strong>Total del pedido se recalculara automaticamente</strong>.
            </p>`;
            html += selectPedido('campo-PedidoIdPedido');
            html += selectProducto('campo-ProductoIdProducto');
        }

        // Envio: requiere que el pedido ya este Confirmado/Pagado
        if (tabla === 'Envio') {
            html += `<p style="font-size:0.82rem;color:var(--azul-mar);margin-bottom:12px;border-left:3px solid var(--azul-mar);padding-left:8px;">
                ⚠ Solo se permite crear un envio si el pedido tiene Estado = <strong>Confirmado</strong> o <strong>Pagado</strong>.
            </p>`;
            html += selectPedido('campo-PedidoIdPedido');
        }

        // Pago: el Monto debe coincidir con el Total del pedido
        if (tabla === 'Pago') {
            html += `<p style="font-size:0.82rem;color:var(--azul-mar);margin-bottom:12px;border-left:3px solid var(--azul-mar);padding-left:8px;">
                ℹ El <strong>Monto debe coincidir exactamente con el Total del pedido</strong> seleccionado.
            </p>`;
            html += selectPedido('campo-PedidoIdPedido');
        }

        // Producto: necesita asociarse a una Categoria
        if (tabla === 'Producto') {
            html += selectCategoria('campo-CategoriaIdCategoria');
        }

        // Campos genericos definidos en camposPorTabla (texto, numero,
        // fecha, selects de Estado, etc.)
        campos.forEach(c => {
            html += `<div class="form-grupo"><label>${c.label}</label>`;
            if (c.type === 'select') {
                html += `<select id="campo-${c.name}">${c.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
            } else {
                html += `<input type="${c.type}" id="campo-${c.name}" placeholder="${c.label}">`;
            }
            html += `</div>`;
        });

        html += `<button class="btn-submit" onclick="ejecutarAlta('${tabla}')">Insertar Registro</button>`;
    }

    // ── BAJA ─────────────────────────────────────────────────
    // Pide el ID del registro a eliminar (o pedido+producto en
    // el caso de Contiene, que tiene clave compuesta).
    if (operacion === 'baja') {
        if (tabla === 'Contiene') {
            html += `<p style="font-size:0.82rem;color:var(--azul-mar);margin-bottom:12px;border-left:3px solid var(--azul-mar);padding-left:8px;">
                Al eliminar este item, el <strong>Total del pedido se recalculara automaticamente</strong>.
            </p>`;
            html += selectPedido('campo-id-pedido-baja');
            html += selectProducto('campo-id-producto-baja');
            html += `<p style="font-size:0.83rem;color:var(--rojo-alerta);margin-bottom:10px;">Advertencia: Esta accion no se puede deshacer</p>
                     <button class="btn-submit" style="background:var(--rojo-alerta)" onclick="ejecutarBajaContiene()">Eliminar Registro</button>`;
        } else {
            html += `<div class="form-grupo"><label>ID del registro a eliminar</label>
                     <input type="number" id="campo-id-baja" placeholder="Ej: 1"></div>
                     <p style="font-size:0.83rem;color:var(--rojo-alerta);margin-bottom:10px;">Advertencia: Esta accion no se puede deshacer</p>
                     <button class="btn-submit" style="background:var(--rojo-alerta)" onclick="ejecutarBaja('${tabla}')">Eliminar Registro</button>`;
        }
    }

    // ── CAMBIO ───────────────────────────────────────────────
    // Pide el ID a modificar y muestra solo los campos que el
    // usuario quiera cambiar (los vacios se ignoran).
    if (operacion === 'cambio') {
        if (tabla === 'Contiene') {
            html += `<p style="font-size:0.82rem;color:var(--azul-mar);margin-bottom:12px;border-left:3px solid var(--azul-mar);padding-left:8px;">
                Al modificar este item, el <strong>Total del pedido se recalculara automaticamente</strong>.
            </p>`;
            html += selectPedido('campo-id-pedido-cambio');
            html += selectProducto('campo-id-producto-cambio');
            html += `<div class="form-grupo"><label>Cantidad (dejar en 0 para no cambiar)</label>
                     <input type="number" id="campo-Cantidad" placeholder="Cantidad"></div>
                     <div class="form-grupo"><label>Precio Unitario (dejar en 0 para no cambiar)</label>
                     <input type="number" id="campo-PrecioUnitario" placeholder="Precio Unitario"></div>
                     <button class="btn-submit" onclick="ejecutarCambioContiene()">Actualizar Registro</button>`;
        } else {
            html += `<div class="form-grupo"><label>ID del registro a modificar</label>
                     <input type="number" id="campo-id-cambio" placeholder="Ej: 1"></div>`;

            if (tabla === 'Pedido')   html += selectCliente('campo-ClienteIdCliente', true);
            if (tabla === 'Producto') html += selectCategoria('campo-CategoriaIdCategoria', true);
            if (tabla === 'Envio')    html += selectPedido('campo-PedidoIdPedido', true);
            if (tabla === 'Pago')     html += selectPedido('campo-PedidoIdPedido', true);

            campos.forEach(c => {
                html += `<div class="form-grupo"><label>${c.label} (dejar vacio para no cambiar)</label>`;
                if (c.type === 'select') {
                    html += `<select id="campo-${c.name}"><option value="">-- Sin cambio --</option>${c.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
                } else {
                    html += `<input type="${c.type}" id="campo-${c.name}" placeholder="${c.label}">`;
                }
                html += `</div>`;
            });
            html += `<button class="btn-submit" onclick="ejecutarCambio('${tabla}')">Actualizar Registro</button>`;
        }
    }

    html += `</div>`;
    contenedor.innerHTML = html;

    // Autorellenar PrecioUnitario al elegir producto en Contiene-Alta
    if (operacion === 'alta' && tabla === 'Contiene') {
        const selProd = document.getElementById('campo-ProductoIdProducto');
        if (selProd) {
            const actualizarPrecio = () => {
                const opt = selProd.options[selProd.selectedIndex];
                const precio = opt ? opt.dataset.precio : null;
                const inputPrecio = document.getElementById('campo-PrecioUnitario');
                if (precio && inputPrecio) inputPrecio.value = parseFloat(precio).toFixed(2);
            };
            selProd.addEventListener('change', actualizarPrecio);
            actualizarPrecio(); // ejecutar al cargar para el primer item
        }
    }
}

// ============================================================
// ABC - EJECUTAR ALTA
// ============================================================
async function ejecutarAlta(tabla) {
    const campos = camposPorTabla[tabla];
    const datos  = {};

    // Recoger FKs dinamicas
    const fkIds = {
        'Pedido':   [{ campo: 'ClienteIdCliente',    elemId: 'campo-ClienteIdCliente' }],
        'Contiene': [
            { campo: 'PedidoIdPedido',     elemId: 'campo-PedidoIdPedido' },
            { campo: 'ProductoIdProducto', elemId: 'campo-ProductoIdProducto' }
        ],
        'Envio': [{ campo: 'PedidoIdPedido', elemId: 'campo-PedidoIdPedido' }],
        'Pago':  [{ campo: 'PedidoIdPedido', elemId: 'campo-PedidoIdPedido' }],
        'Producto': [{ campo: 'CategoriaIdCategoria', elemId: 'campo-CategoriaIdCategoria' }]
    };
    if (fkIds[tabla]) {
        fkIds[tabla].forEach(({ campo, elemId }) => {
            const el = document.getElementById(elemId);
            if (el && el.value) datos[campo] = el.value;
        });
    }

    // Recoger campos normales
    campos.forEach(c => {
        const el = document.getElementById(`campo-${c.name}`);
        if (el && el.value !== '') datos[c.name] = el.value;
    });

    try {
        const res  = await fetch(`${API}/${tabla.toLowerCase()}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos)
        });
        const json = await res.json();
        if (res.ok) {
            // Si es Contiene, mostrar el nuevo Total del pedido
            let extra = '';
            if (tabla === 'Contiene' && json.totalPedido !== undefined) {
                extra = `\nTotal del pedido actualizado: $${parseFloat(json.totalPedido).toFixed(2)}`;
            }
            mostrarMensaje('mensaje-abc', `${json.mensaje}${extra}`, 'exito');
            mostrarResultado('resultado-abc', `INSERT INTO ${tabla}\n${JSON.stringify(datos, null, 2)}${extra}`);
        } else {
            mostrarMensaje('mensaje-abc', `Error: ${json.error}`, 'error');
        }
    } catch (e) {
        mostrarMensaje('mensaje-abc', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ============================================================
// ABC - EJECUTAR BAJA
// ============================================================
async function ejecutarBaja(tabla) {
    const id = document.getElementById('campo-id-baja').value;
    if (!id) { mostrarMensaje('mensaje-abc', 'Debes ingresar un ID valido.', 'error'); return; }
    if (!confirm(`Seguro que deseas eliminar el registro ${id} de ${tabla}?`)) return;
    try {
        const res  = await fetch(`${API}/${tabla.toLowerCase()}/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (res.ok) {
            mostrarMensaje('mensaje-abc', json.mensaje, 'exito');
            mostrarResultado('resultado-abc', `DELETE FROM ${tabla} WHERE Id${tabla} = ${id}`);
        } else {
            mostrarMensaje('mensaje-abc', `Error: ${json.error}`, 'error');
        }
    } catch (e) {
        mostrarMensaje('mensaje-abc', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ============================================================
// ABC - EJECUTAR BAJA CONTIENE
// ============================================================
async function ejecutarBajaContiene() {
    const pedidoId   = document.getElementById('campo-id-pedido-baja').value;
    const productoId = document.getElementById('campo-id-producto-baja').value;
    if (!pedidoId || !productoId) {
        mostrarMensaje('mensaje-abc', 'Debes seleccionar pedido y producto.', 'error'); return;
    }
    if (!confirm(`Seguro que deseas eliminar el producto ${productoId} del pedido ${pedidoId}?`)) return;
    try {
        const res  = await fetch(`${API}/contiene/${pedidoId}/${productoId}`, { method: 'DELETE' });
        const json = await res.json();
        if (res.ok) {
            const extra = json.totalPedido !== undefined
                ? `\nTotal del pedido actualizado: $${parseFloat(json.totalPedido).toFixed(2)}` : '';
            mostrarMensaje('mensaje-abc', `${json.mensaje}${extra}`, 'exito');
            mostrarResultado('resultado-abc',
                `DELETE FROM Contiene\nWHERE PedidoIdPedido = ${pedidoId} AND ProductoIdProducto = ${productoId}${extra}`);
        } else {
            mostrarMensaje('mensaje-abc', `Error: ${json.error}`, 'error');
        }
    } catch (e) {
        mostrarMensaje('mensaje-abc', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ============================================================
// ABC - EJECUTAR CAMBIO
// ============================================================
async function ejecutarCambio(tabla) {
    const id     = document.getElementById('campo-id-cambio').value;
    const campos = camposPorTabla[tabla];
    const datos  = {};
    if (!id) { mostrarMensaje('mensaje-abc', 'Debes ingresar un ID valido.', 'error'); return; }

    const fkMap = {
        'Pedido':   { campo: 'ClienteIdCliente',    elemId: 'campo-ClienteIdCliente' },
        'Producto': { campo: 'CategoriaIdCategoria', elemId: 'campo-CategoriaIdCategoria' },
        'Envio':    { campo: 'PedidoIdPedido',       elemId: 'campo-PedidoIdPedido' },
        'Pago':     { campo: 'PedidoIdPedido',       elemId: 'campo-PedidoIdPedido' }
    };
    if (fkMap[tabla]) {
        const el = document.getElementById(fkMap[tabla].elemId);
        if (el && el.value !== '') datos[fkMap[tabla].campo] = el.value;
    }

    campos.forEach(c => {
        const el = document.getElementById(`campo-${c.name}`);
        if (el && el.value !== '' && el.value !== '-- Sin cambio --') datos[c.name] = el.value;
    });

    if (Object.keys(datos).length === 0) {
        mostrarMensaje('mensaje-abc', 'Debes modificar al menos un campo.', 'error'); return;
    }
    try {
        const res  = await fetch(`${API}/${tabla.toLowerCase()}/${id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos)
        });
        const json = await res.json();
        if (res.ok) {
            mostrarMensaje('mensaje-abc', json.mensaje, 'exito');
            mostrarResultado('resultado-abc',
                `UPDATE ${tabla} SET\n${JSON.stringify(datos, null, 2)}\nWHERE Id${tabla} = ${id}`);
        } else {
            mostrarMensaje('mensaje-abc', `Error: ${json.error}`, 'error');
        }
    } catch (e) {
        mostrarMensaje('mensaje-abc', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ============================================================
// ABC - EJECUTAR CAMBIO CONTIENE
// ============================================================
async function ejecutarCambioContiene() {
    const pedidoId       = document.getElementById('campo-id-pedido-cambio').value;
    const productoId     = document.getElementById('campo-id-producto-cambio').value;
    const cantidad       = document.getElementById('campo-Cantidad').value;
    const precioUnitario = document.getElementById('campo-PrecioUnitario').value;

    if (!pedidoId || !productoId) {
        mostrarMensaje('mensaje-abc', 'Debes seleccionar pedido y producto.', 'error'); return;
    }
    if (!cantidad && !precioUnitario) {
        mostrarMensaje('mensaje-abc', 'Debes modificar al menos un campo.', 'error'); return;
    }

    const datos = {};
    if (cantidad && Number(cantidad) > 0) datos.Cantidad       = cantidad;
    if (precioUnitario)                   datos.PrecioUnitario = precioUnitario;

    try {
        const res  = await fetch(`${API}/contiene/${pedidoId}/${productoId}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos)
        });
        const json = await res.json();
        if (res.ok) {
            const extra = json.totalPedido !== undefined
                ? `\nTotal del pedido actualizado: $${parseFloat(json.totalPedido).toFixed(2)}` : '';
            mostrarMensaje('mensaje-abc', `${json.mensaje}${extra}`, 'exito');
            mostrarResultado('resultado-abc',
                `UPDATE Contiene SET\n${JSON.stringify(datos, null, 2)}\nWHERE PedidoIdPedido = ${pedidoId} AND ProductoIdProducto = ${productoId}${extra}`);
        } else {
            mostrarMensaje('mensaje-abc', `Error: ${json.error}`, 'error');
        }
    } catch (e) {
        mostrarMensaje('mensaje-abc', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ============================================================
// CONSULTAS
// ============================================================
const consultas = {
    sencillas: [
        { titulo: 'Productos disponibles', desc: 'Lista los productos activos del catalogo.',
          sql: "SELECT Nombre, Precio, Estado FROM Producto WHERE Estado = 'Disponible'", endpoint: 'consultas/productos-disponibles' },
        { titulo: 'Todos los clientes', desc: 'Muestra el listado completo de clientes registrados.',
          sql: 'SELECT IdCliente, Nombre, Correo, Fecha_Registro FROM Cliente', endpoint: 'consultas/clientes' },
        { titulo: 'Pedidos confirmados o pagados', desc: 'Filtra los pedidos activos para el historial de ventas.',
          sql: "SELECT IdPedido, Fecha, Total, Estado FROM Pedido WHERE Estado IN ('Confirmado','Pagado')", endpoint: 'consultas/pedidos-activos' },
        { titulo: 'Productos no disponibles', desc: 'Detecta productos fuera de catalogo.',
          sql: "SELECT IdProducto, Nombre, Precio FROM Producto WHERE Estado = 'No disponible'", endpoint: 'consultas/productos-no-disponibles' },
        { titulo: 'Pagos realizados con tarjeta', desc: 'Filtra los pagos por metodo.',
          sql: "SELECT IdPago, FechaPago, Monto, Estado FROM Pago WHERE MetodoDePago = 'Tarjeta'", endpoint: 'consultas/pagos-tarjeta' }
    ],
    agrupadas: [
        { titulo: 'Total de pedidos por cliente', desc: 'Cuenta cuantos pedidos tiene cada cliente.',
          sql: 'SELECT ClienteIdCliente, COUNT(*) AS TotalPedidos FROM Pedido GROUP BY ClienteIdCliente', endpoint: 'consultas/pedidos-por-cliente' },
        { titulo: 'Ventas totales por estado', desc: 'Suma los ingresos agrupados por estado de pedido.',
          sql: 'SELECT Estado, SUM(Total) AS TotalVentas FROM Pedido GROUP BY Estado', endpoint: 'consultas/ventas-por-estado' },
        { titulo: 'Productos por categoria', desc: 'Cuantos productos hay en cada categoria.',
          sql: 'SELECT CategoriaIdCategoria, COUNT(*) AS TotalProductos FROM Producto GROUP BY CategoriaIdCategoria', endpoint: 'consultas/productos-por-categoria' },
        { titulo: 'Precio promedio por categoria', desc: 'Precio promedio por categoria.',
          sql: 'SELECT CategoriaIdCategoria, AVG(Precio) AS PrecioPromedio FROM Producto GROUP BY CategoriaIdCategoria', endpoint: 'consultas/precio-promedio-categoria' },
        { titulo: 'Total recaudado por metodo de pago', desc: 'Tarjeta versus transferencia.',
          sql: 'SELECT MetodoDePago, SUM(Monto) AS TotalRecaudado FROM Pago GROUP BY MetodoDePago', endpoint: 'consultas/recaudado-por-metodo' }
    ],
    having: [
        { titulo: 'Clientes con mas de un pedido', desc: 'Identifica clientes frecuentes.',
          sql: 'SELECT ClienteIdCliente, COUNT(*) AS TotalPedidos FROM Pedido GROUP BY ClienteIdCliente HAVING COUNT(*) > 1', endpoint: 'consultas/clientes-frecuentes' },
        { titulo: 'Categorias con mas de 1 producto disponible', desc: 'Categorias con suficiente variedad.',
          sql: "SELECT CategoriaIdCategoria, COUNT(*) AS Total FROM Producto WHERE Estado = 'Disponible' GROUP BY CategoriaIdCategoria HAVING COUNT(*) > 1", endpoint: 'consultas/categorias-con-stock' },
        { titulo: 'Metodos con recaudacion mayor a $5,000', desc: 'Metodos de pago con mas ingresos.',
          sql: 'SELECT MetodoDePago, SUM(Monto) AS TotalRecaudado FROM Pago GROUP BY MetodoDePago HAVING SUM(Monto) > 5000', endpoint: 'consultas/metodos-mayor-recaudacion' },
        { titulo: 'Estados de pedido con promedio mayor a $1,000', desc: 'Estados con tickets mas altos.',
          sql: 'SELECT Estado, AVG(Total) AS PromedioTotal FROM Pedido GROUP BY Estado HAVING AVG(Total) > 1000', endpoint: 'consultas/estados-ticket-alto' },
        { titulo: 'Productos con mas de 5 unidades vendidas', desc: 'Articulos mas populares.',
          sql: 'SELECT ProductoIdProducto, SUM(Cantidad) AS TotalVendido FROM Contiene GROUP BY ProductoIdProducto HAVING SUM(Cantidad) > 5', endpoint: 'consultas/productos-mas-vendidos' }
    ],
    multitabla: [
        { titulo: 'Pedidos con nombre del cliente', desc: 'Une Pedido y Cliente.',
          sql: 'SELECT P.IdPedido, C.Nombre AS Cliente, P.Fecha, P.Total, P.Estado FROM Pedido P INNER JOIN Cliente C ON P.ClienteIdCliente = C.IdCliente', endpoint: 'consultas/pedidos-con-cliente' },
        { titulo: 'Detalle completo del pedido', desc: 'Productos, cantidades y subtotales.',
          sql: 'SELECT P.IdPedido, PR.Nombre AS Producto, C.Cantidad, C.PrecioUnitario, (C.Cantidad * C.PrecioUnitario) AS Subtotal FROM Contiene C INNER JOIN Pedido P ON C.PedidoIdPedido = P.IdPedido INNER JOIN Producto PR ON C.ProductoIdProducto = PR.IdProducto', endpoint: 'consultas/detalle-pedido' },
        { titulo: 'Envios con cliente y pedido', desc: 'Seguimiento logistico vinculado a clientes.',
          sql: 'SELECT E.IdEnvio, C.Nombre AS Cliente, P.Estado AS EstadoPedido, E.Paqueteria, E.NoGuia, E.FechaEntrega FROM Envio E INNER JOIN Pedido P ON E.PedidoIdPedido = P.IdPedido INNER JOIN Cliente C ON P.ClienteIdCliente = C.IdCliente', endpoint: 'consultas/envios-con-cliente' },
        { titulo: 'Productos con su categoria', desc: 'Catalogo completo con nombre de categoria.',
          sql: 'SELECT PR.Nombre, PR.Precio, PR.Estado, CA.Nombre AS Categoria FROM Producto PR INNER JOIN Categoria CA ON PR.CategoriaIdCategoria = CA.IdCategoria', endpoint: 'consultas/productos-completos' },
        { titulo: 'Pagos con nombre del cliente', desc: 'Historial de pagos vinculado a clientes.',
          sql: 'SELECT C.Nombre AS Cliente, PA.FechaPago, PA.Monto, PA.MetodoDePago, PA.Estado, P.Total AS TotalPedido FROM Pago PA INNER JOIN Pedido P ON PA.PedidoIdPedido = P.IdPedido INNER JOIN Cliente C ON P.ClienteIdCliente = C.IdCliente', endpoint: 'consultas/pagos-con-cliente' }
    ]
};

function mostrarTab(tipo, btnEl) {
    tabActivo = tipo;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const contenedor = document.getElementById('contenido-consultas');
    document.getElementById('resultado-consultas').innerHTML = '';
    contenedor.innerHTML = '';
    consultas[tipo].forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'consulta-item';
        div.innerHTML = `<h4>${c.titulo}</h4><p>${c.desc}</p><pre>${c.sql}</pre>
            <button class="btn-ejecutar" onclick="ejecutarConsulta(${i},'${tipo}')">Ejecutar Consulta</button>`;
        contenedor.appendChild(div);
    });
}

async function ejecutarConsulta(indice, tipo) {
    const consulta   = consultas[tipo][indice];
    const contenedor = document.getElementById('resultado-consultas');
    contenedor.innerHTML = `<p style="color:var(--azul-mar);padding:10px;">Ejecutando consulta...</p>`;
    try {
        const res  = await fetch(`${API}/${consulta.endpoint}`);
        const data = await res.json();
        if (!res.ok) { contenedor.innerHTML = `<div class="mensaje error">Error: ${data.error}</div>`; return; }
        if (data.length === 0) { contenedor.innerHTML = `<div class="mensaje exito">Consulta ejecutada. Sin resultados aun.</div>`; return; }
        const columnas = Object.keys(data[0]);
        contenedor.innerHTML = `
            <div class="tabla-resultado-wrap">
                <table class="tabla-resultado">
                    <thead><tr>${columnas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                    <tbody>${data.map(fila => `<tr>${columnas.map(c => `<td>${fila[c] ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
            <p style="font-size:0.8rem;color:var(--texto-medio);margin-top:8px;">${data.length} registro(s) encontrado(s)</p>`;
    } catch (e) {
        contenedor.innerHTML = `<div class="mensaje error">No se pudo conectar con el servidor.</div>`;
    }
}

// ============================================================
// UTILIDADES
// ============================================================
function mostrarResultado(id, texto) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.classList.add('visible');
}

function mostrarMensaje(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className   = `mensaje ${tipo}`;
    setTimeout(() => { el.className = 'mensaje'; el.textContent = ''; }, 6000);
}

document.addEventListener('DOMContentLoaded', () => {
    // La inicialización del admin ocurre cuando el usuario accede desde el landing
});
