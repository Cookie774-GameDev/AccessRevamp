import React, {CSSProperties, ReactNode} from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
} from 'remotion';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadFraunces} from '@remotion/google-fonts/Fraunces';

const {fontFamily: sans} = loadInter('normal', {weights: ['400', '500', '600', '700']});
const {fontFamily: serif} = loadFraunces('normal', {weights: ['600', '700']});

const C = {
  ink: '#0B1020',
  near: '#05070C',
  bone: '#F6F1E8',
  white: '#FFFFFF',
  coral: '#FF5A3D',
  mint: '#A7F3D0',
  yellow: '#F7D154',
  slate: '#6B7280',
  line: '#D8D0C3',
};

// Paste the mixed MP3 data URI here when rendering from the repository copy.
// The downloadable source archive includes the final embedded audio track.
const AUDIO_DATA_URI = '';
const clamp = (value: number) => Math.max(0, Math.min(1, value));

const Scene: React.FC<{duration: number; background?: string; children: ReactNode}> = ({duration, background = C.bone, children}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{background, opacity, overflow: 'hidden'}}>{children}</AbsoluteFill>;
};

const Grain: React.FC = () => (
  <AbsoluteFill style={{
    opacity: 0.035,
    pointerEvents: 'none',
    mixBlendMode: 'soft-light',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 180 180%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.86%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%27.62%27/%3E%3C/svg%3E")',
  }} />
);

const Label: React.FC<{children: ReactNode; color?: string}> = ({children, color = C.coral}) => (
  <div style={{fontFamily: sans, color, fontWeight: 700, fontSize: 24, letterSpacing: 3.5, textTransform: 'uppercase'}}>{children}</div>
);

const Button: React.FC<{children: ReactNode; pale?: boolean; style?: CSSProperties}> = ({children, pale, style}) => (
  <div style={{
    height: 68,
    borderRadius: 14,
    padding: '0 30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: pale ? C.white : C.coral,
    color: pale ? C.ink : C.white,
    border: pale ? `2px solid ${C.ink}` : 'none',
    fontFamily: sans,
    fontWeight: 700,
    fontSize: 24,
    ...style,
  }}>{children}</div>
);

const Lamp: React.FC<{scale?: number}> = ({scale = 1}) => (
  <div style={{position: 'relative', width: 560 * scale, height: 560 * scale, filter: 'drop-shadow(0 45px 55px rgba(0,0,0,.22))'}}>
    <div style={{position: 'absolute', width: 480 * scale, height: 360 * scale, left: 40 * scale, top: 15 * scale, borderRadius: '50%', background: 'radial-gradient(circle,rgba(246,195,111,.72),rgba(246,195,111,0) 68%)', filter: `blur(${30 * scale}px)`}} />
    <div style={{position: 'absolute', left: 145 * scale, top: 86 * scale, width: 270 * scale, height: 170 * scale, clipPath: 'polygon(18% 0,82% 0,100% 100%,0 100%)', background: 'linear-gradient(90deg,#C48A48,#F1C98D 48%,#C88745)'}} />
    <div style={{position: 'absolute', left: 118 * scale, top: 242 * scale, width: 324 * scale, height: 50 * scale, borderRadius: '50%', background: '#EEC689'}} />
    <div style={{position: 'absolute', left: 267 * scale, top: 284 * scale, width: 26 * scale, height: 124 * scale, borderRadius: 20, background: '#4B2D1C'}} />
    <div style={{position: 'absolute', left: 198 * scale, top: 382 * scale, width: 164 * scale, height: 140 * scale, borderRadius: '46% 46% 34% 34%', background: 'linear-gradient(150deg,#F3E9D8,#D2C1A6)'}} />
    <div style={{position: 'absolute', left: 170 * scale, top: 510 * scale, width: 220 * scale, height: 34 * scale, borderRadius: '50%', background: 'rgba(0,0,0,.2)', filter: `blur(${10 * scale}px)`}} />
  </div>
);

