const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ============================================================
// LISTAR — Obtener todas las categorías
// Usado por el frontend para poblar el select de Categoría
// al crear o editar un producto.
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT IdCategoria, Nombre, Descripcion FROM Categoria ORDER BY Nombre'
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// ALTA — Crear una nueva categoría
// ============================================================
router.post('/', async (req, res) => {
    const { Nombre, Descripcion } = req.body;
    if (!Nombre || !Descripcion)
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    try {
        const [resultado] = await db.query(
            'INSERT INTO Categoria (Nombre, Descripcion) VALUES (?, ?)',
            [Nombre, Descripcion]
        );
        res.status(201).json({ mensaje: 'Categoría creada.', id: resultado.insertId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================================
// BAJA — Eliminar categoría y sus productos en cascada
// Se usa una transacción para garantizar que la eliminación
// de Contiene → Producto → Categoría sea atómica; si algo
// falla, se revierte todo con rollback.
// ============================================================
router.delete('/:id', async (req, res) => {
    const id   = req.params.id;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Obtener los productos de esta categoría
        const [productos] = await conn.query(
            'SELECT IdProducto FROM Producto WHERE CategoriaIdCategoria = ?', [id]
        );
        const productoIds = productos.map(p => p.IdProducto);

        // 2. Eliminar de Contiene todos los registros que usen esos productos
        if (productoIds.length > 0) {
            await conn.query(
                `DELETE FROM Contiene WHERE ProductoIdProducto IN (${productoIds.map(() => '?').join(',')})`,
                productoIds
            );
        }

        // 3. Eliminar los productos de la categoría
        await conn.query('DELETE FROM Producto WHERE CategoriaIdCategoria = ?', [id]);

        // 4. Eliminar la categoría
        const [resultado] = await conn.query('DELETE FROM Categoria WHERE IdCategoria = ?', [id]);
        if (resultado.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        await conn.commit();
        res.json({ mensaje: `Categoría ${id} eliminada junto con sus productos.` });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
});

// ============================================================
// CAMBIO — Actualizar datos de una categoría
// Solo modifica los campos recibidos en el body.
// ============================================================
router.put('/:id', async (req, res) => {
    const campos = req.body;
    const claves = Object.keys(campos);
    if (claves.length === 0)
        return res.status(400).json({ error: 'No se enviaron campos.' });
    const setSQL  = claves.map(c => `${c} = ?`).join(', ');
    const valores = [...Object.values(campos), req.params.id];
    try {
        const [resultado] = await db.query(
            `UPDATE Categoria SET ${setSQL} WHERE IdCategoria = ?`, valores
        );
        if (resultado.affectedRows === 0)
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        res.json({ mensaje: `Categoría ${req.params.id} actualizada.` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
