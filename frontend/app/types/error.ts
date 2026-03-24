export const ErrorTypes = {
  // Auth errors (401)
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  // Forbidden errors (403)
  FORBIDDEN: 'FORBIDDEN',
  ACCESS_DENIED: 'ACCESS_DENIED',
  // Not found errors (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  NOT_FOUND: 'NOT_FOUND',
  // Bad request errors (400)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  MAIL_AUTHENTICATION_FAILED: 'MAIL_AUTHENTICATION_FAILED',
  // Client-side
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

const ERROR_TRANSLATIONS: Record<string, string> = {
  // Auth (401)
  "JWT token has expired": "¡Tu sesión ha caducado! Vuelve a iniciar sesión",
  "Invalid JWT token": "¡Ese token no nos convence!",
  "Invalid username or password": "¡Nope! Usuario o contraseña incorrectos",
  "User is not authenticated": "¡Eh, que no has iniciado sesión!",
  "Invalid credentials": "¡Credenciales incorrectas! Inténtalo de nuevo",
  // Forbidden (403)
  "You don't have permission to access this resource": "¡Zona restringida! No tienes permiso para entrar aquí",
  "You can only delete your own files": "¡Solo puedes borrar tus propios archivos, bribón!",
  "You don't have permission to update issue status": "¡No puedes cambiar el estado de esta incidencia!",
  "You do not have permission to cancel this order": "¡Este pedido no es tuyo para cancelarlo!",
  // Not found (404)
  "The requested resource was not found": "¡Lo que buscas no aparece por ningún lado!",
  "User not found": "¡Ese usuario es un fantasma! No lo encontramos",
  "Product not found": "¡El producto se nos ha escapado!",
  "Project not found": "¡El proyecto brilla por su ausencia!",
  "One or more ordered products were not found": "¡Algunos productos del pedido han desaparecido!",
  "Issue has no related ordered products": "¡La incidencia no tiene productos del pedido asociados!",
  "Invitation not found": "¡Esa invitación no nos suena!",
  // Validation (400)
  "Validation failed": "¡Algo no cuadra! Revisa los datos",
  // User management
  "Email already in use": "¡Ese email ya tiene dueño!",
  "Email is already in use": "¡Ese email ya tiene dueño!",
  "Old password is incorrect": "¡La contraseña actual no es correcta!",
  "At least one profile must be specified": "¡Selecciona al menos un perfil, anda!",
  "Cannot remove the ADMIN profile from a system user": "¡El perfil ADMIN de un usuario del sistema es intocable!",
  "Cannot delete a system user": "¡Los usuarios del sistema son inmortales!",
  "Coordinators must be assigned to the project-level group": "¡Los coordinadores van al grupo de nivel de proyecto, sí o sí!",
  // Invitations
  "Email already registered": "¡Ese email ya tiene dueño! ¿Ya tienes cuenta?",
  "Invitation already used": "¡Esa invitación ya dio su último baile!",
  "Invitation expired": "¡Llegaste tarde! La invitación ha caducado",
  "Invitation not active yet": "¡Calma, calma! La invitación aún no está activa",
  "One or more profiles not found": "¡Algunos perfiles se han esfumado!",
  "Profile IDs are required": "¡Los IDs de perfil son obligatorios!",
  "Email, password and name are required": "¡Necesitamos email, contraseña y nombre!",
  // Products & drops
  "Product name already exists": "¡Ese nombre de producto ya está pillado!",
  "Family product name already exists": "¡Ese nombre de drop ya está pillado!",
  "Start date must be before end date": "¡La fecha de inicio tiene que ir antes que la de fin!",
  // Issues
  "At least one ordered product is required": "¡Selecciona al menos un producto del pedido!",
  "At least one ordered product ID is required": "¡Falta al menos un producto del pedido!",
  "All ordered products in an issue must belong to the same order": "¡Todos los productos de una incidencia deben ser del mismo pedido!",
  "Issue title cannot be empty": "¡Dale un título a tu incidencia!",
  "Issue description cannot be empty": "¡Cuéntanos qué pasó! La descripción es necesaria",
  "Comment text cannot be empty": "¡No nos dejes en ascuas! Escribe algo en el comentario",
  // Orders
  "Order must contain at least one product": "¡Un pedido sin productos no tiene sentido!",
  "Cannot update status of canceled order": "¡Un pedido cancelado ya no se puede tocar!",
  "Cannot change status of closed order": "¡Ese pedido ya cerró la persiana!",
  "Order can only be canceled when pending payment or confirming payment": "¡Solo se puede cancelar si está pendiente de pago o confirmándolo!",
  "Order does not belong to the specified customer": "¡Ese pedido no es de este cliente!",
  "Receipt can only be uploaded when order is pending payment": "¡El comprobante solo vale si el pedido está pendiente de pago!",
  "Receipt can only be uploaded when order is pending or confirming payment": "¡El comprobante solo vale si el pedido está pendiente o confirmando pago!",
  "Cannot delete closed order": "¡Un pedido cerrado es para siempre!",
  // Projects & profiles
  "Project name already exists": "¡Ese nombre de proyecto ya está pillado!",
  "Cannot modify permissions of a system profile": "¡Los permisos de un perfil del sistema son sagrados!",
  "Cannot modify a system profile": "¡Los perfiles del sistema son intocables!",
  "Cannot delete a system profile": "¡Los perfiles del sistema son inmortales!",
  // Files
  "Invalid file path": "¡Esa ruta de archivo no nos convence!",
  "File is empty": "¡El archivo está más vacío que un bolsillo roto!",
  // Settings
  "Issue creation window days must be 0 or greater": "¡Los días deben ser 0 o más!",
  "Max file size must be greater than 0": "¡El tamaño máximo tiene que ser mayor que 0!",
  // Server errors (500)
  "An unexpected error occurred": "¡Algo inesperado ha pasado! Nuestro servidor necesita un respiro",
  "Failed to authenticate mail credentials. Please check your configuration.": "¡El correo no quiere autenticarse! Revisa la configuración",
};

const DYNAMIC_TRANSLATIONS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Product '(.+)' is not yet available\. Available from: (.+)$/, (m) => `¡El producto '${m[1]}' aún no está listo! Disponible desde: ${m[2]}`],
  [/^Product '(.+)' is no longer available\. Expired on: (.+)$/, (m) => `¡El producto '${m[1]}' ya cerró la persiana! Expiró el: ${m[2]}`],
  [/^You don't have access to product '(.+)'\. Required profile: (.+)$/, (m) => `¡No tienes acceso al producto '${m[1]}'! Necesitas el perfil: ${m[2]}`],
  [/^Invalid issue status transition: (.+) -> (.+)$/, (m) => `¡Ese cambio de estado no vale! ${m[1]} → ${m[2]} no es posible`],
  [/^Issues cannot be created more than (\d+) days after order closure$/, (m) => `¡Llegaste tarde! No se pueden crear incidencias después de ${m[1]} días del cierre`],
  [/^File size exceeds maximum allowed size of (\d+)MB$/, (m) => `¡Ese archivo es demasiado grande! Máximo ${m[1]}MB`],
  [/^File not found: (.+)$/, (m) => `¡El archivo '${m[1]}' ha desaparecido!`],
  [/^Setting with key '(.+)' already exists$/, (m) => `¡La configuración '${m[1]}' ya existe!`],
  [/^Cannot transition from (.+) to (.+)$/, (m) => `¡No se puede pasar de ${m[1]} a ${m[2]}!`],
];

