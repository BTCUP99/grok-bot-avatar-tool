// Each signed release is pinned by patch.mjs before these private names are used.
// The 0.78 releases share bindings; 0.79.4 renamed several render helpers.
const nativeBindings = Object.freeze({
  rendererEntry: 'function Xg(e,t,n,r,i={}){',
  exportStart: 'export{Nn as $',
  playerEngine: 'a=eo({body:t.body}),o=t.state===void 0?null:go(a,t.state,',
  playerWithState: 'a=eo({body:t.body,avatarState:()=>t.state}),o=t.state===void 0?null:go(a,t.state,',
  probes: 'go as stateController,lo as stateDefinitions,Wr as quaternionEuler,Oo as eyeLayout,dc as geometry',
});
const nativeBindings0794 = Object.freeze({
  ...nativeBindings,
  rendererEntry: 'function Qg(e,t,n,r,i={}){',
  exportStart: 'export{In as $',
});
const helperNames0794 = Object.freeze({Dp:'kp',kp:'jp',jp:'Np',Hp:'Wp',Hg:'Wg'});

export function commonBindings(version) {
  if (version === '0.78.4' || version === '0.78.5') return nativeBindings;
  if (version === '0.79.4') return nativeBindings0794;
  throw Error('No native renderer contract for Grok Bot ' + version);
}

// Translate only our injected materials. In 0.79.4, several old names still
// exist but refer to different functions, so changing the vendor module is unsafe.
export function bindCommonHelpers(source, version) {
  commonBindings(version);
  return version === '0.79.4'
    ? source.replace(/\b(?:Dp|kp|jp|Hp|Hg)\b/g, name => helperNames0794[name])
    : source;
}

export function patchCommon({version, source, shape, appearance, usesLibrary, read, replace, libraryCharacters}) {
  const bindings = commonBindings(version);
  let adapted = source;
  let material;
  let dispatch;
  if (usesLibrary) {
    const definitions = read('library-runtime.js').replaceAll('__LIBRARY_CHARACTERS__', JSON.stringify(libraryCharacters));
    material = [
      read('milkcat-shape.js'), read('neon-shape.js'),
      read('../avatar-designs/catalog-shapes.js'), read('../avatar-designs/fantasy-shapes.js'), definitions,
    ].join('\n');
    dispatch = 'if(e.body.startsWith(`robot_`))return libraryNativeSvg(e,t,n,r,i);if(e.body===`neonNight`)return neonNativeSvg(e,t,n,r,i);';
  } else {
    const body = 'e.body===`' + shape + '`';
    const condition = shape === 'neonNight' ? body : body + '&&e.bodies.length===1&&e.morph==null';
    dispatch = 'if(' + condition + ')return ' + appearance.renderer + '(e,t,n,r,i);';
    material = (shape === 'neonNight' ? read('milkcat-shape.js') + '\n' : '') + read(appearance.source);
  }
  adapted = replace(adapted, bindings.rendererEntry, bindings.rendererEntry + dispatch, 'shape renderer');
  adapted = replace(adapted, bindings.exportStart, bindCommonHelpers(material, version) + '\n' + bindings.exportStart, 'shape geometry');
  if (usesLibrary) {
    adapted = replace(adapted, bindings.playerEngine, bindings.playerWithState, 'per-player activity state');
  }
  return adapted;
}

// Offline inspection uses the exact helper and common module from the same
// verified archive. The additions only name bindings for the offline checks.
export async function loadCommonModule({archive, contract}, source, extraExports = '') {
  const {probes} = commonBindings(contract.version);
  const dataURL = value => 'data:text/javascript;base64,' + Buffer.from(value).toString('base64');
  const importPath = './' + contract.helper;
  if (!source.includes(importPath)) throw Error('Pinned native module has no import of ' + contract.helper);
  const helper = archive.read('dist/renderer/assets/' + contract.helper);
  const resolved = source.replaceAll(importPath, dataURL(helper));
  const exports = extraExports ? probes + ',' + extraExports : probes;
  try {
    return await import(dataURL(resolved + '\nexport {' + exports + '};'));
  } catch (error) {
    // Node normally includes the entire data URL in its stack trace.
    throw Error('Cannot load the ' + contract.version + ' native renderer: ' +
      String(error.message).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '[native module]').slice(0, 400));
  }
}
