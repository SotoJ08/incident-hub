// Token de sesion (AB#381). Se guarda en sessionStorage: sobrevive a recargar la pestana pero no a cerrarla.
// Si el navegador no permite almacenamiento, la sesion vive solo en memoria.
const KEY = 'incident-hub-session';
let enMemoria = null;

export function getToken() {
  try {
    return window.sessionStorage.getItem(KEY) ?? enMemoria;
  } catch {
    return enMemoria;
  }
}

export function saveToken(token) {
  enMemoria = token;
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function clearToken() {
  enMemoria = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento disponible */
  }
}
