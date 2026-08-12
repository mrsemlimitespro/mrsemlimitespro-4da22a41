/**
 * GeolocationService — posição atual (GPS).
 *
 * Fase atual: contrato. Implementação usará @capacitor/geolocation na
 * plataforma nativa. Web fallback poderia usar navigator.geolocation, mas
 * está desativado nesta fase.
 */
import { type NativeResult, notImplemented } from "./types";

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export const GeolocationService = {
  async getCurrent(): Promise<NativeResult<Position>> {
    return notImplemented("GeolocationService.getCurrent");
  },
  async watch(_cb: (p: Position) => void): Promise<NativeResult<() => void>> {
    return notImplemented("GeolocationService.watch");
  },
};
