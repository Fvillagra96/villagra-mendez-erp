"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

export default function Home() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");

  const [vistaActiva, setVistaActiva] = useState("inventario");

  const [productos, setProductos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editStock, setEditStock] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const unsubscribeDB = onSnapshot(collection(db, "productos"), (snapshot) => {
      const listaProductos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(listaProductos);
    });
    return () => unsubscribeDB();
  }, [usuario]);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorLogin("Correo o contraseña incorrectos.");
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
  };

  const agregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !stock) return;
    try {
      await addDoc(collection(db, "productos"), {
        nombre: nombre,
        precio: Number(precio),
        stock: Number(stock),
      });
      setNombre(""); setPrecio(""); setStock("");
    } catch (error) {
      console.error("Error al agregar:", error);
    }
  };

  const eliminarProducto = async (id: string) => {
    if(window.confirm("¿Estás seguro de eliminar este producto?")) {
        await deleteDoc(doc(db, "productos", id));
    }
  };

  const iniciarEdicion = (producto: any) => {
    setEditandoId(producto.id);
    setEditNombre(producto.nombre);
    setEditPrecio(producto.precio);
    setEditStock(producto.stock);
  };

  const cancelarEdicion = () => setEditandoId(null);

  const guardarEdicion = async (id: string) => {
    try {
      await updateDoc(doc(db, "productos", id), {
        nombre: editNombre,
        precio: Number(editPrecio),
        stock: Number(editStock),
      });
      setEditandoId(null);
    } catch (error) {
      console.error("Error al actualizar:", error);
    }
  };

  // ==========================================
  // RENDERIZADO: LOGIN CALIDO Y ARTESANAL
  // ==========================================
  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 font-sans">
        <form onSubmit={iniciarSesion} className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-6 border-t-4 border-orange-500">
          <div className="text-center mb-2">
            <h2 className="text-3xl font-extrabold text-stone-800">Villagra & Méndez</h2>
            <p className="text-sm text-stone-500 mt-2 font-medium">Gestión de Productos Artesanales</p>
          </div>
          <div className="flex flex-col gap-4">
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-400 shadow-sm transition-all" 
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-stone-900 placeholder-stone-400 shadow-sm transition-all" 
            />
          </div>
          {errorLogin && <p className="text-red-600 text-sm font-medium text-center bg-red-100 p-2 rounded-md border border-red-200">{errorLogin}</p>}
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors mt-2 shadow-md">Ingresar al Sistema</button>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDERIZADO: DASHBOARD PRINCIPAL
  // ==========================================
  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-800 overflow-hidden">
      
      {/* MENÚ LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-stone-800 bg-stone-950">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-orange-500">V&M</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-semibold">Artesanal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-3">
          <button onClick={() => setVistaActiva('inventario')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${vistaActiva === 'inventario' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'hover:bg-stone-800 hover:text-orange-400'}`}>
            <span className="text-xl">📦</span> Inventario
          </button>
          <button onClick={() => setVistaActiva('pedidos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${vistaActiva === 'pedidos' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'hover:bg-stone-800 hover:text-orange-400'}`}>
            <span className="text-xl">📝</span> Pedidos
          </button>
          <button onClick={() => setVistaActiva('finanzas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${vistaActiva === 'finanzas' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'hover:bg-stone-800 hover:text-orange-400'}`}>
            <span className="text-xl">💰</span> Finanzas
          </button>
        </nav>

        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <button onClick={cerrarSesion} className="w-full text-center px-4 py-3 text-sm font-bold text-stone-400 hover:text-white bg-stone-800 hover:bg-red-600 rounded-lg transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-stone-200 px-8 py-5 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-stone-800 capitalize flex items-center gap-3">
            {vistaActiva === 'inventario' && <><span className="bg-orange-100 text-orange-600 p-2 rounded-lg">📦</span> Control de Inventario</>}
            {vistaActiva === 'pedidos' && <><span className="bg-orange-100 text-orange-600 p-2 rounded-lg">📝</span> Gestión de Pedidos</>}
            {vistaActiva === 'finanzas' && <><span className="bg-orange-100 text-orange-600 p-2 rounded-lg">💰</span> Resumen Financiero</>}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {/* MÓDULO: INVENTARIO */}
          {vistaActiva === 'inventario' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 className="text-lg font-bold text-stone-800 mb-5 text-orange-600">Agregar Nuevo Insumo o Producto</h3>
                <form onSubmit={agregarProducto} className="flex flex-col md:flex-row gap-4">
                  <input type="text" placeholder="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)} className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white text-stone-900 placeholder-stone-400 shadow-sm" />
                  <input type="number" placeholder="Precio ($)" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full md:w-36 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white text-stone-900 placeholder-stone-400 shadow-sm" />
                  <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full md:w-32 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white text-stone-900 placeholder-stone-400 shadow-sm" />
                  <button type="submit" className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg">Guardar</button>
                </form>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 text-sm uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-5">Nombre del Artículo</th>
                      <th className="px-6 py-5">Precio</th>
                      <th className="px-6 py-5">Stock Disp.</th>
                      <th className="px-6 py-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {productos.map((producto) => (
                      <tr key={producto.id} className="hover:bg-amber-50/50 transition-colors">
                        {editandoId === producto.id ? (
                          <>
                            <td className="px-6 py-4"><input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full px-3 py-2 border border-stone-400 rounded-lg shadow-inner focus:ring-2 focus:ring-orange-500 outline-none bg-white text-stone-900" /></td>
                            <td className="px-6 py-4"><input type="number" value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)} className="w-28 px-3 py-2 border border-stone-400 rounded-lg shadow-inner focus:ring-2 focus:ring-orange-500 outline-none bg-white text-stone-900" /></td>
                            <td className="px-6 py-4"><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-24 px-3 py-2 border border-stone-400 rounded-lg shadow-inner focus:ring-2 focus:ring-orange-500 outline-none bg-white text-stone-900" /></td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button onClick={() => guardarEdicion(producto.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors">✔</button>
                              <button onClick={cancelarEdicion} className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-4 py-2 rounded-lg shadow-sm transition-colors">✖</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5 font-medium text-stone-800">{producto.nombre}</td>
                            <td className="px-6 py-5 text-stone-600 font-semibold">${producto.precio.toLocaleString("es-CL")}</td>
                            <td className="px-6 py-5">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${producto.stock <= 5 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                {producto.stock} unidades
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right flex justify-end gap-3">
                              <button onClick={() => iniciarEdicion(producto)} className="text-orange-600 hover:text-orange-800 font-bold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors">Editar</button>
                              <button onClick={() => eliminarProducto(producto.id)} className="text-red-500 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Borrar</button>
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
            <div className="max-w-5xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center mt-10">
              <div className="bg-orange-100 p-6 rounded-full mb-6 shadow-inner">
                <span className="text-6xl block">📝</span>
              </div>
              <h3 className="text-3xl font-black text-stone-800 mb-4">Área de Pedidos</h3>
              <p className="text-stone-500 text-lg max-w-lg leading-relaxed">
                Aquí armaremos la lógica para agendar las ventas, seleccionar los productos del inventario y generar la boleta PDF automática.
              </p>
            </div>
          )}

          {/* MÓDULO: FINANZAS */}
          {vistaActiva === 'finanzas' && (
            <div className="max-w-5xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center mt-10">
              <div className="bg-emerald-100 p-6 rounded-full mb-6 shadow-inner">
                <span className="text-6xl block">💰</span>
              </div>
              <h3 className="text-3xl font-black text-stone-800 mb-4">Resumen de Finanzas</h3>
              <p className="text-stone-500 text-lg max-w-lg leading-relaxed">
                Este panel calculará los costos de producción y graficará tus ganancias reales basadas en las ventas registradas.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}