"use strict";
/**
 * @file logger.ts
 * @description Utilidad de logging simple para la aplicacion.
 * Envuelve los metodos nativos de la consola (console.info, warn, error, debug)
 * agregando de manera automatica una marca de tiempo en formato ISO.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/**
 * Objeto logger global para registrar eventos y diagnosticos del sistema con marcas de tiempo.
 */
exports.logger = {
    /**
     * Registra un mensaje o evento informativo general.
     *
     * @param args - Argumentos a registrar en consola.
     */
    info: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.info.apply(console, __spreadArray([new Date().toISOString()], args, false));
    },
    /**
     * Registra un mensaje de advertencia o anomalia no critica.
     *
     * @param args - Argumentos a registrar en consola.
     */
    warn: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.warn.apply(console, __spreadArray([new Date().toISOString()], args, false));
    },
    /**
     * Registra un mensaje de error critico o excepcion.
     *
     * @param args - Argumentos a registrar en consola.
     */
    error: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.error.apply(console, __spreadArray([new Date().toISOString()], args, false));
    },
    /**
     * Registra informacion detallada para depuracion en entornos locales/desarrollo.
     *
     * @param args - Argumentos a registrar en consola.
     */
    debug: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.debug.apply(console, __spreadArray([new Date().toISOString()], args, false));
    },
};
