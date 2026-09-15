import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Download, Eraser, Minus, MousePointer2, PaintBucket, PenLine, Plus, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";

type Point = { x: number; y: number };
type PixelPoint = { x: number; y: number };
type Segment = { id: string; groupId: string; a: Point; b: Point; color: string };
type Fill = { id: string; polygon: Point[]; holes: Point[][]; color: string; boundaryGroups: string[] };
type Face = { polygon: Point[]; holes: Point[][]; boundaryGroups: string[]; area: number };
type Snapshot = { segments: Segment[]; fills: Fill[] };
type Tool = "select" | "line" | "fill" | "eraser";
type Symmetry = 1 | 2 | 4;

const COLORS = ["#ef4444", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#171717"];
const GRID = 28;
const initialSegments: Segment[] = [];
const initialFills: Fill[] = [];

function transformedPoints(p: Point, symmetry: Symmetry): Point[] {
  const points = symmetry===1 ? [p] : symmetry===2 ? [p,{x:-p.x,y:p.y}] : [p,{x:-p.x,y:p.y},{x:p.x,y:-p.y},{x:-p.x,y:-p.y}];
  return points.filter((v,i,all)=>all.findIndex(q=>q.x===v.x&&q.y===v.y)===i);
}
function transformedSegments(a:Point,b:Point,symmetry:Symmetry){
  const operations=((p:Point)=>p);
  const transforms=[operations,...(symmetry>=2?[(p:Point)=>({x:-p.x,y:p.y})]:[]),...(symmetry===4?[(p:Point)=>({x:p.x,y:-p.y}),(p:Point)=>({x:-p.x,y:-p.y})]:[])];
  const pairs=transforms.map(transform=>({a:transform(a),b:transform(b)}));
  return pairs.filter((pair,i,all)=>all.findIndex(other=>edgeKey(other.a,other.b)===edgeKey(pair.a,pair.b))===i);
}
function distanceToSegment(p: PixelPoint, a: PixelPoint, b: PixelPoint) {
  const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
  const t=length===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length));
  return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}

