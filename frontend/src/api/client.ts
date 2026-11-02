// Cliente único para hablar con el back.
// Todas las llamadas a la API pasan por la función `api`, así el token,
// los encabezados y el manejo de errores se resuelven en un solo lugar.

const BASE_URL = "/api";
const TOKEN_KEY = "caos_token";

// Error propio: además del mensaje, guarda el código HTTP (401, 404, 409...)
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Si el navegador bloquea localStorage, la sesión dura hasta recargar.
  }
}

function leerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function api<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const headers = new Headers(opciones.headers);

  // Si mandamos datos (y no es un archivo), avisamos que van en JSON
  if (opciones.body && !(opciones.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Si hay sesión iniciada, mandamos el token para que el back sepa quién es
  const token = leerToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, { ...opciones, headers });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. ¿Está corriendo el back?",
    );
  }

  // 204 = "salió bien pero no hay nada para devolver" (por ejemplo, al borrar)
  if (respuesta.status === 204) return undefined as T;

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // FastAPI manda los errores en el campo "detail"
    const detalle = datos?.detail;
    const mensaje =
      typeof detalle === "string" ? detalle : "Ocurrió un error inesperado";
    throw new ApiError(respuesta.status, mensaje);
  }

  return datos as T;
}
