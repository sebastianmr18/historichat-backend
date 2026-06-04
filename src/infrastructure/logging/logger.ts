/**
 * @file logger.ts
 * @description Utilidad de logging simple para la aplicacion.
 * Envuelve los metodos nativos de la consola (console.info, warn, error, debug)
 * agregando de manera automatica una marca de tiempo en formato ISO.
 */

/**
 * Objeto logger global para registrar eventos y diagnosticos del sistema con marcas de tiempo.
 */
export const logger = {
  /**
   * Registra un mensaje o evento informativo general.
   *
   * @param args - Argumentos a registrar en consola.
   */
  info: (...args: any[]) => console.info(new Date().toISOString(), ...args),

  /**
   * Registra un mensaje de advertencia o anomalia no critica.
   *
   * @param args - Argumentos a registrar en consola.
   */
  warn: (...args: any[]) => console.warn(new Date().toISOString(), ...args),

  /**
   * Registra un mensaje de error critico o excepcion.
   *
   * @param args - Argumentos a registrar en consola.
   */
  error: (...args: any[]) => console.error(new Date().toISOString(), ...args),

  /**
   * Registra informacion detallada para depuracion en entornos locales/desarrollo.
   *
   * @param args - Argumentos a registrar en consola.
   */
  debug: (...args: any[]) => console.debug(new Date().toISOString(), ...args),
};
