// Capture selected screens without playing a combat loop.
// node tools/visual-check.mjs --screens=home,modes,summon,formation
//   --viewports=1280x720,1920x1080 --out=test-results/visual --battle-mode=tournament
//   --css=src/battle-polish.css (preview an optional stylesheet before linking it)
// Layout findings are review candidates, not a visual-quality score. Ornamental
// frames and intentionally overlapping cards still need human inspection.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');return i<0?[arg.replace(/^--/,''),true]:[arg.slice(0,i).replace(/^--/,''),arg.slice(i+1)];}));
const screens=String(args.screens||'home,modes,summon,formation').split(',').map(s=>s.trim()).filter(Boolean);
const allowed=new Set(['home','modes','summon','formation','collection','sect','inventory','realm','battle']);
for(const name of screens)if(!allowed.has(name))throw Error(`Unknown screen: ${name}`);
const viewports=String(args.viewports||'1280x720,1920x1080').split(',').map(value=>{const match=/^(\d{3,4})x(\d{3,4})$/.exec(value);if(!match)throw Error(`Invalid viewport: ${value}`);return {width:Number(match[1]),height:Number(match[2])};});
const output=path.resolve(String(args.out||'test-results/visual'));
await fs.mkdir(output,{recursive:true});
process.env.BLOSSOM_PORT='4176';
const {server}=await import('./serve.mjs');
let browser;
const report={generatedAt:new Date().toISOString(),screens:[],runtimeErrors:[],assetFailures:[],notes:[
  'All coordinates in findings are viewport pixels. designRect values normalize the stage to 1600 by 900.',
  'Controls intentionally hidden beyond scrollable panels are counted separately and excluded from viewport-overflow findings.',
  'Control overlaps and text clipping are candidates for visual review, not automatic proof of a defect.',
  'Only real interactive elements are compared. Decorative filigree/image overlap is not automatically assessed.',
]};
try{
  browser=await chromium.launch({channel:args.channel||'chrome',headless:true});
  for(const viewport of viewports){
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    const page=await context.newPage();let currentScreen='loading';
    page.on('pageerror',error=>report.runtimeErrors.push({screen:currentScreen,viewport,error:error.message}));
    page.on('response',response=>{if(response.status()>=400)report.assetFailures.push({screen:currentScreen,viewport,url:response.url(),status:response.status()});});
    for(const name of screens){
      currentScreen=name;
      await page.goto('http://127.0.0.1:4176');await page.waitForSelector('#stage.screen-home');
      if(name==='battle'){
        await page.locator('[data-action="navigate"][data-screen="modes"]').first().click();
        await page.locator(`[data-action="mode"][data-id="${args['battle-mode']||'tournament'}"]`).click();
        await page.locator('[data-action="battle-start"]').click();await page.waitForSelector('.battle-board');
      }else if(name==='realm'){
        await page.locator('[data-action="navigate"][data-screen="modes"]').first().click();
        await page.locator('[data-action="mode"][data-id="realm"]').click();
        await page.locator('[data-action="navigate"][data-screen="realm"]').first().click();
      }else if(name!=='home')await page.locator(`[data-action="navigate"][data-screen="${name}"]`).first().click();
      if(args.css)for(const file of String(args.css).split(','))await page.addStyleTag({url:'/'+file.replaceAll('\\','/').replace(/^\/+/, '')});
      await page.mouse.move(1,viewport.height-1);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
      // A battle toast briefly covers the footer; screenshots should show the
      // stable interface rather than a time-dependent first-entry notification.
      if(name==='battle')await page.waitForTimeout(3000);
      const filename=`${name}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({path:path.join(output,filename),animations:'disabled'});
      const audit=await page.evaluate(()=>{
        const round=n=>Math.round(n*10)/10;
        const box=r=>({x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height)});
        const viewport={x:0,y:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight};
        const intersect=(a,b)=>{const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.right,b.right),bottom=Math.min(a.bottom,b.bottom);return{x,y,right,bottom,width:Math.max(0,right-x),height:Math.max(0,bottom-y)};};
        const area=r=>r.width*r.height;
        const stage=document.querySelector('#stage'),stageRect=stage.getBoundingClientRect();
        const scale=stageRect.width/1600;
        const elements=[...document.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,[role="button"]')];
        const controls=[],outsideViewport=[],containerClipping=[],textOverflow=[],overlapCandidates=[],occluded=[];let scrollHidden=0;
        for(const [index,el] of elements.entries()){
          const style=getComputedStyle(el),rect=el.getBoundingClientRect();
          if(style.display==='none'||style.visibility==='hidden'||!rect.width||!rect.height||el.closest('[hidden]'))continue;
          let visible=intersect(rect,viewport),scrollable=false,clipped=false,hidden=false;
          for(let parent=el.parentElement;parent&&parent!==document.documentElement;parent=parent.parentElement){
            const ps=getComputedStyle(parent),pr=parent.getBoundingClientRect();
            if(ps.display==='none'||ps.visibility==='hidden'||Number(ps.opacity)===0){hidden=true;break;}
            const clipX=['hidden','clip','auto','scroll'].includes(ps.overflowX),clipY=['hidden','clip','auto','scroll'].includes(ps.overflowY);
            if(['auto','scroll'].includes(ps.overflowX)&&parent.scrollWidth>parent.clientWidth+2||['auto','scroll'].includes(ps.overflowY)&&parent.scrollHeight>parent.clientHeight+2)scrollable=true;
            if(clipX||clipY){const clipping={x:clipX?pr.x:-1e6,y:clipY?pr.y:-1e6,right:clipX?pr.right:1e6,bottom:clipY?pr.bottom:1e6};const next=intersect(visible,clipping);if(area(next)<area(visible)-4)clipped=true;visible=next;}
          }
          if(hidden)continue;
          const name=(el.getAttribute('aria-label')||el.innerText||el.getAttribute('title')||el.dataset.action||el.id||el.tagName).trim().replace(/\s+/g,' ').slice(0,110);
          const selector=el.id?'#'+el.id:[el.tagName.toLowerCase(),...['action','id','uid','index','screen','slot','setting'].filter(key=>el.dataset[key]!=null).map(key=>`[data-${key}="${el.dataset[key]}"]`)].join('');
          const enabled=!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&style.pointerEvents!=='none';
          const record={index,name,selector,enabled,rect:box(rect),designRect:{x:round((rect.x-stageRect.x)/scale),y:round((rect.y-stageRect.y)/scale),width:round(rect.width/scale),height:round(rect.height/scale)}};
          if(scrollable&&area(visible)<4){scrollHidden++;continue;}
          const beyondViewport=rect.x<-.5||rect.y<-.5||rect.right>innerWidth+.5||rect.bottom>innerHeight+.5;
          if(beyondViewport&&!scrollable)outsideViewport.push(record);
          if(clipped&&!scrollable&&area(visible)<area(rect)*.97)containerClipping.push({...record,visibleRect:box(visible),visiblePercent:round(area(visible)/area(rect)*100)});
          if(area(visible)<4)continue;
          controls.push({el,rect,visible,...record});
          const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
          while(node=walker.nextNode()){
            if(!node.textContent.trim())continue;const parent=node.parentElement,ps=getComputedStyle(parent);
            if(ps.display==='none'||ps.visibility==='hidden'||ps.textOverflow==='ellipsis')continue;
            const range=document.createRange();range.selectNodeContents(node);const textRect=range.getBoundingClientRect();
            if(textRect.width&&textRect.height&&(textRect.left<rect.left-2||textRect.right>rect.right+2||textRect.top<rect.top-2||textRect.bottom>rect.bottom+2)){textOverflow.push({...record,text:node.textContent.trim().slice(0,120),textRect:box(textRect),intentionalEllipsis:style.textOverflow==='ellipsis'&&textRect.top>=rect.top-2&&textRect.bottom<=rect.bottom+2});break;}
          }
          if(enabled){
            const samples=[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]],blocked=[];let reachable=0;
            for(const [sx,sy] of samples){const x=visible.x+visible.width*sx,y=visible.y+visible.height*sy,top=document.elementFromPoint(x,y);if(top&&(top===el||el.contains(top)))reachable++;else if(top)blocked.push({tag:top.tagName.toLowerCase(),className:typeof top.className==='string'?top.className:'',action:top.closest('[data-action]')?.dataset.action||null});}
            if(!reachable)occluded.push({...record,blockers:blocked});
          }
        }
        for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
          const a=controls[i],b=controls[j];if(!a.enabled||!b.enabled||a.el.contains(b.el)||b.el.contains(a.el))continue;
          const intersection=intersect(a.visible,b.visible),minimum=Math.min(area(a.visible),area(b.visible));
          if(intersection.width>=4&&intersection.height>=4&&area(intersection)/minimum>.035)overlapCandidates.push({a:{name:a.name,selector:a.selector,rect:a.rect},b:{name:b.name,selector:b.selector,rect:b.rect},intersection:box(intersection),percentOfSmaller:round(area(intersection)/minimum*100)});
        }
        return{stage:box(stageRect),scale:round(scale),visibleControls:controls.length,intentionallyScrollHidden:scrollHidden,outsideViewport,containerClipping,textOverflow,overlapCandidates,occluded};
      });
      report.screens.push({screen:name,viewport,screenshot:filename,...audit});
    }
    await context.close();
  }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({output,screens:report.screens.map(s=>({screen:s.screen,viewport:`${s.viewport.width}x${s.viewport.height}`,controls:s.visibleControls,viewportOverflow:s.outsideViewport.length,containerClipping:s.containerClipping.length,textOverflow:s.textOverflow.filter(x=>!x.intentionalEllipsis).length,intentionallyEllipsized:s.textOverflow.filter(x=>x.intentionalEllipsis).length,overlapCandidates:s.overlapCandidates.length,occluded:s.occluded.length})),runtimeErrors:report.runtimeErrors,assetFailures:report.assetFailures},null,2));
if(report.runtimeErrors.length||report.assetFailures.length)process.exitCode=1;
