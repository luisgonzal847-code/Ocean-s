const mysql = require('mysql2');

const conexion = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'tienda_online',
    port:     process.env.DB_PORT     || 3306,
});

conexion.getConnection((err, conn) => {
    if (err) {
        console.error('Error al conectar con MySQL:', err.message);
        return;
    }
    console.log('Conexión exitosa con la base de datos tienda_online');
    conn.release();
});

module.exports = conexion.promise();