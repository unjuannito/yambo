//Permissions
const SEE_USERS = "users_read"

//links
const LINKS_MAP = [
    { name: "home", href: "/mi-espacio", label: "Página Principal", need: "nothing", icon: "" },
    // ADMIN
    { name: "users", href: "/mi-espacio/usuarios", label: "Usuarios", need: SEE_USERS, icon: "/icons/users.svg" },
    // Todos
    { name: "myAccount", href: "/mi-espacio/mi-cuenta", label: "Mi cuenta", need: "nothing", icon: "/icons/user.svg" },
];

export { LINKS_MAP, SEE_USERS }