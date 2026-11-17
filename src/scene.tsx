import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import {OrbitControls, RoundedBox} from '@react-three/drei'
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import * as T from 'three'
import {byHole,holes,info,partFor,rows,type Build,type Part} from './circuit'
type V=[number,number,number]
const silver='#c8d4df'
const at=(id:string,y=0):V=>[byHole[id].x,y,byHole[id].z]
function Box({p,s,c}: {p:V;s:V;c:string}){return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={c}/></mesh>}
function Rod({a,b,r,c,glass=false,emissive=false}:{a:V;b:V;r:number;c:string;glass?:boolean;emissive?:boolean}){
 const axis=new T.Vector3(...b).sub(new T.Vector3(...a)), q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize())
 return <mesh position={a.map((v,i)=>(v+b[i])/2) as V} quaternion={q}><cylinderGeometry args={[r,r,axis.length(),16]}/><meshStandardMaterial color={c} metalness={c===silver?.45:0} roughness={glass?.16:.48} transparent={glass&&!emissive} opacity={glass&&!emissive?.83:1} emissive={emissive?c:'#000'} emissiveIntensity={emissive?2.1:0}/></mesh>
}
function Caption({label,p,size=2,color='#202738',flat=false}:{label:string;p:V;size?:number;color?:string;flat?:boolean}){
 const tex=useMemo(()=>{const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d')!;ctx.font='bold 44px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(label,128,32);return new T.CanvasTexture(c)},[label,color])
 useEffect(()=>()=>tex.dispose(),[tex])
 return <mesh position={p} rotation={flat?[-Math.PI/2,0,0]:[0,0,0]}><planeGeometry args={[size*4,size]}/><meshBasicMaterial map={tex} transparent depthWrite={false} side={T.DoubleSide}/></mesh>
}
function Body({p,s,c}:{p:V;s:V;c:string}){return <RoundedBox position={p} args={s} radius={.7} smoothness={3}><meshStandardMaterial color={c} roughness={.74}/></RoundedBox>}
function socketsTexture(){
 const c=document.createElement('canvas');c.width=2048;c.height=1408;const ctx=c.getContext('2d')!
 const x=(v:number)=>(v+41)/82*c.width, z=(v:number)=>(v+27.5)/57*c.height
 ctx.fillStyle='#eceef2';ctx.fillRect(0,0,c.width,c.height)
 for(const h of holes){const a=x(h.x),b=z(h.z);ctx.fillStyle='#d4d7dc';ctx.fillRect(a-17,b-17,34,34);ctx.fillStyle='#22252b';ctx.fillRect(a-11,b-11,22,22);ctx.fillStyle='#747e87';ctx.fillRect(a-8,b+5,16,4)}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 29px monospace';ctx.fillStyle='#414752'
 for(let n=1;n<=30;n++) for(const b of [-15.1,17.7])ctx.fillText(String(n),x(byHole['a'+n].x),z(b))
 for(const [r,b] of Object.entries(rows)) if(r.length===1)for(const a of [-39,39])ctx.fillText(r,x(a),z(b))
 for(const [r,b] of Object.entries(rows)) if(r.length===2){ctx.fillStyle=r.endsWith('+')?'#d44758':'#397fbc';const line=b+(r==='T+'||r==='B+'?-1.9:1.9);ctx.fillRect(x(-36),z(line)-3,x(36)-x(-36),6);for(const a of [-39,39])ctx.fillText(r[1],x(a),z(b))}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex
}
const sections=[[-25.9,-16.9],[-15.9,-.15],[2.25,18.55],[19.55,28.5]]
function Board({onHole,active,goal,busy,hover,setHover}:{
 onHole:(s:string)=>void;active:string[];goal:string[];busy:string[];hover:string;setHover:(s:string)=>void
}){
 const tex=useMemo(socketsTexture,[]);useEffect(()=>()=>tex.dispose(),[tex])
 const surfaces=useMemo(()=>sections.map(([a,b])=>{
  const g=new T.PlaneGeometry(82,b-a), uv=g.getAttribute('uv')
  for(let i=0;i<uv.count;i++)uv.setY(i,1-((uv.getY(i)?a:b)+27.5)/57)
  return g
 }),[])
 useEffect(()=>()=>surfaces.forEach(g=>g.dispose()),[surfaces])
 const select=(e:ThreeEvent<PointerEvent>)=>{
  let best: string='', distance=1.58
  for(const h of holes){const d=Math.hypot(e.point.x-h.x,e.point.z-h.z);if(d<distance){distance=d;best=h.id}}
  return best
 }
 return <group>
 <Body p={[0,-3.3,1]} s={[82,4.4,57]} c="#c5c9d3"/>
 {sections.map(([a,b])=><Body key={a} p={[0,-1.35,(a+b)/2]} s={[82,2.7,b-a]} c="#eaedf3"/>)}
 {sections.map(([a,b],i)=>{
  return <mesh key={a} rotation={[-Math.PI/2,0,0]} position={[0,.02,(a+b)/2]} geometry={surfaces[i]} onPointerMove={e=>{e.stopPropagation();setHover(select(e))}} onPointerOut={()=>setHover('')} onPointerUp={e=>{if(e.delta<5){const h=select(e);if(h){e.stopPropagation();onHole(h)}}}}>
  <meshStandardMaterial map={tex} roughness={.8}/></mesh>
 })}
 {holes.filter(h=>active.includes(h.id)||goal.includes(h.id)||busy.includes(h.id)||h.id===hover).map(h=><mesh key={h.id} position={at(h.id,.07)} rotation={[-Math.PI/2,0,0]} raycast={()=>{}}><ringGeometry args={[.57,.92,16]}/><meshBasicMaterial color={h.id===hover?'#ffffff':active.includes(h.id)?'#04c6ad':goal.includes(h.id)?'#ff990d':'#6e84b6'}/></mesh>)}
 </group>
}
function Cable({a,b,color,height,highlight}:{a:V;b:V;color:string;height:number;highlight:boolean}){
 const curve = new T.CubicBezierCurve3(new T.Vector3(...a),new T.Vector3(a[0],height,a[2]),new T.Vector3(b[0],height,b[2]),new T.Vector3(...b))
 return <mesh><tubeGeometry args={[curve,32,.37,9,false]}/><meshStandardMaterial color={highlight?'#53f1cb':color} emissive={highlight?'#1c9e86':'#000'} roughness={.49}/></mesh>
}
const pcb=new T.Shape()
;[[-17,-25],[-14,-27],[16,-27],[17,-25],[17,25],[15,27],[-14,27],[-17,25],[-17,18],[-12,13],[-12,-13],[-17,-18]].forEach(([x,z],i)=>i?pcb.lineTo(x,-z):pcb.moveTo(x,-z))
pcb.closePath()
function Package({p,h,lit,pressed,selected,highlight=false,powerPins=false}:{p:Part;h:string[];lit:boolean;pressed:boolean;selected:boolean;highlight?:boolean;powerPins?:boolean}){
 const pts=h.map(id=>at(id)), a=pts[0], b=pts[1], end=pts.at(-1)!
 const mid:V=[(a[0]+end[0])/2,0,(a[2]+end[2])/2]
 const dx=b[0]-a[0],dz=b[2]-a[2],theta=-Math.atan2(end[2]-a[2],end[0]-a[0])
 const len=Math.hypot(dx,dz)
 const axis=(s:number,y:number):V=>[mid[0]+dx/len*s,y,mid[2]+dz/len*s]
 const leads=(targets:V[])=>pts.map((v,i)=><group key={i}><Rod a={[v[0],-.55,v[2]]} b={[v[0],targets[i][1],v[2]]} r={.22} c={silver}/><Rod a={[v[0],targets[i][1],v[2]]} b={targets[i]} r={.22} c={silver}/></group>)
 const tag=(y:number)=> selected?<Caption label={p.id} p={[mid[0],y,mid[2]]} size={3} color="#6df4d6" flat/>:null
 if(p.kind==='wire')return <>{pts.map((v,i)=><group key={i}><Box p={[v[0],1.75,v[2]]} s={[1.48,2.9,1.48]} c="#232733"/><Rod a={[v[0],-.6,v[2]]} b={[v[0],.6,v[2]]} r={.25} c={silver}/></group>)}<Cable highlight={highlight} a={at(h[0],3.2)} b={at(h[1],3.2)} height={10+Math.min(len*.41,20)+(Number(p.id.slice(1))%3)*3} color={p.value==='GND'?'#556579':['#e67d24','#244fbd','#df8d3f','#727a85'][Number(p.id.slice(1))%4]??'#42aaff'}/>{tag(5)}</>
 if(p.kind==='ps'){
  const sign=b[2]>a[2]?1:-1, x=a[0]+sign*4.34,z=(a[2]+end[2])/2
  const v=(lx:number,y:number,lz:number):V=>[x+sign*lx,y,z+sign*lz]
  return <>
  {pts.map((v,i)=><Rod key={i} a={[v[0],-.9,v[2]]} b={[v[0],3.4,v[2]]} c={silver} r={.34}/>)}
  {[0,2,4,6].map(i=><group key={i}><Box p={[pts[i][0],1.65,(pts[i][2]+pts[i+1][2])/2]} s={[2,1.6,4.6]} c="#dfc535"/>{powerPins&&<><Caption label={p.pins[i]} p={[pts[i][0],4,pts[i][2]-1.5]} size={1.3} color="#6df4d6" flat/><Caption label={p.pins[i+1]} p={[pts[i+1][0],4,pts[i+1][2]+1.5]} size={1.3} color="#6df4d6" flat/></>}</group>)}
  <group visible={!powerPins}>
  <group position={v(0,2.7,0)} rotation={[0,sign<0?Math.PI:0,0]}><mesh rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[pcb,{depth:1.5,bevelEnabled:false}]}/><meshStandardMaterial color="#161921" roughness={.64}/></mesh></group>
  <Box p={v(5,7.8,-16)} s={[13,7,14]} c={silver}/><Box p={v(11.55,7.8,-16)} s={[.15,4.9,11.5]} c="#131820"/><Box p={v(11.69,7.2,-16)} s={[.2,1.05,9.8]} c="#e5e6e9"/>
  <Box p={v(5,7.7,17)} s={[13,7,10]} c="#272c35"/><Rod a={v(11.6,7.8,17)} b={v(11.8,7.8,17)} r={2.75} c="#0d0e12"/>
  <Box p={v(5,6.25,6)} s={[8,4.1,6.7]} c="#747981"/><Box p={v(5,8.8,6)} s={[3.4,2,3.4]} c="#dedfe2"/>
  <Rod a={v(5,4,0)} b={v(5,7.4,0)} r={1.42} c={lit?'#4cff52':'#237930'} emissive={lit}/>
  <Rod a={v(.2,4,1)} b={v(.2,8.6,1)} r={2.9} c="#24252a"/><Rod a={v(.2,8.6,1)} b={v(.2,8.75,1)} r={2.75} c={silver}/>
  {[-22,22].map(i=><group key={i}><Box p={v(-9,5.7,i)} s={[4,3,5]} c="#efd235"/><Box p={v(-9,7.22,i)} s={[2.4,.19,1.3]} c={silver}/><Caption label="5V" p={v(-5,4.25,i)} color="#fff" size={2.25} flat/></group>)}
  {[-10,10].map(i=><group key={i}><Box p={v(-5,4.8,i)} s={[5,1.3,5]} c="#3e424b"/>{[-1.4,0,1.4].map(j=><Box key={j} p={v(-8.4,4.3,i+j)} s={[1.5,.35,.55]} c={silver}/>)}</group>)}
  {[-3,-.5,2,4.5].map(i=><group key={i}><Box p={v(-9,4.85,i)} s={[3.8,1.25,1.9]} c="#c4ad27"/>{[-.95,.95].map(j=><Box key={j} p={v(-9+j,5.81,i)} s={[.5,1,.5]} c={silver}/>)}</group>)}
  <Caption label="HW-131" p={v(-10,4.25,-1)} color="#fff" size={4} flat/>
  </group>
  </>
 }
 if(p.kind==='r'||p.kind==='d'){
 const isR=p.kind==='r', y=isR?2.4:2.8, width=Math.min(len*.8,isR?6.5:4.25), t=width/2
 const bands:Record<string,string[]>={'1 kΩ':['#783c21','#202125','#17181a','#ba301a','#783c21'],'10 kΩ':['#783c21','#202125','#17181a','#da591d','#783c21'],'100 kΩ':['#783c21','#202125','#17181a','#f5ce2f','#783c21'],'200 Ω':['#ba301a','#202125','#17181a','#151515','#783c21']}
 return <>{leads([axis(-t,y),axis(t,y)])}<Rod a={axis(-t,y)} b={axis(t,y)} r={isR?1.08:.8} c={isR?'#428fd5':'#be662f'} glass={!isR}/>
 {(isR?(bands[p.value]??[]).map((c,i)=>[c,-.36+i*.182] as const):[['#15151b',.35] as const]).map(([c,s],i)=><Rod key={i} a={axis(width*s-.13,y)} b={axis(width*s+.13,y)} r={isR?1.1:.82} c={c}/>)}{tag(y+2.4)}</>
 }
 if(p.kind==='q'){
  const shape=new T.Shape();shape.moveTo(-2.2,-.75);shape.lineTo(2.2,-.75);shape.quadraticCurveTo(2.2,1.9,0,2.02);shape.quadraticCurveTo(-2.2,1.9,-2.2,-.75)
  const targets=pts.map((_,i)=>[mid[0]+(end[0]-a[0])*(i-1)*.25,2.45,mid[2]+(end[2]-a[2])*(i-1)*.25] as V)
  return <>{leads(targets)}<group position={mid} rotation={[0,theta,0]}><mesh position={[0,2.42,0]} rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[shape,{depth:4.15,bevelEnabled:false}]}/><meshStandardMaterial color="#23262e" roughness={.8}/></mesh><Caption label="8050" p={[0,4.5,.77]} size={1.5} color="#e1e8ef"/></group>{tag(7.3)}</>
 }
 if(p.kind==='led'){
 const base=3.2,c=lit?'#ff243c':'#9e1934', pos:V=[mid[0],base+2.8,mid[2]]
 return <>{leads([axis(-.8,base),axis(.8,base-.56)])}<Rod a={[mid[0],base,mid[2]]} b={pos} r={1.82} c={c} glass emissive={lit}/><Rod a={[mid[0],base-.38,mid[2]]} b={[mid[0],base,mid[2]]} r={2.04} c={c} glass emissive={lit}/><mesh position={pos}><sphereGeometry args={[1.82,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={c} emissive={lit?c:'#000'} emissiveIntensity={lit?2.8:0} transparent={!lit} opacity={lit?1:.82} roughness={.17}/></mesh>{lit&&<pointLight position={pos} color="#ff3853" intensity={13} distance={16}/>}<Caption label="K" p={axis(len/2,1.3)} size={1.3} color="#24242c" flat/>{tag(8.4)}</>
 }
 if(p.kind==='c')return <>{leads([axis(-1.07,3.4),axis(1.07,3.4)])}<group position={mid} rotation={[0,theta,0]}><Rod a={[0,4.8,-.65]} b={[0,4.8,.65]} r={p.value==='104'?2.35:1.92} c="#bd762b"/><Caption label={p.value} p={[0,4.84,.67]} size={2.48} color="#37261f"/></group>{tag(7.7)}</>
 return <>{leads([axis(-2,2.2),axis(2,2.2)])}<Body p={[mid[0],2.7,mid[2]]} s={[5.8,2.7,5.8]} c="#232630"/><Rod a={[mid[0],3.9,mid[2]]} b={[mid[0],pressed?4.25:5.3,mid[2]]} r={1.8} c="#424954"/>{tag(6.6)}</>
}
function Insertion({children,ghost=false}:{children:ReactNode;ghost?:boolean}){
 const ref=useRef<T.Group>(null)
 useFrame((state,dt)=>{if(ref.current)ref.current.position.y=ghost?1+Math.pow(Math.sin(state.clock.elapsedTime*2.5),2)*12:T.MathUtils.damp(ref.current.position.y,0,12,dt)})
 return <group ref={ref} position={[0,ghost?9:16,0]}>{children}</group>
}
function CameraRig({view,serial,locked}:{view:string;serial:number;locked:boolean}){
 const ref=useRef<React.ComponentRef<typeof OrbitControls>>(null)
 const {camera,size}=useThree()
 useEffect(()=>{const map:Record<string,V>={top:[5,128,1.01],front:[8,23,133],side:[127,21,0],free:[22,94,104]};const target=new T.Vector3(5,0,1);camera.position.set(...map[view]).sub(target).multiplyScalar(Math.max(1,1.12*size.height/size.width)).add(target);ref.current?.target.copy(target);ref.current?.update()},[view,serial,camera,size.width,size.height])
 return <OrbitControls ref={ref} enableDamping enableRotate={!locked} minDistance={30} maxDistance={250} maxPolarAngle={Math.PI*.54}/>
}
export function Scene({powerPins,board,active,goal,view,serial,onHole,onPart,onRelease,selected,armed,ghost,state,pressed,hover,setHover,onReady,onMoveEndpoint,onPress,onPartHover,onPartLeave}:{powerPins:boolean;board:Build;active:string[];goal:string[];view:string;serial:number;onHole:(s:string)=>void;onPart:(s:string)=>void;onRelease:()=>void;selected:string;armed:boolean;ghost?:Part;state:0|1|2;pressed:boolean;hover:string;setHover:(s:string)=>void;onReady:(snap:(x:number,y:number)=>string)=>void;onMoveEndpoint:(id:string,index:number,hole:string)=>void;onPress:()=>void;onPartHover:(id:string,x:number,y:number)=>void;onPartLeave:(id:string)=>void}){
 const [drag,setDrag]=useState(false)
 return <Canvas onCreated={({camera,gl})=>onReady((x,y)=>snapAt(camera,gl.domElement,x,y))} dpr={[1,1.7]} camera={{fov:42,near:.2,far:550,position:[22,94,104]}} fallback={<div className="fallback">当前浏览器没有可用的 WebGL。</div>}>
 <ambientLight intensity={1.45}/><hemisphereLight args={['#c7deff','#616377',1.05]}/><directionalLight position={[-32,85,45]} intensity={2.35}/><directionalLight position={[48,26,-45]} intensity={.75}/>
 <gridHelper args={[300,30,'#303e64','#263450']} position={[0,-6,0]}/>
 <Board onHole={onHole} active={active} goal={goal} busy={Object.values(board).flat()} hover={hover} setHover={setHover}/>
 {Object.entries(board).map(([id,h])=>{const p=partFor(id);if(!p)return null;return <group key={id} onPointerOver={e=>{e.stopPropagation();if(!e.buttons&&!drag)onPartHover(id,e.clientX,e.clientY)}} onPointerMove={e=>{e.stopPropagation();if(!e.buttons&&!drag)onPartHover(id,e.clientX,e.clientY)}} onPointerOut={()=>onPartLeave(id)} onPointerDown={e=>{if(id==='S1'&&state&&e.button===0){e.stopPropagation();onPress()}}} onPointerUp={e=>{if(id==='S1')onRelease();if(e.delta<5){e.stopPropagation();onPart(id)}}} onPointerLeave={()=>{if(id==='S1')onRelease()}}><Insertion key={id}><Package powerPins={powerPins} p={p} h={h} lit={(state===1&&id==='LED1')||(state===2&&id==='LED2')||(state!==0&&id==='P1')} selected={id===selected} highlight={h.some(k=>active.includes(k))} pressed={id==='S1'&&pressed}/></Insertion>{p.kind==='wire'&&h.map((k,i)=><WireHandle key={i} hole={k} onDrop={dest=>onMoveEndpoint(id,i,dest)} setHover={setHover} setDrag={setDrag}/>)}</group>})}
 {ghost&&<group raycast={()=>{}}><Insertion key={ghost.id} ghost><Package p={ghost} h={ghost.target} lit={false} pressed={false} selected/></Insertion></group>}
 <CameraRig view={view} serial={serial} locked={armed||drag||pressed}/>
 </Canvas>
}
function WireHandle({hole,onDrop,setHover,setDrag}:{hole:string;onDrop:(hole:string)=>void;setHover:(s:string)=>void;setDrag:(b:boolean)=>void}){
 const {camera,gl}=useThree()
 const grab=useRef<{x:number;y:number}|null>(null)
 const snap=(e:ThreeEvent<PointerEvent>)=>snapAt(camera,gl.domElement,e.nativeEvent.clientX,e.nativeEvent.clientY)
 const clear=()=>{grab.current=null;setDrag(false);setHover('')}
 return <mesh position={at(hole,1.8)} onPointerDown={e=>{
  if(e.button!==0)return
  e.stopPropagation()
  const target=e.target as unknown as Element
  target.setPointerCapture(e.pointerId)
  grab.current={x:e.clientX,y:e.clientY};setDrag(true)
 }} onPointerMove={e=>{if(grab.current){e.stopPropagation();setHover(snap(e))}}} onPointerUp={e=>{
  if(!grab.current)return
  if(Math.hypot(e.clientX-grab.current.x,e.clientY-grab.current.y)>4){e.stopPropagation();const k=snap(e);if(k)onDrop(k)}
  clear()
 }} onPointerCancel={clear} onLostPointerCapture={clear}><boxGeometry args={[2,3.8,2]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
}
export function snapAt(camera:T.Camera,canvas:HTMLCanvasElement,x:number,y:number){
 const r=canvas.getBoundingClientRect(), ray=new T.Raycaster()
 ray.setFromCamera(new T.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera)
 const p=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3())
 if(!p)return ''
 return holes.reduce<{id:string;d:number}>((best,h)=>{const d=Math.hypot(h.x-p.x,h.z-p.z);return d<best.d?{id:h.id,d}:best},{id:'',d:1.58}).id
}
