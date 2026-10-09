import {createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import type {IncomingMessage,ServerResponse} from 'node:http';

export interface AuthUser {
 id:string;
 provider:'local';
 login:string;
 displayName:string;
 createdAt:number;
 updatedAt:number;
}
interface StoredUser extends AuthUser {passwordSalt:string;passwordHash:string;}
interface StoredSession {hash:string;userId:string;createdAt:number;expiresAt:number;}
interface StoredData {users:StoredUser[];sessions:StoredSession[];}

export interface AuthOptions {dataPath?:string;now?:()=>number;sessionTtlMs?:number;}
export class AuthError extends Error {constructor(public readonly status:number,message:string){super(message);this.name='AuthError';}}
type CookieOptions={maxAge?:number;secure?:boolean;httpOnly?:boolean;sameSite?:'Lax'|'Strict'|'None';path?:string};
const SESSION_TTL=30*24*60*60_000;
const USERNAME_PATTERN=/^[a-z0-9][a-z0-9_.-]{2,31}$/;
const PASSWORD_MIN=8,PASSWORD_MAX=128;
function hash(value:string){return createHash('sha256').update(value).digest('hex');}
function cookieValue(req:IncomingMessage,name:string){const header=req.headers.cookie??'';for(const part of header.split(';')){const [key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='));}return undefined;}
function cookie(name:string,value:string,options:CookieOptions={}){const parts=[`${name}=${encodeURIComponent(value)}`,'Path='+(options.path??'/')];if(options.maxAge!==undefined)parts.push(`Max-Age=${Math.max(0,Math.floor(options.maxAge))}`);if(options.httpOnly!==false)parts.push('HttpOnly');parts.push(`SameSite=${options.sameSite??'Lax'}`);if(options.secure)parts.push('Secure');return parts.join('; ');}
function passwordDigest(password:string,salt:Buffer){return scryptSync(password,salt,64,{N:16_384,r:8,p:1,maxmem:32*1024*1024});}
function publicUser(user:AuthUser){return {id:user.id,provider:user.provider,login:user.login,displayName:user.displayName};}

/** File-backed local account and session store. Passwords are salted and hashed with scrypt. */
export class AuthService {
 private users=new Map<string,StoredUser>();
 private sessions=new Map<string,StoredSession>();
 private readonly now:()=>number;
 private readonly ttl:number;
 constructor(private readonly options:AuthOptions={}){this.now=options.now??Date.now;this.ttl=options.sessionTtlMs??SESSION_TTL;this.load();}
 private load(){if(!this.options.dataPath||!existsSync(this.options.dataPath))return;try{const parsed=JSON.parse(readFileSync(this.options.dataPath,'utf8')) as Partial<StoredData>;for(const user of parsed.users??[]){if(!user||user.provider!=='local'||typeof user.id!=='string'||typeof user.login!=='string'||typeof user.passwordSalt!=='string'||typeof user.passwordHash!=='string')continue;this.users.set(user.id,user);}for(const session of parsed.sessions??[])if(session&&typeof session.hash==='string')this.sessions.set(session.hash,session);}catch{/* A damaged optional auth file must not stop the process before recovery. */}}
 private save(){if(!this.options.dataPath)return;mkdirSync(dirname(this.options.dataPath),{recursive:true});const temp=`${this.options.dataPath}.tmp`;writeFileSync(temp,JSON.stringify({users:[...this.users.values()],sessions:[...this.sessions.values()]}),{mode:0o600});renameSync(temp,this.options.dataPath);}
 private sessionToken(userId:string){const now=this.now(),token=randomBytes(32).toString('hex');this.sessions.set(hash(token),{hash:hash(token),userId,createdAt:now,expiresAt:now+this.ttl});this.save();return token;}
 private validateUsername(value:unknown){if(typeof value!=='string')throw new AuthError(400,'Nama pengguna wajib diisi.');const username=value.trim().toLowerCase();if(!USERNAME_PATTERN.test(username))throw new AuthError(400,'Nama pengguna harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus.');return username;}
 private validatePassword(value:unknown){if(typeof value!=='string'||value.length<PASSWORD_MIN)throw new AuthError(400,`Password minimal ${PASSWORD_MIN} karakter.`);if(value.length>PASSWORD_MAX)throw new AuthError(400,`Password maksimal ${PASSWORD_MAX} karakter.`);return value;}
 getUser(req:IncomingMessage){const token=cookieValue(req,'office_session');if(!token)return undefined;const key=hash(token),session=this.sessions.get(key);if(!session)return undefined;if(session.expiresAt<=this.now()){this.sessions.delete(key);this.save();return undefined;}return this.users.get(session.userId);}
 getUserById(id:string){return this.users.get(id);}
 sessionCookie(req:IncomingMessage,token:string){const secure=req.headers['x-forwarded-proto']==='https';return cookie('office_session',token,{maxAge:this.ttl/1000,secure});}
 clearSessionCookie(req:IncomingMessage){const secure=req.headers['x-forwarded-proto']==='https';return cookie('office_session','',{maxAge:0,secure});}
 register(req:IncomingMessage,res:ServerResponse,body:Record<string,unknown>){const username=this.validateUsername(body.username),password=this.validatePassword(body.password);if(this.users.has(`local:${username}`))throw new AuthError(409,'Nama pengguna sudah dipakai.');const displayName=typeof body.displayName==='string'&&body.displayName.trim()?body.displayName.trim().slice(0,80):username;const now=this.now(),salt=randomBytes(16),user:StoredUser={id:`local:${username}`,provider:'local',login:username,displayName,createdAt:now,updatedAt:now,passwordSalt:salt.toString('hex'),passwordHash:passwordDigest(password,salt).toString('hex')};this.users.set(user.id,user);const token=this.sessionToken(user.id);res.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':this.sessionCookie(req,token)});res.end(JSON.stringify({ok:true,user:publicUser(user)}));}
 login(req:IncomingMessage,res:ServerResponse,body:Record<string,unknown>){const username=this.validateUsername(body.username),password=this.validatePassword(body.password),user=this.users.get(`local:${username}`);if(!user)throw new AuthError(401,'Nama pengguna atau password salah.');const expected=Buffer.from(user.passwordHash,'hex'),actual=passwordDigest(password,Buffer.from(user.passwordSalt,'hex'));if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new AuthError(401,'Nama pengguna atau password salah.');const token=this.sessionToken(user.id);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':this.sessionCookie(req,token)});res.end(JSON.stringify({ok:true,user:publicUser(user)}));}
 logout(req:IncomingMessage,res:ServerResponse){const token=cookieValue(req,'office_session');if(token)this.sessions.delete(hash(token));this.save();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':this.clearSessionCookie(req)});res.end(JSON.stringify({ok:true}));}
}
