import { clips } from './data';

// Replace these mock functions with fetch calls when the backend is ready.
export async function searchClips(query) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return { query, results: clips };
}

export async function searchScript(script) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const sentences = script.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 20);
  return sentences.map((sentence, index) => ({ scene_index: index + 1, sentence, results: clips.slice(index % 3, (index % 3) + 2) }));
}

export async function uploadLibrary(file, onProgress) {
  for (let progress = 10; progress <= 100; progress += 10) {
    await new Promise((resolve) => setTimeout(resolve, 90));
    onProgress(progress);
  }
  return { status: 'ready', clips: 47, segments: 214, fileName: file.name };
}