const MenuIcon: React.FC = () => <div style={{width: 32, display: 'grid', gap: 7}}><i style={{height: 3, background: 'currentColor'}}/><i style={{height: 3, background: 'currentColor'}}/></div>;

const Website: React.FC<{variant?: number; mobile?: boolean; clutter?: boolean; dark?: boolean}> = ({variant = 0, mobile, clutter, dark}) => {
  const bg = dark ? C.near : C.bone;
  const text = dark ? C.white : C.ink;
  return <div style={{width: '100%', height: '100%', position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: mobile ? 24 : 42, background: bg, color: text}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: sans, fontWeight: 700, fontSize: mobile ? 14 : 18}}>
      <span>LUMEN &amp; LOOM</span>{mobile ? <MenuIcon/> : <span>Collection&nbsp;&nbsp;&nbsp; Materials&nbsp;&nbsp;&nbsp; Studio</span>}
    </div>
    {variant === 1 ? <>
      <div style={{fontFamily: serif, fontWeight: 700, fontSize: mobile ? 34 : 62, textAlign: 'center', marginTop: mobile ? 26 : 34}}>The Arc Collection</div>
      <div style={{fontFamily: sans, fontSize: mobile ? 15 : 20, textAlign: 'center', marginTop: 12, color: dark ? '#D3D7DF' : C.slate}}>Quiet material. Warm light. Clear purpose.</div>
      <div style={{position: 'absolute', left: '50%', top: mobile ? '23%' : '26%', transform: `translateX(-50%) scale(${mobile ? .48 : .72})`}}><Lamp/></div>
      <Button style={{position: 'absolute', left: '50%', bottom: mobile ? 20 : 32, transform: 'translateX(-50%)', height: mobile ? 44 : 58, fontSize: mobile ? 13 : 18}}>Explore collection</Button>
    </> : <>
      <div style={{fontFamily: serif, fontWeight: 700, fontSize: mobile ? 42 : 74, lineHeight: .96, marginTop: mobile ? 185 : 105}}>Light, shaped<br/>by hand.</div>
      <div style={{fontFamily: sans, fontSize: mobile ? 15 : 22, lineHeight: 1.4, marginTop: 28, color: dark ? '#D3D7DF' : C.slate}}>Sculptural lighting and crafted objects,<br/>made in deliberate small runs.</div>
      <div style={{position: 'absolute', right: mobile ? -65 : -20, top: mobile ? 30 : 60, transform: `scale(${mobile ? .48 : .78})`}}><Lamp/></div>
      <div style={{position: 'absolute', left: mobile ? 24 : 42, bottom: mobile ? 20 : 38, display: 'flex', gap: 16}}>
        <Button style={{height: mobile ? 44 : 58, fontSize: mobile ? 12 : 18}}>Shop {mobile ? 'collection' : 'the Arc Collection'}</Button>
        {clutter ? <Button pale style={{height: 58, fontSize: 18}}>Learn more</Button> : null}
      </div>
    </>}
  </div>;
};

const Browser: React.FC<{variant?: number; mobile?: boolean; clutter?: boolean; dark?: boolean; style?: CSSProperties}> = (props) => (
  <div style={{background: '#E6E2DA', borderRadius: 26, padding: 14, boxShadow: '0 32px 80px rgba(0,0,0,.22)', ...props.style}}>
    <div style={{height: 38, display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 10}}>
      {[C.coral, C.yellow, C.mint].map((color) => <span key={color} style={{width: 12, height: 12, borderRadius: '50%', background: color}}/>)}
      <span style={{height: 18, flex: 1, marginLeft: 20, borderRadius: 9, background: '#D0CBC1'}}/>
    </div>
    <div style={{height: 'calc(100% - 38px)', borderRadius: 16, overflow: 'hidden'}}><Website {...props}/></div>
  </div>
);

