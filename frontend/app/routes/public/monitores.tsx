import { redirect } from "react-router";

// La página del equipo se llamaba /monitores: se conserva la URL antigua como redirección permanente.
export function loader() {
  return redirect("/equipo", 301);
}
