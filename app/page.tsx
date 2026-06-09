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

  const cancelarEdicion = () => {
    setEditandoId(null);
  };

  const guardarEdicion = async (id: string) => {
    try {
      const productoRef = doc(db, "productos", id);
      await updateDoc(productoRef, {
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
  // RENDERIZADO: PANTALLA DE LOGIN PROFESIONAL
  // ==========================================
  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <form onSubmit={iniciarSesion} className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-6 border border-slate-100">
          <div className="text-center mb-2">
            <h2 className="text-3xl font-extrabold text-slate-800">Villagra & Méndez</h2>
            <p className="text-sm text-slate-500 mt-2">Acceso al Sistema de Gestión ERP</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <input 
              type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required 
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" 
            />
            <input 
              type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required 
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" 
            />
          </div>
          
          {errorLogin && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-md">{errorLogin}</p>}
          
          <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition-colors mt-2 shadow-md">
            Ingresar
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDERIZADO: PANEL DE CONTROL PROFESIONAL
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      
      {/* Barra de Navegación Superior */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">ERP Villagra & Méndez</h1>
        </div>
        <button onClick={cerrarSesion} className="text-sm font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-md transition-colors">
          Cerrar Sesión
        </button>
      </header>
      
      <main className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Tarjeta de Formulario de Ingreso */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Agregar Nuevo Producto
          </h2>
          <form onSubmit={agregarProducto} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Nombre del producto o insumo" value={nombre} onChange={(e) => setNombre(e.target.value)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Precio ($)" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full md:w-36 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" placeholder="Stock (uds)" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full md:w-36 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm whitespace-nowrap">
              Guardar Producto
            </button>
          </form>
        </section>

        {/* Tarjeta de Inventario */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Inventario Actual</h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">{productos.length} artículos</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Precio</th>
                  <th className="px-6 py-4 font-medium">Stock</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50 transition-colors">
                    {editandoId === producto.id ? (
                      // MODO EDICIÓN
                      <>
                        <td className="px-6 py-3"><input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                        <td className="px-6 py-3"><input type="number" value={editPrecio} onChange={(e) => setPrecio(e.target.value)} className="w-24 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                        <td className="px-6 py-3"><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-24 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                          <button onClick={() => guardarEdicion(producto.id)} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-md font-medium transition-colors">Guardar</button>
                          <button onClick={cancelarEdicion} className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md font-medium transition-colors">Cancelar</button>
                        </td>
                      </>
                    ) : (
                      // MODO LECTURA
                      <>
                        <td className="px-6 py-4 font-medium text-slate-900">{producto.nombre}</td>
                        <td className="px-6 py-4">${producto.precio.toLocaleString("es-CL")}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${producto.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {producto.stock} uds.
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button onClick={() => iniciarEdicion(producto)} className="text-indigo-600 hover:text-indigo-900 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors">Editar</button>
                          <button onClick={() => eliminarProducto(producto.id)} className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">Eliminar</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {productos.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                No hay productos en el inventario. Agrega uno arriba para comenzar.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}