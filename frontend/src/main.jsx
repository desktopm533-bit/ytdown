import React from "react";
import {createRoot} from "react-dom/client";
import {Download,Link2,ShieldCheck,Zap,Clock3,Sun,Moon,Trash2,CheckCircle2,AlertCircle,FileVideo} from "lucide-react";
import "./styles.css";

const key="mediadrop-history";
function App(){
 const [url,setUrl]=React.useState("");
 const [format,setFormat]=React.useState("original");
 const [info,setInfo]=React.useState(null);
 const [busy,setBusy]=React.useState(false);
 const [progress,setProgress]=React.useState(0);
 const [error,setError]=React.useState("");
 const [dark,setDark]=React.useState(()=>localStorage.getItem("mediadrop-dark")==="1");
 const [history,setHistory]=React.useState(()=>JSON.parse(localStorage.getItem(key)||"[]"));
 React.useEffect(()=>localStorage.setItem("mediadrop-dark",dark?"1":"0"),[dark]);
 function saveHistory(item){const next=[item,...history.filter(x=>x.url!==item.url)].slice(0,6);setHistory(next);localStorage.setItem(key,JSON.stringify(next));}
 function size(n){if(!n)return "Unknown size";let i=0,v=n,u=["B","KB","MB","GB"];while(v>=1024&&i<3){v/=1024;i++}return `${v.toFixed(i?1:0)} ${u[i]}`}
 async function analyze(){
  setError("");setInfo(null);setProgress(0);
  if(!url.trim()) return setError("Paste a direct media URL first.");
  setBusy(true);
  try{const r=await fetch("/api/inspect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim()})});const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to inspect.");setInfo(d);}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function download(){
  setBusy(true);setError("");setProgress(0);
  try{
   const r=await fetch("/api/download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim(),format})});
   if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||"Download failed.")}
   const total=Number(r.headers.get("content-length")||0);let received=0;const reader=r.body.getReader();const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;if(total)setProgress(Math.round(received/total*100));}
   const blob=new Blob(chunks,{type:r.headers.get("content-type")||"application/octet-stream"});
   const cd=r.headers.get("content-disposition")||"";const m=cd.match(/filename="([^"]+)"/);const name=m?.[1]||"media";
   const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);
   saveHistory({url:url.trim(),name,date:new Date().toLocaleString()});setProgress(100);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 function clearHistory(){setHistory([]);localStorage.removeItem(key)}
 return <div className={dark?"app dark":"app"}>
  <header><div className="brand"><span className="logo"><Download size={19}/></span>MediaDrop</div><button className="iconbtn" onClick={()=>setDark(!dark)} aria-label="Toggle theme">{dark?<Sun size={18}/>:<Moon size={18}/>}</button></header>
  <main>
   <section className="hero"><div className="pill"><Zap size={14}/> Fast media downloads</div><h1>Download media.<br/><em>Without the clutter.</em></h1><p>Clean, fast and simple for direct media files you own or are authorized to download.</p></section>
   <section className="card">
    <div className="inputrow"><div className="urlbox"><Link2 size={20}/><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="Paste a direct video or audio URL…"/></div><button className="primary" onClick={analyze} disabled={busy}>{busy&&!info?"Analyzing…":"Analyze"}</button></div>
    {error&&<div className="error"><AlertCircle size={17}/>{error}</div>}
    {info&&<div className="result"><div className="resulttop"><div className="fileicon"><FileVideo/></div><div className="filemeta"><b>{info.filename}</b><span>{info.contentType} · {size(info.size)}</span></div><CheckCircle2 className="ok"/></div>
     <div className="controls"><select value={format} onChange={e=>setFormat(e.target.value)}><option value="original">Original</option><option value="mp4">MP4</option></select><button className="primary grow" onClick={download} disabled={busy}><Download size={18}/>{busy?`Downloading ${progress}%`:"Download"}</button></div>
     {busy&&<div className="progress"><span style={{width:`${progress}%`}}/></div>}
    </div>}
   </section>
   <section className="features"><div><Zap/><b>Stream-first</b><p>No unnecessary transcoding on the fast path.</p></div><div><ShieldCheck/><b>Protected</b><p>Rate limits and private-network URL checks.</p></div><div><Clock3/><b>Recent files</b><p>Your history stays in your browser.</p></div></section>
   {history.length>0&&<section className="history"><div className="sectionhead"><h2>Recent downloads</h2><button onClick={clearHistory}><Trash2 size={15}/> Clear</button></div>{history.map((x,i)=><div className="historyrow" key={i}><div><b>{x.name}</b><span>{x.date}</span></div><button onClick={()=>{setUrl(x.url);setInfo(null)}}>Use URL</button></div>)}</section>}
   <footer><ShieldCheck size={14}/> Only download content you own or are authorized to download. This app does not bypass platform restrictions.</footer>
  </main>
 </div>
}
createRoot(document.getElementById("root")).render(<App/>);
