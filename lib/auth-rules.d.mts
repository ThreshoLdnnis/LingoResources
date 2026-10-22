export function normalizeInviteCode(value:unknown):string;
export function inviteInputError(value:unknown):string;
export function authErrorMessage(error:{code?:string;message?:string}|null|undefined):string;
export function signupOutcome(data:{session?:unknown;user?:{identities?:unknown[]}|null}|null|undefined):'signed-in'|'existing'|'check-email';