const pointKey=(p:Point)=>`${p.x},${p.y}`;
const edgeKey=(a:Point,b:Point)=>[pointKey(a),pointKey(b)].sort().join("|");
const polygonArea=(polygon:Point[])=>polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p.x*q.y-q.x*p.y},0)/2;
function pointInPolygon(point:Point,polygon:Point[]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if(((a.y>point.y)!==(b.y>point.y))&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
const cleanPoint=(p:Point):Point=>({x:Number(p.x.toFixed(8)),y:Number(p.y.toFixed(8))});
function splitAtIntersections(segments:Segment[]){
  const cuts=segments.map(()=>new Set([0,1])),epsilon=1e-8;
  const parameter=(point:Point,segment:Segment)=>{const dx=segment.b.x-segment.a.x,dy=segment.b.y-segment.a.y;return Math.abs(dx)>=Math.abs(dy)?(point.x-segment.a.x)/dx:(point.y-segment.a.y)/dy};
  const onSegment=(point:Point,segment:Segment)=>{const r={x:segment.b.x-segment.a.x,y:segment.b.y-segment.a.y},q={x:point.x-segment.a.x,y:point.y-segment.a.y},t=parameter(point,segment);return Math.abs(cross(r,q))<epsilon&&t>-epsilon&&t<1+epsilon};
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
    const a=segments[i],b=segments[j],r={x:a.b.x-a.a.x,y:a.b.y-a.a.y},s={x:b.b.x-b.a.x,y:b.b.y-b.a.y},qp={x:b.a.x-a.a.x,y:b.a.y-a.a.y},den=cross(r,s);
    if(Math.abs(den)>epsilon){const t=cross(qp,s)/den,u=cross(qp,r)/den;if(t>-epsilon&&t<1+epsilon&&u>-epsilon&&u<1+epsilon){cuts[i].add(Math.max(0,Math.min(1,t)));cuts[j].add(Math.max(0,Math.min(1,u)))}}
    else if(Math.abs(cross(qp,r))<epsilon){for(const point of [b.a,b.b])if(onSegment(point,a))cuts[i].add(Math.max(0,Math.min(1,parameter(point,a))));for(const point of [a.a,a.b])if(onSegment(point,b))cuts[j].add(Math.max(0,Math.min(1,parameter(point,b))))}
  }
  const atomic=new Map<string,{a:Point;b:Point;groups:Set<string>}>();
  segments.forEach((segment,i)=>{const values=[...cuts[i]].sort((a,b)=>a-b);for(let k=0;k<values.length-1;k++){const t1=values[k],t2=values[k+1];if(t2-t1<epsilon)continue;const at=(t:number)=>cleanPoint({x:segment.a.x+(segment.b.x-segment.a.x)*t,y:segment.a.y+(segment.b.y-segment.a.y)*t}),a=at(t1),b=at(t2),key=edgeKey(a,b),found=atomic.get(key);if(found)found.groups.add(segment.groupId);else atomic.set(key,{a,b,groups:new Set([segment.groupId])})}});
  return atomic;
}
function buildFaces(segments:Segment[]):Face[]{
  const nodes=new Map<string,Point>(),edges=splitAtIntersections(segments);
  edges.forEach(edge=>{nodes.set(pointKey(edge.a),edge.a);nodes.set(pointKey(edge.b),edge.b)});
  const adjacency=new Map<string,{to:string;angle:number}[]>();
  const add=(from:Point,to:Point)=>{const key=pointKey(from),list=adjacency.get(key)??[];if(!list.some(n=>n.to===pointKey(to)))list.push({to:pointKey(to),angle:Math.atan2(to.y-from.y,to.x-from.x)});adjacency.set(key,list)};
  edges.forEach(e=>{add(e.a,e.b);add(e.b,e.a)});adjacency.forEach(list=>list.sort((a,b)=>a.angle-b.angle));
  const visited=new Set<string>(),faces:Face[]=[],limit=edges.size*2+4;
  for(const [startU,list] of adjacency){for(const first of list){const startV=first.to;if(visited.has(`${startU}>${startV}`))continue;let u=startU,v=startV,steps=0,closed=false;const polygon:Point[]=[],groups=new Set<string>();do{visited.add(`${u}>${v}`);polygon.push(nodes.get(u)!);const edge=edges.get([u,v].sort().join("|"));edge?.groups.forEach(g=>groups.add(g));const around=adjacency.get(v);if(!around?.length)break;const incoming=around.findIndex(n=>n.to===u);if(incoming<0)break;const next=around[(incoming-1+around.length)%around.length].to;u=v;v=next;steps++;closed=u===startU&&v===startV}while(!closed&&steps<limit);if(closed&&polygon.length>=3){const area=polygonArea(polygon);if(area>1e-6)faces.push({polygon,holes:[],boundaryGroups:[...groups],area})}}}
  const children=new Map<number,number[]>();
  faces.forEach((child,childIndex)=>{let parent=-1,parentArea=Infinity;faces.forEach((candidate,candidateIndex)=>{if(candidateIndex!==childIndex&&candidate.area>child.area&&candidate.area<parentArea&&pointInPolygon(child.polygon[0],candidate.polygon)){parent=candidateIndex;parentArea=candidate.area}});if(parent>=0)children.set(parent,[...(children.get(parent)??[]),childIndex])});
  return faces.map((face,index)=>{const childFaces=(children.get(index)??[]).map(childIndex=>faces[childIndex]),groups=new Set(face.boundaryGroups);childFaces.forEach(child=>child.boundaryGroups.forEach(group=>groups.add(group)));return{...face,holes:childFaces.map(child=>child.polygon),boundaryGroups:[...groups]}});
}
function faceAt(point:Point,faces:Face[]){return faces.filter(face=>pointInPolygon(point,face.polygon)&&!face.holes.some(hole=>pointInPolygon(point,hole))).sort((a,b)=>a.area-b.area)[0]??null}

export default function App() {
  const canvasRef=useRef<HTMLCanvasElement>(null),wrapRef=useRef<HTMLDivElement>(null),gestureId=useRef(0);
  const [segments,setSegments]=useState<Segment[]>(initialSegments),[fills,setFills]=useState<Fill[]>(initialFills);
  const [history,setHistory]=useState<Snapshot[]>([]),[redo,setRedo]=useState<Snapshot[]>([]);
  const [tool,setTool]=useState<Tool>("line"),[symmetry,setSymmetry]=useState<Symmetry>(4),[color,setColor]=useState(COLORS[0]);
  const [zoom,setZoom]=useState(1),[mouseStart,setMouseStart]=useState<Point|null>(null),[spaceStart,setSpaceStart]=useState<Point|null>(null);
  const [cursor,setCursor]=useState<Point>({x:0,y:0}),[hover,setHover]=useState<Point|null>(null),[rawMouse,setRawMouse]=useState<PixelPoint|null>(null);
  const [selectedGroup,setSelectedGroup]=useState<string|null>(null),[size,setSize]=useState({w:1000,h:650});
  const [fillNotice,setFillNotice]=useState<"filled"|"open"|null>(null);
  const saveHistory=useCallback(()=>{setHistory(h=>[...h.slice(-39),{segments,fills}]);setRedo([])},[segments,fills]);

  useEffect(()=>{const update=()=>{if(wrapRef.current)setSize({w:wrapRef.current.clientWidth,h:wrapRef.current.clientHeight})};update();const o=new ResizeObserver(update);if(wrapRef.current)o.observe(wrapRef.current);return()=>o.disconnect()},[]);
  const toCanvas=useCallback((p:Point):PixelPoint=>({x:size.w/2+p.x*GRID*zoom,y:size.h/2+p.y*GRID*zoom}),[size,zoom]);
  const eventPixel=useCallback((e:PointerEvent<HTMLCanvasElement>):PixelPoint=>{const r=e.currentTarget.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}},[]);
  const pointFromPixel=useCallback((p:PixelPoint):Point=>({x:Math.round((p.x-size.w/2)/(GRID*zoom)),y:Math.round((p.y-size.h/2)/(GRID*zoom))}),[size,zoom]);
  const logicalFromPixel=useCallback((p:PixelPoint):Point=>({x:(p.x-size.w/2)/(GRID*zoom),y:(p.y-size.h/2)/(GRID*zoom)}),[size,zoom]);
  const hitTest=useCallback((p:PixelPoint)=>{let best:{groupId:string;distance:number}|null=null;for(const s of segments){const d=distanceToSegment(p,toCanvas(s.a),toCanvas(s.b));if(d<=9&&(!best||d<best.distance))best={groupId:s.groupId,distance:d}}return best?.groupId??null},[segments,toCanvas]);
  const faces=useMemo(()=>buildFaces(segments),[segments]);

  useEffect(()=>{if(!fillNotice)return;const timer=window.setTimeout(()=>setFillNotice(null),1800);return()=>window.clearTimeout(timer)},[fillNotice]);

  const commitLine=useCallback((a:Point,b:Point)=>{if(a.x===b.x&&a.y===b.y)return;saveHistory();const groupId=`gesture-${Date.now()}-${gestureId.current++}`,pairs=transformedSegments(a,b,symmetry),made=pairs.map((pair,i):Segment=>({id:`${groupId}-${i}`,groupId,a:pair.a,b:pair.b,color}));setSegments(old=>[...old,...made]);setSelectedGroup(null)},[color,saveHistory,symmetry]);
  const deleteGroup=useCallback((groupId:string)=>{saveHistory();setSegments(old=>old.filter(s=>s.groupId!==groupId));setFills(old=>old.filter(f=>!f.boundaryGroups.includes(groupId)));setSelectedGroup(null)},[saveHistory]);

  useEffect(()=>{function down(e:KeyboardEvent){const target=e.target as HTMLElement;if(["INPUT","TEXTAREA","SELECT"].includes(target.tagName))return;if(e.key.startsWith("Arrow")){e.preventDefault();const delta=e.key==="ArrowLeft"?[-1,0]:e.key==="ArrowRight"?[1,0]:e.key==="ArrowUp"?[0,-1]:[0,1];setCursor(p=>({x:p.x+delta[0],y:p.y+delta[1]}));setSelectedGroup(null)}else if(e.code==="Space"&&tool==="line"&&!e.repeat){e.preventDefault();setSpaceStart(cursor)}else if((e.key==="Delete"||e.key==="Backspace")&&selectedGroup){e.preventDefault();deleteGroup(selectedGroup)}else if(e.key==="Escape"){setMouseStart(null);setSpaceStart(null);setSelectedGroup(null)}}function up(e:KeyboardEvent){if(e.code==="Space"&&spaceStart){e.preventDefault();commitLine(spaceStart,cursor);setSpaceStart(null)}}window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)}},[commitLine,cursor,deleteGroup,selectedGroup,spaceStart,tool]);

  const draw=useCallback(()=>{const canvas=canvasRef.current;if(!canvas)return;const dpr=window.devicePixelRatio||1;canvas.width=size.w*dpr;canvas.height=size.h*dpr;canvas.style.width=`${size.w}px`;canvas.style.height=`${size.h}px`;const c=canvas.getContext("2d");if(!c)return;c.scale(dpr,dpr);c.fillStyle="#fff";c.fillRect(0,0,size.w,size.h);const step=GRID*zoom,ox=size.w/2,oy=size.h/2;c.beginPath();c.strokeStyle="#dceaf3";c.lineWidth=1;for(let x=ox%step;x<size.w;x+=step){c.moveTo(x,0);c.lineTo(x,size.h)}for(let y=oy%step;y<size.h;y+=step){c.moveTo(0,y);c.lineTo(size.w,y)}c.stroke();c.beginPath();c.strokeStyle="#91b8d2";c.lineWidth=1.5;c.moveTo(ox,0);c.lineTo(ox,size.h);c.moveTo(0,oy);c.lineTo(size.w,oy);c.stroke();fills.forEach(f=>{if(f.polygon.length<3)return;c.beginPath();const addRing=(ring:Point[])=>{ring.forEach((point,i)=>{const p=toCanvas(point);if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y)});c.closePath()};addRing(f.polygon);f.holes.forEach(addRing);c.globalAlpha=1;c.fillStyle=f.color;c.fill("evenodd")});segments.forEach(s=>{const a=toCanvas(s.a),b=toCanvas(s.b),selected=s.groupId===selectedGroup;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=selected?"#fff":s.color;c.lineWidth=selected?8:3;c.lineCap="round";c.stroke();if(selected){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle="#0ea5e9";c.lineWidth=4;c.stroke()}});
    const previewStart=mouseStart??spaceStart;if(previewStart){const a=toCanvas(previewStart),b=mouseStart&&rawMouse?rawMouse:toCanvas(cursor);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.globalAlpha=.68;c.setLineDash([8,6]);c.lineWidth=2.5;c.stroke();c.setLineDash([]);c.globalAlpha=1;if(mouseStart&&hover&&rawMouse){const snap=toCanvas(hover);c.beginPath();c.moveTo(rawMouse.x,rawMouse.y);c.lineTo(snap.x,snap.y);c.strokeStyle="#2563eb";c.globalAlpha=.35;c.lineWidth=1;c.stroke();c.globalAlpha=1}}
    if(hover){const p=toCanvas(hover);c.beginPath();c.arc(p.x,p.y,7,0,Math.PI*2);c.fillStyle="#eff6ff";c.fill();c.strokeStyle="#60a5fa";c.lineWidth=2;c.stroke()}const cp=toCanvas(cursor);c.beginPath();c.arc(cp.x,cp.y,10,0,Math.PI*2);c.fillStyle="#2563eb22";c.fill();c.strokeStyle="#2563eb";c.lineWidth=2.5;c.stroke();c.beginPath();c.arc(cp.x,cp.y,3.2,0,Math.PI*2);c.fillStyle="#2563eb";c.fill();
  },[color,cursor,fills,hover,mouseStart,rawMouse,segments,selectedGroup,size,spaceStart,toCanvas,zoom]);
  useEffect(draw,[draw]);

  function pointerDown(e:PointerEvent<HTMLCanvasElement>){
    e.currentTarget.focus();const pixel=eventPixel(e),p=pointFromPixel(pixel);setCursor(p);setRawMouse(pixel);
    if(tool==="select"){setSelectedGroup(hitTest(pixel));return}
    if(tool==="eraser"){const group=hitTest(pixel);if(group)deleteGroup(group);return}
    if(tool==="line"){setSelectedGroup(null);setMouseStart(p);return}
    const targets=transformedPoints(logicalFromPixel(pixel),symmetry),found:Face[]=[];
    for(const target of targets){const face=faceAt(target,faces);if(face&&!found.some(item=>item.polygon.map(pointKey).sort().join("|")===face.polygon.map(pointKey).sort().join("|")))found.push(face)}
    if(found.length===0){setFillNotice("open");return}
    saveHistory();const keys=new Set(found.map(face=>face.polygon.map(pointKey).sort().join("|")));
    setFills(old=>[...old.filter(fill=>!keys.has(fill.polygon.map(pointKey).sort().join("|"))),...found.map((face,i)=>({id:`fill-${Date.now()}-${i}`,polygon:face.polygon,holes:face.holes,color,boundaryGroups:face.boundaryGroups}))]);setFillNotice("filled");
  }
  function pointerMove(e:PointerEvent<HTMLCanvasElement>){const pixel=eventPixel(e);setRawMouse(pixel);setHover(pointFromPixel(pixel))}
  function pointerUp(e:PointerEvent<HTMLCanvasElement>){if(tool!=="line"||!mouseStart)return;const end=pointFromPixel(eventPixel(e));commitLine(mouseStart,end);setCursor(end);setMouseStart(null)}
  function undo(){const p=history.at(-1);if(!p)return;setRedo(r=>[...r,{segments,fills}]);setSegments(p.segments);setFills(p.fills);setHistory(h=>h.slice(0,-1));setSelectedGroup(null)}
  function redoAction(){const n=redo.at(-1);if(!n)return;setHistory(h=>[...h,{segments,fills}]);setSegments(n.segments);setFills(n.fills);setRedo(r=>r.slice(0,-1));setSelectedGroup(null)}
  function exportPdf(){const canvas=canvasRef.current;if(!canvas)return;const cs=[...new Set([...segments.map(s=>s.color),...fills.map(f=>f.color)])],rows=cs.map(c=>`<tr><td><i style="background:${c}"></i>${c}</td><td>${segments.filter(s=>s.color===c).length}</td><td>${fills.filter(f=>f.color===c).length}</td></tr>`).join("");const p=window.open("","_blank");if(!p)return;p.document.write(`<!doctype html><html><head><title>quadretti</title><style>@page{size:A4;margin:18mm}body{font:15px Arial;color:#17202a;margin:0}.page{min-height:255mm;page-break-after:always}h1{font-size:30px;margin:0 0 8px}.meta{color:#64748b;margin-bottom:34px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #dbe7ef;padding:12px;text-align:left}i{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:10px;vertical-align:-2px}.art{display:flex;align-items:center;justify-content:center}.art img{max-width:100%;max-height:250mm;border:1px solid #dbe7ef}</style></head><body><section class="page"><h1>Inventario delle forme</h1><p class="meta">quadretti · unità geometriche del disegno</p><table><thead><tr><th>Colore</th><th>Segmenti</th><th>Aree riempite</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Totale:</strong> ${segments.length} segmenti · ${fills.length} aree colorate</p></section><section class="page art"><img src="${canvas.toDataURL("image/png")}" /></section><script>onload=()=>setTimeout(()=>print(),250)<\/script></body></html>`);p.document.close()}

  return <main className="app-shell">
    <div className="canvas-area" ref={wrapRef}>
      <canvas ref={canvasRef} tabIndex={0} aria-label="Foglio a quadretti interattivo" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={()=>{setHover(null);setRawMouse(null)}}/>
      <div className="wordmark">quadretti</div>
      <nav className="floating-stack left-tools" aria-label="Strumenti">
        <button className={tool==="select"?"float-btn active":"float-btn"} onClick={()=>setTool("select")} aria-label="Seleziona"><MousePointer2/></button>
        <button className={tool==="line"?"float-btn active":"float-btn"} onClick={()=>setTool("line")} aria-label="Linea"><PenLine/></button>
        <button className={tool==="fill"?"float-btn active":"float-btn"} onClick={()=>setTool("fill")} aria-label="Riempi"><PaintBucket/></button>
        <button className={tool==="eraser"?"float-btn active":"float-btn"} onClick={()=>setTool("eraser")} aria-label="Gomma"><Eraser/></button>
      </nav>
      <div className="floating-stack left-actions">
        <button className="float-btn" onClick={undo} disabled={!history.length} aria-label="Annulla"><Undo2/></button>
        <button className="float-btn" onClick={redoAction} disabled={!redo.length} aria-label="Ripeti"><Redo2/></button>
        <button className={selectedGroup?"float-btn danger ready":"float-btn danger"} disabled={!selectedGroup} onClick={()=>selectedGroup&&deleteGroup(selectedGroup)} aria-label="Elimina selezione"><Trash2/></button>
        <button className="float-btn" onClick={()=>{saveHistory();setSegments([]);setFills([]);setSelectedGroup(null)}} aria-label="Pulisci foglio"><RotateCcw/></button>
      </div>
      <button className="floating-export" onClick={exportPdf} aria-label="Esporta PDF"><Download/><span>PDF</span></button>
      <div className="floating-stack right-symmetry" aria-label="Simmetria">
        {([1,2,4] as Symmetry[]).map(v=><button key={v} className={symmetry===v?"float-btn text active":"float-btn text"} onClick={()=>setSymmetry(v)} aria-label={v===1?"Simmetria disattivata":`Simmetria ${v} lati`}>{v===1?"1×":`${v}×`}</button>)}
      </div>
      <div className="floating-colors" aria-label="Colori">{COLORS.map(c=><button key={c} className={color===c?"color-btn selected":"color-btn"} style={{backgroundColor:c}} onClick={()=>setColor(c)} aria-label={`Colore ${c}`}/>)}</div>
      <div className="floating-zoom"><button onClick={()=>setZoom(z=>Math.max(.55,z-.15))} aria-label="Riduci zoom"><Minus/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(1.8,z+.15))} aria-label="Aumenta zoom"><Plus/></button></div>
      {selectedGroup&&<div className="selection-toast"><Trash2/>Gruppo simmetrico selezionato <kbd>Canc</kbd></div>}
      {fillNotice&&<div className={fillNotice==="open"?"fill-notice error":"fill-notice success"}>{fillNotice==="open"?"Questa zona è aperta: chiudi prima il contorno.":"Area chiusa riempita."}</div>}
    </div>
  </main>;
}
