"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase"; 
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

export default function AdminDashboard() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [vistaActiva, setVistaActiva] = useState("inventario");

  // --- ESTADOS: INVENTARIO ---
  const [productos, setProductos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [tipoOferta, setTipoOferta] = useState("ninguna"); 
  const [cantidadOferta, setCantidadOferta] = useState(""); 
  const [precioOferta, setPrecioOferta] = useState("");     
  
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editTipoOferta, setEditTipoOferta] = useState("ninguna");
  const [editCantidadOferta, setEditCantidadOferta] = useState(""); 
  const [editPrecioOferta, setEditPrecioOferta] = useState("");     

  // --- ESTADOS: PEDIDOS ---
  const [pedidos, setPedidos] = useState<any[]>([]); // NUEVO: Historial de pedidos
  const [subVistaPedidos, setSubVistaPedidos] = useState("nueva"); // 'nueva' o 'historial'
  const [carrito, setCarrito] = useState<any[]>([]);
  const [nombreCliente, setNombreCliente] = useState("");
  const [rutCliente, setRutCliente] = useState("");
  const [descuentoGlobal, setDescuentoGlobal] = useState(""); 
  const [estadoPago, setEstadoPago] = useState("pagado"); // NUEVO: pagado o pendiente

  // --- ESTADOS: FINANZAS ---
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [tipoMovimiento, setTipoMovimiento] = useState("egreso");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [descMovimiento, setDescMovimiento] = useState("");
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<any>(null);
  const [montoAbono, setMontoAbono] = useState("");

  // --- EFECTOS ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => setUsuario(user));
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const unsubscribeProd = onSnapshot(collection(db, "productos"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProductos(lista);
    });
    const unsubscribeFinanzas = onSnapshot(collection(db, "finanzas"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      lista.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setMovimientos(lista);
    });
    const unsubscribePedidos = onSnapshot(collection(db, "pedidos"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      lista.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setPedidos(lista);
    });

    return () => { unsubscribeProd(); unsubscribeFinanzas(); unsubscribePedidos(); };
  }, [usuario]);

  // --- LÓGICA AUTH ---
  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      setErrorLogin(error.code === 'auth/invalid-credential' ? "Credenciales incorrectas." : `Error: ${error.code}`);
    }
  };
  const cerrarSesion = async () => await signOut(auth);

  // --- LÓGICA INVENTARIO ---
  const agregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !stock) return alert("⚠️ Llena Nombre, Precio Normal y Stock.");
    const tieneOferta = tipoOferta !== "ninguna";
    try {
      await addDoc(collection(db, "productos"), { 
        nombre, precio: Number(precio), stock: Number(stock), tipoOferta: tipoOferta,
        cantidadOferta: tieneOferta ? (Number(cantidadOferta) || 0) : 0, precioOferta: tieneOferta ? (Number(precioOferta) || 0) : 0
      });
      setNombre(""); setPrecio(""); setStock(""); setCantidadOferta(""); setPrecioOferta(""); setTipoOferta("ninguna");
    } catch (error) { alert("❌ Error al guardar producto."); }
  };
  const eliminarProducto = async (id: string) => { if(window.confirm("¿Eliminar producto?")) await deleteDoc(doc(db, "productos", id)); };
  const iniciarEdicion = (prod: any) => { 
    setEditandoId(prod.id); setEditNombre(prod.nombre); setEditPrecio(prod.precio); setEditStock(prod.stock);
    setEditTipoOferta(prod.tipoOferta || "ninguna"); setEditCantidadOferta(prod.cantidadOferta || ""); setEditPrecioOferta(prod.precioOferta || "");
  };
  const cancelarEdicion = () => setEditandoId(null);
  const guardarEdicion = async (id: string) => {
    if (!editNombre || !editPrecio || !editStock) return alert("⚠️ Campos requeridos vacíos.");
    const tieneOferta = editTipoOferta !== "ninguna";
    try {
      await updateDoc(doc(db, "productos", id), { 
        nombre: editNombre, precio: Number(editPrecio), stock: Number(editStock), tipoOferta: editTipoOferta,
        cantidadOferta: tieneOferta ? (Number(editCantidadOferta) || 0) : 0, precioOferta: tieneOferta ? (Number(editPrecioOferta) || 0) : 0
      });
      setEditandoId(null);
    } catch (error) { alert("❌ Error al actualizar."); }
  };

  // --- LÓGICA PEDIDOS ---
  const calcularSubtotalItem = (item: any, cantidadSeleccionada: number) => {
    if (item.tipoOferta !== 'ninguna' && item.cantidadOferta > 0 && cantidadSeleccionada >= item.cantidadOferta) {
      if (item.tipoOferta === 'pack') {
        const packs = Math.floor(cantidadSeleccionada / item.cantidadOferta);
        const sueltos = cantidadSeleccionada % item.cantidadOferta;
        return (packs * item.precioOferta) + (sueltos * item.precio);
      } else if (item.tipoOferta === 'mayor') {
        return cantidadSeleccionada * item.precioOferta;
      }
    }
    return cantidadSeleccionada * item.precio;
  };

  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find(item => item.id === prod.id);
    if (existe) {
      if (existe.cantidad >= prod.stock) return alert(`Solo tienes ${prod.stock} unidades en stock.`);
      setCarrito(carrito.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      if (prod.stock > 0) setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const actualizarCantidadCarrito = (id: string, cantidad: string) => {
    const nuevaCantidad = parseInt(cantidad) || 0;
    setCarrito(carrito.map(item => {
      if (item.id === id) {
        if (nuevaCantidad > item.stock) {
          alert(`El stock máximo para este producto es ${item.stock}.`); return { ...item, cantidad: item.stock };
        }
        return { ...item, cantidad: nuevaCantidad };
      }
      return item;
    }).filter(item => item.cantidad > 0)); 
  };

  const removerDelCarrito = (id: string) => setCarrito(carrito.filter(item => item.id !== id));
  
  const subtotalPedido = carrito.reduce((total, item) => total + calcularSubtotalItem(item, item.cantidad), 0);
  const descuentoAplicado = Number(descuentoGlobal) || 0;
  const totalPedido = Math.max(0, subtotalPedido - descuentoAplicado); 

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    if (!nombreCliente) return alert("Ingresa el nombre del cliente");

    try {
      const fechaActual = new Date().toISOString();
      const itemsProcesados = carrito.map(item => ({ ...item, subtotalAplicado: calcularSubtotalItem(item, item.cantidad) }));

      // 1. Crear el Pedido indicando si está pagado o pendiente
      await addDoc(collection(db, "pedidos"), { 
        cliente: nombreCliente, 
        rut: rutCliente, 
        fecha: fechaActual, 
        items: itemsProcesados, 
        subtotal: subtotalPedido,
        descuentoGlobal: descuentoAplicado,
        total: totalPedido, 
        estadoPago: estadoPago // "pagado" o "pendiente"
      });
      
      // 2. Descontar Stock
      for (const item of carrito) { 
        await updateDoc(doc(db, "productos", item.id), { stock: item.stock - item.cantidad }); 
      }
      
      // 3. Registrar en Finanzas SOLO SI ESTÁ PAGADO
      if (estadoPago === "pagado") {
        await addDoc(collection(db, "finanzas"), { 
          tipo: "venta", 
          monto: totalPedido, 
          descripcion: `Venta: ${nombreCliente}`, 
          fecha: fechaActual 
        });
      }
      
      alert(estadoPago === "pagado" ? "¡Venta registrada y dinero ingresado a caja!" : "¡Pedido guardado como POR COBRAR (Pendiente)!");
      setCarrito([]); setNombreCliente(""); setRutCliente(""); setDescuentoGlobal(""); setEstadoPago("pagado");
    } catch (error) { alert("Hubo un error al registrar la venta."); }
  };

  const marcarPedidoComoPagado = async (pedido: any) => {
    if(!window.confirm(`¿Confirmas que recibiste el pago de $${pedido.total.toLocaleString("es-CL")} de ${pedido.cliente}?`)) return;

    try {
      // 1. Actualizar el estado del pedido
      await updateDoc(doc(db, "pedidos", pedido.id), { estadoPago: "pagado" });
      
      // 2. Ingresar el dinero a las finanzas
      await addDoc(collection(db, "finanzas"), { 
        tipo: "venta", 
        monto: pedido.total, 
        descripcion: `Pago de pedido pendiente: ${pedido.cliente}`, 
        fecha: new Date().toISOString() 
      });
      
      alert("¡Pago registrado correctamente!");
    } catch (error) {
      alert("Error al actualizar el pago.");
    }
  };

  const eliminarPedido = async (id: string) => {
    if(window.confirm("¿Eliminar este pedido del historial? (Ojo: El dinero ya registrado en finanzas o el stock descontado no se revertirán automáticamente)")) {
        await deleteDoc(doc(db, "pedidos", id));
    }
  };

  // --- LÓGICA FINANZAS ---
  const agregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoMovimiento || !descMovimiento) return alert("⚠️ Llena el monto y la descripción.");
    try {
      await addDoc(collection(db, "finanzas"), { tipo: tipoMovimiento, monto: Number(montoMovimiento), descripcion: descMovimiento, fecha: new Date().toISOString() });
      setMontoMovimiento(""); setDescMovimiento(""); setTipoMovimiento("egreso");
    } catch (error) { alert("❌ Error al registrar."); }
  };
  const eliminarMovimiento = async (id: string) => { if(window.confirm("¿Eliminar registro?")) await deleteDoc(doc(db, "finanzas", id)); };
  
  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoAbono || Number(montoAbono) <= 0) return alert("Ingresa un monto válido");
    if (Number(montoAbono) > prestamoSeleccionado.restante) return alert("El abono no puede ser mayor a la deuda restante");
    try {
      await addDoc(collection(db, "finanzas"), { tipo: "cuota", monto: Number(montoAbono), descripcion: `Abono a: ${prestamoSeleccionado.descripcion}`, prestamoId: prestamoSeleccionado.id, fecha: new Date().toISOString() });
      setPrestamoSeleccionado(null); setMontoAbono(""); alert("Abono registrado con éxito");
    } catch (error) { alert("Error al registrar el abono."); }
  };

  const ventasYOtrosIngresos = movimientos.filter(m => ['ingreso', 'venta'].includes(m.tipo)).reduce((acc, curr) => acc + curr.monto, 0);
  const gastosOperativos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0);
  
  const prestamosActivos = movimientos.filter(m => m.tipo === 'prestamo').map(prestamo => {
    const pagado = movimientos.filter(m => m.tipo === 'cuota' && m.prestamoId === prestamo.id).reduce((acc, curr) => acc + curr.monto, 0);
    return { ...prestamo, pagado: pagado, restante: prestamo.monto - pagado };
  }).filter(p => p.restante > 0); 
  
  const deudaTotalAcumulada = prestamosActivos.reduce((acc, curr) => acc + curr.restante, 0);
  const saldoNetoCalculado = ventasYOtrosIngresos - gastosOperativos - deudaTotalAcumulada;

  // Cuentas por Cobrar (Suma de pedidos pendientes)
  const dineroEnLaCalle = pedidos.filter(p => p.estadoPago === 'pendiente').reduce((acc, curr) => acc + curr.total, 0);

  // ==========================================
  // RENDERIZADO (LOGIN)
  // ==========================================
  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 font-sans">
        <form onSubmit={iniciarSesion} className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-6 border-t-4 border-orange-500">
          <div className="text-center mb-2"><h2 className="text-3xl font-extrabold text-stone-800">Administración</h2><p className="text-sm text-stone-500 mt-2 font-medium">Villagra & Méndez</p></div>
          <div className="flex flex-col gap-4">
            <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
          </div>
          {errorLogin && <p className="text-red-600 text-sm bg-red-100 p-2 rounded-md font-bold">{errorLogin}</p>}
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg shadow-md">Ingresar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-800 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-stone-800 bg-stone-950">
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><span className="text-orange-500">V&M</span></h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-semibold">Panel de Control</p>
        </div>
        <nav className="flex-1 p-4 space-y-3">
          <button onClick={() => setVistaActiva('inventario')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${vistaActiva === 'inventario' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-stone-800 hover:text-orange-400'}`}>📦 Inventario</button>
          <button onClick={() => setVistaActiva('pedidos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${vistaActiva === 'pedidos' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-stone-800 hover:text-orange-400'}`}>📝 Pedidos</button>
          <button onClick={() => setVistaActiva('finanzas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${vistaActiva === 'finanzas' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-stone-800 hover:text-orange-400'}`}>💰 Finanzas</button>
        </nav>
        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <button onClick={cerrarSesion} className="w-full text-center px-4 py-3 text-sm font-bold text-stone-400 hover:text-white bg-stone-800 hover:bg-red-600 rounded-lg transition-colors">Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-stone-200 px-8 py-5 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-stone-800 capitalize flex items-center gap-3">
            {vistaActiva === 'inventario' && <><span className="bg-orange-100 text-orange-600 p-2 rounded-lg">📦</span> Inventario</>}
            {vistaActiva === 'pedidos' && <><span className="bg-orange-100 text-orange-600 p-2 rounded-lg">📝</span> Punto de Venta</>}
            {vistaActiva === 'finanzas' && <><span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">💰</span> Finanzas</>}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {/* MÓDULO: INVENTARIO */}
          {vistaActiva === 'inventario' && (
            <div className="max-w-7xl mx-auto space-y-8">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 className="text-lg font-bold text-stone-800 mb-5 text-orange-600">Agregar Insumo o Producto</h3>
                <form onSubmit={agregarProducto} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-stone-500 mb-1">Nombre *</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">Precio Normal *</label>
                    <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">Stock *</label>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" />
                  </div>
                  
                  <div className={`${tipoOferta !== 'ninguna' ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'} p-3 rounded-lg border md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 transition-colors`}>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${tipoOferta !== 'ninguna' ? 'text-orange-700' : 'text-stone-500'}`}>Tipo de Oferta</label>
                      <select value={tipoOferta} onChange={(e) => setTipoOferta(e.target.value)} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 bg-white font-bold outline-none cursor-pointer ${tipoOferta !== 'ninguna' ? 'border-orange-300 text-stone-900' : 'border-stone-300 text-stone-600'}`}>
                        <option value="ninguna">❌ Sin Oferta (Precio Normal)</option>
                        <option value="mayor">Por Mayor (Ej: Sobre 6 a $1700 c/u)</option>
                        <option value="pack">Por Pack (Ej: 3 por $1000)</option>
                      </select>
                    </div>
                    {tipoOferta !== 'ninguna' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-orange-700 mb-1">Cantidad para Activar</label>
                          <input type="number" placeholder="Ej: 3 o 6" value={cantidadOferta} onChange={(e) => setCantidadOferta(e.target.value)} className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-orange-700 mb-1">{tipoOferta === 'pack' ? 'Precio Total del Pack ($)' : 'Nuevo Precio Unitario ($)'}</label>
                          <input type="number" placeholder={tipoOferta === 'pack' ? 'Ej: 1000' : 'Ej: 1700'} value={precioOferta} onChange={(e) => setPrecioOferta(e.target.value)} className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" />
                        </div>
                      </>
                    )}
                  </div>
                  <button type="submit" className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-8 py-3 rounded-xl shadow-md h-[42px] flex items-center justify-center">Guardar</button>
                </form>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 text-sm uppercase font-bold tracking-wider">
                    <tr><th className="px-6 py-5">Nombre</th><th className="px-6 py-5">P. Normal</th><th className="px-6 py-5">Stock</th><th className="px-6 py-5 bg-orange-50">Regla de Oferta</th><th className="px-6 py-5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {productos.map((producto) => (
                      <tr key={producto.id} className="hover:bg-amber-50/50">
                        {editandoId === producto.id ? (
                          <>
                            <td className="px-4 py-3"><input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full px-2 py-1 border border-stone-400 rounded focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" /></td>
                            <td className="px-4 py-3"><input type="number" value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)} className="w-24 px-2 py-1 border border-stone-400 rounded focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" /></td>
                            <td className="px-4 py-3"><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-20 px-2 py-1 border border-stone-400 rounded focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" /></td>
                            <td className={`px-4 py-3 flex gap-2 items-center ${editTipoOferta !== 'ninguna' ? 'bg-orange-50' : ''}`}>
                                <select value={editTipoOferta} onChange={(e) => setEditTipoOferta(e.target.value)} className={`px-1 py-1 border rounded outline-none text-xs font-bold ${editTipoOferta !== 'ninguna' ? 'border-orange-300' : 'border-stone-300 text-stone-500'}`}>
                                  <option value="ninguna">Sin Oferta</option>
                                  <option value="mayor">Mayor</option>
                                  <option value="pack">Pack</option>
                                </select>
                                {editTipoOferta !== 'ninguna' && (
                                  <>
                                    <input type="number" placeholder="Cant." value={editCantidadOferta} onChange={(e) => setEditCantidadOferta(e.target.value)} className="w-14 px-1 py-1 border border-orange-300 rounded outline-none text-sm" />
                                    <input type="number" placeholder="$" value={editPrecioOferta} onChange={(e) => setEditPrecioOferta(e.target.value)} className="w-20 px-1 py-1 border border-orange-300 rounded outline-none text-sm" />
                                  </>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => guardarEdicion(producto.id)} className="bg-emerald-500 text-white font-bold px-3 py-1 rounded mr-2">✔</button>
                              <button onClick={cancelarEdicion} className="bg-stone-200 text-stone-700 font-bold px-3 py-1 rounded">✖</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-medium">{producto.nombre}</td>
                            <td className="px-6 py-5 font-semibold">${producto.precio.toLocaleString("es-CL")}</td>
                            <td className="px-6 py-5"><span className={`px-3 py-1.5 rounded-full text-xs font-bold ${producto.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>{producto.stock} uds</span></td>
                            <td className={`px-6 py-5 ${producto.tipoOferta !== 'ninguna' && producto.cantidadOferta > 0 ? 'bg-orange-50/30' : ''}`}>
                                {producto.tipoOferta !== 'ninguna' && producto.cantidadOferta > 0 ? (
                                    <span className="text-xs font-bold text-orange-700">
                                      {producto.tipoOferta === 'pack' 
                                        ? `📦 Pack: ${producto.cantidadOferta}x por $${producto.precioOferta.toLocaleString("es-CL")}`
                                        : `🏷️ Mayor: ${producto.cantidadOferta}+ a $${producto.precioOferta.toLocaleString("es-CL")} c/u`}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-stone-400">Sin oferta</span>
                                )}
                            </td>
                            <td className="px-6 py-5 text-right gap-3 flex justify-end">
                              <button onClick={() => iniciarEdicion(producto)} className="text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg font-bold">Editar</button>
                              <button onClick={() => eliminarProducto(producto.id)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg font-bold">Borrar</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* MÓDULO: PEDIDOS */}
          {vistaActiva === 'pedidos' && (
             <div className="max-w-7xl mx-auto">
               
               {/* Pestañas de Navegación dentro de Pedidos */}
               <div className="flex gap-4 mb-6 border-b border-stone-200 pb-2">
                 <button 
                   onClick={() => setSubVistaPedidos('nueva')} 
                   className={`px-6 py-2 rounded-t-lg font-bold text-lg transition-colors ${subVistaPedidos === 'nueva' ? 'bg-orange-600 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                 >
                   🛍️ Nueva Venta
                 </button>
                 <button 
                   onClick={() => setSubVistaPedidos('historial')} 
                   className={`px-6 py-2 rounded-t-lg font-bold text-lg transition-colors ${subVistaPedidos === 'historial' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                 >
                   📋 Historial y Por Cobrar
                 </button>
               </div>

               {/* SUBVISTA: NUEVA VENTA */}
               {subVistaPedidos === 'nueva' && (
                 <div className="flex flex-col lg:flex-row gap-8">
                   <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                     <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Seleccionar Productos</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                       {productos.map(prod => (
                         <div key={prod.id} className="border border-stone-200 p-4 rounded-xl hover:border-orange-500 flex flex-col justify-between bg-stone-50 transition-colors">
                           <div>
                             <h4 className="font-bold text-stone-800">{prod.nombre}</h4>
                             <p className="text-orange-600 font-black text-lg">${prod.precio.toLocaleString("es-CL")}</p>
                             {prod.tipoOferta !== 'ninguna' && prod.cantidadOferta > 0 && (
                                <p className="text-xs font-bold text-orange-700 mt-1 bg-orange-100 inline-block px-2 py-0.5 rounded border border-orange-200">
                                    {prod.tipoOferta === 'pack' ? `📦 Llevas ${prod.cantidadOferta} por $${prod.precioOferta.toLocaleString("es-CL")}` : `🔥 Llevas ${prod.cantidadOferta}+ a $${prod.precioOferta.toLocaleString("es-CL")} c/u`}
                                </p>
                             )}
                           </div>
                           <div className="mt-4 flex justify-between items-center">
                             <span className="text-xs font-bold text-stone-500">Stock: {prod.stock}</span>
                             <button onClick={() => agregarAlCarrito(prod)} disabled={prod.stock <= 0} className={`px-4 py-2 rounded-lg font-bold text-sm ${prod.stock > 0 ? 'bg-stone-800 hover:bg-stone-900 text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>+ Agregar</button>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="w-full lg:w-[450px] bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col h-fit">
                     <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Detalle del Pedido</h3>
                     
                     <div className="mb-4 space-y-3">
                       <input type="text" placeholder="Nombre Cliente *" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none text-sm" />
                       <input type="text" placeholder="RUT (Opcional)" value={rutCliente} onChange={(e) => setRutCliente(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none text-sm" />
                     </div>

                     <div className="flex-1 overflow-y-auto mb-4 min-h-[150px] border-b border-stone-100 pb-2">
                       {carrito.length === 0 ? (
                         <p className="text-stone-400 text-sm text-center mt-10 italic">Añade productos para comenzar</p>
                       ) : (
                         <ul className="space-y-4">
                           {carrito.map((item) => {
                             const subtotalCalculado = calcularSubtotalItem(item, item.cantidad);
                             const enOferta = item.tipoOferta !== 'ninguna' && item.cantidadOferta > 0 && item.cantidad >= item.cantidadOferta;

                             return (
                               <li key={item.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${enOferta ? 'bg-orange-50 border-orange-300 shadow-sm' : 'bg-stone-50 border-stone-200'}`}>
                                 <div className="flex justify-between items-start">
                                   <p className="font-bold text-stone-800 text-sm leading-tight flex-1">{item.nombre}</p>
                                   <button onClick={() => removerDelCarrito(item.id)} className="text-red-500 hover:bg-red-100 px-2 rounded font-bold ml-2">✖</button>
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <div className="flex items-center gap-1 bg-white border border-stone-300 rounded">
                                     <button onClick={() => actualizarCantidadCarrito(item.id, String(item.cantidad - 1))} className="px-2 py-1 text-stone-600 hover:bg-stone-100 font-bold">-</button>
                                     <input type="number" value={item.cantidad} onChange={(e) => actualizarCantidadCarrito(item.id, e.target.value)} className="w-10 text-center py-1 bg-transparent font-bold text-sm outline-none text-stone-800" />
                                     <button onClick={() => actualizarCantidadCarrito(item.id, String(item.cantidad + 1))} className="px-2 py-1 text-stone-600 hover:bg-stone-100 font-bold">+</button>
                                   </div>
                                   <div className="text-right">
                                     {enOferta && <p className="text-xs text-stone-400 line-through">${(item.precio * item.cantidad).toLocaleString("es-CL")}</p>}
                                     <span className={`font-black ${enOferta ? 'text-orange-700 text-lg' : 'text-stone-800'}`}>${subtotalCalculado.toLocaleString("es-CL")}</span>
                                   </div>
                                 </div>
                               </li>
                             );
                           })}
                         </ul>
                       )}
                     </div>

                     <div className="pt-2">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-stone-500">Subtotal:</span>
                         <span className="text-sm font-bold text-stone-800">${subtotalPedido.toLocaleString("es-CL")}</span>
                       </div>
                       
                       <div className="flex justify-between items-center mb-4">
                         <span className="text-sm font-bold text-orange-600">Descuento Global ($):</span>
                         <input type="number" placeholder="0" value={descuentoGlobal} onChange={(e) => setDescuentoGlobal(e.target.value)} className="w-24 px-2 py-1 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 bg-orange-50 text-orange-800 font-bold outline-none text-right" />
                       </div>

                       <div className="flex justify-between items-center mb-4 pt-3 border-t border-stone-200">
                         <span className="text-lg font-bold text-stone-800">Total Final:</span>
                         <span className="text-3xl font-black text-orange-600">${totalPedido.toLocaleString("es-CL")}</span>
                       </div>

                       {/* NUEVO: SELECTOR DE ESTADO DE PAGO */}
                       <div className="bg-stone-100 p-3 rounded-lg border border-stone-300 mb-4">
                          <label className="block text-xs font-bold text-stone-600 mb-2 uppercase tracking-wide">Estado del Pago</label>
                          <div className="flex gap-2">
                            <button onClick={() => setEstadoPago('pagado')} className={`flex-1 py-2 rounded font-bold text-sm transition-colors ${estadoPago === 'pagado' ? 'bg-emerald-500 text-white shadow' : 'bg-white text-stone-500 border border-stone-300'}`}>✅ Pagado</button>
                            <button onClick={() => setEstadoPago('pendiente')} className={`flex-1 py-2 rounded font-bold text-sm transition-colors ${estadoPago === 'pendiente' ? 'bg-red-500 text-white shadow' : 'bg-white text-stone-500 border border-stone-300'}`}>⏳ Fiado (Por Cobrar)</button>
                          </div>
                       </div>

                       <button onClick={procesarVenta} className={`w-full text-white font-bold py-3 rounded-xl shadow-md transition-colors text-lg ${estadoPago === 'pagado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-stone-800 hover:bg-stone-900'}`}>
                         {estadoPago === 'pagado' ? 'Confirmar Venta y Cobrar' : 'Guardar Venta Pendiente'}
                       </button>
                     </div>
                   </div>
                 </div>
               )}

               {/* SUBVISTA: HISTORIAL Y POR COBRAR */}
               {subVistaPedidos === 'historial' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                   <div className="px-6 py-5 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                     <h3 className="font-bold text-stone-800 text-lg">Registro de Pedidos</h3>
                   </div>
                   
                   <table className="w-full text-left">
                     <thead className="bg-stone-100 border-b border-stone-200 text-stone-500 text-sm uppercase font-bold tracking-wider">
                       <tr>
                         <th className="px-6 py-4">Fecha</th>
                         <th className="px-6 py-4">Cliente</th>
                         <th className="px-6 py-4">Total</th>
                         <th className="px-6 py-4">Estado de Pago</th>
                         <th className="px-6 py-4 text-right">Acciones</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-stone-100">
                       {pedidos.map((ped) => {
                         const date = new Date(ped.fecha);
                         return (
                           <tr key={ped.id} className={`hover:bg-stone-50 transition-colors ${ped.estadoPago === 'pendiente' ? 'bg-red-50/30' : ''}`}>
                             <td className="px-6 py-4 text-sm text-stone-600">{date.toLocaleDateString("es-CL")} {date.toLocaleTimeString("es-CL", {hour: '2-digit', minute:'2-digit'})}</td>
                             <td className="px-6 py-4 font-bold text-stone-800">{ped.cliente}</td>
                             <td className="px-6 py-4 font-black text-stone-800">${ped.total.toLocaleString("es-CL")}</td>
                             <td className="px-6 py-4">
                               {ped.estadoPago === 'pagado' ? (
                                 <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">✅ Pagado</span>
                               ) : (
                                 <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200 flex items-center w-fit gap-1">
                                   ⏳ Por Cobrar
                                 </span>
                               )}
                             </td>
                             <td className="px-6 py-4 text-right">
                               {ped.estadoPago === 'pendiente' && (
                                 <button onClick={() => marcarPedidoComoPagado(ped)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-sm mr-3 transition-colors shadow-sm">
                                   💰 Cobrar
                                 </button>
                               )}
                               <button onClick={() => eliminarPedido(ped.id)} className="text-red-400 hover:text-red-600 font-bold p-2">✖</button>
                             </td>
                           </tr>
                         );
                       })}
                       {pedidos.length === 0 && (
                         <tr><td colSpan={5} className="px-6 py-10 text-center text-stone-500 italic">No hay pedidos registrados.</td></tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          )}

          {/* MÓDULO: FINANZAS */}
          {vistaActiva === 'finanzas' && (
            <div className="max-w-6xl mx-auto space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-8 rounded-3xl shadow-lg border-2 flex flex-col justify-center relative overflow-hidden ${saldoNetoCalculado >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'}`}>
                  <h4 className="text-sm font-bold uppercase tracking-widest relative z-10 text-stone-600">Balance Neto Disponible</h4>
                  <p className={`text-6xl font-black mt-2 relative z-10 tracking-tight ${saldoNetoCalculado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {saldoNetoCalculado < 0 ? '-' : ''}${Math.abs(saldoNetoCalculado).toLocaleString("es-CL")}
                  </p>
                  <p className="text-xs mt-3 font-bold relative z-10 text-stone-500">
                    * Cálculo: Ventas e Ingresos - Egresos - Total Préstamos Activos
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">Ventas y Extras</h4>
                    <p className="text-2xl font-black mt-1 text-emerald-600">${ventasYOtrosIngresos.toLocaleString("es-CL")}</p>
                  </div>
                  {/* NUEVA TARJETA: CUENTAS POR COBRAR */}
                  <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-200 flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">Cuentas Por Cobrar</h4>
                    <p className="text-2xl font-black mt-1 text-red-700">${dineroEnLaCalle.toLocaleString("es-CL")}</p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-200 flex flex-col justify-center col-span-2">
                    <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wide">Deuda Total Préstamos Pendientes</h4>
                    <p className="text-2xl font-black mt-1 text-orange-700">${deudaTotalAcumulada.toLocaleString("es-CL")}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <h3 className="text-lg font-bold text-stone-800 mb-5 border-b pb-2">Registrar Movimiento Libre</h3>
                  <form onSubmit={agregarMovimiento} className="flex flex-col gap-4">
                    <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className="px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-bold outline-none cursor-pointer">
                      <option value="egreso">💸 Gasto General (Egreso)</option>
                      <option value="ingreso">💰 Ingreso Extra</option>
                      <option value="prestamo">🏦 Tomar Nuevo Préstamo</option>
                    </select>
                    <input type="number" placeholder="Monto ($)" value={montoMovimiento} onChange={(e) => setMontoMovimiento(e.target.value)} className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                    <input type="text" placeholder="Descripción breve" value={descMovimiento} onChange={(e) => setDescMovimiento(e.target.value)} className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                    <button type="submit" className="bg-stone-800 hover:bg-stone-900 text-white font-bold py-3 rounded-xl shadow-md">Registrar Movimiento</button>
                  </form>
                </section>

                <section className="bg-stone-100 p-6 rounded-2xl shadow-inner border border-stone-200">
                  <h3 className="text-lg font-bold text-stone-800 mb-5 border-b border-stone-300 pb-2">Gestión de Préstamos Activos</h3>
                  {prestamosActivos.length === 0 ? (
                    <p className="text-stone-500 text-sm italic text-center py-4">No tienes préstamos pendientes de pago.</p>
                  ) : (
                    <div className="space-y-4">
                      {prestamosActivos.map(p => (
                        <div key={p.id} className="bg-white border border-stone-300 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-stone-800">{p.descripcion}</p>
                              <p className="text-xs text-stone-500">Monto Original: ${p.monto.toLocaleString("es-CL")}</p>
                            </div>
                            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">Deuda: ${p.restante.toLocaleString("es-CL")}</span>
                          </div>
                          {prestamoSeleccionado?.id === p.id ? (
                            <form onSubmit={registrarAbono} className="flex gap-2 mt-2">
                              <input type="number" placeholder="Monto a abonar" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="flex-1 px-3 py-2 border border-stone-300 rounded focus:ring-2 focus:ring-orange-500 text-sm bg-white outline-none" max={p.restante} />
                              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded text-sm transition-colors">Guardar</button>
                              <button type="button" onClick={() => {setPrestamoSeleccionado(null); setMontoAbono("")}} className="bg-stone-300 hover:bg-stone-400 text-stone-700 font-bold px-3 py-2 rounded text-sm transition-colors">Cancelar</button>
                            </form>
                          ) : (
                            <button onClick={() => setPrestamoSeleccionado(p)} className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold py-2 rounded-lg text-sm transition-colors mt-1">💳 Abonar a este crédito</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50"><h3 className="font-bold text-stone-800">Historial de Transacciones</h3></div>
                <table className="w-full text-left">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-500 text-sm uppercase font-bold">
                    <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Descripción</th><th className="px-6 py-4">Tipo</th><th className="px-6 py-4 text-right">Monto</th><th className="px-6 py-4 text-center">X</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {movimientos.map((mov) => {
                      const date = new Date(mov.fecha);
                      return (
                        <tr key={mov.id} className="hover:bg-stone-50">
                          <td className="px-6 py-4 text-sm text-stone-500">{date.toLocaleDateString("es-CL")} {date.toLocaleTimeString("es-CL", {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="px-6 py-4 font-medium text-stone-800">{mov.descripcion}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${mov.tipo === 'venta' || mov.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : ''} ${mov.tipo === 'egreso' ? 'bg-red-100 text-red-800' : ''} ${mov.tipo === 'prestamo' ? 'bg-orange-100 text-orange-800' : ''} ${mov.tipo === 'cuota' ? 'bg-purple-100 text-purple-800' : ''}`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${['venta', 'ingreso', 'prestamo'].includes(mov.tipo) ? 'text-emerald-600' : 'text-red-600'}`}>
                            {['venta', 'ingreso', 'prestamo'].includes(mov.tipo) ? '+' : '-'}${mov.monto.toLocaleString("es-CL")}
                          </td>
                          <td className="px-6 py-4 text-center"><button onClick={() => eliminarMovimiento(mov.id)} className="text-red-400 hover:text-red-600 font-bold">✖</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}