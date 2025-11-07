import { use, useEffect, useState } from "react";
import type { Route } from "./+types/users";
import { useAuth } from "~/hooks/useAuth";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/RequirePermission";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Usuarios" },
    { name: "Yambo - Usuarios", content: "Yambo - Usuarios" },
  ];
}

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    if (!user) return;
    //TODO: Llamar a get users
    const newUsers: User[] = [
      {
        id: "12345678",
        name: "Padre 1",
        email: "padre@mail.com",
        created_by: "",
        createdAt: "",
        permissions: [],
        profiles: []
      },
      {
        id: "12345679",
        name: "Monitor 1",
        email: "monitor@mail.com",
        created_by: "",
        createdAt: "",
        permissions: [],
        profiles: []
      },
      {
        id: "kJ5GV3JH",
        name: "Monitor 1",
        email: "juancanx2@gmail.com",
        created_by: "",
        createdAt: "",
        permissions: [],
        profiles: []
      },
    ];
    setUsers(newUsers);
  }, [user]);
  return (
    <RequirePermission permission={{ obj: "user", action: "read" }}>
      <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
        <h1>Usuarios</h1>
        <section>
          {users.map((user) => (
            <section key={user.id}>
              <span>
                Id: {user.id} | Name: {user.name} | Email: {user.email}
              </span>
            </section>
          ))}
        </section>
      </main>
    </RequirePermission>
  );
}
