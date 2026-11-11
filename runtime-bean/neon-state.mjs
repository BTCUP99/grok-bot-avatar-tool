// Local appearance state only. No Bot mutation, network, or conversation access.
export function createNeonAvatarStore() {
  let actualState='idle',actualCompletionKey=null,actualSequence=0;
  let demoState=null,demoSequence=0,revision=0;
  let snapshot=Object.freeze({state:'idle',actualState:'idle',isDemo:false,completionKey:null,revision:0});
  const listeners=new Set();
  const publish=()=>{
    const state=demoState??actualState,isDemo=demoState!==null;
    snapshot=Object.freeze({state,actualState,isDemo,completionKey:state==='finished'?(isDemo?'demo:'+demoSequence:actualCompletionKey):null,revision:++revision});
    for(const listener of listeners)listener();
    return snapshot;
  };
  return {
    getSnapshot:()=>snapshot,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},
    setActual(state,completionToken=null){
      state=typeof state==='string'&&state.length?state:'idle';
      const key=state==='finished'?completionToken==null?(actualState==='finished'?actualCompletionKey:'actual:edge:'+(++actualSequence)):'actual:'+completionToken:null;
      if(state===actualState&&key===actualCompletionKey)return snapshot;
      actualState=state;actualCompletionKey=key;return publish();
    },
    preview(state){
      if(!['idle','working','finished'].includes(state))throw Error('Unsupported appearance preview state');
      if(state==='finished')demoSequence++;
      if(demoState===state&&state!=='finished')return snapshot;
      demoState=state;return publish();
    },
    followActual(){if(demoState===null)return snapshot;demoState=null;return publish()},
    expirePreview(key){if(snapshot.isDemo&&snapshot.completionKey===key)return this.followActual();return snapshot},
  };
}

export function createNeonCompletionGate() {
  const seen=new WeakMap();
  return (engine,snapshot)=>{
    if(!engine||snapshot.state!=='finished'||snapshot.completionKey==null||seen.get(engine)===snapshot.completionKey)return false;
    seen.set(engine,snapshot.completionKey);
    // Both methods are the original native imperative handle.
    engine.setExpression('happy');engine.poke('nod');
    return true;
  };
}