const Friction: React.FC = () => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, 72], [.92, 1.02], {extrapolateRight: 'clamp'});
  return <Scene duration={72} background={C.near}>
    <AbsoluteFill style={{background: 'radial-gradient(circle at 80% 20%,rgba(183,105,50,.22),transparent 42%),linear-gradient(#05070C,#100D0B)'}}/>
    <div style={{position: 'absolute', left: 100, top: 90}}><Label color="rgba(255,255,255,.55)">AccessRevamp</Label></div>
    <Browser clutter style={{position: 'absolute', width: 1500, height: 900, left: 640, top: 140, transform: `perspective(1800px) rotateY(-10deg) rotateX(2deg) scale(${push})`}}/>
    <div style={{position: 'absolute', left: 990 + Math.sin(frame / 5) * 10, top: 855, width: 40, height: 54, clipPath: 'polygon(0 0,0 100%,28% 73%,48% 100%,65% 88%,45% 62%,78% 62%)', background: C.white, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.8))'}}/>
    <Grain/>
  </Scene>;
};

const Evidence: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = spring({frame, fps: 30, config: {damping: 18}});
  const scan = interpolate(frame, [10, 64], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Scene duration={84}>
    <div style={{position: 'absolute', left: 115, top: 88}}><Label>AccessRevamp review</Label><h1 style={{fontFamily: serif, fontSize: 90, margin: '22px 0 0', color: C.ink}}>Evidence before opinion.</h1></div>
    <Browser clutter style={{position: 'absolute', width: 1300, height: 840, left: 110 - (1 - enter) * 180, top: 315}}/>
    <div style={{position: 'absolute', left: 1520 + (1 - enter) * 180, top: 250, width: 870, height: 920, borderRadius: 40, padding: 70, boxSizing: 'border-box', background: C.ink, color: C.white, boxShadow: '0 36px 90px rgba(0,0,0,.2)'}}>
      <Label>Observed friction</Label><div style={{fontFamily: serif, fontWeight: 700, fontSize: 60, lineHeight: 1.05, marginTop: 44}}>Two competing actions<br/>interrupt the first decision.</div>
      <div style={{height: 1, background: '#303847', margin: '62px 0 40px'}}/>
      {['Human reviewed','Recommended direction','Clear primary path'].map((text, index) => <div key={text} style={{height: 108, display: 'flex', alignItems: 'center', gap: 26, fontFamily: sans, fontSize: 30, color: frame > 38 + index * 8 ? C.white : '#717887'}}><span style={{width: 22, height: 22, borderRadius: '50%', background: frame > 38 + index * 8 ? [C.mint,C.yellow,C.coral][index] : '#394150'}}/>{text}</div>)}
    </div>
    <div style={{position: 'absolute', left: 110, right: 1260, top: 315 + scan * 770, height: 9, background: C.coral, boxShadow: `0 0 70px 25px ${C.coral}33`}}/>
    <Grain/>
  </Scene>;
};

const Directions: React.FC = () => {
  const frame = useCurrentFrame();
  const poses = [[130,340,-4],[900,310,2],[1660,350,4],[490,860,-2],[1270,845,3]];
  return <Scene duration={108}>
    <div style={{position: 'absolute', left: 115, top: 80}}><h1 style={{fontFamily: serif, fontSize: 92, margin: 0, color: C.ink}}>Five directions. One brand.</h1><Label color={C.slate}>3 standard · 2 cinematic</Label></div>
    {poses.map(([left, top, rotation], index) => {const progress = spring({frame: frame - index * 7, fps: 30, config: {damping: 16}}); return <Browser key={index} variant={index % 2} dark={index === 4} style={{position: 'absolute', width: 690, height: 430, left, top: top + (1 - progress) * 160, transform: `rotate(${rotation * (1 - progress)}deg) scale(${.84 + .16 * progress})`, opacity: clamp(progress)}}/>;})}
    <Browser variant={1} mobile style={{position: 'absolute', width: 250, height: 480, right: 100, bottom: 75, transform: `scale(${spring({frame: frame - 68, fps: 30, config: {damping: 16}})})`}}/>
    <Grain/>
  </Scene>;
};

