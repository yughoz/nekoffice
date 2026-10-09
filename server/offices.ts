import {randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

export interface OfficeInfo {id:string;ownerId?:string;slug:string;displayName:string;publicEnabled:boolean;createdAt:number;updatedAt:number;}
interface StoredData {offices:OfficeInfo[];}
function slugify(value:string){const slug=value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);return slug||'office';}

/** Persistent office directory. The default office keeps existing single-office installs compatible. */
export class OfficeRegistry {
 private offices=new Map<string,OfficeInfo>();
 constructor(private readonly path?:string,private readonly now=Date.now){this.load();if(!this.offices.has('default')){const stamp=this.now();this.offices.set('default',{id:'default',slug:'main-office',displayName:'Kantor kreator',publicEnabled:true,createdAt:stamp,updatedAt:stamp});this.save();}}
 private load(){if(!this.path||!existsSync(this.path))return;try{const parsed=JSON.parse(readFileSync(this.path,'utf8')) as Partial<StoredData>;for(const row of parsed.offices??[])if(row&&typeof row.id==='string'&&typeof row.slug==='string')this.offices.set(row.id,{id:row.id,ownerId:typeof row.ownerId==='string'?row.ownerId:undefined,slug:row.slug,displayName:typeof row.displayName==='string'&&row.displayName.trim()?row.displayName.trim().slice(0,80):'Kantor kreator',publicEnabled:row.publicEnabled!==false,createdAt:Number(row.createdAt)||this.now(),updatedAt:Number(row.updatedAt)||this.now()});}catch{/* A damaged optional directory is rebuilt with the default office. */}}
 private save(){if(!this.path)return;mkdirSync(dirname(this.path),{recursive:true});const temp=`${this.path}.tmp`;writeFileSync(temp,JSON.stringify({offices:[...this.offices.values()]}),{mode:0o600});renameSync(temp,this.path);}
 get(id:string){return this.offices.get(id);}
 getBySlug(slug:string){return [...this.offices.values()].find(office=>office.slug===slug);}
 list(){return [...this.offices.values()].sort((a,b)=>a.createdAt-b.createdAt);}
 listPublic(){return this.list().filter(office=>office.publicEnabled);}
 owns(id:string,userId:string){return this.offices.get(id)?.ownerId===userId;}
 ensureForUser(userId:string,displayName:string){const existing=this.list().find(office=>office.ownerId===userId);if(existing)return existing;const unclaimed=this.offices.get('default');if(unclaimed&&!unclaimed.ownerId){unclaimed.ownerId=userId;unclaimed.displayName=`${displayName} Office`.slice(0,80);unclaimed.updatedAt=this.now();this.save();return unclaimed;}const stamp=this.now(),base=slugify(displayName),used=new Set(this.list().map(office=>office.slug));let slug=base,index=2;while(used.has(slug))slug=`${base}-${index++}`;const office:OfficeInfo={id:`office-${randomUUID()}`,ownerId:userId,slug,displayName:`${displayName} Office`.slice(0,80),publicEnabled:false,createdAt:stamp,updatedAt:stamp};this.offices.set(office.id,office);this.save();return office;}
 update(id:string,patch:Partial<Pick<OfficeInfo,'slug'|'displayName'|'publicEnabled'>>){const office=this.offices.get(id);if(!office)return undefined;if(patch.slug!==undefined){const slug=slugify(patch.slug);const collision=this.getBySlug(slug);if(collision&&collision.id!==id)throw new Error('Office slug is already in use.');office.slug=slug;}if(patch.displayName!==undefined)office.displayName=patch.displayName.trim().slice(0,80)||office.displayName;if(patch.publicEnabled!==undefined)office.publicEnabled=patch.publicEnabled;office.updatedAt=this.now();this.save();return office;}
}
