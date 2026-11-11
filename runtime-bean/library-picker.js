// Native avatar popover entry; selection commits to the local adapter only.
const avatarPickerImages=__AVATAR_PICKER_IMAGES__;
// Every individual Bot gets the library tab; groups and unknown IDs keep the vendor editor.
function avatarEditorEligible(agent){return typeof agent?.id==='string'&&!agent.isGroup&&botIdPattern.test(agent.id)}
function avatarWrapEditor(NativeEditor){
  return function AvatarEditorEntry(props){
    return avatarEditorEligible(props.agent)?X.createElement(AvatarLibraryEditor,{...props,NativeEditor}):X.createElement(NativeEditor,props);
  };
}
function AvatarLibraryEditor(props){
  const id=props.agent.id;
  const current=X.useSyncExternalStore(avatarStore.subscribe,()=>avatarStore.shapeFor(id)??null,()=>null);
  const [tab,setTab]=X.useState(current?.startsWith('photo_')?'photos':'library'),[draft,setDraft]=X.useState(current??avatarCharacters[0].shape);
  const photos=avatarCharacters.filter(c=>c.kind==='photo'),dynamic=avatarCharacters.filter(c=>c.kind!=='photo'),isPhotos=tab==='photos';
  const switchTab=key=>{setTab(key);setQuery('');if(key==='photos'&&!draft.startsWith('photo_')&&photos.length)setDraft(photos[0].shape);if(key==='library'&&draft.startsWith('photo_'))setDraft(dynamic[0].shape)};
  const [query,setQuery]=X.useState(''),[collection,setCollection]=X.useState('all');
  const el=X.createElement;
  const buttonStyle={border:'1px solid var(--sand-border-secondary-translucent, #d8e2e4)',borderRadius:10,padding:'8px 12px',background:'var(--sand-bg-secondary, #f3f6f5)',color:'var(--sand-text-primary, #263c43)',font:'inherit',cursor:'pointer'};
  const tabs=el('div',{role:'tablist','aria-label':'头像分类',style:{display:'flex',gap:6,padding:12,borderBottom:'1px solid var(--sand-border-secondary, #d8e2e4)'}},
    ...[['library','原创动态头像'],...(photos.length?[['photos','写真头像']]:[]),['official','官方选项']].map(([key,label])=>el('button',{key,role:'tab','aria-selected':tab===key,onClick:()=>switchTab(key),style:{...buttonStyle,fontWeight:tab===key?650:400,background:tab===key?'var(--sand-bg-tertiary, #e3eeee)':'transparent'}},label)));
  const filtered=(isPhotos?photos:dynamic).filter(character=>(isPhotos||collection==='all'||(Number(character.number)>11)===(collection==='new'))&&(`${character.name} ${character.key} ${character.number}`).toLowerCase().includes(query.trim().toLowerCase()));
  const cards=filtered.map(character=>el('button',{
    key:character.shape,type:'button','aria-label':'选择'+character.name,'aria-pressed':draft===character.shape,
    onClick:()=>setDraft(character.shape),
    style:{...buttonStyle,minWidth:0,padding:'8px 3px',display:'flex',flexDirection:'column',alignItems:'center',gap:3,borderColor:draft===character.shape?'#408d98':'var(--sand-border-secondary, #d8e2e4)',background:draft===character.shape?'var(--sand-bg-tertiary, #e3eeee)':'transparent'},
  },el('img',{src:avatarPickerImages[character.shape],alt:'',width:64,height:64,draggable:false,style:character.kind==='photo'?{borderRadius:'22%',objectFit:'cover'}:undefined}),el('span',{style:{fontSize:11,whiteSpace:'nowrap'}},character.name)));
  const apply=()=>{avatarStore.select(id,draft);console.info('[Avatar Runtime] selection',id,draft);props.onClose()};
  const restore=()=>{avatarStore.select(id,null);console.info('[Avatar Runtime] selection',id,null);props.onClose()};
  const content=tab!=='official'?el('div',{role:'tabpanel','aria-label':isPhotos?'写真头像':'原创动态头像',style:{padding:14}},
    el('p',{style:{margin:'0 0 10px',fontSize:12,lineHeight:1.7,color:'var(--sand-text-secondary, #667c80)'}},isPhotos?`${photos.length} 款写真 · 悬停转正、移开回位，工作柔光与完成轻弹`:`${dynamic.length} 款动态角色 · 悬停转头、工作灯与完成表情`),
    el('input',{type:'search','aria-label':isPhotos?'搜索写真头像':'搜索原创头像',placeholder:'搜索名称或编号',value:query,onChange:event=>setQuery(event.target.value),style:{...buttonStyle,width:'100%',boxSizing:'border-box',marginBottom:8}}),
    !isPhotos&&el('div',{role:'group','aria-label':'角色系列',style:{display:'flex',gap:5,marginBottom:10}},...[["all","全部"],["new","奇想新作 20"],["classic","初代 11"]].map(([value,label])=>el('button',{type:'button',key:value,'aria-pressed':collection===value,onClick:()=>setCollection(value),style:{...buttonStyle,padding:'6px 8px',fontSize:11,background:collection===value?'var(--sand-bg-tertiary, #e3eeee)':'transparent'}},label))),
    el('div',{'aria-label':'角色列表',style:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,maxHeight:'min(330px, 38vh)',overflowY:'auto',padding:2}},...cards),
    !cards.length&&el('p',{role:'status',style:{fontSize:12}},'没有匹配的头像，请换个关键词。'),
    el('p',{'aria-live':'polite',style:{fontSize:12,margin:'10px 0 0'}},'待应用：'+avatarCharacters.find(item=>item.shape===draft).name),
    el('p',{style:{margin:'12px 0',fontSize:11,lineHeight:1.7,color:'var(--sand-text-secondary, #667c80)'}},current?'当前：'+avatarCharacters.find(item=>item.shape===current).name+'。仅这个 Bot 在这台 Mac 显示，无需上传；下次仍从头像工具启动。':'仅这个 Bot 在这台 Mac 显示，无需上传。选择会记住；下次仍从头像工具启动。'),
    el('div',{style:{display:'flex',gap:8,justifyContent:'flex-end'}},
      current&&el('button',{type:'button',onClick:restore,style:{...buttonStyle,marginRight:'auto'}},'恢复原头像'),
      el('button',{type:'button',onClick:props.onClose,style:buttonStyle},'取消'),
      el('button',{type:'button',onClick:apply,style:{...buttonStyle,color:'#fff',background:'#287482',borderColor:'#287482'}},'应用头像')),
  ):el('div',{role:'tabpanel','aria-label':'官方选项'},
    el('p',{style:{fontSize:11,lineHeight:1.6,padding:'0 14px',color:'var(--sand-text-secondary, #667c80)'}},'下方为官方头像设置。自选头像在本设备独立显示，官方上传和设置仍使用账号原有功能。'),
    el(props.NativeEditor,{...props,agent:props.agent.__avatarOriginal??props.agent}));
  return el('div',{role:'dialog','aria-label':'头像编辑器',className:'sand-avatar-editor avatar-library-editor',style:{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:100,width:'100%',maxWidth:354,maxHeight:'calc(100vh - 48px)',overflowY:'auto',boxSizing:'border-box',borderRadius:16,background:'var(--sand-bg-elevated, #fff)',color:'var(--sand-text-primary, #263c43)',boxShadow:'0 12px 40px #0002',border:'1px solid var(--sand-border-secondary-translucent, #d8e2e4)',font:'13px system-ui',outline:'none'}},
    el('style',null,'.avatar-library-editor .sand-avatar-editor{position:static!important;transform:none!important;top:auto!important;left:auto!important;width:auto!important;box-shadow:none!important;border:none!important}'),tabs,content);
}
// Raw native values avoid feeding local-only shape keys into the vendor grid.
function avatarOfficialCharacterOptions(props){
  const agent=props.agent,staged=props.staged;
  const rawShape=staged?.avatarShape??agent.avatarShape??'blob';
  const shape=ji(rawShape)?rawShape:Di(agent.id);
  const rawColor=staged?.avatarColor??agent.avatarColor;
  const color=Ii.find(item=>item.id===rawColor)?.id??wi(agent.id);
  return X.createElement(GO,{shape,color,limitedShapes:props.limitedShapes,showSelection:props.isCharacterActive,
    onSelectShape:value=>{const fixed=wu(value);props.character.commitCharacter(fixed==null?{avatarShape:value}:{avatarShape:value,avatarColor:fixed})},
    onSelectColor:value=>props.character.commitCharacter({avatarColor:value}),
  });
}
