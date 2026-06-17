const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// CONSTANTES DE INTEGRIDAD
// "El estado de un producto solo acepta los valores
//  'Disponible' o 'No disponible'."                          (IC-5)
// ============================================================
const ESTADOS_VALIDOS = ['Disponible', 'No disponible'];

// ============================================================
// LISTAR — Obtener productos disponibles para selects
// Solo devuelve los productos con Estado = 'Disponible' para
// poblar los selects del frontend al agregar items a pedidos.
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT IdProducto, Nombre, Precio FROM producto WHERE Estado = 'Disponible' ORDER BY Nombre"
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Crear un producto
// Regla de integridad aplicada:
//   · Estado solo acepta 'Disponible' o 'No disponible'     (IC-5)
// ============================================================
router.post('/', async (req, res) => {
    const { Nombre, Precio, Estado, CategoriaIdCategoria } = req.body;

    if (!Nombre || !Precio || !Estado || !CategoriaIdCategoria)
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });

    // IC-5: Validar estado del producto
    if (!ESTADOS_VALIDOS.includes(Estado))
        return res.status(400).json({
            error: "Estado debe ser 'Disponible' o 'No disponible'."
        });

    try {
        const [resultado] = await db.query(
            'INSERT INTO producto (Nombre, Precio, Estado, CategoriaIdCategoria) VALUES (?, ?, ?, ?)',
            [Nombre, Precio, Estado, CategoriaIdCategoria]
        );
        res.status(201).json({ mensaje: 'Producto creado.', id: resultado.insertId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// BAJA — Eliminar producto y sus apariciones en Contiene
// Se eliminan primero los registros de Contiene para cumplir
// las restricciones de clave foránea antes de borrar el producto.
// ============================================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await db.query('DELETE FROM contiene WHERE ProductoIdProducto = ?', [id]);
        const [resultado] = await db.query('DELETE FROM producto WHERE IdProducto = ?', [id]);
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json({ mensaje: `Producto ${id} eliminado junto con sus registros en pedidos.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// CAMBIO — Actualizar datos del producto
// Regla de integridad aplicada:
//   · Si se modifica Estado, debe ser uno de los válidos    (IC-5)
// ============================================================
router.put('/:id', async (req, res) => {
    const campos = req.body;
    const claves = Object.keys(campos);
    if (claves.length === 0)
        return res.status(400).json({ error: 'No se enviaron campos.' });

    // IC-5: Revalidar estado si se incluye en la actualización
    if (campos.Estado && !ESTADOS_VALIDOS.includes(campos.Estado))
        return res.status(400).json({
            error: "Estado debe ser 'Disponible' o 'No disponible'."
        });

    const setSQL  = claves.map(c => `${c} = ?`).join(', ');
    const valores = [...Object.values(campos), req.params.id];
    try {
        const [resultado] = await db.query(
            `UPDATE producto SET ${setSQL} WHERE IdProducto = ?`, valores
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json({ mensaje: `Producto ${req.params.id} actualizado.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;