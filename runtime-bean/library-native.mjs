// Offline only: pinned vendor modules are evaluated in memory and never copied out.
import {preflight,build} from './patch.mjs';
import {loadCommonModule} from './common-contract.mjs';

export async function loadNativeLibrary({includePickerImages=true}={}) {
  const checked = preflight();
  const {common} = checked.contract;
  const adapted = build(checked.archive, '00000000-0000-4000-8000-000000000000', {
    shape:'neonNight', library:true, demo:true, includePickerImages,
  });
  const original = await loadCommonModule(checked, checked.archive.read('dist/renderer/assets/' + common).toString());
  const native = await loadCommonModule(checked, adapted.patched[common], 'robotCatalog,robotInspectShape,libraryNativeSvg,neonNativeSvg');
  return {native,original,checked,adapted};
}
