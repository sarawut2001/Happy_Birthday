import { useEffect, useRef, useState } from 'react';
import { content } from './content';

export function useSurpriseAudio() {
  const music = useRef<HTMLAudioElement | null>(null);
  const effects = useRef<Partial<Record<keyof typeof content.sounds, HTMLAudioElement>>>({});
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const enabledRef = useRef(false);
  const videoActive = useRef(false);
  useEffect(() => {
    const audio = new Audio(content.music);
    audio.loop = true; audio.volume = 0.24; audio.preload = 'none'; music.current = audio;
    return () => { audio.pause(); Object.values(effects.current).forEach(a => a?.pause()); };
  }, []);
  const playMusic = () => {
    if (videoActive.current || document.hidden) return;
    void music.current?.play().then(() => setError('')).catch(() => {
      setError('เปิดเพลงไม่ได้ ลองแตะปุ่มเพลงอีกครั้งนะ'); enabledRef.current = false; setEnabled(false);
    });
  };
  const toggle = () => {
    enabledRef.current = !enabledRef.current; setEnabled(enabledRef.current);
    if (enabledRef.current) playMusic(); else { music.current?.pause(); Object.values(effects.current).forEach(a => a?.pause()); }
  };
  const sound = (name: keyof typeof content.sounds) => {
    if (!enabledRef.current || videoActive.current) return;
    const a = effects.current[name] ?? new Audio(content.sounds[name]);
    effects.current[name] = a; a.volume = name === 'gift' ? 0.2 : 0.35; a.currentTime = 0;
    void a.play().catch(() => {});
  };
  const setVideoActive = (active: boolean) => {
    videoActive.current = active;
    if (active) music.current?.pause(); else if (enabledRef.current) playMusic();
  };
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) { music.current?.pause(); Object.values(effects.current).forEach(a=>a?.pause()); }
      else if (enabledRef.current && !videoActive.current) playMusic();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  return { enabled, toggle, sound, setVideoActive, error };
}
