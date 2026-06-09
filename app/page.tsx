"use client";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore"; 
import Link from "next/link";

export default function TiendaPublica() {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Leer productos desde Firebase (solo lectura)
  useEffect(() => {
    const unsubscribeDB = onSnapshot(collection(db, "productos"), (snapshot) => {
      const listaProductos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(listaProductos);
      setCargando(false);
    });
    return () => unsubscribeDB();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      
      {/* Cabecera Pública */}
      <header className="bg-stone-900 text-stone-50 py-6 px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="text-orange-500">V&M</span>
            </h1>
            <p className="text-sm text-stone-400 mt-1 uppercase tracking-widest font-semibold">Productos Artesanales</p>
          </div>
          <nav>
            <Link href="/admin" className="text-stone-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
              <span>🔒</span> Acceso Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Banner Principal */}
      <section className="bg-orange-600 text-white py-16 px-8 text-center shadow-inner">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-md">Nuestra Selección Artesanal y Cacero</h2>
        <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto text-orange-100">
          Descubre nuestra línea de productos hechos con dedicación, tradición familiar y la mejor calidad.
        </p>
      </section>

      {/* Catálogo de Productos */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-4">
          <h3 className="text-2xl font-bold text-stone-800">Catálogo Disponible</h3>
          <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full text-sm font-bold">
            {productos.length} productos
          </span>
        </div>

        {cargando ? (
          <div className="text-center py-20 text-stone-500 font-medium text-lg">
            Cargando catálogo...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {productos.map((producto) => (
              <div key={producto.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
                
                {/* Espacio para futura foto del producto */}
                <div className="h-48 bg-stone-100 border-b border-stone-200 flex items-center justify-center">
                  <span className="text-5xl">🛍️</span>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h4 className="text-xl font-bold text-stone-800 mb-2">{producto.nombre}</h4>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-2xl font-black text-orange-600">
                      ${producto.precio.toLocaleString("es-CL")}
                    </span>
                    {producto.stock > 0 ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                        Stock: {producto.stock}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                        Agotado
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <button 
                    disabled={producto.stock <= 0}
                    className={`w-full py-3 rounded-xl font-bold transition-colors ${producto.stock > 0 ? 'bg-stone-800 hover:bg-stone-900 text-white shadow-md' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                  >
                    {producto.stock > 0 ? 'Consultar Pedido' : 'Sin unidades'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pie de página */}
      <footer className="bg-stone-900 py-8 text-center border-t-4 border-orange-500 mt-12">
        <p className="text-stone-400 text-sm font-medium">
          © {new Date().getFullYear()} Villagra & Méndez. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}