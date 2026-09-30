import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Heart, LockKeyhole, Mail, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { content, chapters } from './content';
import { useSurpriseAudio } from './audio';

const Scene = lazy(() => import('./Scene'));
class SceneBoundary extends Component<{ children:ReactNode; onError:()=>void },{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error,info:ErrorInfo){console.warn('3D scene unavailable',error.message,info.componentStack);this.props.onError();}
  render(){return this.state.failed?<div className="scene-fallback"><Heart size={88} strokeWidth={1}/><p>ความทรงจำของเรา</p><span>เครื่องนี้แสดงฉาก 3D ไม่ได้ แต่ยังเปิดของขวัญและอ่านทุกข้อความได้เลยนะ</span></div>:this.props.children;}
}

function MemoryDialog({index,onClose}:{index:number|null;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(index!==null)ref.current?.showModal();else ref.current?.close();},[index]);
  const memory=index!==null?content.memories[index]:null;
  return <dialog ref={ref} className="memory-dialog" onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}} aria-labelledby="dialog-title">
    {memory&&<><button className="icon-button close-dialog" onClick={onClose} aria-label="ปิดรูป"><X size={20}/></button><img src={memory.image} alt={memory.alt}/><div className="dialog-copy"><p className="eyebrow">{memory.date}</p><h2 id="dialog-title">{memory.title}</h2><p>{memory.caption}</p>{memory.sample&&<span className="sample-label">ภาพตัวอย่าง · รอรูปของเรา</span>}</div></>}
  </dialog>;
}

