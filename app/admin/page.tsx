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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editStock, setEditStock] = useState("");

  // --- ESTADOS: PEDIDOS ---
  const [carrito, setCarrito] = useState<any[]>([]);
  const [nombreCliente, setNombreCliente] = useState("");
  const [rutCliente, setRutCliente] = useState("");

  // --- ESTADOS: FINANZAS ---
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [tipoMovimiento, setTipoMovimiento] = useState("egreso");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [descMovimiento, setDescMovimiento] = useState("");

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
    return () => { unsubscribeProd(); unsubscribeFinanzas(); };
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
    if (!nombre || !precio || !stock) return alert("⚠️ Llena todos los campos.");
    try {
      await addDoc(collection(db, "productos"), { nombre, precio: Number(precio), stock: Number(stock) });
      setNombre(""); setPrecio(""); setStock("");
    } catch (error) { alert("❌ Error al guardar producto."); }
  };
  const eliminarProducto = async (id: string) => { if(window.confirm("¿Eliminar producto?")) await deleteDoc(doc(db, "productos", id)); };
  const iniciarEdicion = (prod: any) => { setEditandoId(prod.id); setEditNombre(prod.nombre); setEditPrecio(prod.precio); setEditStock(prod.stock); };
  const cancelarEdicion = () => setEditandoId(null);
  const guardarEdicion = async (id: string) => {
    if (!editNombre || !editPrecio || !editStock) return alert("⚠️ Campos vacíos.");
    try {
      await updateDoc(doc(db, "productos", id), { nombre: editNombre, precio: Number(editPrecio), stock: Number(editStock) });
      setEditandoId(null);
    } catch (error) { alert("❌ Error al actualizar."); }
  };

  // --- LÓGICA PEDIDOS ---
  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find(item => item.id === prod.id);
    if (existe) {
      if (existe.cantidad >= prod.stock) return alert("Sin stock.");
      setCarrito(carrito.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      if (prod.stock > 0) setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };
  const removerDelCarrito = (id: string) => setCarrito(carrito.filter(item => item.id !== id));
  const totalPedido = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    if (!nombreCliente) return alert("Ingresa el nombre del cliente");
    try {
      const fechaActual = new Date().toISOString();
      await addDoc(collection(db, "pedidos"), { cliente: nombreCliente, rut: rutCliente, fecha: fechaActual, items: carrito, total: totalPedido, estado: "Completado" });
      for (const item of carrito) { await updateDoc(doc(db, "productos", item.id), { stock: item.stock - item.cantidad }); }
      await addDoc(collection(db, "finanzas"), { tipo: "venta", monto: totalPedido, descripcion: `Venta a ${nombreCliente}`, fecha: fechaActual });
      alert("¡Venta registrada con éxito y enviada a Finanzas!");
      setCarrito([]); setNombreCliente(""); setRutCliente("");
    } catch (error) { alert("Hubo un error al registrar la venta."); }
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

  const totalIngresos = movimientos.filter(m => ['ingreso', 'venta', 'prestamo'].includes(m.tipo)).reduce((acc, curr) => acc + curr.monto, 0);
  const totalEgresos = movimientos.filter(m => ['egreso', 'cuota'].includes(m.tipo)).reduce((acc, curr) => acc + curr.monto, 0);
  const saldoCaja = totalIngresos - totalEgresos;
  const prestamosTomados = movimientos.filter(m => m.tipo === 'prestamo').reduce((acc, curr) => acc + curr.monto, 0);
  const cuotasPagadas = movimientos.filter(m => m.tipo === 'cuota').reduce((acc, curr) => acc + curr.monto, 0);
  const deudaActual = prestamosTomados - cuotasPagadas;

  // ==========================================
  // RENDERIZADO (LOGIN)
  // ==========================================
  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 font-sans">
        <form onSubmit={iniciarSesion} className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-6 border-t-4 border-orange-500">
          <div className="text-center mb-2"><h2 className="text-3xl font-extrabold text-stone-800">Administración</h2><p className="text-sm text-stone-500 mt-2 font-medium">Villagra & Méndez</p></div>
          <div className="flex flex-col gap-4">
            {/* TEXTBOX ARREGLADOS CON CONTRASTE */}
            <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
          </div>
          {errorLogin && <p className="text-red-600 text-sm bg-red-100 p-2 rounded-md font-bold">{errorLogin}</p>}
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg shadow-md">Ingresar</button>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDERIZADO (DASHBOARD)
  // ==========================================
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
          <button onClick={cerrarSesion} className="w-full text-center px-4 py-3 text-sm font-bold text-stone-400 hover:text-white bg-stone-800 hover:bg-red-600 rounded-lg">Cerrar Sesión</button>
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
            <div className="max-w-5xl mx-auto space-y-8">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 className="text-lg font-bold text-stone-800 mb-5 text-orange-600">Agregar Insumo o Producto</h3>
                <form onSubmit={agregarProducto} className="flex flex-col md:flex-row gap-4">
                  {/* TEXTBOX ARREGLADOS */}
                  <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                  <input type="number" placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-36 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                  <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} className="w-32 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                  <button type="submit" className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-8 py-3 rounded-xl shadow-md">Guardar</button>
                </form>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 text-sm uppercase font-bold tracking-wider">
                    <tr><th className="px-6 py-5">Nombre</th><th className="px-6 py-5">Precio</th><th className="px-6 py-5">Stock</th><th className="px-6 py-5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {productos.map((producto) => (
                      <tr key={producto.id} className="hover:bg-amber-50/50">
                        {editandoId === producto.id ? (
                          <>
                            <td className="px-6 py-4"><input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full px-3 py-2 border border-stone-400 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" /></td>
                            <td className="px-6 py-4"><input type="number" value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)} className="w-28 px-3 py-2 border border-stone-400 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" /></td>
                            <td className="px-6 py-4"><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-24 px-3 py-2 border border-stone-400 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-medium outline-none" /></td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button onClick={() => guardarEdicion(producto.id)} className="bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg">✔</button>
                              <button onClick={cancelarEdicion} className="bg-stone-200 text-stone-700 font-bold px-4 py-2 rounded-lg">✖</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-medium">{producto.nombre}</td>
                            <td className="px-6 py-5 font-semibold">${producto.precio.toLocaleString("es-CL")}</td>
                            <td className="px-6 py-5"><span className={`px-3 py-1.5 rounded-full text-xs font-bold ${producto.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>{producto.stock} uds</span></td>
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
             <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
               <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                 <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Seleccionar Productos</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {productos.map(prod => (
                     <div key={prod.id} className="border p-4 rounded-xl hover:border-orange-500 flex flex-col justify-between bg-stone-50">
                       <div><h4 className="font-bold">{prod.nombre}</h4><p className="text-orange-600 font-black">${prod.precio.toLocaleString("es-CL")}</p></div>
                       <div className="mt-4 flex justify-between items-center">
                         <span className="text-xs font-bold text-stone-500">Stock: {prod.stock}</span>
                         <button onClick={() => agregarAlCarrito(prod)} disabled={prod.stock <= 0} className={`px-4 py-2 rounded-lg font-bold text-sm ${prod.stock > 0 ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-400'}`}>+ Agregar</button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
               <div className="w-full lg:w-96 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col h-fit">
                 <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Venta Nueva</h3>
                 <div className="mb-4 space-y-3">
                   {/* TEXTBOX ARREGLADOS */}
                   <input type="text" placeholder="Nombre Cliente *" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none text-sm" />
                   <input type="text" placeholder="RUT (Opcional)" value={rutCliente} onChange={(e) => setRutCliente(e.target.value)} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none text-sm" />
                 </div>
                 <div className="flex-1 overflow-y-auto mb-4 min-h-[150px]">
                   <ul className="space-y-3">
                     {carrito.map((item, i) => (
                       <li key={i} className="flex justify-between items-center text-sm border-b pb-2">
                         <div><p className="font-bold">{item.nombre}</p><p className="text-stone-500">{item.cantidad} x ${item.precio.toLocaleString("es-CL")}</p></div>
                         <div className="flex items-center gap-3"><span className="font-bold">${(item.precio * item.cantidad).toLocaleString("es-CL")}</span><button onClick={() => removerDelCarrito(item.id)} className="text-red-500">✖</button></div>
                       </li>
                     ))}
                   </ul>
                 </div>
                 <div className="border-t pt-4">
                   <div className="flex justify-between items-center mb-4"><span className="font-bold">Total:</span><span className="text-2xl font-black text-orange-600">${totalPedido.toLocaleString("es-CL")}</span></div>
                   <button onClick={procesarVenta} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl">Confirmar Venta</button>
                 </div>
               </div>
             </div>
          )}

          {/* MÓDULO: FINANZAS */}
          {vistaActiva === 'finanzas' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-2xl shadow-sm border ${saldoCaja >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Saldo Neto en Caja</h4>
                  <p className={`text-4xl font-black mt-2 ${saldoCaja >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${saldoCaja.toLocaleString("es-CL")}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Egresos Registrados</h4>
                  <p className="text-3xl font-black mt-2 text-stone-700">${totalEgresos.toLocaleString("es-CL")}</p>
                </div>
                <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-200">
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wide">Deuda Préstamos</h4>
                  <p className="text-3xl font-black mt-2 text-orange-700">${deudaActual.toLocaleString("es-CL")}</p>
                </div>
              </div>

              <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 className="text-lg font-bold text-stone-800 mb-5">Registrar Nuevo Movimiento</h3>
                <form onSubmit={agregarMovimiento} className="flex flex-col md:flex-row gap-4">
                  {/* TEXTBOX ARREGLADOS */}
                  <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className="px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 font-bold outline-none cursor-pointer">
                    <option value="egreso">💸 Registrar Gasto (Egreso)</option>
                    <option value="ingreso">💰 Registrar Ingreso Extra</option>
                    <option value="prestamo">🏦 Tomar Préstamo</option>
                    <option value="cuota">💳 Pagar Cuota Préstamo</option>
                  </select>
                  <input type="number" placeholder="Monto ($)" value={montoMovimiento} onChange={(e) => setMontoMovimiento(e.target.value)} className="w-full md:w-48 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                  <input type="text" placeholder="Descripción (Ej: Compra de frascos)" value={descMovimiento} onChange={(e) => setDescMovimiento(e.target.value)} className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-500 font-medium outline-none" />
                  <button type="submit" className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-8 py-3 rounded-xl shadow-md">Registrar</button>
                </form>
              </section>

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