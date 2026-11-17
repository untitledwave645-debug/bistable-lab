import assert from 'node:assert/strict'
import test from 'node:test'
import {check,holes,byHole,netsOf,parts,reference,placementError} from '../src/circuit'
test('mini board has separated rows, 25 offset sockets on each supply rail',()=>{
 assert.equal(holes.length,400)
 assert.equal(byHole['T+24'],undefined)
 assert.ok(byHole.a30.x<byHole.a1.x)
 assert.notEqual(byHole['T+29'].x,byHole.a29.x)
 const n=netsOf({})
 assert.equal(n('a21'),n('e21'))
 assert.notEqual(n('e21'),n('f21'))
 assert.equal(n('T+29'),n('T+1'))
 assert.notEqual(n('T+29'),n('B+29'))
})
test('every teaching step and full reference circuit pass',()=>{
 for(let i=0;i<6;i++){
  const b=Object.fromEntries(parts.filter(p=>p.step<=i).map(p=>[p.id,p.target]))
  assert.deepEqual(check(b,i),[], 'step '+i)
 }
})
test('schematic connectivity and momentary switch action',()=>{
 const up=netsOf(reference), down=netsOf(reference,true)
 for(const id of ['R3','C1']){assert.equal(up(reference[id][0]),up(reference.Q1[2]));assert.equal(up(reference[id][1]),up(reference.Q2[1]))}
 assert.equal(up(reference.D1[1]),up(reference.D2[1]))
 assert.equal(up(reference.D1[1]),up(reference.C3[1]))
 assert.notEqual(up(reference.S1[0]),up(reference.P1[1]))
 assert.equal(down(reference.S1[0]),down(reference.P1[1]))
})
test('alternative same-strip position and passive orientation accepted',()=>{
 assert.deepEqual(check({...reference,LED1:['c26','b21'], R1:[...reference.R1].reverse()}),[])
})
test('swapped polarities, signal shorts and missing parts rejected',()=>{
 for(const id of ['LED1','D1','Q1','P1'])assert.ok(check({...reference,[id]:[...reference[id]].reverse()}).length,id)
 assert.ok(check({...reference,X1:['T+23','T−25']}).some(x=>x.includes('电源正负轨短路')))
 assert.ok(check({...reference,S1:['T+23','i30']}).some(x=>x.includes('按下按键时电源短路')))
 const {W7,...b}=reference
 assert.ok(check(b).includes('缺少 W7 · PULSE'))
 assert.ok(placementError(parts[0],['c23','c21','c22'],reference))
})
test('power module requires all four pairs and checks the additional pins',()=>{
 const power=parts.find(p=>p.id==='P1')!
 assert.equal(power.pins.length,8)
 assert.ok(placementError(power,reference.P1.slice(0,4),reference))
 const crossed=[...reference.P1]
 ;[crossed[4],crossed[5]]=[crossed[5],crossed[4]]
 assert.ok(check({...reference,P1:crossed}).some(e=>e.includes('电源正负轨短路')))
 assert.deepEqual(check(reference),[])
})