const Selection: React.FC = () => {
  const frame = useCurrentFrame(); const selected = frame > 34;
  return <Scene duration={75} background={C.near}>
    <div style={{position: 'absolute', left: 115, top: 76}}><Label color={C.mint}>Private project space</Label><h1 style={{fontFamily: serif, fontSize: 84, lineHeight: 1, margin: '26px 0 0', color: C.white}}>Choose the direction<br/>that feels like you.</h1></div>
    <div style={{position: 'absolute', left: 110, top: 420, display: 'flex', gap: 40}}>{[0,1,0,1,0].map((variant,index) => <div key={index} style={{position: 'relative', width: 430, height: 300, overflow: 'hidden', borderRadius: 28, border: `6px solid ${selected && index === 1 ? C.yellow : '#2A3240'}`, boxShadow: selected && index === 1 ? `0 0 70px ${C.yellow}42` : 'none'}}><Website variant={variant} dark={index === 4}/>{selected && index === 1 ? <div style={{position: 'absolute', right: 18, bottom: 18, padding: '12px 22px', borderRadius: 20, background: C.yellow, color: C.ink, fontFamily: sans, fontWeight: 700}}>Selected</div> : null}</div>)}</div>
    <div style={{position: 'absolute', left: 170, right: 170, top: 1120, height: 5, background: '#303746'}}><div style={{width: selected ? '25%' : 0, height: '100%', background: C.yellow}}/>{['Review','Direction','Build','Quality check','Delivery'].map((text,index) => <div key={text} style={{position: 'absolute', left: `${index * 25}%`, top: -11, width: 25, height: 25, borderRadius: '50%', background: selected && index < 2 ? C.yellow : '#303746'}}><span style={{position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: sans, fontSize: 23, color: selected && index < 2 ? C.white : '#737A88'}}>{text}</span></div>)}</div>
    <Grain/>
  </Scene>;
};

const ResponsiveBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const devices = [{w:1240,h:720,l:120,t:360,d:0},{w:860,h:520,l:1120,t:610,d:10},{w:500,h:720,l:1830,t:410,d:20},{w:310,h:650,l:2200,t:650,d:29}];
  return <Scene duration={132}>
    <div style={{position: 'absolute', left: 115, top: 74}}><h1 style={{fontFamily: serif, fontSize: 92, margin: 0, color: C.ink}}>One direction. Every screen.</h1><Label color={C.slate}>Home · About · Shop · Materials · Contact</Label></div>
    {devices.map((device,index) => {const progress = spring({frame: frame - device.d, fps: 30, config: {damping: 17}}); return <Browser key={index} variant={1} mobile={index > 1} style={{position: 'absolute', width: device.w, height: device.h, left: device.l, top: device.t + (1 - progress) * 150, transform: `scale(${.88 + .12 * progress})`}}/>;})}
    <Grain/>
  </Scene>;
};

