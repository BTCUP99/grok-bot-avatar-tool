// Local-only settings. The file holds Bot IDs, so it is never published.
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {avatarChoice as libraryCharacter} from './avatar-catalog.mjs';
import {botIdPattern} from './library-state.mjs';

export const configUrl=new URL('./config.local.json',import.meta.url);

// Strict form for build inputs: every key is a Bot UUID, every value a library character.
export function normalizeAssignments(value){
  const out={};
  for(const [id,shape] of Object.entries(value??{})){
    if(!botIdPattern.test(id))throw Error('Bot ID must be a lowercase UUID.');
    if(!libraryCharacter(shape))throw Error('Unknown library character: '+shape);
    out[id]=shape;
  }
  return out;
}

// Version 1 stored one {botId, shape}; version 2 stores {assignments: {botId: shape}}.
// botId/shape are kept for the older single-avatar launchers.
export function readConfig(url=configUrl){
  let raw;
  try{raw=JSON.parse(readFileSync(url,'utf8'))}catch(error){
    if(error.code==='ENOENT')return {assignments:{}};
    throw Error('config.local.json 无法读取，请修复或移走该文件后重试：'+error.message);
  }
  const source=raw.assignments??(raw.botId&&libraryCharacter(raw.shape)?{[raw.botId]:raw.shape}:{});
  // A character removed in a later version must not block startup; drop it.
  const assignments=Object.fromEntries(Object.entries(source).filter(([id,shape])=>botIdPattern.test(id)&&libraryCharacter(shape)));
  const config={assignments};
  if(typeof raw.botId==='string'&&botIdPattern.test(raw.botId))config.botId=raw.botId;
  if(typeof raw.shape==='string')config.shape=raw.shape;
  return config;
}

export function writeConfig(config,url=configUrl){
  const next={version:2,assignments:normalizeAssignments(config.assignments)};
  if(config.botId)next.botId=config.botId;
  if(config.shape)next.shape=config.shape;
  const temp=new URL(url.href+'.tmp');
  writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{mode:0o600});
  renameSync(temp,url);
  return next;
}
