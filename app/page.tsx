"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth"; // Importamos 'User'

export default function Home() {
  // Le decimos a TypeScript que esto puede ser un User o null
  const [usuario, setUsuario] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");

  // Le decimos que productos es un arreglo de cualquier cosa (any[])
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

  // Agregamos React.FormEvent para los eventos de formulario
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
    await deleteDoc(doc(db, "productos", id));
  };

  // Agregamos tipo 'any' para el producto temporalmente
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

  if (!usuario) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f4f4f9" }}>
        <form onSubmit={iniciarSesion} style={{ background: "white", padding: "40px", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "15px", width: "300px" }}>
          <h2 style={{ textAlign: "center", margin: "0 0 20px 0" }}>Villagra y Méndez</h2>
          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }} required />
          {errorLogin && <p style={{ color: "red", fontSize: "12px", margin: 0 }}>{errorLogin}</p>}
          <button type="submit" style={{ padding: "10px", background: "#333", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Ingresar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "900px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "20px", marginBottom: "20px" }}>
        <h1>📦 ERP - Villagra y Méndez</h1>
        <button onClick={cerrarSesion} style={{ padding: "8px 16px", background: "#ff4d4f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cerrar Sesión</button>
      </div>
      
      <form onSubmit={agregarProducto} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ padding: "8px", flex: 1 }} />
        <input type="number" placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} style={{ padding: "8px", width: "100px" }} />
        <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} style={{ padding: "8px", width: "100px" }} />
        <button type="submit" style={{ padding: "8px 16px", background: "#0070f3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Agregar</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ccc", backgroundColor: "#f9f9f9" }}>
            <th style={{ padding: "10px" }}>Nombre</th>
            <th style={{ padding: "10px" }}>Precio ($)</th>
            <th style={{ padding: "10px" }}>Stock</th>
            <th style={{ padding: "10px" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id} style={{ borderBottom: "1px solid #eee" }}>
              {editandoId === producto.id ? (
                <>
                  <td style={{ padding: "10px" }}><input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} style={{ padding: "4px", width: "100%" }} /></td>
                  <td style={{ padding: "10px" }}><input type="number" value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)} style={{ padding: "4px", width: "80px" }} /></td>
                  <td style={{ padding: "10px" }}><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} style={{ padding: "4px", width: "80px" }} /></td>
                  <td style={{ padding: "10px", display: "flex", gap: "5px" }}>
                    <button onClick={() => guardarEdicion(producto.id)} style={{ background: "green", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>Guardar</button>
                    <button onClick={cancelarEdicion} style={{ background: "gray", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>Cancelar</button>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: "10px" }}>{producto.nombre}</td>
                  <td style={{ padding: "10px" }}>{producto.precio}</td>
                  <td style={{ padding: "10px" }}>{producto.stock}</td>
                  <td style={{ padding: "10px", display: "flex", gap: "5px" }}>
                    <button onClick={() => iniciarEdicion(producto)} style={{ background: "#f0ad4e", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>Editar</button>
                    <button onClick={() => eliminarProducto(producto.id)} style={{ background: "red", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>Eliminar</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}