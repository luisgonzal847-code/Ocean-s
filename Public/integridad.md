# Condiciones de Integridad — Ocean's Store

## 1. Condiciones Explícitas

| # | Condición | Dónde se aplica |
|---|-----------|-----------------|
| 1 | El **correo electrónico** de Cliente debe ser **único** en la relación. | `UNIQUE KEY Correo` en tabla `cliente` · validación en ruta `/api/cliente` (POST) |
| 2 | Un **envío** solo puede crearse si el pedido asociado tiene `Estado = 'Confirmado'` o `'Pagado'`. | Validación explícita en ruta `/api/envio` (POST) antes del INSERT |
| 3 | El **método de pago** solo acepta `'Tarjeta'` o `'Transferencia'`. | `CHECK (MetodoDePago IN ('Tarjeta','Transferencia'))` en tabla `pago` · validación en ruta `/api/pago` |
| 4 | Un **pedido** debe tener al menos un producto. | Validación en `confirmPayment()` del frontend: se verifica `clientState.cart.length > 0` antes de crear el pedido |
| 5 | El **estado de un producto** solo acepta `'Disponible'` o `'No disponible'`. | `CHECK (Estado IN ('Disponible','No disponible'))` en tabla `producto` · validación en ruta `/api/producto` |
| 6 | La **cantidad** en Contiene debe ser un **entero mayor a 0**. | `CHECK (Cantidad > 0)` en tabla `contiene` · `type="number" min="1"` en el carrito del cliente |
| 7 | El **subtotal** en Contiene es un valor derivado (`Cantidad × PrecioUnitario`), **no se almacena**. | No existe columna `Subtotal` en la tabla; se calcula en las consultas SQL con `Cantidad * PrecioUnitario` |
| 8 | El **estado de un pedido** solo acepta `'Pendiente'`, `'Confirmado'`, `'Pagado'` o `'Cancelado'`. | `CHECK (Estado IN (...))` en tabla `pedido` · validación en ruta `/api/pedido` |
| 9 | El **estado de un envío** solo acepta `'En camino'`, `'Entregado'` o `'Retrasado'`. | `CHECK (Estado IN (...))` en tabla `envio` · validación en ruta `/api/envio` |
| 10 | El **estado de un pago** solo acepta `'Pendiente'`, `'Completado'` o `'Rechazado'`. | `CHECK (Estado IN (...))` en tabla `pago` · validación en ruta `/api/pago` |

---

## 2. Condiciones Implícitas

### 2.1 Integridad de Entidad

| # | Condición | Implementación |
|---|-----------|----------------|
| 1 | `IdCliente` no puede ser NULL ni repetirse. | `PRIMARY KEY (IdCliente)` + `AUTO_INCREMENT` |
| 2 | `IdPedido` no puede ser NULL ni repetirse. | `PRIMARY KEY (IdPedido)` + `AUTO_INCREMENT` |
| 3 | `IdProducto` no puede ser NULL ni repetirse. | `PRIMARY KEY (IdProducto)` + `AUTO_INCREMENT` |
| 4 | `IdCategoria` no puede ser NULL ni repetirse. | `PRIMARY KEY (IdCategoria)` + `AUTO_INCREMENT` |
| 5 | `IdEnvio` no puede ser NULL ni repetirse. | `PRIMARY KEY (IdEnvio)` + `AUTO_INCREMENT` |
| 6 | `IdPago` no puede ser NULL ni repetirse. | `PRIMARY KEY (IdPago)` + `AUTO_INCREMENT` |
| 7 | La PK de Contiene es compuesta `(PedidoIdPedido, ProductoIdProducto)`, ninguno puede ser NULL ni repetirse la combinación. | `PRIMARY KEY (PedidoIdPedido, ProductoIdProducto)` |

### 2.2 Integridad Referencial

