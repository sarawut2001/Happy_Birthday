import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, RotateCcw, Sparkles, Ticket, Utensils, Clapperboard, Trees, Luggage, Compass, X } from 'lucide-react';
import { content } from './content';
import type { DateMachine } from './date-machine';

const icons=[Utensils,Compass,Clapperboard,Trees,Luggage];
const status={ready:'',spinning:'กำลังเลือกเดตของเรา…',capsule:'แคปซูลพร้อมเปิดแล้ว',opening:'กำลังเปิดตั๋วเดต…',revealed:''};
export function DateCapsule({ machine, reduced, sceneFailed }: { machine:DateMachine; reduced:boolean; sceneFailed:boolean }) {
  const {state,spin,open,save,newRound}=machine;
  const [collection,setCollection]=useState(false);
  const anchor=useRef<HTMLDivElement>(null), ticket=useRef<HTMLElement>(null), action=useRef<HTMLButtonElement>(null), collectionButton=useRef<HTMLButtonElement>(null);
  const revealed=state.phase==='revealed', complete=state.opened.length===content.promises.length, saved=state.chosen!==null&&state.saved.includes(state.chosen);
  const busy=state.phase==='spinning'||state.phase==='opening', Icon=icons[state.chosen??0];
  useEffect(()=>{
    const element=anchor.current;if(!element)return;
    const measure=()=>{const r=element.getBoundingClientRect();window.dispatchEvent(new CustomEvent('hbd:capsule-layout',{detail:{x:r.x,y:r.y,width:r.width,height:r.height}}));window.dispatchEvent(new Event('hbd:guide-layout'));};
    const observer=new ResizeObserver(measure);observer.observe(element);window.addEventListener('resize',measure);document.addEventListener('scroll',measure,true);measure();
    // Publish settled positions after the panel's entrance transform.
    const timer=window.setTimeout(measure,1700);
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);document.removeEventListener('scroll',measure,true);window.clearTimeout(timer);};
  },[revealed,collection]);
  useEffect(()=>{if(revealed)ticket.current?.focus({preventScroll:true});else if(state.phase==='capsule')action.current?.focus({preventScroll:true});},[revealed,state.phase]);
  useEffect(()=>{if(!collection)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setCollection(false);}};window.addEventListener('keydown',close,true);return()=>{window.removeEventListener('keydown',close,true);requestAnimationFrame(()=>collectionButton.current?.focus({preventScroll:true}));};},[collection]);
  const allTickets=[...new Set([...state.saved,...state.opened])];
  return <div className={`date-capsule ${revealed?'with-ticket':''}`} data-capsule-phase={state.phase}>
    <div className="date-activity-content" inert={collection}>
      <header className="capsule-heading"><p className="panel-kicker">OUR NEXT LITTLE DATE</p><h2>{content.activityTitles.promise}</h2>
        <div className="capsule-topline"><span>เปิดแล้ว {state.opened.length} / {content.promises.length}</span><button ref={collectionButton} className="capsule-collection-button" disabled={!allTickets.length} onClick={()=>setCollection(true)}><Ticket size={17}/> ดูตั๋วของเรา <span>{allTickets.length}</span></button></div>
      </header>
      <div className="capsule-stage">
        <div ref={anchor} className="capsule-model-anchor">
          {sceneFailed&&<div className="capsule-fallback" aria-hidden="true"><span><Heart size={30}/></span><Ticket size={55}/></div>}
          {!revealed&&<button className="capsule-model-hit" disabled={busy} aria-label={state.phase==='capsule'?'แตะแคปซูลเพื่อเปิดตั๋วเดต':'แตะมือหมุนเพื่อสุ่มตั๋วเดต'} onClick={state.phase==='capsule'?open:spin}/>}
        </div>
        <AnimatePresence>{revealed&&state.chosen!==null&&<motion.article key={`${state.round}-${state.serial}`} ref={ticket} tabIndex={-1} className="date-ticket" aria-label="ตั๋วเดตที่สุ่มได้" initial={{opacity:0,y:reduced?0:65,rotateX:reduced?0:22,scale:reduced?1:.85}} animate={{opacity:1,y:0,rotateX:0,scale:1}} exit={{opacity:0,y:reduced?0:24,scale:reduced?1:.9}} transition={{duration:reduced?0:1.15,ease:[.22,1,.36,1]}}>
          <div className="ticket-header"><span>FOR MY FAVORITE PERSON</span><span>0{state.chosen+1} / 05</span></div>
          <span className="ticket-icon" aria-hidden="true"><Icon size={32}/></span><p className="ticket-promise">{content.promises[state.chosen]}</p>
          <div className="ticket-perforation" aria-hidden="true"/><div className="ticket-footer"><span>เดตครั้งต่อไปของเรา</span><Heart size={18} fill="currentColor"/></div>
          <AnimatePresence>{saved&&<motion.span className="ticket-kept" initial={{opacity:0,scale:reduced?1:1.3,rotate:reduced?0:-22}} animate={{opacity:1,scale:1,rotate:-9}} transition={{duration:.6}}><Check size={14}/> เก็บไว้แล้ว</motion.span>}</AnimatePresence>
        </motion.article>}</AnimatePresence>
      </div>
      <div className="capsule-actions" aria-busy={busy}>
        <p className="capsule-status" role="status" aria-live="polite">{status[state.phase]}</p>
        {revealed?<><button ref={action} className="primary-button capsule-save" onClick={save} disabled={saved}><span>{saved?<><Check size={17}/> เก็บไว้ไปด้วยกันแล้ว</>:<><Heart size={17}/> เก็บไว้ไปด้วยกัน ♡</>}</span></button>
          <button className="capsule-secondary" onClick={complete?newRound:spin}><RotateCcw size={17}/>{complete?'เริ่มสุ่มใหม่':'สุ่มอีกครั้ง'}</button></>
          :<button ref={action} className="primary-button" disabled={busy} onClick={state.phase==='capsule'?open:spin}><span><Sparkles size={17}/>{state.phase==='capsule'?'เปิดแคปซูล':busy?'รอลุ้นแป๊บนึง…':'หมุนเลย ♡'}</span></button>}
      </div>
    </div>
    <AnimatePresence>{collection&&<motion.section className="date-collection" aria-label="ตั๋วเดตของเรา" initial={{opacity:0,y:reduced?0:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.45}}>
      <header><Ticket size={23}/><h3>ตั๋วเดตของเรา</h3><button className="icon-button" aria-label="ปิดตั๋วและกลับไปหมุน" autoFocus onClick={()=>setCollection(false)}><X size={18}/></button></header>
      <div className="date-collection-list">{allTickets.map(i=>{const Symbol=icons[i];return <article key={i}><Symbol size={24}/><p>{content.promises[i]}</p><span>{state.saved.includes(i)?<Check size={19} aria-label="เก็บไว้แล้ว"/>:<Heart size={19}/>}</span></article>;})}</div>
      <button className="capsule-secondary" onClick={()=>setCollection(false)}>กลับไปหมุนด้วยกัน</button>
    </motion.section>}</AnimatePresence>
  </div>;
}
