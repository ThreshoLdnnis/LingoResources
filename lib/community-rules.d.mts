import type {Resource,Post} from './data';
export function canRegisterResource(resource:Resource|null|undefined,today?:string):boolean;
export function ownsContent(ownerId:string|undefined,userId:string|undefined,connected:boolean):boolean;
export function postDraft(form:FormData):Pick<Post,'title'|'body'|'type'|'tags'>;
