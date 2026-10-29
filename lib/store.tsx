"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { resources as seed, posts as postSeed, type Resource, type Post, type PostComment, type Application, type CourseFile } from "./data";
import { blankShowcase, parseShowcase, validateShowcase, type ShowcaseDoc } from "./showcase";
import {validateCompetitionCover} from "./event-sharing.mjs";
import { validateMaterial } from "./course-materials.mjs";
import { accountNotifications, notificationKey } from "./notifications.mjs";
import { prepareCourseSave } from "./course-publishing.mjs";
import { canRegisterResource, ownsContent } from "./community-rules.mjs";

type CommunityActions = {
 updatePost:(id:string,draft:Pick<Post,"title"|"body"|"type"|"tags">)=>Promise<void>;
 deletePost:(id:string)=>Promise<void>;
 getComments:(postId:string,page:number)=>Promise<{items:PostComment[];total:number}>;
 addComment:(postId:string,body:string)=>Promise<void>;
 editComment:(comment:PostComment,body:string)=>Promise<void>;
 deleteComment:(comment:PostComment)=>Promise<void>;
};
type Experience = {id:string;title:string;type:string;body:string;date:string};
type State = CommunityActions & {uploadCompetitionCover:(id:string,file:File)=>Promise<string>;getCompetitionCoverUrl:(path:string)=>Promise<string>;readNotifications:string[];markNotificationsRead:(items:Application[])=>Promise<void>;uploadCourseFile:(courseId:string,lessonId:string,file:File)=>Promise<CourseFile>;readCourseFile:(file:CourseFile)=>Promise<Blob>;showcase:ShowcaseDoc;updateShowcase:(doc:ShowcaseDoc)=>Promise<void>;uploadShowcaseImage:(file:File)=>Promise<string>;experiences:Experience[];avatarUrl:string;addExperience:(x:Experience)=>Promise<void>;uploadAvatar:(file:File)=>Promise<void>;resources:Resource[]; posts:Post[]; favorites:string[]; completed:string[]; applications:Application[]; user:User|null; profile:{name:string; school:string; bio:string; interests:string[]}; connected:boolean; loading:boolean; error:string; isAdmin:boolean; client:SupabaseClient|null; notify:(s:string)=>void; message:string; save:(id:string)=>Promise<void>; apply:(resourceId:string|undefined,postId:string|undefined,message:string)=>Promise<void>; complete:(id:string)=>Promise<void>; updateProfile:(p:State["profile"],introduction?:string)=>Promise<void>; saveResource:(r:Resource)=>Promise<void>; setResourceFlag:(id:string,flag:"featured"|"beginner_recommended",value:boolean)=>Promise<void>; deleteResource:(id:string)=>Promise<void>; publishPost:(p:Post)=>Promise<void>; review:(id:string,status:"approved"|"rejected")=>Promise<void>; reload:()=>Promise<void>};
const Context = createContext<State|null>(null);
const fallbackProfile = {name:"刚刚出发的你",school:"大学生 / 成长探索者",bio:"保持好奇，认真做成一件小事。",interests:["产品设计","人工智能"]};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url,key) : null;
export function GrowthProvider({children}:{children:ReactNode}){
const [readNotifications,setReadNotifications]=useState<string[]>([]);
const demoMaterials=useRef(new Map<string,File>());
const demoCovers=useRef(new Map<string,string>());
useEffect(()=>()=>{for(const url of demoCovers.current.values())URL.revokeObjectURL(url)},[]);
const [demoComments,setDemoComments]=useState<PostComment[]>([]);
const activeAccount=useRef<string|null|undefined>(undefined);
const requestVersion=useRef(0);
const [showcase,setShowcase]=useState<ShowcaseDoc>(blankShowcase);
const [experiences,setExperiences]=useState<Experience[]>([]),[avatarUrl,setAvatarUrl]=useState("");
const [resources,setResources]=useState<Resource[]>(supabase?[]:seed),[posts,setPosts]=useState<Post[]>(supabase?[]:postSeed),[favorites,setFavorites]=useState<string[]>([]),[completed,setCompleted]=useState<string[]>([]),[applications,setApplications]=useState<Application[]>([]),[user,setUser]=useState<User|null>(null),[profile,setProfile]=useState(fallbackProfile),[isAdmin,setAdmin]=useState(false),[loading,setLoading]=useState(!!supabase),[error,setError]=useState(""),[message,setMessage]=useState("");
function notify(s:string){setMessage(s);}
useEffect(()=>{if(message){const t=setTimeout(()=>setMessage(""),4000);return()=>clearTimeout(t)}},[message]);
async function reload(){
if(!supabase)return;
const version=++requestVersion.current;
setLoading(true);setError("");
try{
const {data:{user:current}}=await supabase.auth.getUser();
if(version!==requestVersion.current)return;
const accountId=current?.id||null;
if(activeAccount.current!==accountId){
 clearAccountData();
 activeAccount.current=accountId;
}
setUser(current);
if(!current){clearAccountData();return;}
const r=await supabase.from("resources").select("*").order("created_at",{ascending:false});if(version!==requestVersion.current)return;if(r.error)throw r.error;setResources((r.data||[]).map(x=>({...x,lessons:x.lessons||[]})));
const p=await supabase.from("posts").select("*").is("deleted_at",null).order("created_at",{ascending:false});if(version!==requestVersion.current)return;if(p.error)throw p.error;setPosts(p.data||[]);
if(current){
const q=await supabase.from("profiles").select("*").eq("id",current.id).single();if(version!==requestVersion.current)return;if(q.error)throw q.error;setProfile({name:q.data.name,school:q.data.school,bio:q.data.bio,interests:q.data.interests});setAdmin(q.data.role==="admin");setAvatarUrl(q.data.avatar_url||"");setShowcase(parseShowcase(q.data.showcase));
const exp=await supabase.from("experiences").select("*").eq("user_id",current.id).order("date",{ascending:false});if(version!==requestVersion.current)return;if(exp.error)throw exp.error;setExperiences(exp.data||[]);
const [f,c,a,n]=await Promise.all([supabase.from("favorites").select("resource_id").eq("user_id",current.id),supabase.from("lesson_progress").select("lesson_id").eq("user_id",current.id),supabase.from("applications").select("*"),supabase.from("application_notification_reads").select("application_id,notification_version").eq("user_id",current.id)]);
if(version!==requestVersion.current)return;
for(const result of [f,c,a,n])if(result.error)throw result.error;
setFavorites((f.data||[]).map(x=>x.resource_id));setCompleted((c.data||[]).map(x=>x.lesson_id));setApplications(a.data||[]);setReadNotifications((n.data||[]).map(item=>item.application_id+":"+item.notification_version));
}
}catch(e){if(version===requestVersion.current)setError(e instanceof Error?e.message:(e as {message?:string}).message||"资源加载失败，请重试");}finally{if(version===requestVersion.current)setLoading(false)}
}
function clearAccountData(){
 setResources([]);setPosts([]);setFavorites([]);setCompleted([]);setApplications([]);setReadNotifications([]);setAdmin(false);
 setProfile(fallbackProfile);setExperiences([]);setAvatarUrl("");setShowcase(blankShowcase());setDemoComments([]);
}
useEffect(()=>{
 let active=true;
 void reload();
 const sub=supabase?.auth.onAuthStateChange((event)=>{
  requestVersion.current++;
  if(event==="SIGNED_OUT"){
   activeAccount.current=null;setUser(null);clearAccountData();setError("");setLoading(false);
  }else{
   setLoading(true);
   setTimeout(()=>{if(active)void reload()},0);
  }
 });
 return()=>{active=false;requestVersion.current++;sub?.data.subscription.unsubscribe()};
},[]);
function requireUser(){if(supabase&&!user)throw new Error("请先登录，再保存你的成长记录。");}
async function updateShowcase(doc:ShowcaseDoc){
 requireUser();validateShowcase(doc);
 if(supabase&&user){const result=await supabase.from("profiles").update({showcase:doc}).eq("id",user.id).select("id").single();if(result.error)throw result.error;}
 setShowcase(doc);notify(supabase?(doc.published?"主页已保存，其他用户可以查看你的名片":"主页已保存，当前仅自己可见"):"示例主页已保存，仅保留在本次体验");
}
async function uploadShowcaseImage(file:File){
 requireUser();if(!supabase||!user)throw new Error("请登录正式账号后上传图片。");
 if(!file.size||file.size>3*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error("请选择 3MB 内的 PNG、JPEG 或 WebP 图片。");
 const extension=file.type==="image/jpeg"?"jpg":file.type==="image/webp"?"webp":"png";
 const path=user.id+"/"+crypto.randomUUID()+"."+extension;
 const result=await supabase.storage.from("profile-media").upload(path,file,{upsert:false,contentType:file.type});
 if(result.error)throw result.error;return path;
}
async function save(id:string){requireUser();const on=favorites.includes(id);if(supabase&&user){const r=on?await supabase.from("favorites").delete().eq("user_id",user.id).eq("resource_id",id):await supabase.from("favorites").insert({user_id:user.id,resource_id:id});if(r.error)throw r.error;}setFavorites(x=>on?x.filter(i=>i!==id):[...x,id]);notify(on?"已取消收藏":"已加入收藏");}
async function apply(resourceId:string|undefined,postId:string|undefined,text:string){requireUser();if(resourceId&&!canRegisterResource(resources.find(r=>r.id===resourceId)))throw new Error("这份资源未开放站内报名，请通过官方链接了解参与方式。");if(postId){const p=posts.find(p=>p.id===postId);if(!p||p.type!=="recruitment"||ownsContent(p.owner_id,user?.id,!!supabase))throw new Error("这份招募暂时不能申请加入。");}if(applications.some(a=>(resourceId?a.resource_id===resourceId:a.post_id===postId)&&a.user_id===user?.id))throw new Error("你已经提交过申请，可以在个人空间查看进度。");const a:Application={id:crypto.randomUUID(),resource_id:resourceId,post_id:postId,message:text,status:"pending",created_at:new Date().toISOString(),...(user?{user_id:user.id}:{}),name:profile.name};if(supabase){const r=await supabase.from("applications").insert(a);if(r.error)throw r.error;}setApplications(x=>[a,...x]);notify(supabase?"申请已提交，等待审核":"示例申请已提交，仅在本次体验保留");}
async function complete(id:string){requireUser();if(completed.includes(id))return;if(supabase&&user){const r=await supabase.from("lesson_progress").upsert({user_id:user.id,lesson_id:id},{onConflict:"user_id,lesson_id"});if(r.error)throw r.error;}setCompleted(x=>[...x,id]);notify("本节已完成，成长进度已更新");}
async function updateProfile(p:State["profile"],introduction?:string){
 requireUser();
 const nextShowcase=introduction===undefined?showcase:{...showcase,introduction:introduction.trim()};
 validateShowcase(nextShowcase);
 if(supabase&&user){const data=introduction===undefined?p:{...p,showcase:nextShowcase};const r=await supabase.from("profiles").update(data).eq("id",user.id).select("id").single();if(r.error)throw r.error;}
 setProfile(p);if(introduction!==undefined)setShowcase(nextShowcase);
 setPosts(x=>x.map(post=>ownsContent(post.owner_id,user?.id,!!supabase)?{...post,author:p.name,avatar:Array.from(p.name)[0]||"翎"}:post));notify("个人资料已更新");
}
async function uploadCompetitionCover(id:string,file:File){
 const {extension,mime}=validateCompetitionCover(file);
 if(supabase&&(!user||!isAdmin))throw new Error("仅管理员可以上传赛事封面。");
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw new Error("赛事信息无效，请重新打开编辑器。");
 const path=id+"/"+crypto.randomUUID()+"."+extension;
 if(supabase){const r=await supabase.storage.from("competition-covers").upload(path,file,{contentType:mime,upsert:false});if(r.error)throw r.error;}
 else demoCovers.current.set(path,URL.createObjectURL(file));
 return path;
}
async function getCompetitionCoverUrl(path:string){
 if(supabase){const r=await supabase.storage.from("competition-covers").createSignedUrl(path,300);if(r.error)throw r.error;return r.data.signedUrl;}
 const url=demoCovers.current.get(path);if(!url)throw new Error("请重新上传预览封面。");return url;
}
async function uploadCourseFile(courseId:string,lessonId:string,file:File){
 const {extension,mime}=validateMaterial(file);
 const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 if(!uuid.test(courseId)||!uuid.test(lessonId))throw new Error("课件关联信息无效，请重新打开课程编辑器。");
 if(supabase&&(!user||!isAdmin))throw new Error("仅管理员可以上传课程课件。");
 const path=courseId+"/"+lessonId+"/"+crypto.randomUUID()+"."+extension;
 if(supabase){const result=await supabase.storage.from("course-files").upload(path,file,{contentType:mime,upsert:false});if(result.error)throw result.error;}
 else demoMaterials.current.set(path,file);
 return {path,name:file.name,mime,size:file.size};
}
async function readCourseFile(file:CourseFile){
 if(supabase){const result=await supabase.storage.from("course-files").download(file.path);if(result.error)throw result.error;return result.data;}
 const data=demoMaterials.current.get(file.path);if(!data)throw new Error("示例课件只保留在本次预览，请重新上传。");return data;
}
async function setResourceFlag(id:string,flag:"featured"|"beginner_recommended",value:boolean){
 requireUser();if(supabase&&!isAdmin)throw new Error("需要管理员权限");
 const resource=resources.find(r=>r.id===id);if(!resource)throw new Error("未找到内容");
 if(flag==="beginner_recommended"&&resource.kind!=="competition")throw new Error("仅赛事活动可以加入小白推荐。");
 const accountId=user?.id;
 if(supabase){const result=await supabase.from("resources").update({[flag]:value}).eq("id",id).select("id").single();if(result.error)throw result.error;if(activeAccount.current!==accountId)return;}
 setResources(items=>items.map(r=>r.id===id?{...r,[flag]:value}:r));notify("推荐设置已保存");
}
async function saveResource(r:Resource){requireUser();if(r.kind==="course")r=prepareCourseSave(r,r.status);if(supabase){if(r.kind!=="project"&&!isAdmin)throw new Error("需要管理员权限");const data={...r,lessons:r.lessons||[],url:r.url||null,...(!r.owner_id&&user?{owner_id:user.id}:{})};const resp=resources.some(item=>item.id===r.id)?await supabase.from("resources").update(data).eq("id",r.id).select("id").single():await supabase.from("resources").insert(data).select("id").single();if(resp.error)throw resp.error;}setResources(x=>x.some(i=>i.id===r.id)?x.map(i=>i.id===r.id?r:i):[r,...x]);notify(r.status==="draft"?"草稿已保存":"内容已发布");}
async function deleteResource(id:string){requireUser();if(supabase){const resource=resources.find(item=>item.id===id);if(!isAdmin&&!(resource?.kind==="project"&&resource.owner_id===user?.id))throw new Error("需要管理员权限");const r=await supabase.from("resources").delete().eq("id",id).select("id").single();if(r.error)throw r.error;}setResources(x=>x.filter(r=>r.id!==id));setFavorites(x=>x.filter(i=>i!==id));setApplications(x=>x.filter(a=>a.resource_id!==id));notify("内容已删除");}
async function publishPost(p:Post){
 requireUser();let post={...p,owner_id:user?.id||"demo",author:profile.name,avatar:Array.from(profile.name)[0]||"宗",avatar_url:avatarUrl};
 if(supabase&&user){const r=await supabase.from("posts").insert(post).select("*").single();if(r.error)throw r.error;post=r.data;}
 setPosts(x=>[post,...x]);notify(p.type==="recruitment"?"招募已发布":"动态已发布");
}
function requireAuthor(ownerId:string|undefined){
 requireUser();if(!ownsContent(ownerId,user?.id,!!supabase))throw new Error("只能管理自己发布的内容。");
}
async function updatePost(id:string,draft:Pick<Post,"title"|"body"|"type"|"tags">){
 const post=posts.find(p=>p.id===id);requireAuthor(post?.owner_id);
 let updated={...post!,...draft,updated_at:new Date().toISOString()};
 if(supabase&&user){const r=await supabase.from("posts").update(draft).eq("id",id).eq("owner_id",user.id).is("deleted_at",null).select("*").single();if(r.error)throw r.error;updated=r.data;}
 setPosts(x=>x.map(p=>p.id===id?updated:p));notify("帖子已更新");
}
async function deletePost(id:string){
 requireAuthor(posts.find(p=>p.id===id)?.owner_id);
 if(supabase&&user){const r=await supabase.from("posts").update({deleted_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id).select("id").single();if(r.error)throw r.error;}
 setPosts(x=>x.filter(p=>p.id!==id));notify("帖子已删除，不再对外展示");
}
async function getComments(postId:string,page:number){
 const start=(Math.max(1,page)-1)*20;
 if(supabase){const r=await supabase.from("post_comments").select("*",{count:"exact"}).eq("post_id",postId).is("deleted_at",null).order("created_at",{ascending:false}).order("id",{ascending:false}).range(start,start+19);if(r.error)throw r.error;return{items:(r.data||[]) as PostComment[],total:r.count||0};}
 const rows=demoComments.filter(c=>c.post_id===postId&&!c.deleted_at).sort((a,b)=>b.created_at.localeCompare(a.created_at));return{items:rows.slice(start,start+20),total:rows.length};
}
function commentBody(body:string){const text=body.trim();if(!text||text.length>1500)throw new Error("评论需要 1–1500 字。");return text;}
async function addComment(postId:string,body:string){
 requireUser();const text=commentBody(body);if(!posts.some(p=>p.id===postId))throw new Error("帖子已不存在，请刷新广场。");
 const comment:PostComment={id:crypto.randomUUID(),post_id:postId,owner_id:user?.id||"demo",author:profile.name,avatar:Array.from(profile.name)[0]||"宗",avatar_url:avatarUrl,body:text,created_at:new Date().toISOString()};
 if(supabase){const r=await supabase.from("post_comments").insert(comment);if(r.error)throw r.error;}else setDemoComments(x=>[comment,...x]);notify("评论已发布");
}
async function editComment(comment:PostComment,body:string){
 requireAuthor(comment.owner_id);const text=commentBody(body);
 if(supabase&&user){const r=await supabase.from("post_comments").update({body:text}).eq("id",comment.id).eq("owner_id",user.id).is("deleted_at",null).select("id").single();if(r.error)throw r.error;}
 else setDemoComments(x=>x.map(c=>c.id===comment.id?{...c,body:text,updated_at:new Date().toISOString()}:c));notify("评论已更新");
}
async function deleteComment(comment:PostComment){
 requireAuthor(comment.owner_id);
 if(supabase&&user){const r=await supabase.from("post_comments").update({deleted_at:new Date().toISOString()}).eq("id",comment.id).eq("owner_id",user.id).select("id").single();if(r.error)throw r.error;}
 else setDemoComments(x=>x.filter(c=>c.id!==comment.id));notify("评论已删除");
}
async function markNotificationsRead(items:Application[]){
 requireUser();const accountId=user?.id;
 const own=accountNotifications(applications,accountId,!!supabase);
 const requested=new Set(items.map(notificationKey));
 const targets=own.filter(item=>requested.has(notificationKey(item))&&!readNotifications.includes(notificationKey(item)));
 if(!targets.length)return;
 if(supabase&&accountId){
  if(targets.some(item=>!item.notification_version))throw new Error("通知状态已更新，请重新打开通知面板。");
  const result=await supabase.from("application_notification_reads").upsert(targets.map(item=>({user_id:accountId,application_id:item.id,notification_version:item.notification_version})),{onConflict:"user_id,application_id,notification_version",ignoreDuplicates:true});
  if(result.error)throw result.error;
  if(activeAccount.current!==accountId)return;
 }
 setReadNotifications(current=>Array.from(new Set([...current,...targets.map(notificationKey)])));
}
async function review(id:string,status:"approved"|"rejected"){
 requireUser();let reviewed:Application|undefined;
 if(supabase){const result=await supabase.from("applications").update({status}).eq("id",id).select("*").single();if(result.error)throw result.error;reviewed=result.data;}
 setApplications(current=>current.map(item=>item.id===id?reviewed||{...item,status,notification_version:crypto.randomUUID()}:item));notify(status==="approved"?"已通过申请":"已拒绝申请");
}
async function addExperience(x:Experience){requireUser();if(supabase&&user){const r=await supabase.from("experiences").insert({...x,user_id:user.id});if(r.error)throw r.error;}setExperiences(a=>[x,...a]);notify("这段成长经历已保存");}
async function uploadAvatar(file:File){requireUser();if(!supabase||!user)throw new Error("头像上传需要登录。");if(file.size>3*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error("请选择 3MB 内的 PNG、JPEG 或 WebP 图片");const extension=file.type==="image/jpeg"?"jpg":file.type==="image/webp"?"webp":"png";const name=user.id+"/"+crypto.randomUUID()+"."+extension;const r=await supabase.storage.from("avatars").upload(name,file,{upsert:false,contentType:file.type});if(r.error)throw r.error;const u=supabase.storage.from("avatars").getPublicUrl(name).data.publicUrl;const p=await supabase.from("profiles").update({avatar_url:u}).eq("id",user.id);if(p.error)throw p.error;setAvatarUrl(u);setPosts(x=>x.map(post=>post.owner_id===user.id?{...post,avatar_url:u}:post));notify("头像已更新");}
return <Context.Provider value={{uploadCompetitionCover,getCompetitionCoverUrl,readNotifications,markNotificationsRead,updatePost,deletePost,getComments,addComment,editComment,deleteComment,uploadCourseFile,readCourseFile,showcase,updateShowcase,uploadShowcaseImage,experiences,avatarUrl,addExperience,uploadAvatar,resources,posts,favorites,completed,applications,user,profile,connected:!!supabase,client:supabase,loading,error,isAdmin,notify,message,save,apply,complete,updateProfile,saveResource,setResourceFlag,deleteResource,publishPost,review,reload}}>{children}</Context.Provider>;
}
export function useGrowth(){const s=useContext(Context);if(!s)throw new Error("GrowthProvider required");return s;}
