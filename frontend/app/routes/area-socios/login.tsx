import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import type { Route } from "./+types/login";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Yambo - Área Socios - Login" },
    { name: "description", content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo." },
  ];
}

export default function Index() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/area-socios', { replace: true });
    } catch (err) {
      alert('Error al iniciar sesión. Por favor, verifica tus credenciales.');
    }
  }
  return (
    <main className="min-h-screen flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100">
      <div className="bg-white shadow-xl rounded-2xl px-8 py-10 max-w-md w-full space-y-6">
        <div className="text-center">
          {/* Logo de Yambo aquí si lo tienes */}
          <h1 className="text-2xl font-bold text-gray-800">Área de Socios</h1>
          <p className="text-sm text-gray-500">Inicia sesión para acceder</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 shadow-sm focus:border-orange-400 focus:ring-orange-400 sm:text-sm p-2"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 shadow-sm focus:border-orange-400 focus:ring-orange-400 sm:text-sm p-2"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all font-semibold"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="text-xs text-center text-gray-500">
          ¿No eres socio? <a href="/contacto">Contacta con Yambo.</a>
        </p>
      </div>
    </main>
  );
}
