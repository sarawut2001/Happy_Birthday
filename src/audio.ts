import { useCallback, useEffect, useRef, useState } from 'react';
import { content } from './content';
import { StoryAudio } from './audio-engine';
import type { AudioEvent, AudioOptions, SoundCue } from './audio-cues';
import type { Journey } from './journey';

export function useSurpriseAudio(journey: Journey, videoPlaying: boolean, reduced = false) {
  const engine = useRef<StoryAudio | null>(null), preferences = useRef(false);
  const [enabled, setEnabled] = useState(false), [error, setError] = useState('');
  // Intro phases share one scope so warp cues survive phase changes.
  const scope = [journey.stage, journey.transition?.kind ?? '', journey.gift, journey.cake,
    journey.envelope, journey.world, journey.finale, journey.endingPhase].join(':');
  const video = videoPlaying || journey.stage === 6 && journey.finale === 'end' && ['watching', 'closing'].includes(journey.endingPhase);
  const quiet = journey.stage === 4 || journey.stage === 6 && journey.finale === 'end';
  // Keep music and event cues; the sustained cosmic loop sounded like a stuck effect.
  const ambience = false;
  const current = useRef({ scope, video, quiet, ambience, reduced }); current.current = { scope, video, quiet, ambience, reduced };
  useEffect(() => {
    const audio = new StoryAudio(`${import.meta.env.BASE_URL}assets/audio/`, content.music, setError); engine.current = audio;
    const receive = (e: Event) => {
      const { name, options } = (e as CustomEvent<AudioEvent>).detail;
      audio.setScope(current.current.scope);
      if (name === 'hold-start' || name === 'hold-progress') audio.charge(options?.progress ?? 0);
      else if (name === 'hold-stop') audio.stopCharge();
      else audio.play(name, options);
    };
    const visibility = () => audio.visibility(document.hidden);
    window.addEventListener('hbd:sound', receive); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('hbd:sound', receive); document.removeEventListener('visibilitychange', visibility); audio.dispose(); engine.current = null; };
  }, []);
  useEffect(() => { engine.current?.setScope(scope); engine.current?.setMix({ quiet, ambience, video, reduced }); }, [scope, quiet, ambience, video, reduced]);
  const toggle = useCallback(() => {
    preferences.current = !preferences.current; setEnabled(preferences.current);
    void engine.current?.enable(preferences.current).then(() => {
      if (engine.current && !engine.current.enabled) { preferences.current = false; setEnabled(false); }
    });
  }, []);
  const sound = useCallback((name: SoundCue, options?: AudioOptions) => { engine.current?.setScope(current.current.scope); engine.current?.play(name, options); }, []);
  const reset = useCallback(() => { engine.current?.clear(); }, []);
  const setVideoActive = useCallback((active: boolean) => {
    // Pause/unmount events cannot resume music while the video panel remains open.
    engine.current?.setMix({ ...current.current, video: active || current.current.video });
  }, []);
  return { enabled, toggle, sound, reset, setVideoActive, error };
}
