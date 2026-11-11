import {createNeonAvatarStore} from './neon-state.mjs';

export const botIdPattern=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

// Per-Bot character assignments and per-Bot activity share one external store.
// Everything is local; it never mutates a Bot object or its cloud avatar fields.
export function createLibraryStore(initialAssignments,allowedShapes) {
  const allowed=new Set(allowedShapes);
  const check=(id,shape)=>{
    if(typeof id!=='string'||!botIdPattern.test(id))throw Error('Invalid Bot ID');
    if(shape!=null&&!allowed.has(shape))throw Error('Unknown library character');
  };
  const assignments=new Map();
  for(const [id,shape] of Object.entries(initialAssignments??{})){check(id,shape);assignments.set(id,shape)}
  const activities=new Map(),views=new Map(),listeners=new Set();
  let demo=null,demoSequence=0,revision=0,snapshot=null;
  const freeze=()=>Object.freeze({assignments:Object.freeze(Object.fromEntries(assignments)),state:demo??'idle',isDemo:demo!==null,revision});
  snapshot=freeze();
  const publish=()=>{
    revision++;views.clear();snapshot=freeze();
    for(const listener of listeners)listener();
  };
  const activity=id=>{
    let store=activities.get(id);
    if(!store){store=createNeonAvatarStore();store.subscribe(publish);activities.set(id,store)}
    return store;
  };
  const view=id=>{
    const actual=activities.get(id)?.getSnapshot()??{state:'idle',completionKey:null};
    const state=demo??actual.state,isDemo=demo!==null;
    const completionKey=state==='finished'?(isDemo?'demo:'+demoSequence:actual.completionKey):null;
    return Object.freeze({id,shape:assignments.get(id)??null,state,actualState:actual.state,isDemo,completionKey,revision});
  };
  return {
    getSnapshot:()=>snapshot,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},
    shapeFor:id=>typeof id==='string'?assignments.get(id):undefined,
    // Stable between publishes, as useSyncExternalStore requires.
    getBot(id){let value=views.get(id);if(!value){value=view(id);views.set(id,value)}return value},
    select(id,shape){
      check(id,shape);
      if((assignments.get(id)??null)===(shape??null))return this.getBot(id);
      shape==null?assignments.delete(id):assignments.set(id,shape);
      publish();return this.getBot(id);
    },
    setActual(id,...args){check(id,null);activity(id).setActual(...args);return this.getBot(id)},
    preview(state){
      if(!['idle','working','finished'].includes(state))throw Error('Unsupported appearance preview state');
      if(state==='finished')demoSequence++;
      else if(demo===state)return Object.freeze({state,completionKey:null});
      demo=state;publish();
      return Object.freeze({state,completionKey:state==='finished'?'demo:'+demoSequence:null});
    },
    followActual(){if(demo!==null){demo=null;publish()}return snapshot},
    expirePreview(key){if(demo==='finished'&&key==='demo:'+demoSequence)return this.followActual();return snapshot},
  };
}
