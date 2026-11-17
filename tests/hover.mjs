import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {PerspectiveCamera,Vector3} from 'three'
const browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']})
try{
 const page=await browser.newPage({viewport:{width:1440,height:940}})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/')
 const button=name=>page.getByRole('button',{name,exact:true})
 await button('一键搭建完整电路').click()
 await button('俯视').click()
 await page.waitForTimeout(700)
 const r=await page.locator('canvas').boundingBox()
 const camera=new PerspectiveCamera(42,r.width/r.height,.2,550)
 const target=new Vector3(5,0,1)
 camera.position.set(5,128,1.01).sub(target).multiplyScalar(Math.max(1,1.12*r.height/r.width)).add(target)
 camera.lookAt(target);camera.updateMatrixWorld()
 const move=async(x,y,z)=>{const v=new Vector3(x,y,z).project(camera);await page.mouse.move(r.x+(v.x+1)*r.width/2,r.y+(1-v.y)*r.height/2)}
 const tip=page.getByRole('tooltip')
 await move(-16.51,6.6,-7.62)
 await tip.waitFor()
 assert.match(await tip.innerText(),/Q1 · S8050/)
 for(const text of ['发射极','基极','集电极','c23','c22','c21'])assert.ok((await tip.innerText()).includes(text))
 await page.screenshot({path:'artifacts/引脚坐标悬停.png'})
 // Rotate the physical component; the tooltip must report its current holes, not its recommendations.
 await page.locator('.inventory .part').filter({has:page.locator('.part-copy b').filter({hasText:/^Q1 /})}).click()
 await button('反向 / 180°').click()
 await move(-16.51,6.6,-7.62)
 await tip.waitFor()
 assert.match(await tip.locator('.hover-pins>div').nth(0).innerText(),/c21/)
 assert.match(await tip.locator('.hover-pins>div').nth(2).innerText(),/c23/)
 await page.getByTitle('撤销',{exact:true}).click()
 await move(51,4.3,0)
 await tip.waitFor()
 assert.match(await tip.innerText(),/P1 · HW-131/)
 assert.equal(await tip.locator('.hover-pins>div').count(),8)
 for(const text of ['T+1','T−1','B+1','B−1','上方正轨','下方负轨'])assert.ok((await tip.innerText()).includes(text))
 await page.mouse.move(10,10)
 await tip.waitFor({state:'hidden'})
 assert.deepEqual(errors,[])
 console.log('Hover: transistor labels, live rotated holes, eight power pins and hide-on-leave passed.')
}finally{await browser.close()}
