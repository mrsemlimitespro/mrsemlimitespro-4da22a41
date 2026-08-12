/**
 * MicrophoneService — captura de áudio (voz).
 *
 * Fase atual: contrato. Implementação usará plugin de gravação
 * (ex: capacitor-voice-recorder) ou MediaRecorder na web.
 */
import { type NativeResult, notImplemented } from "./types";

export interface AudioRecording {
  path: string;
  durationMs: number;
  mimeType: string;
}

export const MicrophoneService = {
  async startRecording(): Promise<NativeResult<void>> {
    return notImplemented("MicrophoneService.startRecording");
  },
  async stopRecording(): Promise<NativeResult<AudioRecording>> {
    return notImplemented("MicrophoneService.stopRecording");
  },
};
