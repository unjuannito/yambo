import { use, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import ButtonComponent from "../components/common/forms/ButtonComponent";
import type { Route } from "./+types/login";
import InputComponent from "~/components/common/forms/InputComponent";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Yambo - Área Socios - Login" },
    { name: "description", content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo." },
  ];
}

export default function Index() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/mi-espacio', { replace: true });
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      setLoading(true);
      await login(email, password);
      navigate('/mi-espacio', { replace: true });
    } catch (err) {
      alert('Error al iniciar sesión. Por favor, verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100">
      <div className="bg-white shadow-xl rounded-2xl px-8 py-10 max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Área de Socios</h1>
          <p className="text-sm text-gray-500">Inicia sesión para acceder</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <InputComponent name="email" label="Correo electrónico" type="email" required />
          <InputComponent name="password" label="Contraseña" type="password" required />

          <ButtonComponent
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            Iniciar sesión
          </ButtonComponent>
        </form>

        <p className="text-xs text-center text-gray-500">
          ¿No eres socio? <a className="text-blue-600" href="/contacto">Contacta con Yambo.</a>
        </p>
      </div>
    </main>
  );
}
