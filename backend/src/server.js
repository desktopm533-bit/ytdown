import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import ipaddr from "ipaddr.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const MAX_MB = Number(process.env.MAX_FILE_MB || 500);
const MAX_BYTES = MAX_MB * 1024 * 1024;
const TIMEOUT = Number(process.env.DOWNLOAD_TIMEOUT_MS || 30000);
const ALLOWED = (process.env.ALLOWED_HOSTS || "").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(helmet());
app.use(express.json({limit:"32kb"}));
app.use("/api", rateLimit({windowMs:60_000, limit:40, standardHeaders:true, legacyHeaders:false}));

function validateUrl(raw){
  let u;
  try { u = new URL(raw); } catch { throw new Error("Invalid URL."); }
  if(!["http:","https:"].includes(u.protocol)) throw new Error("Only HTTP/HTTPS URLs are supported.");
  const h=u.hostname.toLowerCase();
  if(ALLOWED.length && !ALLOWED.includes(h)) throw new Error("This host is not allowed.");
  if(h==="localhost" || h.endsWith(".local")) throw new Error("Local destinations are blocked.");
  try{
    const a=ipaddr.parse(h), r=a.range();
    if(["private","loopback","linkLocal","uniqueLocal","carrierGradeNat","reserved"].includes(r))
      throw new Error("Private/local destinations are blocked.");
  }catch(e){
    if(String(e.message).includes("blocked")) throw e;
  }
  return u;
}

async function fetchTimed(url, method){
  const c=new AbortController(), t=setTimeout(()=>c.abort(),TIMEOUT);
  try{
    const r=await fetch(url,{method,redirect:"follow",signal:c.signal,headers:{"User-Agent":"MediaDrop/2.0"}});
    if(!r.ok) throw new Error(`Source returned HTTP ${r.status}.`);
    return r;
  }catch(e){
    if(e.name==="AbortError") throw new Error("Source request timed out.");
    throw e;
  }finally{ clearTimeout(t); }
}

function filename(u,type){
  let n=decodeURIComponent(u.pathname.split("/").pop()||"").replace(/[^a-zA-Z0-9._-]/g,"_");
  if(n && n.includes(".")) return n.slice(0,120);
  const ext=type.includes("webm")?"webm":type.includes("quicktime")?"mov":type.includes("ogg")?"ogg":"mp4";
  return `media-${Date.now()}.${ext}`;
}

app.get("/api/health",(_,res)=>res.json({ok:true,service:"mediadrop-v2"}));

app.post("/api/inspect",async(req,res)=>{
  try{
    const u=validateUrl(req.body?.url);
    let r;
    try { r=await fetchTimed(u,"HEAD"); }
    catch { r=await fetchTimed(u,"GET"); }
    const type=r.headers.get("content-type")||"application/octet-stream";
    const size=Number(r.headers.get("content-length")||0);
    if(size>MAX_BYTES) return res.status(413).json({error:`File exceeds ${MAX_MB} MB.`});
    res.json({ok:true,contentType:type,size:size||null,filename:filename(u,type),downloadable:true});
  }catch(e){res.status(400).json({error:e.message||"Inspection failed."});}
});

app.post("/api/download",async(req,res)=>{
  try{
    const u=validateUrl(req.body?.url);
    const r=await fetchTimed(u,"GET");
    const type=r.headers.get("content-type")||"application/octet-stream";
    const size=Number(r.headers.get("content-length")||0);
    if(size>MAX_BYTES) return res.status(413).json({error:`File exceeds ${MAX_MB} MB.`});
    if(!r.body) throw new Error("Source returned no body.");
    const name=filename(u,type);
    res.setHeader("Content-Type",type);
    res.setHeader("Content-Disposition",`attachment; filename="${name}"`);
    res.setHeader("Cache-Control","no-store");
    if(size) res.setHeader("Content-Length",String(size));
    Readable.fromWeb(r.body).pipe(res);
  }catch(e){ if(!res.headersSent) res.status(400).json({error:e.message||"Download failed."}); }
});

app.use(express.static(path.join(__dirname,"../public")));
app.get("*",(_,res)=>res.sendFile(path.join(__dirname,"../public/index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log(`MediaDrop listening on ${PORT}`));