const Quality: React.FC = () => {
  const frame = useCurrentFrame();
  const checks = ['Keyboard focus','Contrast review','Mobile alignment','Reduced motion','Responsive review'];
  return <Scene duration={96} background={C.ink}>
    <div style={{position: 'absolute', left: 115, top: 74}}><Label color={C.mint}>Human review + quality check</Label><h1 style={{fontFamily: serif, fontSize: 84, lineHeight: 1, margin: '26px 0 0', color: C.white}}>Built to stay clear<br/>when real people use it.</h1></div>
    <Browser variant={1} style={{position: 'absolute', left: 110, top: 470, width: 1320, height: 820}}/>
    <div style={{position: 'absolute', left: 1530, top: 420, width: 900}}>{checks.map((text,index) => <div key={text} style={{height: 125, marginBottom: 24, padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 24, border: '2px solid #293247', background: '#151C2B', color: C.white, fontFamily: sans, fontSize: 29}}><span>{text}</span><span style={{padding: '13px 25px', borderRadius: 30, background: frame > index * 10 + 18 ? C.mint : '#3A4150', color: frame > index * 10 + 18 ? C.ink : '#BBC1CC', fontWeight: 700, fontSize: 20}}>{frame > index * 10 + 18 ? ['Verified','Verified','Aligned','Ready','Complete'][index] : 'Reviewing'}</span></div>)}</div>
    <div style={{position: 'absolute', left: 230 + Math.min(3, Math.floor(frame / 22)) * 260, top: 600, width: 250, height: 78, border: `7px solid ${C.yellow}`, borderRadius: 16}}/>
    <Grain/>
  </Scene>;
};

const MiniPoster: React.FC<{index: number; motion?: boolean}> = ({index, motion}) => <div style={{position: 'relative', width: 260, height: 270, overflow: 'hidden', background: index % 2 ? C.near : C.bone, boxShadow: '0 22px 42px rgba(0,0,0,.16)'}}><div style={{height: '42%', background: index % 3 === 0 ? C.coral : index % 3 === 1 ? '#8B4B2B' : C.ink}}/><div style={{position: 'absolute', left: 25, top: 25, fontFamily: serif, fontWeight: 700, fontSize: 42, color: index % 2 ? C.white : C.ink}}>{index % 3 === 0 ? 'ARC' : index % 3 === 1 ? 'LIGHT, SHAPED.' : 'WARM BY DESIGN.'}</div><div style={{position: 'absolute', right: -95, bottom: -120, transform: 'scale(.46)'}}><Lamp/></div>{motion ? <span style={{position: 'absolute', right: 16, top: 16, padding: '8px 13px', borderRadius: 18, background: C.mint, fontFamily: sans, fontSize: 12, fontWeight: 700}}>MOTION</span> : null}</div>;

const CreativePack: React.FC = () => {
  const frame = useCurrentFrame();
  return <Scene duration={96}>
    <div style={{position: 'absolute', left: 115, top: 70}}><h1 style={{fontFamily: serif, fontSize: 88, margin: 0, color: C.ink}}>A coordinated creative pack.</h1><Label color={C.slate}>5 motion posters · 10 still posters · 3 business cards · 2 brochures</Label></div>
    <div style={{position: 'absolute', left: 110, top: 310, display: 'grid', gridTemplateColumns: 'repeat(5,260px)', gap: 24}}>{Array.from({length: 15},(_,index) => {const progress = spring({frame: frame - index * 2, fps: 30, config: {damping: 15}}); return <div key={index} style={{transform: `translateY(${(1 - progress) * 80}px) scale(${.9 + .1 * progress})`, opacity: clamp(progress)}}><MiniPoster index={index} motion={index < 5}/></div>;})}</div>
    <div style={{position: 'absolute', right: 120, top: 360, width: 740, height: 340, padding: 50, boxSizing: 'border-box', transform: 'rotate(2deg)', background: C.ink, color: C.white, fontFamily: sans}}><b style={{fontSize: 30}}>LUMEN &amp; LOOM</b><div style={{fontFamily: serif, fontSize: 48, color: C.mint, marginTop: 70}}>Light, shaped by hand.</div></div>
    <div style={{position: 'absolute', right: 190, bottom: 90, width: 650, height: 350, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: C.white, border: `2px solid ${C.line}`}}>{['ARC','MATERIAL','STUDIO'].map((text,index) => <div key={text} style={{padding: 30, borderRight: index < 2 ? `1px solid ${C.line}` : 'none', fontFamily: serif, fontSize: 32, color: C.ink}}>{text}</div>)}</div>
    <Grain/>
  </Scene>;
};

