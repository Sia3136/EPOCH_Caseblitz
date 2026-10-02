import ResultCard from './ResultCard';

export default function SceneBlock({ scene, onPlay }) {
  return <article className="scene"><div className="scene-number">{String(scene.scene_index).padStart(2, '0')}</div><div><p className="scene-sentence">{scene.sentence}</p><div className="scene-results">{scene.results.map((clip) => <ResultCard key={clip.file} clip={clip} compact onPlay={onPlay} />)}</div></div></article>;
}
