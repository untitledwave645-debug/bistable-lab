import {useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {byHole,check,holes,info,netsOf,partFor,parts,placementError,steps,reference,type Part} from './circuit'
import {Scene} from './scene'
import {useBoard} from './store'
import './style.css'
const views=[['free','自由'],['top','俯视'],['front','正视'],['side','侧视']]
const netNames:Record<string,string>={'5V':'+5 V','GND':'GND','B1':'Q1 基极','B2':'Q2 基极','C1':'Q1 集电极','C2':'Q2 集电极','A1':'LED1 阳极','A2':'LED2 阳极','PULSE':'触发脉冲','KEY':'按键节点'}
function pinMeaning(p:Part,pin:string){
 if(p.kind==='q')return ({E:'发射极',B:'基极',C:'集电极'} as Record<string,string>)[pin]
 if(p.kind==='led')return pin==='A'?'阳极（＋）':'阴极（−）'
 if(p.kind==='d')return pin==='A'?'阳极':'阴极（黑环端）'
 if(p.kind==='ps')return ({'+T':'上方正轨','−T':'上方负轨','+B':'下方正轨','−B':'下方负轨'} as Record<string,string>)[pin.slice(0,2)]+' · 第 '+pin.slice(2)+' 组'
 return (p.kind==='wire'?'端点 ':'引脚 ')+pin
}
function holeMeaning(id:string){
 const h=byHole[id]
 if(!h)return '未插入'
 if(h.row.length===1)return h.row+' 排 · 第 '+h.col+' 列'
 return (h.row[0]==='T'?'上方':'下方')+(h.row[1]==='+'?'正':'负')+'电源轨 · 第 '+h.col+' 位'
}
function App(){
 const {board,back,ahead,commit,undo,redo}=useBoard()
 const [mode,setMode]=useState<'guide'|'free'>('guide'), [step,setStep]=useState(0), [selected,setSelected]=useState(''), [armed,arm]=useState(false)
 const [draft,setDraft]=useState<string[]>([]), [endIndex,setEndIndex]=useState(-1), [hole,setHole]=useState(''), [hover,setHover]=useState('')
 const [powerPins,setPowerPins]=useState(false)
 const [view,setView]=useState('free'), [serial,bump]=useState(0), [demo,setDemo]=useState(''), [notice,setNotice]=useState(''), [errors,setErrors]=useState<string[]>([])
 const [state,setState]=useState<0|1|2>(0), [pressed,setPressed]=useState(false), [schematic,setSchematic]=useState(false), [proof,setProof]=useState(false)
 const [holeChoice,setHoleChoice]=useState(''), [query,setQuery]=useState(''), [rotated,setRotated]=useState(false)
 const viewport=useRef<HTMLDivElement>(null)
 const [partHover,setPartHover]=useState<{id:string;x:number;y:number}|null>(null)
 const hoveredPart=partHover&&board[partHover.id]?partFor(partHover.id):undefined
 const showPartHover=(id:string,x:number,y:number)=>{
  const rect=viewport.current?.getBoundingClientRect()
  if(!rect)return
  const width=Math.min(278,rect.width-20), height=88+(partFor(id)?.pins.length??2)*44
  const left=x-rect.left+18+width>rect.width-10?x-rect.left-width-18:x-rect.left+18
  setPartHover({id,x:Math.max(10,Math.min(left,rect.width-width-10)),y:Math.max(55,Math.min(y-rect.top+16,rect.height-height-12))})
  setHover('')
 }
 const snap=useRef<(x:number,y:number)=>string>(()=>'')
 const all=[...parts,...Object.keys(board).filter(id=>id.startsWith('X')).flatMap(id=>partFor(id)??[])]
 const current=parts.filter(p=>p.step===step), p=partFor(selected)
 const root=netsOf(board)
 const active=hole?[...holes.filter(h=>root(h.id)===root(hole)).map(h=>h.id)]:[]
 const goals=mode==='guide'?(p?.step===step?p.target:current.filter(p=>!board[p.id]).flatMap(p=>p.target)):[]
 const pathParts=hole?Object.entries(board).flatMap(([id,h])=>h.flatMap((k,i)=>root(k)===root(hole)?[id+' '+(partFor(id)?.pins[i]??'')+' · '+k]:[])):[]
 const done=current.filter(p=>board[p.id]).length
 const change=()=>{setPartHover(null);setState(0);setPressed(false);setErrors([]);setDemo('')}
 const apply=(p:Part,h:string[])=>{
  const e=placementError(p,h,board)
  if(e){setNotice(e);return false}
  commit({...board,[p.id]:h});change()
  setSelected(p.id);arm(false);setDraft([]);setEndIndex(-1);setNotice(p.id+' 已插入 · '+h.join(' → '));return true
 }
 const choose=(p:Part,placing=!board[p.id])=>{setSelected(p.id);arm(placing);setDraft([]);setEndIndex(-1);setRotated(false);setDemo('');setNotice('')}
 const cancel=()=>{arm(false);setDraft([]);setEndIndex(-1);setDemo('');setNotice('')}
 function place(k:string,part=p,force=armed){
  if(!byHole[k])return
  setHole(k);setHoleChoice(k)
  if(!part||!force)return
  if(endIndex>=0&&board[part.id]){apply(part,board[part.id].map((v,i)=>i===endIndex?k:v));return}
  if(part.kind==='q'||part.kind==='ps'){
   const first=byHole[part.target[0]], base=byHole[k], s=rotated?-1:1
   const h=part.target.map(t=>holes.find(h=>Math.abs(h.x-(base.x+s*(byHole[t].x-first.x)))<.02&&Math.abs(h.z-(base.z+s*(byHole[t].z-first.z)))<.02)?.id??'')
   apply(part,h);return
  }
  if(draft.length===0){setDraft([k]);setNotice('已选 '+part.pins[rotated?1:0]+' · '+k+'，请选择 '+part.pins[rotated?0:1]+' 的插孔。');return}
  if(!apply(part,rotated?[k,draft[0]]:[draft[0],k]))setNotice('第二脚未插入：请选一个未被占用的不同插孔。')
 }
 function rotate(){
  if(!p)return
  if(!board[p.id]||armed){setDraft([]);setRotated(!rotated);setNotice(rotated?'方向已恢复。':'方向已反转，下一次插接从第一脚定位。');return}
  const h=board[p.id]
  apply(p,[...h].reverse())
 }
 function remove(){
  if(!p||!board[p.id])return
  const next={...board};delete next[p.id];commit(next);change();cancel();setNotice(p.id+' 已取下。')
 }
 const flip=()=>{if(state){setPressed(true);setState(state===1?2:1);setNotice('S1 触发：两侧状态已翻转。')}}
 const tap=()=>{flip();window.setTimeout(()=>setPressed(false),180)}
 function inspect(advance=false){
  const failed=check(board,advance?step:5);setErrors(failed)
  if(failed.length){setNotice('发现连线问题，请查看检查结果。');return}
  if(advance&&step<5){setStep(step+1);cancel();setSelected('');setNotice('通过检查，进入下一步。')}
  else setNotice('电气连接与讲义图 1 一致。')
 }
 function assemble(){
  const complete=Object.fromEntries(Object.entries(reference).map(([id,pins])=>[id,[...pins]]))
  const failed=check(complete)
  if(failed.length){setErrors(failed);setNotice('参考电路检查失败。');return}
  commit(complete);change();cancel();setStep(5);setSelected('');setHole('');setHoleChoice('');setHover('');setQuery('');setPowerPins(false);setView('free');bump(serial+1)
  setNotice('完整电路已搭好，全部 28 个元件已通过连接检查。可旋转查看，或开始逻辑演示。')
 }
 function run(){
  if(state){setState(0);setPressed(false);return}
  const failed=check(board);setErrors(failed)
  if(failed.length){setNotice('先完成电路并通过检查，再运行逻辑演示。');return}
  cancel();setState(1);setNotice('初始演示：Q1 导通，LED1 亮。实物也可能从另一状态开始。')
 }
 useEffect(()=>{
  function key(e:KeyboardEvent){if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return
   if(e.key==='Escape')cancel()
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();change();cancel()}
   if(e.key.toLowerCase()==='r'&&!e.metaKey&&!e.ctrlKey)rotate()
   if(e.key==='Delete'||e.key==='Backspace')remove()
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
 })
 return <>
 <header className="mast">
 <div className="brand"><span className="brand-icon">ϟ</span><div><strong>电路实验台</strong><small> BENCH / ELECTRONICS LAB</small></div></div>
 <div className="modes"><button className={mode==='guide'?'chosen':''} onClick={()=>{setMode('guide');cancel()}}>教学模式</button><button className={mode==='free'?'chosen':''} onClick={()=>{setMode('free');cancel()}}>自由搭建</button></div>
 <div className="toolbar"><button title="撤销" disabled={!back.length} onClick={()=>{undo();change();cancel()}}>↶</button><button title="重做" disabled={!ahead.length} onClick={()=>{redo();change();cancel()}}>↷</button><button onClick={()=>{if(Object.keys(board).length&&window.confirm('清空面包板？重置可以撤销。')){commit({});change();cancel();setStep(0);setSelected('');setHole('');setNotice('面包板已清空。')}}}>重置</button><button onClick={()=>inspect()}>电路检查</button><button className="primary" onClick={run}>{state?'■ 停止演示':'▶ 开始仿真'}</button></div>
 </header>
 <main>
 <aside className="library panel">
 <div className="panel-head"><div className="eyebrow">01 / INVENTORY</div><h2>元件库</h2><p>拖到孔位，或选中后逐脚插接。</p></div>
 <label className="search"><span>⌕</span><input placeholder="搜索编号或参数" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <div className="inventory">
 {all.filter(p=>(p.id+p.value+info[p.kind].name).toLowerCase().replaceAll(' ','').includes(query.toLowerCase().replaceAll(' ',''))).map(p=><button draggable={!board[p.id]} onDragStart={e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='copy';choose(p,true)}} key={p.id} className={'part '+(selected===p.id?'selected ':'')+(mode==='guide'&&p.step===step&&!board[p.id]?'needed':'')} onClick={()=>choose(p)}>
 <span className={'part-icon '+p.kind} style={{'--ink':info[p.kind].color} as React.CSSProperties}>{info[p.kind].icon}</span>
 <span className="part-copy"><b>{p.id} <i>{p.value}</i></b><small>{info[p.kind].name}</small></span><span className={board[p.id]?'used':'count'}>{board[p.id]?'✓':'1'}</span>
 </button>)}
 </div>
 <button className="add" onClick={()=>{const id='X'+(1+Math.max(0,...Object.keys(board).filter(s=>s.startsWith('X')).map(s=>+s.slice(1))));choose(partFor(id)!,true)}}>＋ 添加自定义跳线</button>
 </aside>
 <section className="work panel">
 <div className="workhead"><div><div className="eyebrow">02 / WORKSPACE</div><h1>三极管双稳态电路</h1></div><div className="actions"><button onClick={assemble}>一键搭建完整电路</button><button onClick={()=>setSchematic(true)}>▤ 原理图</button></div></div>
 <div className="viewport" ref={viewport} onPointerLeave={()=>setPartHover(null)} onPointerDownCapture={()=>setPartHover(null)} onWheelCapture={()=>setPartHover(null)} onDragOver={e=>{e.preventDefault();setHover(snap.current(e.clientX,e.clientY))}} onDragLeave={()=>setHover('')} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain'), dp=partFor(id), k=snap.current(e.clientX,e.clientY);setHover('');if(dp&&k)place(k,dp,true);else setNotice('请把元件拖到面包板的具体插孔。')}}>
 <div className="view-tools">{views.map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>{setView(key);bump(serial+1)}}>{label}</button>)}<button aria-pressed={powerPins} onClick={()=>setPowerPins(!powerPins)}>电源底针</button></div>
 <div className="scene"><Scene powerPins={powerPins} board={board} view={view} serial={serial} selected={selected} active={[...active,...draft,...(hoveredPart?board[hoveredPart.id]:[])]} goal={goals} onHole={place} onPart={id=>choose(partFor(id)!,false)} onPress={flip} onRelease={()=>setPressed(false)} armed={armed} ghost={demo?partFor(demo):undefined} state={state} pressed={pressed} hover={hover} setHover={setHover} onPartHover={showPartHover} onPartLeave={id=>setPartHover(h=>h?.id===id?null:h)} onReady={fn=>{snap.current=fn}} onMoveEndpoint={(id,i,k)=>apply(partFor(id)!,board[id].map((h,j)=>i===j?k:h))}/></div>
 {hoveredPart&&partHover&&<div className="part-tooltip" role="tooltip" style={{left:partHover.x,top:partHover.y}}>
 <strong>{hoveredPart.id} · {hoveredPart.value}</strong>
 <small>{hoveredPart.kind==='ps'?'8 针模型坐标 · 实物针序待核对':'当前实际插孔 · 字母为排，数字为列'}</small>
 <div className="hover-pins">{hoveredPart.pins.map((pin,i)=>{const id=board[hoveredPart.id][i];return <div key={pin}><span><b>{pin}</b> {pinMeaning(hoveredPart,pin)}<small>{holeMeaning(id)}</small></span><code>{id}</code></div>})}</div>
 <small className="hover-help">绿色圆环标出各引脚落点</small>
 </div>}
 <div className="viewport-footer"><span><i className="dot"/> {state?'逻辑演示运行中':armed?'插接模式':'交互式 3D'} <em> · </em>{hover||'2.54 mm 孔距'}</span><span>拖动旋转 · 滚轮缩放</span></div>
 </div>
 <div className="workspace-foot">
 <div className="status" role="status"><span>◉</span>{notice||'选择左侧元件，或点击插孔查看内部连通关系。'}</div>
 <div className="manual"><label htmlFor="hole-pick">定位插孔</label><select id="hole-pick" value={holeChoice} onChange={e=>setHoleChoice(e.target.value)}><option value="">选择编号</option>{holes.map(h=><option key={h.id}>{h.id}</option>)}</select><button disabled={!holeChoice} onClick={()=>place(holeChoice)}>{armed?'插入':'查看'}</button>{armed&&<button onClick={cancel}>取消</button>}</div>
 {hole&&<small className="node-detail">{hole} · {byHole[hole].strip} · {active.length} 个孔导通{pathParts.length?' · '+pathParts.join(' / '):' · 无已连接引脚'}</small>}
 </div>
 </section>
 <aside className="guide panel">
 <div className="panel-head"><div className="eyebrow">03 / LAB GUIDE</div><h2>{mode==='guide'?'实验指导':'自由搭建'}</h2><p>{mode==='guide'?'依据讲义图 1 · 推荐操作顺序':'孔位不同也可实现相同电气节点。'}</p></div>
 <div className="guide-scroll">
 {mode==='guide'&&<>
 <div className="progress">{steps.map(([name],i)=><button key={name} aria-label={name} title={name} className={(i===step?'current ':'')+(i<step?'prev':'')} onClick={()=>{setStep(i);cancel();setSelected('');setErrors([])}}>{String(i+1).padStart(2,'0')}</button>)}</div>
 <section className="lesson"><div className="eyebrow">STEP {String(step+1).padStart(2,'0')} <span>{done} / {current.length} 已放置</span></div><h3>{steps[step][0]}</h3><p>{steps[step][1]}</p>
 <div className="targets">{current.map(x=><button key={x.id} title={x.role} className={selected===x.id?'selected':''} onClick={()=>choose(x)}><b>{board[x.id]?'✓ ':''}{x.id}</b><span>{x.target.join(' → ')}</span></button>)}</div>
 <button className="primary next" onClick={()=>inspect(true)}>{step===5?'检查本步':'检查本步并继续 →'}</button>
 </section></>}
 {p&&<section className="inspector"><div className="eyebrow">COMPONENT <span>{board[p.id]?'已安装':'待安装'}</span></div><h3>{p.id} · {p.value}</h3><p>{p.role}</p>
 {armed&&<p className="instruction">{endIndex>=0?'移动 '+p.pins[endIndex]:'选择 '+(draft.length?p.pins[rotated?0:1]:p.pins[rotated&&p.pins.length===2?1:0])}{(p.kind==='q'||p.kind==='ps')?'；其余各脚自动定位。':' 的插孔。'}</p>}
 <div className="pins">{p.pins.map((n,i)=><div key={n}><b>{n}</b><span>{p.kind==='q'?({E:'发射极',B:'基极',C:'集电极'}[n]+' · '):['led','d'].includes(p.kind)?(n==='A'?'阳极 · ':'阴极 · '):''}{netNames[p.nets[i]]||'端点'}</span><button className="pin-hole" disabled={!board[p.id]?.[i]&&!p.target[i]} title="高亮引脚及其连通节点" onClick={()=>{const k=board[p.id]?.[i]||p.target[i];setHole(k);setHoleChoice(k)}}>{board[p.id]?.[i]||p.target[i]||'—'}</button>{p.kind==='wire'&&board[p.id]&&<button title={'移动端点 '+n} onClick={()=>{setEndIndex(i);arm(true);setDraft([])}}>移动</button>}</div>)}</div>
 <div className="actions">
 {p.target.length>0&&!board[p.id]&&mode==='guide'&&<><button onClick={()=>{setDemo(demo===p.id?'':p.id)}}>{demo===p.id?'关闭示范':'观看插入'}</button><button onClick={()=>apply(p,p.target)}>用推荐孔位</button></>}
 {board[p.id]&&<button onClick={()=>choose(p,true)}>移动</button>}
 <button onClick={rotate}>{board[p.id]&&!armed?'反向 / 180°':rotated?'恢复方向':'反向'}</button>
 {board[p.id]&&<button onClick={remove}>取下</button>}
 </div>
 </section>}
 {errors.length>0&&<section className="error"><strong>检查结果 · {errors.length}</strong><ul>{errors.map(e=><li key={e}>{e}</li>)}</ul></section>}
 <section className="simulation"><div className="eyebrow">LOGIC DEMO</div><h3>双稳态逻辑演示</h3><p>按接线检查结果演示状态翻转，不计算电流、电压或实际暂态。</p>
 <div className="states">{[1,2].map(i=><div key={i} className={state===i?'on':''}><i/> LED{i}<small>Q{i} {state?state===i?'导通':'截止':'未上电'}</small></div>)}</div>
 <button disabled={!state} className={pressed?'chosen':''} onPointerDown={flip} onPointerUp={()=>setPressed(false)} onPointerCancel={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)} onClick={e=>{if(e.detail===0)tap()}}>{pressed?'S1 已按下':'按下 S1'}</button>
 </section>
 <button className="proof" onClick={()=>setProof(!proof)}>ⓘ 实物对照与待确认项 {proof?'▴':'▾'}</button>
 {proof&&<div className="proof-text">器材照片用于外形和孔位布局。供电轨默认每条全长导通，实物请用通断档确认。S8050 模型按 <a href="https://www.onsemi.com/pdf/datasheet/ss8050-d.pdf" target="_blank" rel="noreferrer">onsemi SS8050 数据表</a>（1=E、2=B、3=C）；你的器件厂牌未核实。右侧模块的四组双针座已建模，针位及同极性并联关系为模型配置；实物请先断电核对底针极性、USB 输入和两路跳帽，再测量正负轨是否为 5 V。推荐孔位与节点要求不同：同一电气节点允许改用其他等效插孔。</div>}
 </div>
 </aside>
 </main>
 <footer className="app-foot"><span>LAB / 01</span><span>{Object.keys(board).length} 个元件已安装 <em> / </em> {holes.length} 个插孔</span><span>USB · 5 V <em> / </em> 本地实验环境</span></footer>
 {schematic&&<div className="modal" onClick={()=>setSchematic(false)}><div role="dialog" aria-modal="true" aria-label="讲义原理图" onClick={e=>e.stopPropagation()}><div><strong>讲义图 1 · 三极管双稳态电路</strong><button onClick={()=>setSchematic(false)}>关闭</button></div><img src="/schematic.png" alt="讲义图 1：两组交叉反馈和按键触发支路"/></div></div>}
 </>
}
createRoot(document.getElementById('root')!).render(<App/>)
