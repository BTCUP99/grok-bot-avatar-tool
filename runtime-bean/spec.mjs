// Reproduce the current avatar specification without connecting to the running app.
// Vendor modules stay in memory; only derived measurements and SVG are written.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync,mkdirSync} from 'node:fs';
import {preflight, build, sha, appearanceFor} from './patch.mjs';
import {parseArgs} from 'node:util';
import {loadCommonModule} from './common-contract.mjs';
const {values}=parseArgs({options:{shape:{type:'string',default:'apricotBean'}}});
const shape=values.shape,appearance=appearanceFor(shape);
const outputPrefix={apricotBean:'头像',milkcat:'奶糖喵机',neonNight:'霓虹夜行'}[shape]??'library/specs/'+appearance.name;
if(shape.startsWith('robot_'))mkdirSync(new URL('./library/specs/',import.meta.url),{recursive:true});

const checked = preflight();
const {archive, version, officialHash, contract} = checked;
const {patched} = build(archive, '00000000-0000-4000-8000-000000000000', {shape,includePickerImages:false});
const native = await loadCommonModule(checked, patched[contract.common]);
const engine = native.P({body: shape});
engine.rest();
const settle = gaze => {
  engine.setGaze(gaze);
  for (let i = 0; i < 180; i++) engine.advance(1 / 60);
  return engine.frame();
};
const definitions = [
  ['rest', '闲置 / 移开回位', null],
  ['front', '悬停中心 · 正面', [0, 0]],
  ['left', '左 · yaw −26°', [-1, 0]],
  ['right', '右 · yaw +26°', [1, 0]],
  ['up', '上 · pitch −19°', [0, 1]],
  ['down', '下 · pitch +19°', [0, -1]],
];
const frames = definitions.map(([key, label, gaze]) => ({key, label, gaze, frame: settle(gaze)}));
assert.deepEqual(frames[1].frame.quat, [1, 0, 0, 0]);
assert(Math.hypot(...settle(null).quat.map((v, i) => v - frames[0].frame.quat[i])) < 1e-8);
for (const size of [36, 64]) {
  const rect = {left: 0, top: 0, width: size, height: size};
  for (const gaze of [[0, 0], [-1, 0], [1, 0], [0, 1], [0, -1]]) {
    const point = {x: size / 2 + gaze[0] * size / 2, y: size / 2 - gaze[1] * size / 2};
    const actual = native.L(rect, point, .5);
    actual.forEach((v, i) => assert(Math.abs(v - gaze[i]) < 1e-12));
  }
}
const palette = native.D('#f7af69', '#3c2924');
const render = (frame, size, id) => {
  const svg = native.O(frame, palette, size, id);
  assert(!/NaN|Infinity/.test(svg));
  return svg;
};
const geometry = native.geometry(shape);
const report = {
  appVersion: version,
  officialAsarSHA256: officialHash,
  avatarSourceSHA256: sha(readFileSync(new URL('./'+appearance.source, import.meta.url))),
  ...(shape==='neonNight'?{sourceDependencySHA256:Object.fromEntries(['milkcat-shape.js','neon-state.mjs','neon-bridge.js'].map(name=>[name,sha(readFileSync(new URL('./'+name,import.meta.url)))]))}:{}),
  ...(shape.startsWith('robot_')?{sourceDependencySHA256:Object.fromEntries(['../avatar-designs/catalog-shapes.js','../avatar-designs/fantasy-shapes.js','library.mjs','library-state.mjs','library-bridge.js','library-picker.js','neon-state.mjs','neon-shape.js','milkcat-shape.js'].map(name=>[name,sha(readFileSync(new URL('./'+name,import.meta.url)))]))}:{}),
  scope: 'offline native-engine measurements; actual window hover evidence is separate',
  shape,
  geometry: {size: geometry.size, kind: geometry.silhouette.kind, ballCount: geometry.silhouette.balls?.length??0, seat: geometry.seat.kind},
  eyeLayout: native.eyeLayout[shape],
  observedAppDisplayCssPx: {sidebar: 36, profile: 64},
  sharedSourceResolution: 192,
  views: frames.map(({key, gaze, frame}) => {
    const [pitch, yaw, roll] = native.quaternionEuler(frame.quat).map(v => v * 180 / Math.PI);
    return {key, gaze, quaternionWXYZ: frame.quat, degrees: {pitch, yaw, roll}, zoom: frame.zoom, offset: frame.offset};
  }),
};
const tiles = frames.map(({key, label, gaze, frame}, i) => {
  const x = 28 + (i % 3) * 260, y = 100 + Math.floor(i / 3) * 284;
  return `<g transform="translate(${x} ${y})"><rect width="244" height="266" rx="18" fill="#fff" stroke="#e4d6c8"/><text x="18" y="30" font-size="16" font-weight="600">${label}</text><g transform="translate(26 42)">${render(frame, 192, 'spec-' + key)}</g><text x="122" y="246" text-anchor="middle" font-size="13" fill="#786658">gaze: ${JSON.stringify(gaze)}</text></g>`;
});
const sizes = [36, 64].map((size, i) => {
  const x = 380 + i * 170;
  return `<g transform="translate(${x} 718)"><rect width="${size}" height="${size}" fill="#fff" stroke="#d4c5b7"/>${render(frames[1].frame, size, 'size-' + size)}<text y="90" font-size="14">${size} × ${size} CSS px</text></g>`;
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="846" viewBox="0 0 820 846"><rect width="820" height="846" fill="#fcf6ed"/><g font-family="PingFang SC, system-ui, sans-serif" fill="#493527"><text x="28" y="40" font-size="25" font-weight="700">${appearance.name} · 制作与转向基准</text><text x="28" y="70" font-size="14" fill="#786658">Grok Bot ${version} · 原生引擎离线渲染 · 六个验收姿态，方向连续变化</text>${tiles.join('')}<text x="28" y="740" font-size="17" font-weight="600">实际显示尺寸参考</text><text x="28" y="768" font-size="13" fill="#786658">按 100% 查看；不代表 PNG 上传要求。</text><text x="28" y="792" font-size="13" fill="#786658">大图为 192 单位 SVG；浅底与卡片仅用于展示。</text>${sizes.join('')}</g></svg>`;
writeFileSync(new URL('./'+outputPrefix+'参数快照.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
writeFileSync(new URL('./'+outputPrefix+'规格图.svg', import.meta.url), sheet + '\n');
console.log(JSON.stringify({passed: true, outputs: [outputPrefix+'参数快照.json', outputPrefix+'规格图.svg'], views: report.views}, null, 2));
