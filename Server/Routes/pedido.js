const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// CONSTANTES DE INTEGRIDAD
// Estados válidos del pedido definidos como CHECK en la BD.
// "El estado de un pedido solo acepta los valores
//  'Pendiente', 'Confirmado', 'Pagado' o 'Cancelado'."  (IC-8)
// ============================================================
const ESTADOS_VALIDOS = ['Pendiente', 'Confirmado', 'Pagado', 'Cancelado'];

// ============================================================
// HELPER EXPORTADO — Recalcular Total de un pedido
// Suma Subtotal de todos los items en Contiene y actualiza
// el campo Total del pedido. Se importa en contiene.js para
// reutilizarlo sin duplicar la lógica.
// ============================================================
async function recalcularTotal(idPedido) {
    const [[{ total }]] = await db.query(
        `SELECT COALESCE(SUM(Subtotal), 0) AS total
         FROM contiene WHERE PedidoIdPedido = ?`,
        [idPedido]
    );
    await db.query(
        'UPDATE pedido SET Total = ? WHERE IdPedido = ?',
        [total, idPedido]
    );
    return parseFloat(total);
}

// ============================================================
// LISTAR — Obtener todos los pedidos
// Incluye el nombre del cliente para los selects del frontend.
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT P.IdPedido, C.Nombre AS Cliente, P.Fecha, P.Total, P.Estado
             FROM pedido P
             INNER JOIN cliente C ON P.ClienteIdCliente = C.IdCliente
             ORDER BY P.IdPedido DESC`
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Registrar un pedido
// Regla de integridad aplicada:
//   · Estado solo acepta los cuatro valores permitidos      (IC-8)
// El Total arranca en 0 y se actualiza automáticamente cada
// vez que se agrega, edita o elimina un item en Contiene.
// IC-4 (al menos un producto) se verifica en el frontend;
// la BD lo garantiza porque Total = 0 sin items en Contiene.
// ============================================================
router.post('/', async (req, res) => {
    const { Fecha, Estado, ClienteIdCliente } = req.body;

    if (!Fecha || !Estado || !ClienteIdCliente)
        return res.status(400).json({ error: 'Fecha, Estado y ClienteIdCliente son requeridos.' });

    // IC-8: Estado debe ser uno de los cuatro valores válidos
    if (!ESTADOS_VALIDOS.includes(Estado))
        return res.status(400).json({
            error: "Estado debe ser 'Pendiente', 'Confirmado', 'Pagado' o 'Cancelado'."
        });

    try {
        const [resultado] = await db.query(
            'INSERT INTO pedido (Fecha, Total, Estado, ClienteIdCliente) VALUES (?, 0, ?, ?)',
            [Fecha, Estado, ClienteIdCliente]
        );
        res.status(201).json({
            mensaje: 'Pedido registrado. Agrega productos para calcular el total.',
            id: resultado.insertId
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// RECALCULAR TOTAL — PUT /api/pedido/:id/recalcular-total
// Endpoint explícito para forzar la sincronización del Total
// desde el frontend cuando se necesite verificar manualmente.
// ============================================================
router.put('/:id/recalcular-total', async (req, res) => {
    const id = req.params.id;
    try {
        const [existe] = await db.query('SELECT IdPedido FROM pedido WHERE IdPedido = ?', [id]);
        if (existe.length === 0)
            return res.status(404).json({ error: 'Pedido no encontrado.' });

        const nuevoTotal = await recalcularTotal(id);
        res.json({ mensaje: `Total del pedido ${id} actualizado.`, total: nuevoTotal });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// BAJA — Eliminar pedido y sus registros hijos en cascada
// Se eliminan primero Contiene, Pago y Envio asociados al
// pedido antes de borrar el propio Pedido, respetando las
// restricciones de clave foránea.
// ============================================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await db.query('DELETE FROM contiene WHERE PedidoIdPedido = ?', [id]);
        await db.query('DELETE FROM pago    WHERE PedidoIdPedido = ?', [id]);
        await db.query('DELETE FROM envio   WHERE PedidoIdPedido = ?', [id]);
        const [resultado] = await db.query('DELETE FROM pedido WHERE IdPedido = ?', [id]);
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        res.json({ mensaje: `Pedido ${id} eliminado junto con sus ítems, pagos y envíos.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CAMBIO — Actualizar campos de un pedido
// Regla de integridad aplicada:
//   · Estado solo acepta los cuatro valores válidos         (IC-8)
// Total se elimina del body si alguien lo envía; es un campo
// calculado y nunca debe modificarse de forma manual.
// ============================================================
router.put('/:id', async (req, res) => {
    const campos = { ...req.body };

    // Total es derivado; se ignora aunque venga en el body
    delete campos.Total;

    const claves = Object.keys(campos);
    if (claves.length === 0)
        return res.status(400).json({ error: 'No se enviaron campos.' });

    // IC-8: Si se modifica Estado, debe ser uno de los valores válidos
    if (campos.Estado && !ESTADOS_VALIDOS.includes(campos.Estado))
        return res.status(400).json({
            error: "Estado debe ser 'Pendiente', 'Confirmado', 'Pagado' o 'Cancelado'."
        });

    const setSQL  = claves.map(c => `${c} = ?`).join(', ');
    const valores = [...Object.values(campos), req.params.id];
    try {
        const [resultado] = await db.query(
            `UPDATE pedido SET ${setSQL} WHERE IdPedido = ?`, valores
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        res.json({ mensaje: `Pedido ${req.params.id} actualizado.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Exportar router y helper para que contiene.js lo reutilice
module.exports        = router;
module.exports.recalcularTotal = recalcularTotal;