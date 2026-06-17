const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { recalcularTotal } = require('./pedido');

// ============================================================
// CONSTANTES DE INTEGRIDAD
// Cantidad mínima permitida por las reglas de integridad:
// "La cantidad en Contiene debe ser un valor entero mayor a 0."
// ============================================================
const CANTIDAD_MINIMA = 1;

// ============================================================
// HELPER INTERNO — Calcular subtotal
// El subtotal es un valor DERIVADO: Cantidad × PrecioUnitario.
// Nunca se recibe del cliente; siempre se calcula aquí antes
// de enviarlo a la base de datos.
// ============================================================
function calcularSubtotal(cantidad, precioUnitario) {
    return Math.round(parseFloat(cantidad) * parseFloat(precioUnitario) * 100) / 100;
}

// ============================================================
// LISTAR — Obtener todos los items de pedidos (Contiene)
// Devuelve Subtotal calculado desde la BD para verificación.
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT PedidoIdPedido, ProductoIdProducto, Cantidad, PrecioUnitario, Subtotal
             FROM contiene ORDER BY PedidoIdPedido, ProductoIdProducto`
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Agregar producto a un pedido
// Reglas de integridad aplicadas:
//   · Cantidad debe ser entero mayor a 0                  (IC-6)
//   · Subtotal = Cantidad × PrecioUnitario (derivado)     (IC-7)
// Después de insertar, recalcula automáticamente el Total
// del pedido sumando todos sus items en Contiene.
// ============================================================
router.post('/', async (req, res) => {
    const { PedidoIdPedido, ProductoIdProducto, Cantidad, PrecioUnitario } = req.body;

    // Validación de campos obligatorios
    if (!PedidoIdPedido || !ProductoIdProducto || !Cantidad || !PrecioUnitario)
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });

    // IC-6: La cantidad debe ser un entero mayor a 0
    const cantidadNum = parseInt(Cantidad, 10);
    if (!Number.isInteger(cantidadNum) || cantidadNum < CANTIDAD_MINIMA)
        return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a 0.' });

    // IC-7: El subtotal es derivado; se calcula aquí, nunca se recibe del cliente
    const subtotal = calcularSubtotal(cantidadNum, PrecioUnitario);

    try {
        await db.query(
            'INSERT INTO contiene (PedidoIdPedido, ProductoIdProducto, Cantidad, PrecioUnitario, Subtotal) VALUES (?, ?, ?, ?, ?)',
            [PedidoIdPedido, ProductoIdProducto, cantidadNum, PrecioUnitario, subtotal]
        );

        // Recalcular Total del pedido padre a partir de todos sus items
        const nuevoTotal = await recalcularTotal(PedidoIdPedido);
        res.status(201).json({
            mensaje: 'Producto agregado al pedido.',
            subtotal,
            totalPedido: nuevoTotal
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// BAJA — Eliminar un producto de un pedido
// Después de eliminar, recalcula el Total del pedido padre.
// ============================================================
router.delete('/:pedidoId/:productoId', async (req, res) => {
    const { pedidoId, productoId } = req.params;
    try {
        const [resultado] = await db.query(
            'DELETE FROM contiene WHERE PedidoIdPedido = ? AND ProductoIdProducto = ?',
            [pedidoId, productoId]
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Registro no encontrado.' });

        // Recalcular Total del pedido padre tras la eliminación
        const nuevoTotal = await recalcularTotal(pedidoId);
        res.json({
            mensaje: 'Producto eliminado del pedido.',
            totalPedido: nuevoTotal
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CAMBIO — Actualizar cantidad o precio de un item
// Reglas de integridad aplicadas:
//   · Cantidad debe ser entero mayor a 0 si se modifica    (IC-6)
//   · Subtotal se recalcula automáticamente                (IC-7)
// Después de actualizar, recalcula el Total del pedido.
// ============================================================
router.put('/:pedidoId/:productoId', async (req, res) => {
    const { pedidoId, productoId } = req.params;
    const { Cantidad, PrecioUnitario } = req.body;

    if (!Cantidad && !PrecioUnitario)
        return res.status(400).json({ error: 'Debes enviar Cantidad o PrecioUnitario.' });

    // IC-6: Si se modifica Cantidad, debe ser entero mayor a 0
    if (Cantidad) {
        const cantidadNum = parseInt(Cantidad, 10);
        if (!Number.isInteger(cantidadNum) || cantidadNum < CANTIDAD_MINIMA)
            return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a 0.' });
    }

    try {
        // Obtener los valores actuales para recalcular el Subtotal con datos completos
        const [[actual]] = await db.query(
            'SELECT Cantidad, PrecioUnitario FROM contiene WHERE PedidoIdPedido = ? AND ProductoIdProducto = ?',
            [pedidoId, productoId]
        );
        if (!actual)
            return res.status(404).json({ error: 'Registro no encontrado.' });

        // IC-7: Subtotal siempre derivado; se usa el valor nuevo si se proporcionó,
        //        o el existente en BD si no se modificó ese campo
        const cantidadFinal       = Cantidad       ? parseInt(Cantidad, 10)         : actual.Cantidad;
        const precioUnitarioFinal = PrecioUnitario ? parseFloat(PrecioUnitario)     : actual.PrecioUnitario;
        const subtotal            = calcularSubtotal(cantidadFinal, precioUnitarioFinal);

        await db.query(
            `UPDATE Contiene
             SET Cantidad = ?, PrecioUnitario = ?, Subtotal = ?
             WHERE PedidoIdPedido = ? AND ProductoIdProducto = ?`,
            [cantidadFinal, precioUnitarioFinal, subtotal, pedidoId, productoId]
        );

        // Recalcular Total del pedido padre
        const nuevoTotal = await recalcularTotal(pedidoId);
        res.json({
            mensaje: 'Detalle de pedido actualizado.',
            subtotal,
            totalPedido: nuevoTotal
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;