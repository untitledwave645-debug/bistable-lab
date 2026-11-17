export const pitch = 2.54
export const rows = {'T+':-22.86,'T−':-20.32,a:-12.7,b:-10.16,c:-7.62,d:-5.08,e:-2.54,f:5.08,g:7.62,h:10.16,i:12.7,j:15.24,'B+':22.86,'B−':25.4}
export type Row = keyof typeof rows
export type Hole = {id:string; row:Row; col:number;x:number;z:number; strip:string}
export const holes:Hole[] = Object.entries(rows).flatMap(([r,z]) => Array.from({length:30},(_,i)=>30-i).filter(c=>r.length===1||c%6!==0).map(col=>({id:r+col,row:r as Row,col,x:(15.5-col-(r.length===2?.5:0))*pitch,z,strip:r.length===2?r:(r<'f'?'U':'L')+col})))
export const byHole = Object.fromEntries(holes.map(h=>[h.id,h])) as Record<string,Hole>
export type Kind = 'q'|'r'|'led'|'d'|'c'|'sw'|'wire'|'ps'
export type Part = {id:string; kind:Kind; value:string; role:string; pins:string[]; nets:string[]; target:string[]; step:number}
const p=(id:string,kind:Kind,value:string,role:string,pins:string,nets:string,target:string,step:number):Part=>({id,kind,value,role,pins:pins.split(' '),nets:nets.split(' '),target:target.split(' '),step})
export const parts = [
p('Q1','q','S8050','左侧锁存开关','E B C','GND B1 C1','c23 c22 c21',0),
p('Q2','q','S8050','右侧锁存开关','E B C','GND B2 C2','c12 c11 c10',0),
p('W1','wire','GND','Q1 发射极接地','1 2','GND GND','T−23 a23',0),
p('W2','wire','GND','Q2 发射极接地','1 2','GND GND','T−11 a12',0),
p('R1','r','1 kΩ','Q1 集电极上拉','1 2','5V C1','T+21 a21',1),
p('R2','r','1 kΩ','Q2 集电极上拉','1 2','5V C2','T+9 a10',1),
p('R7','r','200 Ω','LED1 限流','1 2','5V A1','T+25 a26',1),
p('R8','r','200 Ω','LED2 限流','1 2','5V A2','T+7 a7',1),
p('LED1','led','红色 LED','指示 Q1 导通','A K','A1 C1','b26 b21',2),
p('LED2','led','红色 LED','指示 Q2 导通','A K','A2 C2','b7 b10',2),
p('R3','r','10 kΩ','C1 → B2 反馈','1 2','C1 B2','d21 d11',3),
p('R4','r','10 kΩ','C2 → B1 反馈','1 2','C2 B1','e10 e22',3),
p('C1','c','104','并联 R3，加速翻转','1 2','C1 B2','f19 f15',3),
p('C2','c','104','并联 R4，加速翻转','1 2','C2 B1','i14 i18',3),
p('W3','wire','C1','跨槽连接 Q1 集电极','1 2','C1 C1','e21 g19',3),
p('W4','wire','B2','跨槽连接 Q2 基极','1 2','B2 B2','a11 g15',3),
p('W5','wire','C2','跨槽连接 Q2 集电极','1 2','C2 C2','d10 h14',3),
p('W6','wire','B1','跨槽连接 Q1 基极','1 2','B1 B1','d22 h18',3),
p('D1','d','1N4148','将负脉冲送至 Q1 基极','A K','B1 PULSE','b22 f23',4),
p('D2','d','1N4148','将负脉冲送至 Q2 基极','A K','B2 PULSE','e11 f12',4),
p('W7','wire','PULSE','汇合两只二极管阴极','1 2','PULSE PULSE','g23 g12',4),
p('W8','wire','PULSE','将脉冲引到触发支路','1 2','PULSE PULSE','i23 i27',4),
p('R6','r','100 kΩ','给触发电容充电','1 2','5V KEY','B+29 j29',4),
p('R5','r','1 kΩ','触发脉冲节点下拉','1 2','PULSE GND','j27 B−27',4),
p('C3','c','103','耦合按键负脉冲','1 2','KEY PULSE','h29 h27',4),
p('S1','sw','瞬时按钮','按下时 KEY 接地','1 2','KEY GND','i29 i30',4),
p('W9','wire','GND','将按键另一脚接到下方负轨','1 2','GND GND','j30 B−29',4),
p('P1','ps','HW-131 · USB 5 V','4 组针座 × 2 针；模型按同极性并联供电，实物针序待核对','+T1 −T1 +B1 −B1 +T2 −T2 +B2 −B2','5V GND 5V GND 5V GND 5V GND','T+1 T−1 B+1 B−1 T+5 T−5 B+5 B−5',5),
]
export const info:Record<Kind,{name:string;icon:string;color:string}> = {
q:{name:'NPN 三极管',icon:'◒',color:'#252a36'},r:{name:'金属膜电阻',icon:'▰',color:'#4a91ff'},led:{name:'发光二极管',icon:'●',color:'#fa4762'},d:{name:'开关二极管',icon:'▬',color:'#df7c52'},c:{name:'瓷片电容',icon:'◉',color:'#dda750'},sw:{name:'瞬时按键',icon:'◼',color:'#9999af'},wire:{name:'杜邦跳线',icon:'∿',color:'#3bcdb3'},ps:{name:'面包板电源',icon:'▣',color:'#ffe176'}
}
export const steps = [
['安装两只三极管','分清 E（发射极）、B（基极）、C（集电极）。分别用跳线将 E 接到上方负轨。'],
['搭建上拉与限流支路','R1、R2 给集电极提供上拉；R7、R8 分别给两只 LED 限流。'],
['安装红色 LED','阳极 A 接限流电阻，阴极 K 接同侧三极管集电极。'],
['闭合交叉反馈','R3 ∥ C1 从 Q1 集电极接 Q2 基极；R4 ∥ C2 从 Q2 集电极接 Q1 基极。两组反馈在图中交叉但不相连。'],
['搭建按键触发支路','二极管的黑环为 K，两只 K 通过跳线相连。按键按下时将 KEY 拉低，C3 将下降沿耦合到 PULSE。'],
['插接 USB 电源模块','底部有 4 组双针座，共 8 根金属针。模型在上下供电轨各放两组，两路跳帽设为 5 V；可用“电源底针”查看。照片确认针数，实物针序与组间距仍需核对。'],
]
export type Build = Record<string,string[]>
export const partFor=(id:string)=>parts.find(p=>p.id===id) ?? (id.startsWith('X')?{...parts[2],id,value:'自定义跳线',role:'连接任意两个插孔',nets:[],target:[],step:6}:undefined)
export function netsOf(build:Build, pressed=false) {
 const parent = new Map(holes.map(h=>[h.strip,h.strip]))
 function root(k:string):string { const n=parent.get(k)!; return n===k?k:root(n) }
 function join(a:string,b:string) { if(byHole[a]&&byHole[b]) parent.set(root(byHole[a].strip),root(byHole[b].strip)) }
 for(const [id,h] of Object.entries(build)) {
  if(partFor(id)?.kind==='wire'||(id==='S1'&&pressed)) join(h[0],h[1])
  if(id==='P1') {for(let i=2;i<h.length;i++)join(h[i%2],h[i])}
 }
 return (id:string)=>byHole[id]?root(byHole[id].strip):'?'
}
export function placementError(p:Part, h:string[], build:Build) {
 if(h.length!==p.pins.length||new Set(h).size!==h.length||h.some(k=>!byHole[k])) return '每个引脚必须使用不同的有效插孔。'
 if(Object.entries(build).some(([id,pins])=>id!==p.id&&pins.some(k=>h.includes(k)))) return '该孔已被其他引脚占用。'
 if(p.kind==='q'||p.kind==='ps') {
 const a=byHole[h[0]], b=byHole[p.target[0]], sign=(p.kind==='ps'?byHole[h[1]].z<a.z:byHole[h[1]].x<a.x)?-1:1
 if(h.some((k,i)=>{const x=byHole[k], t=byHole[p.target[i]]; return Math.abs(x.x-a.x-sign*(t.x-b.x))>.01||Math.abs(x.z-a.z-sign*(t.z-b.z))>.01})) return p.kind==='q'?'三极管的三个脚需要插在同一行的相邻三孔。':'模块的八针必须与四组针座的固定针距对齐。'
 }
 return ''
}
export function check(build:Build, upto=5) {
 const problems=new Set<string>(), root=netsOf(build), down=netsOf(build,true)
 const links=new Map<string,{key:string;label:string}[]>(), occupied=new Set<string>()
 for(const [id,h] of Object.entries(build)) {
 const p=partFor(id); if(!p) continue
 const error=placementError(p,h,build); if(error) problems.add(id+'：'+error)
 h.forEach(k=>{if(occupied.has(k)) problems.add('孔位重复：'+k); occupied.add(k)})
 }
 const canonical = Object.fromEntries(parts.map(p=>[p.id,p.target]))
 const refs=netsOf(canonical)
 // A partly assembled build may still require a future jumper to bridge two physical strips.
 const staged=new Map<string,string>()
 if(upto<5) for(const p of parts.filter(p=>p.step>upto&&(p.kind==='wire'||p.kind==='ps'))) {
  for(const h of p.target) staged.set(root(h),refs(h))
 }
 for(const p of parts.filter(p=>p.step<=upto)) {
  const h=build[p.id]
  if(!h) {problems.add('缺少 '+p.id+' · '+p.value); continue}
  let expected=p.nets
  if(['r','c','wire','sw'].includes(p.kind)&&h.length===2) {
   // Prefer known equivalent recommended strips, then solve ambiguous reversals below.
   const forward=h.filter((k,i)=>refs(k)===refs(p.target[i])).length
   const reverse=h.filter((k,i)=>refs(k)===refs(p.target[1-i])).length
   if(reverse>forward) expected=[...expected].reverse()
  }
  links.set(p.id,h.map((k,i)=>({key:root(k),label:expected[i]})))
 }
 const fixed=new Map<string,string>()
 function compatible(n:string,k:string) {
   const prior=fixed.get(n)
   return (!prior||prior===k||(upto<5&&(staged.get(prior)===staged.get(k)&&staged.has(k))))&&![...fixed].some(([net,v])=>net!==n&&v===k)
 }
 const entries=[...links].sort(([a],[b])=>Number(['r','c','sw'].includes(partFor(a)!.kind))-Number(['r','c','sw'].includes(partFor(b)!.kind)))
 function solve(i:number):boolean {
   if(i===entries.length)return true
   const [id, terminals]=entries[i]
   const variants=['r','c','sw'].includes(partFor(id)!.kind)?[terminals,terminals.map((t,j)=>({...t,label:terminals[1-j]?.label}))]:[terminals]
   for(const variant of variants){
    const added:string[]=[]; let ok=true
    for(const {key,label} of variant){if(!compatible(label,key)){ok=false;break} if(!fixed.has(label)){fixed.set(label,key);added.push(label)}}
    if(ok&&solve(i+1))return true
    added.forEach(n=>fixed.delete(n))
   }
   return false
 }
 if(!solve(0)){
  const observed=new Map<string,Set<string>>(), physical=new Map<string,Set<string>>()
  for (const [id, pins] of links) pins.forEach(({key,label},i)=>{
   if(!observed.has(label))observed.set(label,new Set())
   if(!physical.has(key))physical.set(key,new Set())
   observed.get(label)!.add(key); physical.get(key)!.add(label)
   const p=partFor(id)!
   if(['q','led','d','ps'].includes(p.kind)&&refs(build[id][i])!==refs(p.target[i])) problems.add(id+' · '+p.pins[i]+'：检查孔位与极性（参考 '+p.target[i]+'）')
  })
  for(const [n,keys] of observed) if(keys.size>1)problems.add(n+'：应相连的引脚未连通；也请检查方向。')
  for(const labels of physical.values()) if(labels.size>1)problems.add([...labels].join(' / ')+'：不应合并的节点，检查短接。')
  if(!problems.size)problems.add('连接不符合图 1。')
 }
 if(!build.P1&&['T','B'].some(s=>root(s+'+1')===root(s+'−1'))) problems.add('供电轨正负极被短接。')
 if(build.P1&&root(build.P1[0])===root(build.P1[1])) problems.add('电源正负轨短路！')
 if(build.P1&&down(build.P1[0])===down(build.P1[1])) problems.add('按下按键时电源短路！')
 if(build.P1&&build.P1.some((k,i)=>byHole[k]?.row!==byHole[partFor('P1')!.target[i]].row))problems.add('电源模块正负极或上下轨方向有误。')
 return [...problems]
}
export const reference=Object.fromEntries(parts.map(p=>[p.id,p.target]))
