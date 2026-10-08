// Original stylized effects, generated deterministically without dependencies.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../public/assets/audio/', import.meta.url), rate = 24000;
await mkdir(out, { recursive: true });
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
async function render(name, seconds, kind) {
  let seed = [...name].reduce((s,c) => ((s*31+c.charCodeAt(0))>>>0), 17);
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296*2-1; };
  const count = Math.floor(seconds*rate), samples = new Float32Array(count*2), notes = [523.251,659.255,783.991,1046.502];
  let brown = 0, soft = 0, peak = 0;
  for (let i=0;i<count;i++) {
    const t=i/rate,p=t/seconds,n=random(); brown=.985*brown+.015*n;soft=.7*soft+.3*n;
    let env=smooth(t/.07)*smooth((seconds-t)/.22),pan=.25*Math.sin(p*Math.PI*2),v=0;
    if (['magic','travel','return','twinkle'].includes(kind)) {
      // Noise-free music-box tones: soft attacks and rounded tails replace the surf-like swell.
      const melody=kind==='return'?[3,2,1,0]:kind==='travel'?[0,1,2,3,2,3]:kind==='twinkle'?[1,2,3]:[0,1,2,3];
      const gap=kind==='return'?.72:kind==='travel'?.32:kind==='twinkle'?.16:.34;
      for(let k=0;k<melody.length;k++) {
        const age=t-k*gap;
        if(age<0)continue;
        const f=notes[melody[k]],hit=smooth(age/.055)*Math.exp(-age*2.4);
        v+=hit*(.12*Math.sin(2*Math.PI*f*age)+.018*Math.sin(2*Math.PI*f*2*age)*Math.exp(-age*2));
      }
      // A very quiet harmonic bed fills the travel/gather without wind or low rumble.
      if(['travel','return'].includes(kind))v+=.012*Math.sin(Math.PI*p)**2*(Math.sin(2*Math.PI*523.251*t)+.5*Math.sin(2*Math.PI*659.255*t));
      pan=.16*Math.sin(p*Math.PI);
    } else if (kind==='breath') {
      const shape=Math.sin(Math.PI*p)**1.3;v=(brown*4+soft*.16)*shape;
    } else if(['paper','ribbon','lid','door'].includes(kind)) {
      // Discrete rounded taps/plucks, without sustained noise or an air-like swell.
      const tones=kind==='paper'?[659.255,783.991]:kind==='ribbon'?[783.991,1046.502]:kind==='door'?[261.626,392,523.251]:[392,523.251,783.991];
      const gap=kind==='ribbon'?.13:kind==='paper'?.23:.25;
      for(let k=0;k<tones.length;k++) {
        const age=t-k*gap;if(age<0)continue;
        const hit=smooth(age/.022)*Math.exp(-age*(kind==='paper'?12:kind==='door'?6:8));
        v+=hit*(.14*Math.sin(2*Math.PI*tones[k]*age)+.022*Math.sin(2*Math.PI*tones[k]*2*age));
      }
    } else if(['formation','celebrate','resolve'].includes(kind)) {
      const gap=kind==='celebrate'?.19:kind==='resolve'?.28:.38,noteCount=kind==='formation'?8:4;
      for(let k=0;k<noteCount;k++) {const age=t-k*gap;if(age>=0){const f=notes[k%4]*(k<4?1:2),hit=smooth(age/.012)*Math.exp(-age*(kind==='formation'?3.6:2.7));v+=hit*(.14*Math.sin(2*Math.PI*f*age)+.035*Math.sin(2*Math.PI*f*2.003*age));}}
      if(kind==='celebrate')v+=soft*.1*Math.exp(-t*17);
    } else {
      env=1;v=[130.813,196,261.626,392].reduce((s,f,j)=>s+.035*Math.sin(2*Math.PI*Math.round(f*seconds)/seconds*t+j*.8),0);
      v*=.85+.15*Math.cos(2*Math.PI*p);pan=.1*Math.sin(2*Math.PI*p);
    }
    v*=env;samples[i*2]=v*(1-pan);samples[i*2+1]=v*(1+pan);peak=Math.max(peak,Math.abs(samples[i*2]),Math.abs(samples[i*2+1]));
  }
  const wav=Buffer.alloc(44+count*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*4,40);
  const gain=.65/Math.max(peak,.001);for(let i=0;i<samples.length;i++)wav.writeInt16LE(Math.round(samples[i]*gain*32767),44+i*2);
  await writeFile(new URL(name,out),wav);
}
const assets=[['ribbon-pluck.wav',.7,'ribbon'],['gift-open-tonal.wav',1.65,'lid'],['breath.wav',1.95,'breath'],['paper-lift-tonal.wav',1.5,'paper'],['door-open-tonal.wav',1.8,'door'],['gentle-twinkle.wav',1.3,'twinkle'],['magic-transition.wav',2.8,'magic'],['starlight-travel.wav',2.8,'travel'],['cosmic.wav',8,'ambient'],['sparkle-rise.wav',3.5,'formation'],['memory-return.wav',4.65,'return'],['celebrate.wav',2,'celebrate'],['resolve.wav',2.4,'resolve']];
for(const args of assets)await render(...args);
console.log(`Generated ${assets.length} original story effects in ${fileURLToPath(out)}`);