function Credits({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="credits-dialog" onCancel={onClose} aria-labelledby="credits-title"><button className="icon-button close-dialog" onClick={onClose} aria-label="ปิดเครดิต"><X size={20}/></button><p className="eyebrow">THE LITTLE DETAILS</p><h2 id="credits-title">Made with a little help</h2><p>โมเดล <a href="https://poly.pizza/m/uio7lWWJo3" target="_blank" rel="noreferrer">Present</a> โดย <a href="https://poly.pizza/u/J-Toastie" target="_blank" rel="noreferrer">J-Toastie</a> ใช้ภายใต้ <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> ปรับสีเป็นชมพูและแยกฝาเพื่อทำแอนิเมชัน</p><p>เพลง Classical 4 — Jonny S. และเสียง Camera shutter click, Page turn single, Fairy magic sparkle จาก <a href="https://mixkit.co/" target="_blank" rel="noreferrer">Mixkit</a> ภายใต้ Mixkit Free License</p><p>ภาพประกอบตัวอย่างสร้างขึ้นสำหรับเว็บนี้ เปลี่ยนเป็นภาพของเราได้ภายหลัง</p></dialog>;
}

export default function App() {
  const reduced=!!useReducedMotion();
  const [stage,setStage]=useState(0), [visited,setVisited]=useState(0), [pin,setPin]=useState('');
  const [pinError,setPinError]=useState(''),[giftOpen,setGiftOpen]=useState(false);
  const [memory,setMemory]=useState(0),[selectedMemory,setSelectedMemory]=useState<number|null>(null);
  const [finished,setFinished]=useState(false),[credits,setCredits]=useState(false),[ready,setReady]=useState(false);
  const [paragraphs,setParagraphs]=useState(reduced?content.letter.length:1);
  const [flowing,setFlowing]=useState(false),[videoFailed,setVideoFailed]=useState(false);
  const titleRef=useRef<HTMLHeadingElement>(null),pinRef=useRef<HTMLInputElement>(null),videoRef=useRef<HTMLVideoElement>(null);
  const swipeStart=useRef<number|null>(null);
  const audio=useSurpriseAudio();
  const markReady=useCallback(()=>setReady(true),[]);
  const go=(next:number)=>{setStage(next);setVisited(v=>Math.max(v,next));setFlowing(false);audio.setVideoActive(false);window.scrollTo({top:0,behavior:'instant'});};
  const focusScene=useCallback((node:HTMLHeadingElement|null)=>{
    titleRef.current=node;
    if(node){node.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  },[]);
  useEffect(()=>{
    if(stage!==2||paragraphs>=content.letter.length)return;
    const t=window.setTimeout(()=>setParagraphs(p=>p+1),reduced?0:1700); return()=>clearTimeout(t);
  },[stage,paragraphs,reduced]);
  useEffect(()=>{
    if(!flowing||stage!==3)return;
    const t=window.setInterval(()=>setMemory(i=>{if(i>=content.memories.length-1){setFlowing(false);return i;}return i+1;}),5500);
    return()=>clearInterval(t);
  },[flowing,stage]);
  useEffect(()=>{if(reduced)setFlowing(false);},[reduced]);
  useEffect(()=>{
    const hide=()=>{if(document.hidden){setFlowing(false);videoRef.current?.pause();}};
    document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);
  },[]);
  const unlock=(event:React.FormEvent)=>{
    event.preventDefault();
    if(pin===content.pin){setPinError('');go(1);}
    else {setPinError('ยังไม่ใช่นะ ลองนึกถึงวันแรกของเราอีกที ♡');pinRef.current?.focus();}
  };
  const openGift=()=>{if(stage!==1||giftOpen)return;setGiftOpen(true);audio.sound('gift');};
  const nextPhoto=(direction:number)=>{setFlowing(false);setMemory(i=>Math.min(content.memories.length-1,Math.max(0,i+direction)));audio.sound('photo');};
  const chooseMemory=useCallback((i:number)=>{if(stage===4)setSelectedMemory(i);else if(stage===3){setMemory(i);setFlowing(false);}},[stage]);
  const replay=()=>{videoRef.current?.pause();audio.setVideoActive(false);setGiftOpen(false);setMemory(0);setFinished(false);setParagraphs(reduced?content.letter.length:1);go(1);};
  const finish=()=>{videoRef.current?.pause();audio.setVideoActive(false);setFinished(true);audio.sound('gift');};
  const primary=(label:string,onClick:()=>void,icon:ReactNode=<ArrowRight size={18} aria-hidden="true"/>)=><button className="primary-button" onClick={onClick}><span>{label}</span>{icon}</button>;
  const current=content.memories[memory];
  return <div className={`app stage-${stage}${(stage===5&&finished)?' is-finished':''}`}>
    <a className="skip-link" href="#main">ข้ามไปเนื้อหา</a>
    <header className="header"><div className="brand"><Heart size={20} strokeWidth={1.5} aria-hidden="true"/><span>our memory box<span className="brand-dot">.</span></span></div><button className="sound-button" onClick={audio.toggle} aria-pressed={audio.enabled}>{audio.enabled?<Volume2 size={17} aria-hidden="true"/>:<VolumeX size={17} aria-hidden="true"/>}<span>{audio.enabled?'เพลงเปิดอยู่':'เปิดเพลง'}</span></button></header>
    <main id="main" className="journey">
      <div className="copy-column">
        <AnimatePresence mode="wait"><motion.section key={`${stage}-${finished}`} className="scene-copy" initial={{opacity:0,y:reduced?0:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-10}} transition={{duration:reduced?0:0.35}}>
          <p className="eyebrow"><span className="eyebrow-line"/> {['A LITTLE SECRET, JUST FOR YOU','A LITTLE GIFT, A LOT OF LOVE','WORDS FROM MY HEART','LITTLE MOMENTS, BIG FEELINGS','ALL OUR LITTLE MOMENTS','ONE LAST THING, FROM ME'][stage]}</p>
          <div className="chapter-label"><span>0{stage+1}</span><span>{chapters[stage]}</span></div>
          {stage===0&&<>
            <h1 ref={focusScene} tabIndex={-1}>มีอะไรเล็ก ๆ<br/>อยากให้<span className="pink-word">เธอดู</span><span className="title-heart">♡</span></h1>
            <p className="intro">เก็บความทรงจำของเราใส่กล่องไว้<br/>วันนี้อยากชวนเธอค่อย ๆ เปิดไปด้วยกัน</p>
            <form onSubmit={unlock} className="pin-form"><label htmlFor="secret-pin">ก่อนเปิด… ขอถามอะไรหน่อย</label><p id="pin-hint" className="hint">{content.hint}</p><div className={`pin-control${pinError?' has-error':''}`}><div className="pin-slots" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={pin.length===i?'current':''}>{pin[i]||<i/>}</span>)}</div><input ref={pinRef} id="secret-pin" type="text" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setPinError('');}} aria-describedby={`pin-hint${pinError?' pin-error':''}`} aria-invalid={!!pinError} aria-label="รหัสวันแรกที่คบกัน 6 หลัก"/></div><p id="pin-error" className="input-message" role="status">{pinError||'วันที่มีความหมายกับเราสองคน'}</p><button type="submit" className="primary-button" disabled={pin.length!==6}><span>เปิดกล่องของเรา</span><LockKeyhole size={17} aria-hidden="true"/></button></form>
            <p className="tiny-note"><Heart size={12} aria-hidden="true"/> ทำด้วยใจ ให้เธอคนเดียว</p>
          </>}
          {stage===1&&<>
            <h1 ref={focusScene} tabIndex={-1}>{giftOpen?<>สุขสันต์วันเกิด<br/><span className="pink-word">นะ {content.nickname}</span></>:<>กล่องนี้…<br/><span className="pink-word">เป็นของเธอนะ</span></>}</h1>
            <p className="intro">{giftOpen?'เราตั้งใจทำไว้ให้เธอคนเดียวเลย ค่อย ๆ เปิดไปทีละหน้านะ':<>ของขวัญเล็ก ๆ ที่มีเรื่องของเราอยู่ข้างใน<br/>ลองแตะที่กล่อง แล้วดูสิ</>}</p>
            {giftOpen?<><div className="personal-note"><Sparkles size={19} aria-hidden="true"/><span>มีความรู้สึกอีกเยอะเลย ที่อยากบอกเธอ</span></div>{primary('อ่านจดหมายจากเรา',()=>{audio.sound('letter');go(2);},<Mail size={18} aria-hidden="true"/>)}</>:primary('แกะของขวัญเลย',openGift,<Sparkles size={18} aria-hidden="true"/>)}
          </>}
          {stage===2&&<>
            <h1 ref={focusScene} tabIndex={-1}>ถึงเธอ…<br/><span className="pink-word">คนโปรดของเรา</span></h1>
            <div className="letter-paper"><span className="letter-corner"/><div className="letter-content">{content.letter.slice(0,paragraphs).map((p,i)=><motion.p key={i} initial={{opacity:reduced?1:0}} animate={{opacity:1}}>{p}</motion.p>)}</div>{paragraphs<content.letter.length?<button className="text-button" onClick={()=>setParagraphs(content.letter.length)}>อ่านทั้งหมด <ArrowRight size={15}/></button>:<p className="signature">{content.signature} <Heart size={14}/></p>}</div>
            {primary('ไปดูความทรงจำของเรา',()=>go(3))}
          </>}
          {stage===3&&<>
            <h1 ref={focusScene} tabIndex={-1}>บางความทรงจำ<br/><span className="pink-word">ยังยิ้มได้เสมอ</span></h1>
            <p className="intro">แต่ละรูป มีเรื่องของเราอยู่ในนั้น</p>
            <AnimatePresence mode="wait"><motion.div key={memory} className="memory-caption" initial={{opacity:0,y:reduced?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><p className="photo-date">{current.date}</p><h2>{current.title}</h2><p>{current.caption}</p>{current.sample&&<span className="sample-label">ภาพตัวอย่าง · รอรูปของเรา</span>}</motion.div></AnimatePresence>
            <div className="memory-controls" onFocusCapture={()=>setFlowing(false)}><button className="icon-button" onClick={()=>nextPhoto(-1)} disabled={memory===0} aria-label="รูปก่อนหน้า"><ChevronLeft size={21}/></button><span className="photo-count"><strong>{String(memory+1).padStart(2,'0')}</strong><span> / {String(content.memories.length).padStart(2,'0')}</span></span><button className="icon-button" onClick={()=>nextPhoto(1)} disabled={memory===content.memories.length-1} aria-label="รูปถัดไป"><ChevronRight size={21}/></button><button className="flow-button" aria-pressed={flowing} onClick={()=>{if(memory===content.memories.length-1)setMemory(0);setFlowing(v=>!v);}}>{flowing?<Pause size={16}/>:<Play size={16}/>}<span>{flowing?'หยุดภาพ':'ชมต่อเนื่อง'}</span></button></div>
            {primary('เก็บทุกภาพไว้ด้วยกัน',()=>go(4))}
          </>}
          {stage===4&&<>
            <h1 ref={focusScene} tabIndex={-1}>ทุกช่วงเวลา<br/><span className="pink-word">ดีใจที่มีเธอ</span></h1>
            <p className="intro">รูปเล็ก ๆ จากวันธรรมดา<br/>รวมกันแล้วกลายเป็นเรื่องโปรดของเรา</p>
            <div className="memory-thumbnails" aria-label="เปิดดูความทรงจำแต่ละรูป">{content.memories.map((m,i)=><button key={m.title} onClick={()=>setSelectedMemory(i)} aria-label={`ดูรูป ${m.title}`}><img src={m.image} alt=""/><span>{String(i+1).padStart(2,'0')}</span></button>)}</div>
            {primary('มีอีกอย่างอยากบอก',()=>go(5))}<p className="tiny-note">แตะที่ภาพ เพื่อกลับไปอ่านเรื่องของเรา</p>
          </>}
          {stage===5&&<>
            <h1 ref={focusScene} tabIndex={-1}>{finished?<>รักเธอ<br/><span className="pink-word">ในทุก ๆ วัน</span></>:<>สุดท้ายนี้…<br/><span className="pink-word">อยากบอกด้วยตัวเอง</span></>}</h1>
            <p className="intro">{finished?content.final:'มีบางอย่างที่พิมพ์เท่าไรก็ไม่เหมือนบอกเธอด้วยตัวเอง'}</p>
            {!finished&&(content.video&&!videoFailed?<video ref={videoRef} className="birthday-video" src={content.video} poster={content.videoPoster||undefined} controls playsInline preload="metadata" onPlay={()=>audio.setVideoActive(true)} onPause={()=>audio.setVideoActive(false)} onEnded={finish} onError={()=>{setVideoFailed(true);audio.setVideoActive(false);}} aria-label="วิดีโออวยพรวันเกิดจากเรา"/>:<div className="video-placeholder"><div className="video-play"><Play size={24} fill="currentColor"/></div><span>{videoFailed?'วิดีโอนี้ยังเปิดไม่ได้':'ตรงนี้จะเป็นวิดีโอจากเรา'}</span><p>{videoFailed?'ยังอ่านข้อความสุดท้ายได้เลยนะ':'เก็บที่ว่างไว้สำหรับคำอวยพรที่เราจะอัดให้เธอ'}</p></div>)}
            {finished?<><div className="final-note"><Heart size={25}/><span>Happy birthday, my favorite person.</span></div>{primary('เปิดความทรงจำอีกครั้ง',replay,<RotateCcw size={17}/>)}</>:primary('เปิดข้อความสุดท้าย',finish,<Heart size={17}/>)}
          </>}
        </motion.section></AnimatePresence>
        {stage>0&&<button className="back-link" onClick={()=>go(stage-1)}><ArrowLeft size={15}/> กลับไปก่อนหน้า</button>}
      </div>
      <div className="visual-column" onPointerDown={e=>{swipeStart.current=e.clientX;}} onPointerUp={e=>{if(stage===3&&swipeStart.current!==null&&Math.abs(e.clientX-swipeStart.current)>65)nextPhoto(e.clientX<swipeStart.current?1:-1);swipeStart.current=null;}} onPointerCancel={()=>{swipeStart.current=null;}}>
        <div className="orbital orbital-one"/><div className="orbital orbital-two"/>
        <div className="visual-kicker"><span className="small-star">✧</span><span>{stage===3?'a collection of us':stage===4?'together, always':'made with love, kept forever'}</span></div>
        <div className="canvas-wrap" aria-hidden="true"><SceneBoundary onError={markReady}><Suspense fallback={null}><Scene stage={stage} memory={memory} giftOpen={stage===1&&giftOpen} reduced={reduced} finished={stage===5&&finished} onGift={openGift} onMemory={chooseMemory} onReady={markReady}/></Suspense></SceneBoundary></div>
        {!ready&&<div className="scene-loading" role="status"><span className="loading-heart"><Heart size={23}/></span>กำลังจัดของขวัญให้เธอ…</div>}
        <div className="object-caption"><span className="caption-rule"/><span>{stage===0?'A BOX FULL OF OUR LITTLE MOMENTS':stage===1?(giftOpen?'THE BEST THINGS COME FROM THE HEART':'TAP THE GIFT. THERE’S SOMETHING INSIDE.'):stage===2?'A LETTER, JUST FOR YOU':stage===3?`MEMORY ${String(memory+1).padStart(2,'0')} — ${String(content.memories.length).padStart(2,'0')}`:stage===4?'OUR STORY, IN LITTLE PICTURES':'WITH LOVE, ALWAYS'}</span><span className="caption-rule"/></div>
        <div className="handwritten">{stage===0?'for my favorite person':stage===1?'a little surprise for you':stage===2?'every word, from my heart':stage===3?'remember this feeling?':stage===4?'my favorite place is with you':'here’s to more days with you'}<svg viewBox="0 0 85 26" aria-hidden="true"><path d="M4 9c27 14 44 11 72-3M67 4l12 1-6 10"/></svg></div>
      </div>
    </main>
    <footer className="footer"><div className="footer-note">a little birthday story <span>♡</span></div><nav className="chapters" aria-label="ลำดับเรื่องราว">{chapters.map((label,i)=><button key={label} disabled={i>visited} onClick={()=>go(i)} className={`${stage===i?'active ':''}${i<stage?'complete':''}`} aria-label={`ฉาก ${i+1}: ${label}`} aria-current={stage===i?'step':undefined}>{i<stage?<Check size={11}/>:<span/>}</button>)}</nav><button className="credits-button" onClick={()=>setCredits(true)}>รายละเอียดเล็ก ๆ</button></footer>
    <p className="audio-error" role="status">{audio.error}</p>
    <MemoryDialog index={selectedMemory} onClose={()=>setSelectedMemory(null)}/>
    {credits&&<Credits onClose={()=>setCredits(false)}/>}
  </div>;
}
