import { Worker } from "bullmq";
import IORedis from "ioredis";

const url=process.env.REDIS_URL;
if(!url){ console.log("REDIS_URL is not configured; worker idle."); process.stdin.resume(); }
else{
  const connection=new IORedis(url,{maxRetriesPerRequest:null});
  const worker=new Worker("media-jobs", async job=>{
    // Reserved for authorized media processing jobs.
    // Keep expensive FFmpeg work here rather than blocking the public API.
    console.log("Processing job",job.id,job.name);
    return {ok:true};
  },{connection,concurrency:1});
  worker.on("completed",j=>console.log("Completed",j.id));
  worker.on("failed",(j,e)=>console.error("Failed",j?.id,e.message));
}