| # | Condición | Implementación |
|---|-----------|----------------|
| 1 | `ClienteIdCliente` en Pedido debe existir en Cliente. | `FOREIGN KEY (ClienteIdCliente) REFERENCES cliente(IdCliente) ON DELETE CASCADE` |
| 2 | `PedidoIdPedido` en Contiene debe existir en Pedido. | `FOREIGN KEY (PedidoIdPedido) REFERENCES pedido(IdPedido) ON DELETE CASCADE` |
| 3 | `ProductoIdProducto` en Contiene debe existir en Producto. | `FOREIGN KEY (ProductoIdProducto) REFERENCES producto(IdProducto) ON DELETE CASCADE` |
| 4 | `PedidoIdPedido` en Envio debe existir en Pedido. | `FOREIGN KEY (PedidoIdPedido) REFERENCES pedido(IdPedido) ON DELETE CASCADE` |
| 5 | `PedidoIdPedido` en Pago debe existir en Pedido. | `FOREIGN KEY (PedidoIdPedido) REFERENCES pedido(IdPedido) ON DELETE CASCADE` |
| 6 | `CategoriaIdCategoria` en Producto debe existir en Categoria. | `FOREIGN KEY (CategoriaIdCategoria) REFERENCES categoria(IdCategoria) ON DELETE CASCADE` |

> **Nota sobre ON DELETE CASCADE:** al eliminar una Categoría se eliminan sus Productos y los registros de Contiene asociados. Al eliminar un Cliente se eliminan sus Pedidos y en cascada sus Pagos, Envíos y registros de Contiene.

### 2.3 Integridad de Dominio

| # | Condición | Implementación |
|---|-----------|----------------|
| 1 | Los campos `tinyint(3)` solo aceptan enteros en su rango. | Tipo de dato definido en DDL; MySQL rechaza valores fuera de rango |
| 2 | Los campos `varchar(n)` no pueden superar su longitud máxima. | Longitudes definidas en DDL; MySQL trunca o rechaza según configuración |
| 3 | Los campos `date` solo aceptan fechas válidas `AAAA-MM-DD`. | Tipo `date` en DDL; el frontend genera la fecha con `new Date().toISOString().split('T')[0]` |
| 4 | Los campos numéricos (`double`, `int`) no aceptan texto. | Validación de tipo por MySQL y por el frontend antes de enviar al API |
| 5 | Todos los campos `NOT NULL` no pueden quedar vacíos. | `NOT NULL` en DDL + validaciones en rutas Express antes del INSERT |
| 6 | Los campos `double(5,2)` aceptan hasta 5 dígitos totales con 2 decimales. | Definición de tipo en DDL; valores fuera de rango son rechazados por MySQL |

### 2.4 Integridad de Negocio

| # | Condición | Implementación |
|---|-----------|----------------|
| 1 | Un Producto debe pertenecer obligatoriamente a una Categoría. | `CategoriaIdCategoria NOT NULL` + FK · el formulario de alta en Admin exige seleccionar categoría |
| 2 | Un Pedido debe estar asociado a un Cliente registrado. | `ClienteIdCliente NOT NULL` + FK · el flujo de compra requiere que el cliente haya iniciado sesión |
| 3 | Un Pago debe estar asociado a un Pedido existente. | FK `PedidoIdPedido` en tabla `pago` + validación en ruta `/api/pago` |
| 4 | Un Envío debe estar asociado a un Pedido existente. | FK `PedidoIdPedido` en tabla `envio` + validación en ruta `/api/envio` |
| 5 | No puede registrarse un Envío para un Pedido con Estado `'Pendiente'` o `'Cancelado'`. | Validación explícita en ruta `/api/envio` (POST): consulta el estado del pedido antes de insertar |
| 6 | El Total de un Pedido debe ser mayor o igual a 0. | El `Total` se calcula como `SUM(Cantidad × PrecioUnitario)` desde el carrito; siempre es ≥ 0 porque la cantidad mínima es 1 y el precio es positivo |

---

### Condiciones implícitas adicionales observadas en el sistema

| Condición | Tipo | Implementación |
|-----------|------|----------------|
| `Fecha_Registro` del Cliente se asigna automáticamente con la fecha del día del registro | **Implícita de negocio** | `new Date().toISOString().split('T')[0]` en `clientRegister()` — el usuario nunca la captura |
| `FechaPago` se asigna con la fecha del día en que se confirma el pago | **Implícita de negocio** | Igual que arriba, generada en `confirmPayment()` |
| `NoGuia` se genera automáticamente con formato `OC{IdPedido}{4 dígitos aleatorios}` | **Implícita de negocio** | Generada en `confirmPayment()` sin intervención del usuario |
| `FechaEntrega` del envío se calcula como fecha actual + 5 días | **Implícita de negocio** | `del.setDate(del.getDate()+5)` en `confirmPayment()` |
| El `Total` del Pedido se actualiza vía ruta PUT después de insertar todos los items de Contiene | **Implícita de proceso** | `PUT /api/pedido/:id` con `{ Total: cartTotal() }` en el flujo de checkout |
