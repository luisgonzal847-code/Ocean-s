const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// CONSULTAS SENCILLAS
// Filtran filas con WHERE sin agrupación.
// ============================================================

// Devuelve solo los productos con Estado = 'Disponible'.
router.get('/productos-disponibles', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT Nombre, Precio, Estado FROM Producto WHERE Estado = 'Disponible'"
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lista completa de clientes registrados.
router.get('/clientes', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT IdCliente, Nombre, Correo, Fecha_Registro FROM Cliente'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pedidos cuyo estado es 'Confirmado' o 'Pagado' (pedidos activos).
router.get('/pedidos-activos', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT IdPedido, Fecha, Total, Estado FROM Pedido WHERE Estado IN ('Confirmado','Pagado')"
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Productos marcados como 'No disponible' para revisión de catálogo.
// (Reemplaza la consulta de stock bajo que requería tabla Inventario inexistente)
router.get('/productos-no-disponibles', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT IdProducto, Nombre, Precio FROM Producto WHERE Estado = 'No disponible'"
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pagos realizados con tarjeta.
router.get('/pagos-tarjeta', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT IdPago, FechaPago, Monto, Estado FROM Pago WHERE MetodoDePago = 'Tarjeta'"
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CONSULTAS AGRUPADAS
// Usan GROUP BY para resumir datos por categoría o estado.
// ============================================================

// Cuenta cuántos pedidos tiene cada cliente.
router.get('/pedidos-por-cliente', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT ClienteIdCliente, COUNT(*) AS TotalPedidos FROM Pedido GROUP BY ClienteIdCliente'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Suma los totales de pedidos agrupados por su estado.
router.get('/ventas-por-estado', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT Estado, SUM(Total) AS TotalVentas FROM Pedido GROUP BY Estado'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cuenta cuántos productos hay en cada categoría.
router.get('/productos-por-categoria', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT CategoriaIdCategoria, COUNT(*) AS TotalProductos FROM Producto GROUP BY CategoriaIdCategoria'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Calcula el precio promedio de los productos por categoría.
router.get('/precio-promedio-categoria', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT CategoriaIdCategoria, AVG(Precio) AS PrecioPromedio FROM Producto GROUP BY CategoriaIdCategoria'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Suma el monto total recaudado agrupado por método de pago.
router.get('/recaudado-por-metodo', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT MetodoDePago, SUM(Monto) AS TotalRecaudado FROM Pago GROUP BY MetodoDePago'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CONSULTAS CON HAVING
// Filtran los grupos resultantes del GROUP BY.
// Nota: el WHERE ya acota las filas antes de agrupar;
// el HAVING solo filtra sobre el resultado agregado.
// ============================================================

// Clientes que han realizado más de un pedido (clientes frecuentes).
router.get('/clientes-frecuentes', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT ClienteIdCliente, COUNT(*) AS TotalPedidos FROM Pedido GROUP BY ClienteIdCliente HAVING COUNT(*) > 1'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Categorías que tienen más de un producto disponible.
// WHERE filtra primero los disponibles; HAVING filtra los grupos con más de 1.
router.get('/categorias-con-stock', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT CategoriaIdCategoria, COUNT(*) AS Total FROM Producto WHERE Estado = 'Disponible' GROUP BY CategoriaIdCategoria HAVING COUNT(*) > 1"
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Métodos de pago cuya recaudación total supera $5,000.
// Sin WHERE previo: el HAVING es la única condición de filtrado sobre el grupo.
router.get('/metodos-mayor-recaudacion', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT MetodoDePago, SUM(Monto) AS TotalRecaudado FROM Pago GROUP BY MetodoDePago HAVING SUM(Monto) > 5000'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Estados de pedido cuyo total promedio supera $1,000.
router.get('/estados-ticket-alto', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT Estado, AVG(Total) AS PromedioTotal FROM Pedido GROUP BY Estado HAVING AVG(Total) > 1000'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Productos cuya cantidad total vendida (suma de Contiene) supera 5 unidades.
router.get('/productos-mas-vendidos', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT ProductoIdProducto, SUM(Cantidad) AS TotalVendido FROM Contiene GROUP BY ProductoIdProducto HAVING SUM(Cantidad) > 5'
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CONSULTAS MULTITABLA
// Usan INNER JOIN para cruzar información de varias tablas.
// ============================================================

// Une Pedido con Cliente para mostrar quién realizó cada orden.
router.get('/pedidos-con-cliente', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT P.IdPedido, C.Nombre AS Cliente, P.Fecha, P.Total, P.Estado
             FROM Pedido P
             INNER JOIN Cliente C ON P.ClienteIdCliente = C.IdCliente`
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cruza Contiene, Pedido y Producto para ver el detalle
// (producto, cantidad, precio unitario y subtotal) de cada pedido.
router.get('/detalle-pedido', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT P.IdPedido, PR.Nombre AS Producto, C.Cantidad, C.PrecioUnitario,
                    (C.Cantidad * C.PrecioUnitario) AS Subtotal
             FROM Contiene C
             INNER JOIN Pedido P   ON C.PedidoIdPedido     = P.IdPedido
             INNER JOIN Producto PR ON C.ProductoIdProducto = PR.IdProducto`
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Une Envio, Pedido y Cliente para el seguimiento logístico.
router.get('/envios-con-cliente', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT E.IdEnvio, E.PedidoIdPedido, C.Nombre AS Cliente,
                    P.Estado AS EstadoPedido, P.Total,
                    E.Paqueteria, E.NoGuia, E.Estado AS EstadoEnvio,
                    E.FechaEntrega, E.DireccionEnvio,
                    PA.IdPago, PA.FechaPago, PA.Monto, PA.MetodoDePago, PA.Estado AS EstadoPago
             FROM Envio E
             INNER JOIN Pedido P  ON E.PedidoIdPedido   = P.IdPedido
             INNER JOIN Cliente C ON P.ClienteIdCliente = C.IdCliente
             LEFT  JOIN Pago PA   ON PA.PedidoIdPedido  = P.IdPedido`
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Une Producto y Categoria para mostrar el catálogo completo con nombre de categoría.
// (Reemplaza la consulta que cruzaba también con Inventario, tabla inexistente)
router.get('/productos-completos', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT PR.Nombre, PR.Precio, PR.Estado, CA.Nombre AS Categoria
             FROM Producto PR
             INNER JOIN Categoria CA ON PR.CategoriaIdCategoria = CA.IdCategoria`
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Une Pago, Pedido y Cliente para el historial de transacciones por cliente.
router.get('/pagos-con-cliente', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT C.Nombre AS Cliente, PA.FechaPago, PA.Monto,
                    PA.MetodoDePago, PA.Estado, P.Total AS TotalPedido
             FROM Pago PA
             INNER JOIN Pedido P  ON PA.PedidoIdPedido  = P.IdPedido
             INNER JOIN Cliente C ON P.ClienteIdCliente = C.IdCliente`
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;