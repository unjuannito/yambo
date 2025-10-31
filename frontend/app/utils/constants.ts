//Permissions
const MANAGE_USERS = "manage_user"

//links
const LINKS_MAP = [
    { href: '/mi-espacio', label: 'Página Principal', need: 'nothing' },
    // ADMIN
    { href: '/mi-espacio/usuarios', label: 'Usuarios', need: MANAGE_USERS },
    // Todos
    { href: '/mi-espacio/mi-cuenta', label: 'Mi cuenta', need: 'nothing' },
];


export { LINKS_MAP, MANAGE_USERS }