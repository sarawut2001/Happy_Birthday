import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Film, Heart, LoaderCircle, Play, X } from 'lucide-react';
import { content } from './content';
import type { EndingPhase } from './journey';

type Props = {
  phase: EndingPhase; reduced: boolean;
  onStart: () => void; onClose: () => void; onExited: () => void;
  onPlaying: (active: boolean) => void;
};

/** A single cinema frame expands, plays the real film, then yields to the ending. */
export function EndingVideo({ phase, reduced, onStart, onClose, onExited, onPlaying }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false), [posterFailed, setPosterFailed] = useState(false);
  const [loading, setLoading] = useState(true), [needsTap, setNeedsTap] = useState(false), [holdingEnd, setHoldingEnd] = useState(false);
  const lastPresentation = useRef(phase === 'watching');
  if (phase !== 'closing') lastPresentation.current = phase === 'watching';
  const focused = lastPresentation.current, closing = phase === 'closing';
  const playable = !!content.video && !failed;
  const close = useCallback(() => { video.current?.pause(); onPlaying(false); onClose(); }, [onClose, onPlaying]);
  const latestClose = useRef(close); latestClose.current = close;
  const play = () => {
    const media = video.current;
    if (!media || !playable || closing) return;
    setNeedsTap(false);
    void media.play().catch(() => { if (media.paused && !media.error) { setLoading(false); setNeedsTap(true); } });
  };

  useEffect(() => {
    const media = video.current;
    const hide = () => { if (document.hidden) media?.pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => { media?.pause(); onPlaying(false); document.removeEventListener('visibilitychange', hide); };
  }, [onPlaying]);
  useEffect(() => {
    const media = video.current;
    if (phase === 'closing') { media?.pause(); onPlaying(false); }
    if (phase === 'watching') {
      media?.focus({ preventScroll: true });
      // Replay mounts a fresh player; request playback there as well as in the cover tap.
      if (playable && media?.paused && !media.ended) void media.play().catch(() => { if (media.paused && !media.error) { setLoading(false); setNeedsTap(true); } });
    }
  }, [phase, playable, onPlaying]);
  useEffect(() => {
    if (!holdingEnd || phase !== 'watching') return;
    if (reduced) { latestClose.current(); return; }
    let frame = 0, elapsed = 0, previous = performance.now();
    const visibility = () => { previous = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    const tick = (now: number) => {
      if (!document.hidden) elapsed += now - previous;
      previous = now;
      if (elapsed >= 800) latestClose.current(); else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [holdingEnd, phase, reduced]);

  const start = () => { if (!closing) { onStart(); play(); } };
  return <motion.section className={`ending-video-layer ${focused ? 'video-focused' : 'video-invitation'} ${holdingEnd ? 'video-last-frame' : ''}`}
    aria-labelledby="ending-video-title" aria-busy={closing} inert={closing}
    initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: closing ? 0 : 1 }}
    transition={{ duration: reduced ? 0 : 1.5, ease: 'easeInOut' }}
    onAnimationComplete={() => { if (closing) onExited(); }}>
    <motion.div className="ending-video-backdrop" aria-hidden="true" initial={false}
      animate={{ opacity: focused ? 1 : 0 }} transition={{ duration: reduced ? 0 : 1.5 }} />
    <motion.div className="ending-video-card" layout transition={{ layout: { duration: reduced ? 0 : 1.6, ease: [.22, 1, .36, 1] } }}>
      <div className="ending-video-heading"><Film size={20} aria-hidden="true" /><h2 id="ending-video-title">เรื่องของเราสองคน</h2>
        {focused && <button className="icon-button ending-video-close" aria-label="ปิดคลิปและไปหน้าสุดท้าย" onClick={close}><X size={20} /></button>}
      </div>
      <div className="ending-video-media">
        {playable && <video ref={video} className="ending-video-player" src={content.video}
          poster={content.videoPoster || undefined} controls={focused} playsInline preload="metadata"
          tabIndex={focused ? 0 : -1} aria-hidden={!focused} aria-label="วิดีโอ presentation เรื่องของเราสองคน"
          onPlay={() => { setNeedsTap(false); setHoldingEnd(false); onPlaying(true); }} onPause={() => onPlaying(false)}
          onPlaying={() => { setLoading(false); setNeedsTap(false); }} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
          onSeeking={() => setHoldingEnd(false)} onEnded={() => { onPlaying(false); setLoading(false); setHoldingEnd(true); }}
          onError={() => { setFailed(true); setLoading(false); onPlaying(false); }} />}
        {!focused && <button className="ending-video-cover" onClick={start} aria-label="ดูเรื่องของเรา ♡">
          {content.videoPoster && !posterFailed ? <img src={content.videoPoster} alt="" onError={() => setPosterFailed(true)} />
            : <span className="ending-video-art" aria-hidden="true"><Film size={60}/><span>OUR LITTLE FILM</span></span>}
          <span className="ending-video-play"><Play size={28} fill="currentColor" aria-hidden="true" /></span>
          <span className="ending-video-play-label">ดูเรื่องของเรา ♡</span>
        </button>}
        {focused && playable && !closing && !holdingEnd && (loading || needsTap) && <div className="ending-video-loading" role="status" aria-live="polite">
          {needsTap ? <button className="cinema-resume" onClick={play}><Play size={22} fill="currentColor"/> เริ่มเล่นคลิป</button>
            : <><LoaderCircle className="cinema-spinner" size={27} aria-hidden="true"/><span>กำลังโหลดเรื่องของเรา…</span></>}
        </div>}
        {focused && !playable && <div className="ending-video-empty" role="status"><Film size={44} aria-hidden="true" />
          <p>{failed ? 'คลิปนี้ยังเปิดไม่ได้' : 'เรื่องของเรากำลังเดินทางมา ♡'}</p><span>ไปหน้าสุดท้ายต่อได้เลยนะ</span></div>}
      </div>
      <div className="ending-cinema-footer"><span className="cinema-label"><Heart size={14} aria-hidden="true"/> OUR LITTLE FILM</span>
        <button className="text-button ending-video-next" onClick={close}>ไปหน้าสุดท้าย <ArrowRight size={17} aria-hidden="true" /></button>
      </div>
    </motion.div>
  </motion.section>;
}