const CinematicScroll: React.FC = () => {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [0,108], [0,-1650], {easing: Easing.inOut(Easing.cubic)});
  return <Scene duration={108} background={C.near}>
    <div style={{position: 'absolute', left: 115, top: 64}}><Label color={C.mint}>Cinematic scroll site</Label><h1 style={{fontFamily: serif, fontSize: 78, margin: '20px 0 0', color: C.white}}>Story, motion, and a real next step.</h1></div>
    <div style={{position: 'absolute', left: 280, top: 300, width: 1600, height: 1020, overflow: 'hidden', borderRadius: 38, border: '26px solid #171B22', boxShadow: '0 50px 120px rgba(0,0,0,.5)'}}><div style={{position: 'absolute', left: 0, right: 0, top: scroll, height: 2800, background: C.near}}>
      <div style={{height: 700, position: 'relative', padding: 80, boxSizing: 'border-box', color: C.white}}><h2 style={{fontFamily: serif, fontSize: 95, lineHeight: .94, margin: 120}}>A warmer<br/>way to arrive.</h2><div style={{position: 'absolute', right: 120, top: 20, transform: 'scale(1.2)'}}><Lamp/></div><Button style={{position: 'absolute', left: 200, bottom: 100}}>Shop the Arc Collection</Button></div>
      <div style={{height: 700, padding: 95, boxSizing: 'border-box', background: '#E8D5B8'}}><h2 style={{fontFamily: serif, fontSize: 80, color: C.ink}}>Material becomes mood.</h2><div style={{display: 'flex', gap: 90, marginTop: 100}}>{[[C.bone,'BONE CERAMIC'],['#6D422C','WALNUT'],['#D5A765','AMBER LINEN']].map(([color,text]) => <div key={text} style={{textAlign: 'center', fontFamily: sans, fontWeight: 700, color: C.ink}}><div style={{width: 260, height: 260, marginBottom: 35, borderRadius: '50%', background: color}}/>{text}</div>)}</div></div>
      <div style={{height: 700, padding: 100, boxSizing: 'border-box', background: '#2A1912', color: C.white}}><h2 style={{fontFamily: serif, fontSize: 80}}>Made in deliberate<br/>small runs.</h2></div>
      <div style={{height: 700, padding: 100, boxSizing: 'border-box', background: C.bone}}><h2 style={{fontFamily: serif, fontSize: 90, color: C.ink}}>Bring the room<br/>into focus.</h2><Button>Shop the Arc Collection</Button></div>
    </div></div>
    <div style={{position: 'absolute', right: 90, bottom: 80, width: 330, height: 700, transform: `scale(${spring({frame: frame - 68, fps: 30, config: {damping: 16}})})`}}><Browser variant={1} mobile style={{width: '100%', height: '100%'}}/><div style={{marginTop: 20, padding: 18, borderRadius: 30, textAlign: 'center', background: C.mint, color: C.ink, fontFamily: sans, fontWeight: 700}}>Reduced motion ready</div></div>
    <Grain/>
  </Scene>;
};

