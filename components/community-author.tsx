
import {I18nRegion} from "./i18n";
import { AvatarImage } from "./account-avatar";
import { MemberLink } from "./member-link";

export function CommunityAuthor({id,name,url,meta}:{id?:string;name:string;url?:string;meta:string}){
 return <I18nRegion><MemberLink id={id} name={name}><span className="post-avatar"><AvatarImage url={url||""} name={name}/></span><span className="community-person-label"><b translate="no">{name}</b><small>{meta}</small></span></MemberLink></I18nRegion>;
}
