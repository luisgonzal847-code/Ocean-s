const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// CONSTANTES DE INTEGRIDAD
// Valores permitidos por el CHECK de la tabla Pago en la BD.
// "El método de pago solo acepta 'Tarjeta' o 'Transferencia'." (IC-3)
// "El estado de un pago solo acepta 'Pendiente',
//  'Completado' o 'Rechazado'."                               (IC-10)
// ============================================================
const METODOS_VALIDOS = ['Tarjeta', 'Transferencia'];
const ESTADOS_VALIDOS = ['Pendiente', 'Completado', 'Rechazado'];

// ============================================================
// LISTAR — Obtener todos los pagos
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pago ORDER BY IdPago DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Registrar un pago
// Reglas de integridad aplicadas:
//   · MetodoDePago: solo 'Tarjeta' o 'Transferencia'         (IC-3)
//   · Estado: solo 'Pendiente', 'Completado' o 'Rechazado'  (IC-10)
// Adicionalmente, el Monto debe coincidir con el Total del
// pedido asociado para garantizar consistencia financiera.
// ============================================================
router.post('/', async (req, res) => {
    const { FechaPago, Monto, MetodoDePago, Estado, PedidoIdPedido } = req.body;

    if (!FechaPago || !Monto || !MetodoDePago || !Estado || !PedidoIdPedido)
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });

    // IC-3: Validar método de pago
    if (!METODOS_VALIDOS.includes(MetodoDePago))
        return res.status(400).json({
            error: "MetodoDePago debe ser 'Tarjeta' o 'Transferencia'."
        });

    // IC-10: Validar estado del pago
    if (!ESTADOS_VALIDOS.includes(Estado))
        return res.status(400).json({
            error: "Estado debe ser 'Pendiente', 'Completado' o 'Rechazado'."
        });

    try {
        // Validación de monto: debe coincidir con el Total del pedido
        // para garantizar consistencia entre Pedido y Pago.
        const [pedidos] = await db.query(
            'SELECT Total FROM pedido WHERE IdPedido = ?', [PedidoIdPedido]
        );
        if (pedidos.length === 0)
            return res.status(404).json({ error: 'El pedido no existe.' });

        const totalPedido = parseFloat(pedidos[0].Total);
        const montoPago   = parseFloat(Monto);

        if (montoPago !== totalPedido)
            return res.status(400).json({
                error: `El monto $${montoPago} no coincide con el total del pedido $${totalPedido}.`
            });

        const [resultado] = await db.query(
            'INSERT INTO pago (FechaPago, Monto, MetodoDePago, Estado, PedidoIdPedido) VALUES (?, ?, ?, ?, ?)',
            [FechaPago, Monto, MetodoDePago, Estado, PedidoIdPedido]
        );
        res.status(201).json({ mensaje: 'Pago registrado.', id: resultado.insertId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// BAJA — Eliminar un pago por ID
// El pago no tiene registros hijos; se borra directamente.
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const [resultado] = await db.query(
            'DELETE FROM pago WHERE IdPago = ?', [req.params.id]
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Pago no encontrado.' });
        res.json({ mensaje: `Pago ${req.params.id} eliminado.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CAMBIO — Actualizar campos de un pago
// Reglas de integridad aplicadas:
//   · MetodoDePago revalidado si se incluye en el body      (IC-3)
//   · Estado revalidado si se incluye en el body            (IC-10)
// Los campos vacíos se filtran antes de construir el UPDATE
// para no sobreescribir valores existentes con cadenas vacías.
// Monto se convierte a número porque llega como string desde
// el formulario HTML.
// ============================================================
router.put('/:id', async (req, res) => {
    const campos = req.body;

    // Filtrar campos vacíos o nulos enviados desde el formulario
    const claves = Object.keys(campos).filter(k => campos[k] !== '' && campos[k] !== null);
    const camposFiltrados = {};
    claves.forEach(k => camposFiltrados[k] = campos[k]);

    if (claves.length === 0)
        return res.status(400).json({ error: 'No se enviaron campos.' });

    // IC-3: Revalidar método de pago si se incluye
    if (camposFiltrados.MetodoDePago && !METODOS_VALIDOS.includes(camposFiltrados.MetodoDePago))
        return res.status(400).json({
            error: "MetodoDePago debe ser 'Tarjeta' o 'Transferencia'."
        });

    // IC-10: Revalidar estado del pago si se incluye
    if (camposFiltrados.Estado && !ESTADOS_VALIDOS.includes(camposFiltrados.Estado))
        return res.status(400).json({
            error: "Estado debe ser 'Pendiente', 'Completado' o 'Rechazado'."
        });

    // Convertir Monto a número para que MySQL lo trate como DOUBLE
    if (camposFiltrados.Monto)
        camposFiltrados.Monto = parseFloat(camposFiltrados.Monto);

    const setSQL  = Object.keys(camposFiltrados).map(c => `${c} = ?`).join(', ');
    const valores = [...Object.values(camposFiltrados), req.params.id];

    try {
        const [resultado] = await db.query(
            `UPDATE pago SET ${setSQL} WHERE IdPago = ?`, valores
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Pago no encontrado.' });
        res.json({ mensaje: `Pago ${req.params.id} actualizado.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;