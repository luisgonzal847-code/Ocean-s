const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// REGEX DE VALIDACIÓN
// Formato básico de correo electrónico utilizado en alta y cambio.
// La restricción UNIQUE del correo está definida en la BD       (IC-1)
// y también se captura en el catch (errno 1062 = duplicado).
// ============================================================
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// LISTAR — Obtener todos los clientes
// Usado por el frontend para poblar selects dinámicos.
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT IdCliente, Nombre, Correo FROM Cliente ORDER BY Nombre'
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Registrar nuevo cliente
// Regla de integridad aplicada:
//   · Correo debe ser único en la relación                  (IC-1)
//     (garantizado por UNIQUE en BD + verificación en catch)
// También valida el formato del correo antes del INSERT.
// ============================================================
router.post('/', async (req, res) => {
    const { Nombre, Telefono, Correo, Fecha_Registro } = req.body;

    if (!Nombre || !Telefono || !Correo || !Fecha_Registro)
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });

    if (!REGEX_CORREO.test(Correo))
        return res.status(400).json({ error: 'El formato del correo no es válido.' });

    try {
        const [resultado] = await db.query(
            'INSERT INTO Cliente (Nombre, Telefono, Correo, Fecha_Registro) VALUES (?, ?, ?, ?)',
            [Nombre, Telefono, Correo, Fecha_Registro]
        );
        res.status(201).json({ mensaje: 'Cliente registrado.', id: resultado.insertId });
    } catch (error) {
        // IC-1: MySQL lanza errno 1062 cuando se viola la restricción UNIQUE de Correo
        if (error.errno === 1062)
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// BAJA — Eliminar cliente y sus pedidos en cascada
// Antes de borrar al cliente se eliminan en orden:
//   Contiene → Pago → Envio → Pedido → Cliente
// para respetar las restricciones de clave foránea.
// ============================================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Obtener los IDs de los pedidos del cliente para la cascada
        const [pedidos] = await db.query(
            'SELECT IdPedido FROM Pedido WHERE ClienteIdCliente = ?', [id]
        );
        const pedidoIds = pedidos.map(p => p.IdPedido);

        if (pedidoIds.length > 0) {
            const ph = pedidoIds.map(() => '?').join(',');
            await db.query(`DELETE FROM Contiene WHERE PedidoIdPedido IN (${ph})`, pedidoIds);
            await db.query(`DELETE FROM Pago    WHERE PedidoIdPedido IN (${ph})`, pedidoIds);
            await db.query(`DELETE FROM Envio   WHERE PedidoIdPedido IN (${ph})`, pedidoIds);
            await db.query(`DELETE FROM Pedido  WHERE ClienteIdCliente = ?`, [id]);
        }

        const [resultado] = await db.query('DELETE FROM Cliente WHERE IdCliente = ?', [id]);
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.json({ mensaje: `Cliente ${id} eliminado junto con sus pedidos.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CAMBIO — Actualizar datos del cliente
// Regla de integridad aplicada:
//   · Si se modifica Correo, sigue siendo único             (IC-1)
//     (UNIQUE en BD + errno 1062 en catch)
// También revalida el formato del correo si se incluye.
// ============================================================
router.put('/:id', async (req, res) => {
    const campos = req.body;
    const claves = Object.keys(campos);
    if (claves.length === 0)
        return res.status(400).json({ error: 'No se enviaron campos.' });

    if (campos.Correo && !REGEX_CORREO.test(campos.Correo))
        return res.status(400).json({ error: 'El formato del correo no es válido.' });

    const setSQL  = claves.map(c => `${c} = ?`).join(', ');
    const valores = [...Object.values(campos), req.params.id];
    try {
        const [resultado] = await db.query(
            `UPDATE Cliente SET ${setSQL} WHERE IdCliente = ?`, valores
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.json({ mensaje: `Cliente ${req.params.id} actualizado.` });
    } catch (error) {
        // IC-1: Capturar intento de actualizar Correo a uno ya existente
        if (error.errno === 1062)
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
