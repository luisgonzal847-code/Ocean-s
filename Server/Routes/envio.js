const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// CONSTANTES DE INTEGRIDAD
// Estados del pedido que permiten la creación de un envío   (IC-2)
// Estados válidos del propio envío                          (IC-9)
// ============================================================
const ESTADOS_PEDIDO_PERMITIDOS = ['Confirmado', 'Pagado'];
const ESTADOS_ENVIO_VALIDOS     = ['En camino', 'Entregado', 'Retrasado'];

// ============================================================
// LISTAR — Obtener todos los envíos
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Envio ORDER BY IdEnvio DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Crear un envío para un pedido
// Reglas de integridad aplicadas:
//   · El pedido debe estar 'Confirmado' o 'Pagado'          (IC-2)
//   · Estado del envío solo acepta los tres valores válidos (IC-9)
// Se consulta el estado del pedido antes de insertar.
// ============================================================
router.post('/', async (req, res) => {
    const { Paqueteria, NoGuia, Estado, FechaEntrega, DireccionEnvio, PedidoIdPedido } = req.body;

    if (!Paqueteria || !NoGuia || !Estado || !FechaEntrega || !DireccionEnvio || !PedidoIdPedido)
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });

    // IC-9: Estado del envío debe ser uno de los tres valores válidos
    if (!ESTADOS_ENVIO_VALIDOS.includes(Estado))
        return res.status(400).json({
            error: "Estado debe ser 'En camino', 'Entregado' o 'Retrasado'."
        });

    try {
        // IC-2: Verificar estado del pedido asociado antes de crear el envío
        const [pedidos] = await db.query(
            'SELECT Estado FROM Pedido WHERE IdPedido = ?', [PedidoIdPedido]
        );
        if (pedidos.length === 0)
            return res.status(404).json({ error: 'El pedido no existe.' });
        if (!ESTADOS_PEDIDO_PERMITIDOS.includes(pedidos[0].Estado))
            return res.status(400).json({
                error: 'El pedido debe estar Confirmado o Pagado para crear un envío.'
            });

        const [resultado] = await db.query(
            'INSERT INTO Envio (Paqueteria, NoGuia, Estado, FechaEntrega, DireccionEnvio, PedidoIdPedido) VALUES (?, ?, ?, ?, ?, ?)',
            [Paqueteria, NoGuia, Estado, FechaEntrega, DireccionEnvio, PedidoIdPedido]
        );
        res.status(201).json({ mensaje: 'Envío creado.', id: resultado.insertId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// BAJA — Eliminar un envío por su ID
// El envío no tiene registros hijos; se borra directamente.
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const [resultado] = await db.query(
            'DELETE FROM Envio WHERE IdEnvio = ?', [req.params.id]
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Envío no encontrado.' });
        res.json({ mensaje: `Envío ${req.params.id} eliminado.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CAMBIO — Actualizar datos del envío
// Regla de integridad aplicada:
//   · Si se cambia Estado, debe ser uno de los tres válidos (IC-9)
// Solo se modifican los campos recibidos en el body.
// ============================================================
router.put('/:id', async (req, res) => {
    const campos = req.body;
    const claves = Object.keys(campos);
    if (claves.length === 0)
        return res.status(400).json({ error: 'No se enviaron campos.' });

    // IC-9: Revalidar Estado si se incluye en la actualización
    if (campos.Estado && !ESTADOS_ENVIO_VALIDOS.includes(campos.Estado))
        return res.status(400).json({
            error: "Estado debe ser 'En camino', 'Entregado' o 'Retrasado'."
        });

    const setSQL  = claves.map(c => `${c} = ?`).join(', ');
    const valores = [...Object.values(campos), req.params.id];
    try {
        const [resultado] = await db.query(
            `UPDATE Envio SET ${setSQL} WHERE IdEnvio = ?`, valores
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Envío no encontrado.' });
        res.json({ mensaje: `Envío ${req.params.id} actualizado.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
