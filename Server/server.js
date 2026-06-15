const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();

app.use(cors());
app.use(express.json());

// ============================================================
// ARCHIVOS ESTATICOS
// __dirname apunta a la carpeta Server/, entonces subimos
// un nivel con '..' para llegar a la raiz del proyecto
// y de ahi entramos a Public/
// ============================================================
app.use(express.static(path.join(__dirname, '..', 'Public')));

// ── RUTAS ABC ────────────────────────────────────────────────
app.use('/api/categoria',  require('./Routes/categoria'));
app.use('/api/producto',   require('./Routes/producto'));
app.use('/api/cliente',    require('./Routes/cliente'));
app.use('/api/pedido',     require('./Routes/pedido'));
app.use('/api/contiene',   require('./Routes/contiene'));
app.use('/api/envio',      require('./Routes/envio'));
app.use('/api/pago',       require('./Routes/pago'));

// ── RUTAS CONSULTAS ──────────────────────────────────────────
app.use('/api/consultas',  require('./Routes/consultas'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});