const Pricing: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [['Free Snapshot','$0'],['Homepage Reveal','$50'],['Complete Website Revamp','$200'],['Cinematic Scroll Site','$250']];
  return <Scene duration={81}>
    <div style={{position: 'absolute', left: 115, top: 75}}><h1 style={{fontFamily: serif, fontSize: 100, margin: 0, color: C.ink}}>One-time services.</h1><div style={{fontFamily: sans, fontSize: 31, color: C.slate, marginTop: 20}}>Start where the next decision becomes obvious.</div></div>
    <div style={{position: 'absolute', left: 115, top: 350, width: 1450}}>{rows.map(([name,price],index) => <div key={name} style={{height: 170, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${C.line}`, transform: `translateX(${(1 - spring({frame: frame - index * 5, fps: 30, config: {damping: 16}})) * -170}px)`}}><span style={{fontFamily: serif, fontWeight: 700, fontSize: 48, color: C.ink}}>{name}</span><span style={{fontFamily: sans, fontWeight: 700, fontSize: 48, color: C.ink}}>{price}</span></div>)}</div>
    <div style={{position: 'absolute', right: 115, top: 310, width: 760, height: 780, padding: 70, boxSizing: 'border-box', borderRadius: 40, background: C.ink, color: C.white, boxShadow: '0 40px 90px rgba(0,0,0,.2)', transform: `translateX(${(1 - spring({frame: frame - 30, fps: 30, config: {damping: 17}})) * 180}px)`}}><Label color={C.mint}>Upgrade credit</Label><div style={{display: 'flex', justifyContent: 'space-between', marginTop: 80, fontFamily: sans, fontSize: 28, color: '#BCC2CD'}}><span>Previously paid</span><b style={{color: C.white, fontSize: 42}}>$50</b></div><div style={{height: 1, margin: '42px 0', background: '#343B49'}}/><div style={{display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontSize: 28, color: '#BCC2CD'}}><span>Complete Revamp due now</span><b style={{color: C.white, fontSize: 50}}>$150</b></div><div style={{marginTop: 80, padding: 28, borderRadius: 22, textAlign: 'center', background: C.mint, color: C.ink, fontFamily: sans, fontWeight: 700, fontSize: 27}}>Previous payment credited</div><div style={{marginTop: 70, fontFamily: sans, fontSize: 24, lineHeight: 1.5, color: '#BCC2CD'}}>No subscription. No coupon.<br/>Just verified cumulative credit.</div></div>
    <Grain/>
  </Scene>;
};

const BrandFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = spring({frame, fps: 30, config: {damping: 18}});
  return <Scene duration={48} background={C.near}>
    <div style={{position: 'absolute', left: '50%', top: 350, width: 900 * progress, height: 8, transform: 'translateX(-50%)', borderRadius: 4, background: C.coral}}/>
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `translateY(${(1 - progress) * 45}px)`}}><div style={{fontFamily: serif, fontWeight: 700, fontSize: 145, color: C.white}}>AccessRevamp</div><div style={{fontFamily: sans, fontSize: 40, color: C.mint, marginTop: 28}}>See the barrier. Preview the fix.</div><Button style={{width: 480, height: 92, marginTop: 80, fontSize: 30}}>Start your project</Button><div style={{fontFamily: sans, fontSize: 28, color: '#AAB0BD', marginTop: 70}}>Make the next click feel obvious.</div></div>
    <Grain/>
  </Scene>;
};

export const AccessRevampPromo: React.FC = () => <AbsoluteFill style={{fontFamily: sans}}>
  {AUDIO_DATA_URI ? <Audio src={AUDIO_DATA_URI}/> : null}
  <Sequence from={0} durationInFrames={72} premountFor={30}><Friction/></Sequence>
  <Sequence from={72} durationInFrames={84} premountFor={30}><Evidence/></Sequence>
  <Sequence from={156} durationInFrames={108} premountFor={30}><Directions/></Sequence>
  <Sequence from={264} durationInFrames={75} premountFor={30}><Selection/></Sequence>
  <Sequence from={339} durationInFrames={132} premountFor={30}><ResponsiveBuild/></Sequence>
  <Sequence from={471} durationInFrames={96} premountFor={30}><Quality/></Sequence>
  <Sequence from={567} durationInFrames={96} premountFor={30}><CreativePack/></Sequence>
  <Sequence from={663} durationInFrames={108} premountFor={30}><CinematicScroll/></Sequence>
  <Sequence from={771} durationInFrames={81} premountFor={30}><Pricing/></Sequence>
  <Sequence from={852} durationInFrames={48} premountFor={30}><BrandFinale/></Sequence>
</AbsoluteFill>;
