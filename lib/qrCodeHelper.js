import QRCode from 'qrcode';

/**
 * Genera un código alfanumérico único con el patrón exacto XX00XX00XX00:
 * 2 letras mayúsculas, 2 dígitos, 2 letras, 2 dígitos, 2 letras, 2 dígitos (12 caracteres).
 * Ejemplo: LL26AB14CD99
 */
export function generarCodigoAlfanumerico() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluyendo I y O para evitar confusiones
  const digitos = '0123456789';

  function randL(n) {
    let res = '';
    for (let i = 0; i < n; i++) {
      res += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    return res;
  }

  function randD(n) {
    let res = '';
    for (let i = 0; i < n; i++) {
      res += digitos.charAt(Math.floor(Math.random() * digitos.length));
    }
    return res;
  }

  // Comienza con LL (Las Llaves) o letras aleatorias + 2 digitos + 2 letras + 2 digitos + 2 letras + 2 digitos
  return `LL${randD(2)}${randL(2)}${randD(2)}${randL(2)}${randD(2)}`;
}

/**
 * Genera un código QR como Data URL (PNG base64) para incrustar en el PDF o mostrar en pantalla.
 */
export async function generarQrDataUrl(texto, opciones = {}) {
  try {
    return await QRCode.toDataURL(texto, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: opciones.width || 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      ...opciones,
    });
  } catch (err) {
    console.error('Error generando QR Data URL:', err);
    return null;
  }
}