function translateErrorMessage(message: string): string {
  const exact = ERROR_TRANSLATIONS[message];
  if (exact) return exact;

  for (const [pattern, builder] of DYNAMIC_TRANSLATIONS) {
    const match = message.match(pattern);
    if (match) return builder(match);
  }

  return message;
}

export interface ErrorResponse {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  path: string;
  status: number;
  details?: string;
}

export class ApiError extends Error {
  public id: string;
  public timestamp: string;
  public type: string;
  public path: string;
  public status: number;
  public details?: string;

  constructor(errorResponse: ErrorResponse) {
    super(errorResponse.message);
    this.name = 'ApiError';
    this.id = errorResponse.id;
    this.timestamp = errorResponse.timestamp;
    this.type = errorResponse.type;
    this.path = errorResponse.path;
    this.status = errorResponse.status;
    this.details = errorResponse.details;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return translateErrorMessage(this.message);
  }

  /**
   * Get detailed error information for debugging
   */
  getDebugInfo(): string {
    const parts = [
      `Error ID: ${this.id}`,
      `Type: ${this.type}`,
      `Status: ${this.status}`,
      `Path: ${this.path}`,
      `Time: ${this.timestamp}`,
    ];

    if (this.details) {
      parts.push(`Details: ${this.details}`);
    }

    return parts.join('\n');
  }

  /**
   * Check if error is a specific type
   */
  isType(type: string): boolean {
    return this.type === type;
  }

  isAuthError(): boolean {
    return this.type === ErrorTypes.AUTHENTICATION_FAILED ||
           this.type === ErrorTypes.UNAUTHORIZED ||
           this.type === ErrorTypes.ACCESS_DENIED;
  }

  isTokenError(): boolean {
    return this.type === ErrorTypes.TOKEN_EXPIRED ||
           this.type === ErrorTypes.INVALID_TOKEN;
  }

  isForbiddenError(): boolean {
    return this.type === ErrorTypes.FORBIDDEN ||
           this.type === ErrorTypes.ACCESS_DENIED;
  }

  isNotFoundError(): boolean {
    return this.type === ErrorTypes.RESOURCE_NOT_FOUND ||
           this.type === ErrorTypes.NOT_FOUND;
  }

  isValidationError(): boolean {
    return this.type === ErrorTypes.VALIDATION_ERROR;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * Extract a user-friendly error message from any caught error.
 * Centralises error message extraction across the entire frontend.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.getUserMessage();
  if (err instanceof Error) return err.message;
  return fallback;
}
