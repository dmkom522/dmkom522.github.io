"use client";
import {useEffect,useState} from "react";
import type {ImgHTMLAttributes} from "react";
import {apiOrigin,apiFetch,mediaUrl} from "@/lib/api-client";
export function PrivateImage({src,alt,...props}:ImgHTMLAttributes<HTMLImageElement>){
  const path=typeof src==="string"?src:"";const privateRemote=Boolean(apiOrigin&&path.startsWith("/api/admin/media/"));
  const [blob,setBlob]=useState("");const [failed,setFailed]=useState(false);
  useEffect(()=>{if(!privateRemote)return;const controller=new AbortController();let objectUrl="";setBlob("");setFailed(false);
    void apiFetch(path,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.blob();if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(data);setBlob(objectUrl);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
    return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[path,privateRemote]);
  if(privateRemote&&!blob)return <span className="save-status" role="img" aria-label={alt??"配图"}>{failed?"图片读取失败":"加载图片…"}</span>;
  return <img {...props} src={privateRemote?blob:mediaUrl(path)} alt={alt??""}/>;
}
