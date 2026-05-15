import { useVolumeStore } from "@/stores/volume";

let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let sourceElement: HTMLVideoElement | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
const sourceNodes = new WeakMap<HTMLVideoElement, MediaElementAudioSourceNode>();

function getAudioContext(): AudioContext | null {
  if (audioContext)
    return audioContext;

  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor)
    return null;

  audioContext = new AudioContextConstructor();
  gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  return audioContext;
}

function bindAudioGraph(element: HTMLVideoElement): void {
  if (sourceElement === element && sourceNode)
    return;

  const context = getAudioContext();
  if (!context || !gainNode)
    return;

  sourceNode?.disconnect();
  sourceElement = element;
  sourceNode = sourceNodes.get(element) ?? context.createMediaElementSource(element);
  sourceNodes.set(element, sourceNode);
  sourceNode.connect(gainNode);
}

function sync(): void {
  const { boost, isMuted, value } = useVolumeStore.getState();

  if (sourceElement) {
    sourceElement.volume = isMuted ? 0 : value;
    sourceElement.muted = isMuted;
  }

  if (gainNode)
    gainNode.gain.value = isMuted ? 0 : boost;
}

useVolumeStore.subscribe(sync);

export function bindAudioOutput(element: HTMLVideoElement | null): void {
  if (!element) {
    sourceElement = null;
    sourceNode?.disconnect();
    sourceNode = null;
    return;
  }

  bindAudioGraph(element);
  sync();
}

export async function resumeAudioOutput(): Promise<void> {
  const context = getAudioContext();
  if (context?.state === "suspended")
    await context.resume();
}
