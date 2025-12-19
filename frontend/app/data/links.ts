import { PRODUCT_LINK_NAME, PRODUCT_NAME } from "~/utils/constants";

//links
const LINKS_MAP = [
    { name: "home", href: "/mi-espacio", label: "Página Principal", need: null},
    // socios
    { name: "projects", href: "/mi-espacio/proyectos", label: "Proyetos", need: { obj: "project", action: "read"}},
    // COMPRAS
    { name: "products", href: `/mi-espacio/${PRODUCT_LINK_NAME}`, label: PRODUCT_NAME, need: { obj: "product", action: "read"}},
    { name: "orders", href: "/mi-espacio/pedidos", label: "Pedidos", need: { obj: "order", action: "read"}},
    // ADMIN
    { name: "users", href: "/mi-espacio/usuarios", label: "Usuarios", need: { obj: "user", action: "read"}},
    { name: "invitations", href: "/mi-espacio/invitaciones", label: "Invitaciones", need: { obj: "invitation", action: "read"}},
    // Todos
    { name: "myAccount", href: "/mi-espacio/mi-cuenta", label: "Mi cuenta", need: null},
];

export default LINKS_MAP