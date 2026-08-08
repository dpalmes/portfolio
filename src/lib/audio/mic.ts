/**
 * Microphone capture for pitch detection.
 *
 * The constraints matter more than the plumbing. Browsers default to the
 * processing chain designed for speech — echo cancellation, noise suppression
 * and automatic gain — and every one of those is actively harmful here. Noise
 * suppression treats a sustained tone as stationary noise and attenuates it,
 * AGC hides the decay of a plucked note, and echo cancellation can subtract the
 * very signal being measured. All three are turned off.
 */

import { getAudioContext } from "./engine";

export interface MicrophoneSession {
  context: AudioContext;
  analyser: AnalyserNode;
  stream: MediaStream;
  /**
   * Reusable scratch buffer sized to the analyser. Allocating one per frame
   * would hand the garbage collector 60 buffers a second, and a GC pause is
   * exactly what a real-time loop cannot afford.
   *
   * Explicitly backed by an ArrayBuffer rather than an ArrayBufferLike:
   * `getFloatTimeDomainData` will not accept a possibly-shared buffer.
   */
  buffer: Float32Array<ArrayBuffer>;
  stop(): void;
}

export class MicrophoneError extends Error {
  constructor(
    message: string,
    /** Machine-readable reason, so the UI can offer the right advice. */
    readonly reason:
      | "unsupported"
      | "insecure"
      | "denied"
      | "not-found"
      | "unknown",
  ) {
    super(message);
    this.name = "MicrophoneError";
  }
}

export async function startMicrophone(
  fftSize = 4096,
): Promise<MicrophoneSession> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    // getUserMedia is missing entirely on http:// origins other than
    // localhost, which is by far the most common cause of this branch.
    throw new MicrophoneError(
      typeof window !== "undefined" && !window.isSecureContext
        ? "Microphone access needs a secure connection (https)."
        : "This browser does not support microphone capture.",
      typeof window !== "undefined" && !window.isSecureContext
        ? "insecure"
        : "unsupported",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
  } catch (cause) {
    const name = cause instanceof Error ? cause.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new MicrophoneError(
        "Microphone permission was denied. Allow it in your browser's site settings and try again.",
        "denied",
      );
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      throw new MicrophoneError("No microphone was found.", "not-found");
    }
    throw new MicrophoneError(
      "Could not open the microphone.",
      "unknown",
    );
  }

  const context = await getAudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = fftSize;
  // The detector does its own smoothing in the pitch domain; smoothing the
  // time-domain data here would just blur the waveform it analyses.
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);

  // Deliberately not connected to the destination — routing the microphone to
  // the speakers would feed back.

  return {
    context,
    analyser,
    stream,
    buffer: new Float32Array(analyser.fftSize),
    stop() {
      source.disconnect();
      analyser.disconnect();
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
