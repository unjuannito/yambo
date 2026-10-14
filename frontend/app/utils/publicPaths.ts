/**
 * Rutas públicas de proyectos y actividades. Usan el nombre legible (`slug`) cuando
 * existe; el id sigue funcionando y redirige a la URL con nombre.
 */

interface Addressable {
    id: string;
    slug?: string | null;
}

export function projectPath(project: Addressable): string {
    return `/proyectos/${project.slug || project.id}`;
}

export function activityPath(activity: Addressable): string {
    return `/actividades/${activity.slug || activity.id}`;
}
