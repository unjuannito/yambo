/**
 * Clave de un rol de proyecto (issue #126).
 *
 * Antes era una unión cerrada de tres valores del enum fijo del backend
 * (`MONITOR | COORDINATOR | PARENT`). Ahora los roles son configurables por
 * asociación y se almacenan en BD, así que la clave es un string cualquiera
 * (p. ej. `VOLUNTEER`, `JUEZ`, …). Los tres roles por defecto mantienen sus
 * claves originales para no romper los datos existentes.
 */
export type GroupRole = string;
