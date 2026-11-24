'use strict';
const VERSION='3.10.10',KEY='alivi-mobile-notes-v1';
const $=id=>document.getElementById(id);
let uid="", notes=[];
try{notes=JSON.parse(localStorage.getItem(KEY+':'+uid)||'[]');if(!Array.isArray(notes))notes=[]}catch{notes=[]}
function render(){const target=$('notes');target.replaceChildren();if(!notes.length){const e=document.createElement('div');e.className='empty';e.textContent='Nenhuma nota ainda.';target.append(e)}notes.forEach((n,i)=>{const d=document.createElement('div');d.className='item';const b=document.createElement('b');b.textContent=n.title;const t=document.createElement('p');t.textContent=n.content;const s=document.createElement('small');s.textContent=n.date;const del=document.createElement('button');del.className='secondary';del.textContent='Excluir';del.onclick=()=>{if(confirm('Excluir esta nota?')){notes.splice(i,1);persist()}};d.append(b,t,s,del);target.append(d)})}
function persist(){localStorage.setItem(KEY+':'+uid,JSON.stringify(notes));render()}
function go(page){if(page!=='home'&&voiceModeOn)setVoiceMode(false);document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===page));$('menu').hidden=true;$('dots').setAttribute('aria-expanded','false');if(page==='home')scrollLatest();if(page==='projects')renderProjects();if(page==='agenda')renderAgenda();if(page==='finance'||page==='business')renderLedger();if(page==='alerts')renderAlerts();if(page==='feedback')loadFeedbackMine()}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
$('alert-badge').onclick=()=>go('alerts');
$('dots').onclick=()=>{const m=$('menu');m.hidden=!m.hidden;$('dots').setAttribute('aria-expanded',String(!m.hidden))};document.addEventListener('click',e=>{if(!e.target.closest('.menu-wrap')){$('menu').hidden=true;$('dots').setAttribute('aria-expanded','false')}});
$('save').onclick=()=>{const title=$('title').value.trim(),content=$('content').value.trim();if(!title||!content){alert('Informe título e texto.');return}notes.unshift({title,content,date:new Date().toLocaleString('pt-BR')});try{persist()}catch(e){notes.shift();alert('Não foi possível salvar: '+e.message);return}$('title').value='';$('content').value=''};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'alivi-mobile-notes-v1',notes},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='alivi_mobile_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const obj=JSON.parse(await f.text());if(obj.format!=='alivi-mobile-notes-v1'||!Array.isArray(obj.notes)||obj.notes.length>10000||obj.notes.some(n=>typeof n.title!=='string'||typeof n.content!=='string'||typeof n.date!=='string'))throw Error('Formato inválido');if(confirm('Substituir as notas locais pelo backup?')){notes=obj.notes;persist()}}catch(err){alert('Não foi possível importar: '+err.message)}e.target.value=''};
const CHATKEY='alivi-mobile-chat-v1',APIKEY='alivi-mobile-api-url-v1',TOKENKEY='alivi-mobile-token-session';
const DEFAULT_API='https://alivi-backend.onrender.com';
let messages=[];try{messages=JSON.parse(localStorage.getItem(CHATKEY+':'+uid)||'[]');if(!Array.isArray(messages))messages=[]}catch{messages=[]}
// Local conversation organization; existing cloud rows and schema remain unchanged.
const PROJECTKEY='alivi-mobile-projects-v1';
let projects=[], associations=Object.create(null), activeProject='', pendingSuggestion='';
function projectStorage(){return PROJECTKEY+':'+uid}
function loadProjects(){projects=[];associations=Object.create(null);activeProject='';try{const v=JSON.parse(localStorage.getItem(projectStorage())||'{}');if(Array.isArray(v.projects))projects=v.projects.filter(p=>typeof p.id==='string'&&typeof p.name==='string');if(v.associations&&typeof v.associations==='object')Object.assign(associations,v.associations);if(projects.some(p=>p.id===v.active))activeProject=v.active}catch{}$('suggest-memory').checked=localStorage.getItem('alivi-suggest:'+uid)==='yes';renderProjects()}
function saveProjects(){if(!uid)return;try{localStorage.setItem(projectStorage(),JSON.stringify({projects,associations,active:activeProject}))}catch(e){$('chat-notice').textContent='Não foi possível salvar organização local: '+e.message}renderDesktopSidebar()}
function visibleMessages(){return messages.filter(m=>(associations[m.id]||'')===activeProject)}
function associate(m,project){if(project&&m.id){associations[m.id]=project;saveProjects()}}
function renderProjects(){const list=$('project-list');list.replaceChildren();const options=[{id:'',name:'Conversa geral'},...projects];for(const p of options){const b=document.createElement('button');b.className=p.id===activeProject?'primary':'secondary';b.textContent=p.name;b.disabled=busy;b.onclick=()=>{if(busy)return;activeProject=p.id;saveProjects();lastReply=[...visibleMessages()].reverse().find(m=>m.role==='assistant')?.text||'';clearSuggestion();chatRender(true);go('home')};const item=document.createElement('div');item.className='item';item.append(b);if(p.id){const rename=document.createElement('button');rename.className='secondary';rename.textContent='Renomear';rename.onclick=()=>{if(busy||!uid)return;const name=prompt('Novo nome da conversa',p.name)?.trim();if(!name||name.length>80)return;if(projects.some(x=>x.id!==p.id&&x.name.toLowerCase()===name.toLowerCase())){alert('Já existe uma conversa com este nome.');return}p.name=name;saveProjects();renderProjects()};item.append(rename)}list.append(item)}$('active-project').textContent=options.find(p=>p.id===activeProject)?.name||'Conversa geral';renderDesktopSidebar()}
$('create-project').onclick=()=>{if(!uid||busy)return;const name=$('project-name').value.trim();if(!name)return;if(projects.some(p=>p.name.toLowerCase()===name.toLowerCase())){alert('Já existe uma conversa com este nome.');return}projects.push({id:crypto.randomUUID(),name});activeProject=projects.at(-1).id;saveProjects();$('project-name').value='';lastReply='';clearSuggestion();renderProjects();chatRender(true);go('home')};

// 3.8.0: navegação desktop em três colunas, sem alterar dados da nuvem.
const DESKTOP_LAYOUT_KEY='alivi-desktop-sidebar-collapsed-v1';
function desktopVisible(){return !!$('desktop-sidebar') && window.innerWidth>=1000}
function desktopConversationName(p){return p.name||'Conversa sem título'}
function openDesktopConversation(id){
 if(busy||!uid)return;
 activeProject=id;
 stopAudio();
 saveProjects();
 lastReply=[...visibleMessages()].reverse().find(m=>m.role==='assistant')?.text||'';
 clearSuggestion();chatRender(true);go('home');closeMobileDrawer();
 $('message').focus();
}
function renderDesktopSidebar(){
 if(!$('desktop-sidebar'))return;
 const filter=($('desktop-search').value||'').trim().toLocaleLowerCase('pt-BR');
 const lastTime=id=>{
  for(let i=messages.length-1;i>=0;i--)if((associations[messages[i].id]||'')===id)return Date.parse(messages[i].created_at||'')||0;
  return 0;
 };
 const projectsOnly=projects.filter(p=>p.kind!=='chat');
 const chatsOnly=projects.filter(p=>p.kind==='chat');
 const general={id:'',name:'Conversa geral',kind:'chat'};
 const recent=[general,...chatsOnly].sort((a,b)=>lastTime(b.id)-lastTime(a.id)||(b.created_at||'').localeCompare(a.created_at||''));
 const pinned=projects.filter(p=>p.pinned).sort((a,b)=>lastTime(b.id)-lastTime(a.id));
 function draw(targetId,items,isPinned=false){
  const el=$(targetId);el.replaceChildren();let shown=0;
  for(const p of items){
   if(filter&&!desktopConversationName(p).toLocaleLowerCase('pt-BR').includes(filter))continue;
   shown++;
   const wrap=document.createElement('div');wrap.className='desktop-sidebar-item'+(activeProject===p.id?' selected':'');
   const open=document.createElement('button');open.type='button';open.className='desktop-item-open';open.textContent=desktopConversationName(p);open.title=desktopConversationName(p);
   if(activeProject===p.id)open.setAttribute('aria-current','page');
   open.onclick=()=>openDesktopConversation(p.id);
   wrap.append(open);
   if(p.id){
    const star=document.createElement('button');star.type='button';star.className='desktop-item-pin';star.textContent=p.pinned?'★':'☆';
    star.title=p.pinned?'Desafixar conversa':'Fixar conversa';star.setAttribute('aria-label',star.title);star.setAttribute('aria-pressed',String(!!p.pinned));
    star.onclick=()=>{p.pinned=!p.pinned;saveProjects();renderDesktopSidebar()};
    wrap.append(star);
    if(p.kind==='chat'){
      const rename=document.createElement('button');rename.type='button';rename.className='desktop-item-rename';rename.textContent='✎';rename.title='Renomear conversa';rename.setAttribute('aria-label','Renomear '+p.name);
      rename.onclick=()=>renameChat(p.id);
      const del=document.createElement('button');del.type='button';del.className='desktop-item-delete';del.textContent='✕';del.title='Excluir conversa';del.setAttribute('aria-label','Excluir '+p.name);
      del.onclick=()=>deleteNamedChat(p.id);
      wrap.append(rename,del);
    }
   }
   el.append(wrap);
  }
  if(!shown){const empty=document.createElement('div');empty.className='desktop-side-placeholder';empty.textContent=filter?'Nenhuma correspondência.':(isPinned?'Fixe conversas usando a estrela.':'Nenhum item ainda.');el.append(empty)}
 }
 draw('desktop-pinned',pinned,true);draw('desktop-projects',projectsOnly);draw('desktop-recents',recent);
}
function startDesktopChat(){
 if(!uid||busy)return;
 let n=1;while(projects.some(p=>p.name===`Nova conversa ${n}`))n++;
 const now=new Date().toISOString();
 const chat={id:crypto.randomUUID(),name:`Nova conversa ${n}`,kind:'chat',autoTitle:true,created_at:now,pinned:false};
 projects.push(chat);activeProject=chat.id;lastReply='';clearSuggestion();
 saveProjects();renderProjects();chatRender(true);go('home');closeMobileDrawer();$('message').value='';$('message').focus();
}
function maybeTitleNewChat(project,q){
 const p=projects.find(p=>p.id===project&&p.kind==='chat'&&p.autoTitle);
 if(!p)return;
 let title=q.trim().replace(/\s+/g,' ');
 if(title.length>48)title=title.slice(0,48).replace(/\s+\S*$/,'')+'…';
 if(title){p.name=title;p.autoTitle=false;saveProjects();renderProjects()}
}
// Conversas criadas neste aparelho: nomes e agrupamentos continuam locais.
function renameChat(id){
 const p=projects.find(x=>x.id===id&&x.kind==='chat');if(!p||!uid||busy||syncing)return;
 const name=prompt('Novo nome da conversa',p.name)?.trim();if(!name)return;
 if(name.length>80){alert('Use no máximo 80 caracteres.');return}
 if(projects.some(x=>x.id!==id&&x.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){alert('Já existe outra conversa com este nome.');return}
 p.name=name;p.autoTitle=false;saveProjects();renderProjects();
}
async function deleteNamedChat(id){
 const p=projects.find(x=>x.id===id&&x.kind==='chat');if(!p||!uid||busy||syncing)return;
 // Use the saved association map rather than the last 100 loaded rows.
 const ids=Object.keys(associations).filter(messageId=>associations[messageId]===id&&/^[0-9a-f-]{36}$/i.test(messageId));
 const title=p.name;const warning=ids.length?
  `Excluir "${title}" e as ${ids.length} mensagens vinculadas neste aparelho, inclusive do histórico sincronizado?\n\nEssa ação não pode ser desfeita. Memórias permanentes, agenda e notas não serão apagadas.`:
  `Excluir a conversa vazia "${title}" deste aparelho?`;
 if(!confirm(warning))return;
 const userId=uid;const g=generation;busy=true;stopAudio();
 try{
  // DELETE restricts both user_id and exact message UUIDs: never wipe other chats.
  for(let i=0;i<ids.length;i+=40){
   const batch=ids.slice(i,i+40);const query='user_id=eq.'+encodeURIComponent(userId)+'&id=in.('+batch.join(',')+')';
   await db('chat_messages','DELETE',query);
   const remain=await db('chat_messages','GET',query+'&select=id');
   if(remain.length)throw Error('Algumas mensagens não foram excluídas do banco.');
   if(g!==generation||uid!==userId)throw Error('A sessão mudou durante a exclusão.');
  }
  const removed=new Set(ids);
  messages=messages.filter(m=>!removed.has(m.id));
  for(const messageId of ids)delete associations[messageId];
  projects=projects.filter(x=>x.id!==id);
  if(activeProject===id){activeProject='';lastReply=[...visibleMessages()].reverse().find(m=>m.role==='assistant')?.text||'';}
  saveProjects();renderProjects();chatSave(true);closeMobileDrawer();
  $('chat-notice').textContent='Conversa excluída. As memórias salvas foram preservadas.';
 }catch(e){alert('Exclusão não concluída: '+e.message+'\nNenhuma outra conversa foi selecionada para exclusão.');}
 finally{busy=false;if(g===generation)syncChat()}
}
function exportActiveChat(){
 if(!uid)return;
 const current=projects.find(x=>x.id===activeProject)?.name||'Conversa geral';
 const rows=visibleMessages();if(!rows.length){alert('Esta conversa ainda não tem mensagens para exportar.');return}
 const content=['ALIVI — '+current,'Exportação de mensagens carregadas em '+new Date().toLocaleString('pt-BR'),'---',...rows.map(m=>'['+(m.created_at?new Date(m.created_at).toLocaleString('pt-BR'):'sem data')+'] '+(m.role==='assistant'?'ALIVI':'VOCÊ')+'\n'+m.text+'\n')].join('\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='alivi_conversa_'+new Date().toISOString().slice(0,10)+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('export-active-chat').addEventListener('click',exportActiveChat);
if($('desktop-sidebar')){
 $('desktop-new-chat').addEventListener('click',startDesktopChat);
 $('desktop-search').addEventListener('input',renderDesktopSidebar);
 $('desktop-project-add').addEventListener('click',()=>{go('projects');$('project-name').focus()});
 const toggleDesktopSidebar=()=>{const collapsed=$('main-app').classList.toggle('desktop-sidebar-collapsed');
  try{localStorage.setItem(DESKTOP_LAYOUT_KEY,collapsed?'yes':'no')}catch{}
  $('desktop-sidebar-toggle').setAttribute('aria-expanded',String(!collapsed));};
 $('desktop-sidebar-toggle').addEventListener('click',toggleDesktopSidebar);
 $('desktop-close-sidebar').addEventListener('click',toggleDesktopSidebar);
 $('desktop-sidebar-toggle').setAttribute('aria-expanded',String(localStorage.getItem(DESKTOP_LAYOUT_KEY)!=='yes'));
 if(localStorage.getItem(DESKTOP_LAYOUT_KEY)==='yes')$('main-app').classList.add('desktop-sidebar-collapsed');
 $('desktop-rail-more').addEventListener('click',()=>{$('dots').click()});
}


// 3.9.1: Personalização local de tema, sem modificar contas, histórico ou notificações.
const ALIVI_THEME_KEY='alivi-appearance-theme-v1';
let themeChoice='dark';
try{const saved=localStorage.getItem(ALIVI_THEME_KEY);if(['dark','light','auto'].includes(saved))themeChoice=saved}catch{}
const scheme=window.matchMedia?.('(prefers-color-scheme: dark)');
function applyAliviTheme(){
 const effective=themeChoice==='auto'?(scheme?.matches?'dark':'light'):themeChoice;
 document.documentElement.dataset.aliviTheme=effective;
 const color=effective==='light'?'#c3dbea':'#1b3955';
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',color);
 document.querySelectorAll('[data-alivi-theme-choice]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.aliviThemeChoice===themeChoice)));
 const status=$('theme-status');if(status)status.textContent='Tema '+(themeChoice==='dark'?'Azul Orbital':themeChoice==='light'?'Azul Cristal':'Automático')+' selecionado neste dispositivo.';
}
document.querySelectorAll('[data-alivi-theme-choice]').forEach(btn=>btn.addEventListener('click',()=>{
 themeChoice=btn.dataset.aliviThemeChoice;
 try{localStorage.setItem(ALIVI_THEME_KEY,themeChoice)}catch{}
 applyAliviTheme();
}));
if(scheme){if(scheme.addEventListener)scheme.addEventListener('change',()=>{if(themeChoice==='auto')applyAliviTheme()});else if(scheme.addListener)scheme.addListener(()=>{if(themeChoice==='auto')applyAliviTheme()})}
applyAliviTheme();

// 3.9.1: Mobile reutiliza a MESMA lista de conversas e o mesmo criador do desktop.
function mobileDrawerOpen(){return $('main-app').classList.contains('mobile-drawer-open')}
function closeMobileDrawer(){
 const host=$('main-app');if(!host||!host.classList.contains('mobile-drawer-open'))return;
 host.classList.remove('mobile-drawer-open');
 $('mobile-chat-menu').setAttribute('aria-expanded','false');
 if(window.innerWidth<1000)$('desktop-sidebar').setAttribute('aria-hidden','true');
}
function toggleMobileDrawer(){
 if(window.innerWidth>=1000)return;
 const opened=!mobileDrawerOpen();
 $('main-app').classList.toggle('mobile-drawer-open',opened);
 $('mobile-chat-menu').setAttribute('aria-expanded',String(opened));
 $('desktop-sidebar').setAttribute('aria-hidden',String(!opened));
 if(opened){renderDesktopSidebar();$('desktop-search').focus()}
}
if($('mobile-chat-menu')){
 $('mobile-chat-menu').addEventListener('click',toggleMobileDrawer);
 $('mobile-drawer-overlay').addEventListener('click',closeMobileDrawer);
 $('mobile-drawer-close').addEventListener('click',closeMobileDrawer);
 $('mobile-new-chat').addEventListener('click',()=>{startDesktopChat();closeMobileDrawer()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileDrawer()});
 document.querySelectorAll('#main-app>.nav [data-go]').forEach(b=>b.addEventListener('click',closeMobileDrawer));
 window.addEventListener('resize',()=>{if(window.innerWidth>=1000){closeMobileDrawer();$('desktop-sidebar').removeAttribute('aria-hidden')}else if(!mobileDrawerOpen())$('desktop-sidebar').setAttribute('aria-hidden','true')});
 if(window.innerWidth<1000)$('desktop-sidebar').setAttribute('aria-hidden','true');
}

function scrollLatest(){const t=$('chat-log');t.scrollTop=t.scrollHeight;requestAnimationFrame(()=>{if($('page-home').classList.contains('active'))t.scrollTop=t.scrollHeight})}
$('chat-bottom').onclick=scrollLatest;
$('suggest-memory').onchange=()=>{if(uid)localStorage.setItem('alivi-suggest:'+uid,$('suggest-memory').checked?'yes':'no');if(!$('suggest-memory').checked)clearSuggestion()};
function clearSuggestion(){pendingSuggestion='';$('memory-suggestion').hidden=true}
function preferenceCandidate(q){const s=q.trim();if(s.length>250||s.includes('?')||/\b(?:senha|c[oó]digo|token|segredo|cpf|cart[aã]o|endere[cç]o|doen[cç]a|diagn[oó]stico|medicamento)\b/iu.test(s))return '';return /^(?:eu\s+)?(?:prefiro|gosto de|costumo|tenho o h[aá]bito de)\s+.{3,}$/iu.test(s)?s:''}
function suggestPreference(q,rows){if(!$('suggest-memory').checked)return;const candidate=preferenceCandidate(q);if(!candidate||rows.some(r=>canonical(r.memory_value)===canonical(candidate)))return;pendingSuggestion=candidate;$('suggestion-text').textContent='Deseja guardar esta preferência na memória? '+candidate;$('memory-suggestion').hidden=false}
$('dismiss-memory').onclick=clearSuggestion;
$('accept-memory').onclick=async()=>{if(!uid||!pendingSuggestion||busy)return;const g=generation,v=pendingSuggestion;busy=true;$('accept-memory').disabled=true;try{const status=await storeMemory(v,g);if(g===generation){$('memory-status').textContent=status;clearSuggestion()}}catch(e){if(g===generation)$('memory-status').textContent='Memória não salva: '+e.message}finally{busy=false;$('accept-memory').disabled=false}};
// ALIVI 3.10.2 — pausas inteligentes: encerramento automático do reconhecedor NÃO envia a mensagem.
// Se o navegador encerrar a captura após silêncio, preservamos os trechos e tentamos reabrir a escuta.
// O envio exige 6,5 segundos sem novas palavras, comando de voz explícito ou botão Enviar fala.
const VOICE_PAUSE_MS=6500;
// Desliga automaticamente o Modo Voz depois de 15 segundos aguardando nova fala.
const VOICE_IDLE_MS=15000;
let voiceModeOn=false,voiceRecognitionFailed=false,voiceFinalTranscript=false;
let voiceSession=0,voiceListening=false,voiceStarting=false,voiceRequested=false;
let voiceResumeTimer=null,voiceResumeTries=0,voiceSilenceRetries=0,voiceRecognitionText='';
let voiceDraftTimer=null,voiceSavedTranscript='',voiceCurrentTranscript='',voiceLastInputTime=0;
let voiceIdleTimer=null;
let voiceLastError='';
const voiceStopPhrases=new Set([
 'encerrar','encerra','encerrar conversa','encerra conversa','encerrar a conversa',
 'finalizar conversa','finaliza conversa','terminar conversa','termina conversa',
 'desligar modo voz','desliga modo voz','desligar o modo voz',
 'encerrar modo voz','encerra modo voz','parar de ouvir','pare de ouvir',
 'pode encerrar','pode encerrar a conversa','tchau','ate mais','fim da conversa',
 'parar conversa','parar a conversa','parar modo voz'
]);
function voiceNormalize(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim()}
function isVoiceStop(text){const s=voiceNormalize(text).replace(/^(?:ei |oi |ola )?alivi(?: |$)/,'').replace(/ por favor$/,'').replace(/ agora$/,'').trim();return voiceStopPhrases.has(s)}
function voiceStatus(text){$('voice-status').textContent=text;const info=$('voice-mode-explain');if(info)info.textContent=text||'Pronta para ouvir.'}
function voiceShowResume(visible){$('voice-talk').hidden=!visible}
function voiceShowStop(visible){$('voice-stop').hidden=!visible}
function voiceShowSend(visible){$('voice-send').hidden=!visible}
function clearVoiceTimer(){if(voiceResumeTimer!==null){clearTimeout(voiceResumeTimer);voiceResumeTimer=null}}
function clearVoiceDraftTimer(){if(voiceDraftTimer!==null){clearTimeout(voiceDraftTimer);voiceDraftTimer=null}}
function clearVoiceIdleTimer(){if(voiceIdleTimer!==null){clearTimeout(voiceIdleTimer);voiceIdleTimer=null}}
function voiceStartIdleCountdown(){
 clearVoiceIdleTimer();
 if(!voiceModeOn||!uid||document.hidden||voiceDraftText()||busy||voiceLoading||(audio&&!audio.paused))return;
 const sessionId=voiceSession;
 voiceIdleTimer=setTimeout(()=>{
  voiceIdleTimer=null;
  if(!voiceModeOn||sessionId!==voiceSession||voiceDraftText()||busy||voiceLoading||(audio&&!audio.paused))return;
  setVoiceMode(false);
  $('chat-notice').textContent='Modo Voz desligado automaticamente após 15 segundos sem fala. Toque em Voz para conversar novamente.';
 },VOICE_IDLE_MS);
}

function voiceDraftText(){return [voiceSavedTranscript,voiceCurrentTranscript].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function voiceUpdateDraft(){const text=voiceDraftText();$('message').value=text;voiceShowSend(!!text)}
function voiceClearDraft(){clearVoiceDraftTimer();voiceSavedTranscript='';voiceCurrentTranscript='';voiceLastInputTime=0;voiceShowSend(false)}
function voiceAbortRecognition(){voiceRequested=false;voiceRecognitionText='';voiceFinalTranscript=false;if(rec){try{rec.abort()}catch{}}}
function voicePause(message){clearVoiceTimer();voiceShowResume(true);voiceStatus(message||'Toque em Retomar para continuar.');if(!voiceIdleTimer)voiceStartIdleCountdown();}
function voiceSubmitDraft(force=false){
 if(!voiceModeOn||!uid)return;
 const text=voiceDraftText();if(!text)return;
 if(!force&&Date.now()-voiceLastInputTime<VOICE_PAUSE_MS-50){voiceScheduleDraftSend();return}
 clearVoiceDraftTimer();clearVoiceTimer();clearVoiceIdleTimer();
 voiceRequested=false;try{if(rec)rec.abort()}catch{}
 const clean=text.replace(/\s*(?:alivi[\s,]+)?(?:pode responder|responda agora|pode enviar)(?:[.!?])?\s*$/iu,'').trim();
 voiceClearDraft();$('message').value=clean;
 if(isVoiceStop(text)){setVoiceMode(false);$('message').value='';$('chat-notice').textContent='Conversa por voz encerrada.';return}
 if(!clean){voiceStatus('🎙 Pode continuar falando.');scheduleVoiceResume(350);return}
 if(busy||syncing){voicePause('Ainda estou processando uma mensagem. Seu texto foi mantido para envio.');return}
 voiceSilenceRetries=0;voiceStatus('Mensagem completa. ALIVI pensando...');void sendChat();
}
function voiceScheduleDraftSend(){
 clearVoiceDraftTimer();if(!voiceModeOn||!voiceDraftText())return;
 const current=voiceSession;
 voiceDraftTimer=setTimeout(()=>{
  voiceDraftTimer=null;if(!voiceModeOn||voiceSession!==current||document.hidden)return;
  voiceSubmitDraft(false);
 },VOICE_PAUSE_MS);
}
function setVoiceMode(enabled){
 const next=!!enabled;voiceSession++;clearVoiceTimer();clearVoiceIdleTimer();voiceClearDraft();voiceResumeTries=0;voiceSilenceRetries=0;
 voiceModeOn=next;voiceShowStop(false);$('speak').checked=next;$('voice-mode-panel').hidden=!next;
 $('main-app').classList.toggle('voice-mode-on',next);
 $('voice-mode-toggle').setAttribute('aria-pressed',String(next));
 $('voice-mode-toggle').textContent=next?'✕ Encerrar voz':'✧ Voz';
 $('voice-mode-toggle').title=next?'Encerrar conversa por voz':'Ativar conversa por voz';
 if(!next){voiceRecognitionFailed=true;voiceAbortRecognition();stopAudio();$('voice-status').textContent='';$('voice-mode-explain').textContent='Pronta para ouvir.';voiceShowResume(false)}
 else{voiceRecognitionFailed=false;voiceShowResume(false);voiceStatus('Ativando microfone...');if(!rec){voicePause('Reconhecimento de voz não disponível neste navegador.');return}startSpeechInput(true);voiceStartIdleCountdown()}
}
$('voice-mode-toggle').addEventListener('click',()=>setVoiceMode(!voiceModeOn));
$('voice-exit').addEventListener('click',()=>setVoiceMode(false));
$('voice-talk').addEventListener('click',()=>{voiceSilenceRetries=0;startSpeechInput(true)});
$('voice-send').addEventListener('click',()=>voiceSubmitDraft(true));
$('voice-replay').addEventListener('click',()=>{if(!lastReply){voiceStatus('Ainda não há resposta para repetir.');return}clearVoiceTimer();voiceAbortRecognition();voiceClearDraft();void say(lastReply,true)});
$('voice-stop').addEventListener('click',()=>{voiceShowStop(false);stopAudio();if(voiceModeOn){voiceStatus('Resposta interrompida. Retomando microfone...');scheduleVoiceResume(500);voiceStartIdleCountdown()}else voiceStatus('Áudio interrompido.')});
// Limitamos tentativas automáticas sem nenhuma fala; pausas com texto são tratadas pelo temporizador.
function scheduleVoiceResume(delay=550){
 if(!voiceModeOn||!uid||!rec||document.hidden)return;
 clearVoiceTimer();const mySession=voiceSession;voiceShowResume(false);
 voiceResumeTimer=setTimeout(()=>{
  voiceResumeTimer=null;
  if(!voiceModeOn||voiceSession!==mySession||document.hidden||!uid)return;
  if(busy||syncing||voiceLoading||(audio&&!audio.paused)||voiceListening||voiceStarting){
   if(++voiceResumeTries<25){scheduleVoiceResume(600)}else voicePause('Toque em Retomar para continuar a conversa.');return;
  }
  voiceResumeTries=0;startSpeechInput(true);
 },delay);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&voiceModeOn)setVoiceMode(false)});
function chatRender(force=true){const target=$('chat-log');const oldTop=target.scrollTop,nearBottom=target.scrollHeight-target.clientHeight-oldTop<70;const visible=visibleMessages();target.replaceChildren();visible.slice(-100).forEach(m=>{const d=document.createElement('div');d.className='bubble '+(m.role==='user'?'user':'alivi');const name=document.createElement('small');name.textContent=m.role==='user'?'VOCÊ':'ALIVI';d.append(name,document.createTextNode(m.text));target.append(d)});document.querySelector('.welcome').hidden=visible.length>0;if(force||nearBottom)scrollLatest();else target.scrollTop=oldTop}
function chatSave(force=true){try{localStorage.setItem(CHATKEY+':'+uid,JSON.stringify(messages.slice(-100)))}catch(e){$('chat-notice').textContent='Não foi possível salvar histórico: '+e.message}chatRender(force);renderDesktopSidebar()}
let audio=null,objectUrl=null,playbackEpoch=0;
function stopAudio(){playbackEpoch++;if(audio){audio.pause();audio.src='';audio=null}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}if('speechSynthesis'in window)speechSynthesis.cancel()}
function getBase(){return DEFAULT_API}
const SB='https://xadzckilujbydycebizj.supabase.co', PUB='sb_publishable_Gm2JW3ns-WmQmFvg3JNXjA_n0VjCDpD', SESSION='alivi-auth-v1';
let session=null, refreshing=null, generation=0;

// 3.10.9 — Perfil opcional, ligado ao próprio usuário autenticado.
// user_metadata é apresentação, NUNCA autorização ou nível de acesso.
let aliviProfile={userId:'',email:'',name:'',avatar:''};
let aliviProfileDraftAvatar='';
function aliviProfileText(value,max){return typeof value==='string'?value.trim().slice(0,max):''}
function aliviAvatarAllowed(value){return typeof value==='string'&&value.length<31000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)?value:''}
function aliviProfileLabel(){return aliviProfile.name||((aliviProfile.email||'').split('@')[0])||'Minha conta'}
function aliviSetAvatar(imgId,initialId,source){
 const pic=$(imgId),initial=$(initialId);
 const okay=aliviAvatarAllowed(source);
 pic.hidden=!okay;initial.hidden=!!okay;
 if(okay){pic.src=okay;pic.onerror=()=>{pic.hidden=true;initial.hidden=false}}else pic.removeAttribute('src');
 initial.textContent=aliviProfileLabel().slice(0,1).toLocaleUpperCase('pt-BR')||'?';
}
function aliviRenderAccountProfile(){
 $('alivi-profile-display-name').textContent=aliviProfileLabel();
 $('alivi-profile-display-email').textContent=aliviProfile.email||'Conta não identificada';
 $('alivi-profile-button').title='Conta conectada: '+(aliviProfile.email||'');
 aliviSetAvatar('alivi-profile-avatar','alivi-profile-initial',aliviProfile.avatar);
}
function aliviLoadAccountProfile(u){
 const m=u&&u.user_metadata&&typeof u.user_metadata==='object'?u.user_metadata:{};
 aliviProfile={userId:u?.id||'',email:u?.email||'',name:aliviProfileText(m.alivi_display_name,45),avatar:aliviAvatarAllowed(m.alivi_avatar_small)};
 aliviRenderAccountProfile();
}
function aliviPreviewProfile(){
 $('alivi-profile-preview-name').textContent=aliviProfileText($('alivi-profile-name-input').value,45)||aliviProfile.email.split('@')[0]||'Minha conta';
 aliviSetAvatar('alivi-profile-photo-preview','alivi-profile-preview-initial',aliviProfileDraftAvatar);
 $('alivi-profile-preview-initial').textContent=($('alivi-profile-preview-name').textContent||'?').charAt(0).toLocaleUpperCase('pt-BR');
}
function aliviOpenProfile(){
 if(!uid||uid!==aliviProfile.userId)return;
 $('alivi-profile-name-input').value=aliviProfile.name;
 $('alivi-profile-account-email').textContent=aliviProfile.email;
 $('alivi-profile-file').value='';
 aliviProfileDraftAvatar=aliviProfile.avatar;
 $('alivi-profile-status').textContent='';$('alivi-profile-status').classList.remove('error');
 aliviPreviewProfile();
 closeMobileDrawer();
 $('alivi-profile-dialog').showModal();
}
function aliviProfileFileData(file){
 return new Promise((resolve,reject)=>{
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))return reject(Error('Escolha uma foto JPG, PNG ou WebP.'));
  if(file.size>8*1024*1024)return reject(Error('A foto deve ter até 8 MB.'));
  const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{
   URL.revokeObjectURL(url);
   try{
    const side=Math.min(img.naturalWidth,img.naturalHeight);
    if(!side)throw Error('Foto inválida.');
    const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Seu navegador não conseguiu preparar a foto.');
    ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,120,120);
    let data=canvas.toDataURL('image/jpeg',.73);
    if(data.length>30000)data=canvas.toDataURL('image/jpeg',.48);
    if(data.length>30000)throw Error('Escolha outra foto: a imagem ficou grande demais.');
    resolve(data);
   }catch(e){reject(e)}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Não foi possível abrir a foto.'))};
  img.src=url;
 });
}
$('alivi-profile-button').addEventListener('click',aliviOpenProfile);
$('alivi-profile-close').addEventListener('click',()=>$('alivi-profile-dialog').close());
$('alivi-profile-name-input').addEventListener('input',aliviPreviewProfile);
$('alivi-profile-remove-photo').addEventListener('click',()=>{aliviProfileDraftAvatar='';$('alivi-profile-file').value='';aliviPreviewProfile()});
$('alivi-profile-file').addEventListener('change',async()=>{
 const input=$('alivi-profile-file'),file=input.files&&input.files[0];if(!file)return;
 const status=$('alivi-profile-status');status.classList.remove('error');status.textContent='Preparando foto...';
 try{aliviProfileDraftAvatar=await aliviProfileFileData(file);aliviPreviewProfile();status.textContent='Foto pronta. Clique em Salvar perfil.'}
 catch(e){input.value='';status.textContent=e.message;status.classList.add('error')}
});
$('alivi-profile-form').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('alivi-profile-save');if(!uid||uid!==aliviProfile.userId)return;
 const expectedUid=uid,g=generation;
 const name=aliviProfileText($('alivi-profile-name-input').value,45),avatar=aliviAvatarAllowed(aliviProfileDraftAvatar);
 const status=$('alivi-profile-status');btn.disabled=true;status.classList.remove('error');status.textContent='Salvando seu perfil...';
 try{
  const token=await getToken();if(!token)throw Error('Entre novamente na sua conta.');
  const response=await fetch(SB+'/auth/v1/user',{method:'PUT',headers:{apikey:PUB,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({data:{alivi_display_name:name,alivi_avatar_small:avatar}})});
  const answer=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(answer.msg||answer.message||answer.error_description||'Não foi possível salvar seu perfil.');
  const updatedUser=answer.user&&answer.user.id?answer.user:answer;
  if(expectedUid!==uid||g!==generation||updatedUser.id!==expectedUid)throw Error('A conta mudou durante a atualização. Entre novamente.');
  aliviLoadAccountProfile(updatedUser);
  aliviProfileDraftAvatar=aliviProfile.avatar;
  status.textContent='Perfil salvo e associado à sua conta!';
  aliviPreviewProfile();
 }catch(error){status.textContent='Não foi possível salvar: '+error.message;status.classList.add('error')}
 finally{btn.disabled=false}
});

async function authRequest(path,body,token){const r=await fetch(SB+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{apikey:PUB,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(d.msg||d.message||d.error_description||'Falha de autenticação: '+r.status);e.status=r.status;throw e}return d}
function saveSession(d){session=d;localStorage.setItem(SESSION,JSON.stringify(d))}
async function getToken(){if(!session)return '';if(Number(session.expires_at||0)<Date.now()/1000+90){if(!refreshing)refreshing=(async()=>{const g=generation;try{const d=await authRequest('token?grant_type=refresh_token',{refresh_token:session.refresh_token});if(g!==generation)return '';saveSession(d);return d.access_token}catch(e){if(g===generation&&[400,401,403].includes(e.status))lock();throw e}finally{refreshing=null}})();return refreshing}return session.access_token}
function readList(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function lock(){setVoiceMode(false);generation++;noticeFilter='all';$('alerts-list').replaceChildren();$('notice-status').textContent='';$('memory-list').replaceChildren();$('memory-status').textContent='';$('memory-only').checked=false;session=null;uid='';resetManagement();resetAgenda();projects=[];associations=Object.create(null);activeProject='';clearSuggestion();$('suggest-memory').checked=false;localStorage.removeItem(SESSION);notes=[];messages=[];lastReply='';stopAudio();$('message').value='';$('title').value='';$('content').value='';$('feedback-list').replaceChildren();$('feedback-body').value='';aliviProfile={userId:'',email:'',name:'',avatar:''};aliviProfileDraftAvatar='';if($('alivi-profile-dialog').open)$('alivi-profile-dialog').close();aliviRenderAccountProfile();$('main-app').hidden=true;$('auth-screen').hidden=false;$('auth-status').textContent='Entre na sua conta.';render();chatRender()}
async function enter(){const token=await getToken();if(!token)throw Error('Entre na sua conta');const u=await authRequest('user',null,token);if(!u.id||!u.email_confirmed_at)throw Error('Confirme seu e-mail antes de entrar.');uid=u.id;aliviLoadAccountProfile(u);loadAgenda();loadManagement();loadProjects();notes=readList(KEY+':'+uid);messages=readList(CHATKEY+':'+uid);lastReply=[...visibleMessages()].reverse().find(m=>m.role==='assistant'&&!m.text.startsWith('Não consegui'))?.text||'';$('api-status').textContent='Conectado: '+u.email;$('auth-screen').hidden=true;$('main-app').hidden=false;$('chat-notice').textContent='ALIVI conectada. Pesquisa opcional.';render();chatRender();go('home');await syncChat(true);syncManagement();renderAlerts();if(new URLSearchParams(location.search).get('page')==='alerts'){go('alerts');history.replaceState(null,'',location.pathname)}}
async function login(signup){const email=$('email').value.trim(),password=$('password').value;if(!$('auth-form').reportValidity())return;$('login').disabled=$('signup').disabled=true;try{$('auth-status').textContent='Aguarde...';const d=await authRequest(signup?'signup?redirect_to='+encodeURIComponent('https://alivi-ia.github.io/alivi-mobile/'):'token?grant_type=password',{email,password});$('password').value='';if(signup&&!d.access_token){$('auth-status').textContent='Cadastro solicitado. Confirme o e-mail e depois entre com sua senha.';return}saveSession(d);await enter()}catch(e){$('auth-status').textContent=e.message}finally{$('login').disabled=$('signup').disabled=false}}
$('auth-form').onsubmit=e=>{e.preventDefault();login(false)};$('signup').onclick=()=>login(true);
async function restore(){sessionStorage.removeItem(TOKENKEY);if(location.hash.includes('access_token=')||location.hash.includes('error='))history.replaceState(null,'',location.pathname+location.search);try{session=JSON.parse(localStorage.getItem(SESSION)||'null');if(session)await enter();else $('auth-status').textContent='Entre na sua conta.'}catch(e){$('auth-status').textContent='Não foi possível restaurar a sessão: '+e.message}}
let readyText='',voiceLoading=false;
async function say(text,manual=false){
 if(!manual&&(!voiceModeOn||!$('speak').checked))return;
 if(voiceLoading)return;
 const g=generation,turn=voiceSession;
 if(voiceModeOn){clearVoiceTimer();clearVoiceIdleTimer();voiceAbortRecognition();voiceShowResume(false)}
 if(manual&&audio&&readyText===text){
  try{audio.currentTime=0;await audio.play();voiceShowStop(true);voiceStatus('🔊 ALIVI falando...')}
  catch{voicePause('Áudio bloqueado. Toque em Repetir para ouvir ou Retomar para continuar.')}return;
 }
 voiceLoading=true;
 try{
  const token=await getToken();if(!token)throw Error('Sessão indisponível');
  stopAudio();const epoch=playbackEpoch;
  voiceStatus('🔊 Preparando resposta...');
  const r=await fetch(getBase()+'/speech',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({text:text.slice(0,3000)})});
  if(!r.ok)throw Error('HTTP '+r.status);
  const blob=await r.blob();
  if(g!==generation||epoch!==playbackEpoch||(voiceModeOn&&turn!==voiceSession)||(!manual&&!voiceModeOn))return;
  objectUrl=URL.createObjectURL(blob);audio=new Audio(objectUrl);readyText=text;
  audio.onended=()=>{voiceShowStop(false);if(voiceModeOn&&turn===voiceSession){voiceStatus('🎙 Sua vez! Aguardo até 15 segundos para você continuar falando.');scheduleVoiceResume(450);voiceStartIdleCountdown()}else voiceStatus('')};
  audio.onerror=()=>{voiceShowStop(false);if(voiceModeOn)voicePause('Falha no áudio. Toque em Retomar para continuar.')};
  try{await audio.play();voiceShowStop(true);voiceStatus('🔊 ALIVI falando...')}
  catch{voiceShowStop(false);voicePause('Reprodução bloqueada pelo navegador. Toque em Repetir ou Retomar.')}
 }catch(e){if(voiceModeOn&&turn===voiceSession)voicePause('Não foi possível reproduzir a resposta. Toque em Retomar.');else voiceStatus('Voz indisponível: '+e.message)}
 finally{voiceLoading=false}
}
function localReply(q){const t=q.toLowerCase();if(t.includes('nota'))return 'Suas notas estão na aba Notas. Você tem '+notes.length+' nota(s) salva(s) neste aparelho.';return 'Para conversar com a ALIVI, configure seu token em Ajustes → Chat e voz.'}
let lastReply='';
// Memory operations: scope every request to the authenticated account.
function normalizeMemory(v){return String(v||'').normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').replace(/[.!?;:,]+$/u,'').trim()}
// 3.10.10 — Comandos naturais de memória, exigindo pedido explícito.
// Evita transformar perguntas normais e avisos de agenda em memórias.
const memoryCommand=/\b(?:memorize|memorizar|memoriza|lembre[- ]?se(?:\s+de)?|lembre\s+(?:de|que)|(?:guarde|guardar|guarda|salve|salvar|salva|anote|anotar|anota|registre|registrar)\s+(?:(?:isso|esta\s+informa[cç][aã]o|esse\s+detalhe)\s+)?(?:na|em)\s+(?:(?:minha|sua)\s+)?mem[oó]ria)\b/iu;
function memoryFact(q){
 const s=String(q||'').trim();
 if(/\b(?:n[aã]o|nunca)\s+(?:(?:quero|gostaria)\s+que\s+)?(?:memorize|memorizar|memoriza|guarde|guardar|salve|salvar|anote|registre|lembre)/iu.test(s))return '';
 const m=memoryCommand.exec(s);if(!m)return '';
 const after=s.slice(m.index+m[0].length).replace(/^\s*(?:[:,;–-]\s*)?(?:de\s+que\s+|que\s+)?/iu,'').trim();
 const before=s.slice(0,m.index).replace(/[,;:.\s]+$/u,'').replace(/^(?:oi\s*)?alivi[,!?\s]*/iu,'').trim();
 const fact=(after||before).replace(/\s*[,;]?\s*(?:por favor|por gentileza)\s*[.!?]*$/iu,'').trim();
 return /^(?:isso|esta informa[cç][aã]o|esse detalhe)$/iu.test(fact)?'':fact;
}
function canonical(v){return normalizeMemory(memoryFact(v)||v)}
function memoryScope(){if(!uid)throw Error('Entre na sua conta');return 'user_id=eq.'+encodeURIComponent(uid)}
async function readMemories(limit=100){const all=[];for(let offset=0;offset<10000;offset+=100){const rows=await db('user_memory','GET',memoryScope()+'&select=id,memory_key,memory_value&order=updated_at.desc,id.desc&limit='+Math.min(100,limit-all.length)+'&offset='+offset);all.push(...rows);if(rows.length<100||all.length>=limit)return all}throw Error('Limite de consulta de memórias atingido')}
async function storeMemory(fact,g){const value=fact.trim();if(!value||value.length>1000)throw Error('Informe uma memória de até 1000 caracteres.');const key='explicit:'+canonical(value);const rows=await readMemories(10000);if(g!==generation)throw Error('Sessão alterada');if(rows.some(r=>canonical(r.memory_value)===canonical(value)||r.memory_key===key))return 'Esta memória já está salva no banco de dados.';await db('user_memory','POST','on_conflict=user_id,memory_key',{memory_key:key,memory_value:value},true);if(g!==generation)throw Error('Sessão alterada');const saved=await db('user_memory','GET',memoryScope()+'&select=id,memory_value&memory_key=eq.'+encodeURIComponent(key));if(!saved.some(r=>canonical(r.memory_value)===canonical(value)))throw Error('Gravação não confirmada pelo banco');return 'Memória salva no banco de dados.'}
async function editMemory(row,g){const value=prompt('Edite a informação salva. O histórico não será alterado.',row.memory_value);if(value===null||g!==generation)return;const fact=(memoryFact(value)||value).trim();if(!fact||fact.length>1000)throw Error('Informe uma memória de até 1000 caracteres.');const key='explicit:'+canonical(fact);const rows=await readMemories(10000);if(g!==generation)return;if(rows.some(r=>r.id!==row.id&&(canonical(r.memory_value)===canonical(fact)||r.memory_key===key)))throw Error('Já existe outra memória com essa informação.');await db('user_memory','PATCH',memoryScope()+'&id=eq.'+encodeURIComponent(row.id),{memory_key:key,memory_value:fact},true);if(g!==generation)return;const saved=await db('user_memory','GET',memoryScope()+'&id=eq.'+encodeURIComponent(row.id)+'&select=memory_value,memory_key');if(g!==generation)return;if(saved.length!==1||saved[0].memory_value!==fact||saved[0].memory_key!==key)throw Error('Edição não confirmada pelo banco');await showMemories();if(g===generation)$('memory-status').textContent='Memória atualizada no banco de dados.'}
function memoryWords(text){return new Set(normalizeMemory(text).normalize('NFD').replace(/\p{M}/gu,'').match(/[\p{L}\p{N}]{3,}/gu)?.filter(w=>!['que','com','uma','para','qual','meu','minha','voce','sobre','das','dos','como','este','essa','isso','mais','alivi','memorize','salvas'].includes(w))||[])}
function contextualMemories(rows,q,history){const terms=memoryWords(q), recent=memoryWords(history.slice(-4).map(m=>m.text).join(' '));const unique=[...new Map([...rows].reverse().map(m=>[canonical(m.memory_value),m])).values()].reverse();return unique.map((m,i)=>{const words=memoryWords(m.memory_value);let score=0;for(const w of words){if(terms.has(w))score+=4;else if(recent.has(w))score++}return {m,i,score}}).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,30).map(x=>x.m)}
async function showMemories(){const g=generation;const target=$('memory-list');target.textContent='Carregando...';try{const rows=await readMemories(10000);if(g!==generation)return;target.replaceChildren();if(!rows.length)target.textContent='Nenhuma memória salva.';const seen=new Set();for(const row of rows){const item=document.createElement('div');item.className='item';const p=document.createElement('p');p.textContent=row.memory_value;const k=canonical(row.memory_value);if(seen.has(k)){const tag=document.createElement('small');tag.textContent='Possível duplicata de registro anterior';item.append(tag)}seen.add(k);const b=document.createElement('button');b.className='secondary';b.textContent='Excluir memória';b.onclick=async()=>{if(g!==generation||!confirm('Excluir esta memória salva? O histórico de conversa não será apagado.'))return;b.disabled=true;try{await db('user_memory','DELETE',memoryScope()+'&id=eq.'+encodeURIComponent(row.id),undefined,true);if(g!==generation)return;const remaining=await db('user_memory','GET',memoryScope()+'&id=eq.'+encodeURIComponent(row.id)+'&select=id');if(remaining.length)throw Error('Exclusão não confirmada pelo banco');await showMemories()}catch(e){if(g===generation){alert(e.message);b.disabled=false}}};const edit=document.createElement('button');edit.className='secondary';edit.textContent='Editar memória';edit.onclick=async()=>{if(busy||g!==generation)return;busy=true;edit.disabled=b.disabled=true;try{await editMemory(row,g)}catch(e){if(g===generation)alert(e.message)}finally{busy=false;edit.disabled=b.disabled=false}};item.append(p,edit,b);target.append(item)}}catch(e){if(g===generation)target.textContent=e.message}}
$('show-memory').onclick=showMemories;

let busy=false,syncing=false;
// Um teste de ida e volta no banco, limitado à conta atual.
// Não substitui uma auditoria RLS nem demonstra isolamento entre contas.
$('memory-test').onclick=async()=>{
 if(!uid||busy)return;
 if(!confirm('Fazer um teste da memória nesta conta? A ALIVI criará um registro temporário, verificará a leitura e tentará excluí-lo em seguida.'))return;
 const b=$('memory-test'),status=$('memory-test-status');
 const g=generation,account=uid;
 const fact='TESTE TEMPORÁRIO ALIVI '+crypto.randomUUID();
 const key='explicit:'+canonical(fact);
 b.disabled=true;busy=true;status.textContent='Verificando gravação, leitura e exclusão nesta conta...';
 let created=false,deleted=false;
 try{
  const result=await storeMemory(fact,g);
  if(g!==generation||account!==uid)return;
  created=true;
  if(!/Memória salva no banco/.test(result))throw Error('O registro de teste não foi criado: '+result);
  const found=await db('user_memory','GET',memoryScope()+'&memory_key=eq.'+encodeURIComponent(key)+'&select=id,memory_value');
  if(g!==generation||account!==uid)return;
  if(found.length!==1||found[0].memory_value!==fact)throw Error('A leitura de volta não confirmou a memória.');
  await db('user_memory','DELETE',memoryScope()+'&id=eq.'+encodeURIComponent(found[0].id));
  const check=await db('user_memory','GET',memoryScope()+'&memory_key=eq.'+encodeURIComponent(key)+'&select=id');
  if(g!==generation||account!==uid)return;
  if(check.length)throw Error('O registro de teste não foi excluído do banco.');
  deleted=true;
  status.textContent='✓ Gravação, leitura e exclusão confirmadas nesta conta. Para verificar a privacidade, compare com outra conta e conclua a auditoria do banco.';
 }catch(e){
  if(g===generation&&account===uid)status.textContent='Teste incompleto: '+e.message+(created&&!deleted?' Se o registro temporário permanecer, você pode excluí-lo em “Ver memórias salvas”.':'');
 }finally{busy=false;b.disabled=false}
};

async function db(table,method='GET',query='',body,representation=false,merge=false){const token=await getToken();if(!token)throw Error('Sessão indisponível');const r=await fetch(SB+'/rest/v1/'+table+'?'+query,{method,headers:{apikey:PUB,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:(method==='POST'?(merge?'resolution=merge-duplicates,':'resolution=ignore-duplicates,'):'')+(representation?'return=representation':'return=minimal')},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok){const detail=await r.json().catch(()=>({}));throw Error('Sincronização HTTP '+r.status+(detail.code?' ('+detail.code+')':'')+(detail.message?' — '+String(detail.message).slice(0,180):''));}return method==='GET'||representation?await r.json():null}
function stamp(m){return {...m,id:m.id||crypto.randomUUID(),created_at:m.created_at||new Date().toISOString()}}
async function syncChat(initial=false){if(!uid||syncing||busy)return;syncing=true;const g=generation;try{if(initial){const old=messages.filter(m=>!m.id).map(stamp);if(old.length){messages=messages.filter(m=>m.id).concat(old);chatSave();await db('chat_messages','POST','on_conflict=id',old.map(m=>({id:m.id,role:m.role,content:m.text,created_at:m.created_at})))}}const rows=await db('chat_messages','GET','select=id,role,content,created_at&order=created_at.desc,id.desc&limit=100');if(g!==generation)return;const next=rows.reverse().map(r=>({id:r.id,role:r.role,text:r.content,created_at:r.created_at}));const changed=JSON.stringify(next)!==JSON.stringify(messages);messages=next;if(changed)chatSave(initial);else if(initial)scrollLatest();lastReply=[...visibleMessages()].reverse().find(m=>m.role==='assistant')?.text||'';$('chat-notice').textContent='Tudo atualizado.'}catch(e){if(g===generation)$('chat-notice').textContent='Histórico local preservado. '+e.message}finally{syncing=false}}
setInterval(()=>{if(!document.hidden)syncChat()},10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncChat()});
async function sendChat(){
 const q=$('message').value.trim();
 if(!q||busy||syncing||!uid)return;
 if(/^(?:alivi[,!\s]+)?(?:quero|gostaria de|preciso|pode|abra|abrir|vou)?\s*(?:enviar|mandar|registrar|fazer|abrir)?\s*(?:um|uma)?\s*(?:feedback|sugest[aã]o|reclama[cç][aã]o|relat[oa]r? problema)(?:\s+(?:para|à|a)\s+(?:equipe|alivi))?[.!?]?$/iu.test(q)){
  if(voiceModeOn)setVoiceMode(false);
  $('message').value='';go('feedback');await loadFeedbackMine();return;
 }
 if(voiceModeOn&&voiceDraftText()){
  clearVoiceDraftTimer();voiceRequested=false;
  try{if(rec)rec.abort()}catch{}
  voiceClearDraft();
 }
 busy=true;if(voiceModeOn)clearVoiceIdleTimer();
 const g=generation;
 const isReminder=isReminderIntent(q);
 $('send').disabled=true;$('chat-notice').textContent=isReminder?'Conferindo lembrete e sincronização...':'Consultando ALIVI...';
 let questionRecorded=false;
 try{
  const token=await getToken();if(!token)throw Error('Sua sessão expirou. Entre novamente.');
  if(g!==generation)return;
  const project=activeProject;
  const history=($('memory-only').checked?[]:visibleMessages().slice(-20)).map(m=>({role:m.role,text:m.text.slice(0,1500)}));
  // Um lembrete local não depende da disponibilidade da API de IA/memória.
  let memory=isReminder?[]:await readMemories(10000);
  if(g!==generation)return;
  const user=stamp({role:'user',text:q});
  try{
   await db('chat_messages','POST','on_conflict=id',{id:user.id,role:user.role,content:q,created_at:user.created_at});
  }catch(e){if(!isReminder)throw e;}
  if(g!==generation)return;
  $('message').value='';
  associate(user,project);messages.push(user);maybeTitleNewChat(project,q);chatSave();questionRecorded=true;
  let memoryStatus='',directReply='';
  const fact=isReminder?'':memoryFact(q);
  if(isReminder){
   await syncManagement();
   if(g!==generation)return;
   directReply=await reminderCommand(q);
   if(!directReply)directReply='Não consegui entender o pedido de lembrete. Diga: “Me avise de beber água daqui a 5 minutos”.';
  }else if(!fact){
   await syncManagement();
   if(g!==generation)return;
   directReply=extendedManagement(q)||managementCommand(naturalCommand(q))||agendaCommand(q);
   if(directReply&&/^(?:registrado|compromisso atualizado|tarefa concluída|lançamento atualizado|conta registrada|conta liquidada)/iu.test(directReply)){
    await syncManagement();
    if(g!==generation)return;
    directReply=directReply.replace('Registrado neste aparelho:','Registrado:').replace('Registrado na agenda:','Registrado:').replace(' Sincronização pendente até confirmação no painel de alertas.','');
    if(Object.keys(pending).length)directReply+=' (Envio pendente; confira em Alertas.)';
   }
  }
  if(fact){
   try{memoryStatus=await storeMemory(fact,g);memory=await readMemories(10000);directReply=memoryStatus+' Informação: '+fact;}
   catch(e){memoryStatus='Memória não salva: '+e.message;directReply=memoryStatus;}
  }else if(!isReminder&&!directReply&&/\b(?:mostre|liste|exiba|consulte|quais)\b[\s\S]*\bmem[oó]rias?\b[\s\S]*\b(?:salvas?|permanentes?)\b/iu.test(q)){
   const rows=await readMemories(10000);
   directReply=rows.length?'Memórias salvas ('+rows.length+'):\n'+rows.map((r,i)=>(i+1)+'. '+r.memory_value).join('\n'):'Nenhuma memória salva.';
  }
  if(g!==generation)return;
  $('memory-status').textContent=memoryStatus;
  let data;
  if(directReply)data={reply:directReply,searched:false};
  else{
   const uniqueMemory=contextualMemories(memory,q,history);
   const r=await fetch(getBase()+'/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({message:q,search:$('search-web').checked,auto_search:true,history,memory:uniqueMemory.slice(0,30).map(m=>m.memory_value.slice(0,1000))})});
   data=await r.json().catch(()=>({}));
   if(!r.ok||!data.reply){const detail=typeof data.detail==='string'?data.detail:typeof data.message==='string'?data.message:'Serviço de IA temporariamente indisponível';throw Error(detail+' (HTTP '+r.status+').');}
  }
  if(g!==generation)return;
  const answer=stamp({role:'assistant',text:data.reply});
  let answerSynced=true;
  try{await db('chat_messages','POST','on_conflict=id',{id:answer.id,role:answer.role,content:answer.text,created_at:answer.created_at})}
  catch(e){answerSynced=false;}
  if(g!==generation)return;
  associate(answer,project);messages.push(answer);lastReply=answer.text;chatSave();
  $('chat-notice').textContent=answerSynced?(data.searched?'Pesquisa realizada.':'Resposta concluída.'):'Resposta exibida; histórico ainda não sincronizado.';
  if(voiceModeOn)void say(answer.text,false);
  if(!directReply)suggestPreference(q,memory);
 }catch(e){
  if(g===generation){
   $('chat-notice').textContent='Falha: '+e.message+' Confira a conexão e tente novamente.';
   if(!questionRecorded&&!$('message').value.trim())$('message').value=q;
   if(voiceModeOn)voicePause('Houve uma falha. Confira a mensagem na tela e toque em Retomar para continuar.');
  }
 }finally{
  busy=false;$('send').disabled=false;
  if(g===generation)syncChat();
  if(voiceModeOn&&!voiceIdleTimer&&!voiceLoading&&!voiceDraftText()&&(!audio||audio.paused))voiceStartIdleCountdown();
 }
}
$('send').onclick=sendChat;$('message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}});
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null;
if(Recognition){
 rec=new Recognition();rec.lang='pt-BR';rec.interimResults=true;rec.continuous=false;
 rec.onstart=()=>{
  voiceStarting=false;voiceListening=true;voiceRecognitionFailed=false;voiceLastError='';
  voiceFinalTranscript=false;voiceRecognitionText='';
  voiceStatus(voiceModeOn?'🎙 Ouvindo. Pode fazer pausas; aguardo 6 segundos antes de enviar.':'🎙 Ouvindo... Pode falar.');
  voiceShowResume(false);$('mic').disabled=true;$('voice-talk').disabled=true;
 };
 rec.onresult=e=>{
  let partial='',final='';
  for(let i=0;i<e.results.length;i++){const part=e.results[i][0]?.transcript||'';partial+=part+' ';if(e.results[i].isFinal)final+=part+' '}
  if(voiceModeOn){
   if(!voiceRequested)return;
   const next=partial.trim();
   if(next&&next!==voiceCurrentTranscript){
    voiceCurrentTranscript=next;voiceRecognitionText=final.trim();voiceFinalTranscript=!!final.trim();
    voiceLastInputTime=Date.now();voiceSilenceRetries=0;clearVoiceIdleTimer();
    voiceUpdateDraft();voiceScheduleDraftSend();
    voiceStatus('🎙 Pode continuar. A ALIVI aguarda sua pausa para enviar.');
    if(isVoiceStop(voiceDraftText())||/\b(?:alivi[\s,]+)?(?:pode responder|responda agora|pode enviar)[.!?]?\s*$/iu.test(next))voiceSubmitDraft(true);
   }
  }else{$('message').value=partial.trim();if(final.trim()){voiceRecognitionText=final.trim();voiceFinalTranscript=true}}
 };
 rec.onerror=e=>{
  voiceRecognitionFailed=true;voiceStarting=false;voiceLastError=e.error||'unknown';
  const problem=({'not-allowed':'Permita o microfone nas configurações do navegador.','service-not-allowed':'Reconhecimento bloqueado pelo navegador.','audio-capture':'Microfone indisponível.','no-speech':'Não ouvi sua fala.','network':'Reconhecimento indisponível na rede.','aborted':'Escuta interrompida.'})[e.error]||'Microfone: '+e.error;
  if(voiceModeOn&&e.error==='no-speech'){
   if(!voiceDraftText())voiceSilenceRetries++;
   if(voiceSilenceRetries>2)voicePause('Não ouvi sua fala. Toque em Retomar quando quiser continuar.');
  }else if(voiceModeOn&&e.error!=='aborted')voicePause(problem+' Toque em Retomar.');
  else if(!voiceModeOn&&e.error!=='aborted')voiceStatus(problem);
 };
 rec.onend=()=>{
  voiceListening=false;voiceStarting=false;$('mic').disabled=false;$('voice-talk').disabled=false;
  const shouldProcess=voiceRequested;voiceRequested=false;
  if(!shouldProcess)return;
  if(voiceModeOn){
   // O navegador encerra sessões após silêncio: nunca enviamos aqui.
   if(voiceCurrentTranscript){
    voiceSavedTranscript=[voiceSavedTranscript,voiceCurrentTranscript].filter(Boolean).join(' ').trim();
    voiceCurrentTranscript='';voiceUpdateDraft();
   }
   if(voiceLastError&&voiceLastError!=='no-speech'&&voiceLastError!=='aborted')return;
   if(!voiceDraftText()&&voiceSilenceRetries>2){voicePause('Toque em Retomar quando quiser conversar.');return}
   if(voiceDraftText())voiceStatus('🎙 Pausa detectada. Pode continuar falando; sua mensagem ainda não foi enviada.');
   scheduleVoiceResume(350);
  }else if(!voiceRecognitionFailed)voiceStatus('Ditado concluído. Confira e envie a mensagem.');
 };
}else $('mic').title='Reconhecimento de voz indisponível neste navegador';
function startSpeechInput(automatic=false){
 if(!rec){voiceStatus('Este navegador não oferece reconhecimento de fala. Use o teclado.');return}
 if(voiceStarting||voiceListening)return;
 if(busy||syncing||voiceLoading){if(voiceModeOn)voicePause('Ainda estou respondendo. Toque em Retomar em instantes.');return}
 if(automatic&&(!voiceModeOn||document.hidden))return;
 clearVoiceTimer();stopAudio();voiceShowResume(false);
 voiceRecognitionFailed=false;voiceFinalTranscript=false;voiceRecognitionText='';voiceLastError='';voiceRequested=true;voiceStarting=true;
 // continuous melhora o Chrome no computador, mas o Android pode ignorar esta opção;
 // quando o navegador encerrar mesmo assim, onend preserva o texto e retoma a escuta.
 rec.continuous=!!voiceModeOn;
 if(!voiceModeOn)$('message').value='';
 try{rec.start()}catch(e){voiceStarting=false;voiceRequested=false;voicePause('Microfone não iniciou. Toque em Retomar: '+e.message)}
}
$('mic').onclick=()=>startSpeechInput(false);
$('repeat-voice').onclick=()=>{if(lastReply)say(lastReply,true);else voiceStatus('Ainda não há resposta para reproduzir.')};
$('attach').onclick=()=>{$('chat-notice').textContent='Anexos ainda não estão disponíveis nesta versão.'};
$('clear-token').onclick=async()=>{const t=session?.access_token;try{await unregisterRemotePush()}catch{}lock();if(t)try{await fetch(SB+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:PUB,Authorization:'Bearer '+t}})}catch{}};
$('clear-chat').onclick=async()=>{if(!uid||busy||syncing||!confirm('Apagar conversas sincronizadas em todos os aparelhos?'))return;busy=true;try{await db('chat_messages','DELETE','user_id=eq.'+encodeURIComponent(uid));messages=[];associations=Object.create(null);saveProjects();lastReply='';chatSave();stopAudio()}catch(e){alert(e.message)}finally{busy=false}};chatRender();
async function update(){go('settings');const st=$('updateStatus');st.textContent='Verificando atualização...';try{const response=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('Servidor indisponível');const v=await response.json();if(!v.version||typeof v.version!=='string')throw Error('Versão inválida');const reg=await navigator.serviceWorker?.getRegistration();if(reg){await reg.update();if(reg.waiting){st.textContent='Atualização encontrada. Aplicando...';reg.waiting.postMessage({type:'SKIP_WAITING'});setTimeout(()=>location.reload(),1200);return}}if(v.version!==VERSION){st.textContent='Versão '+v.version+' disponível. Reabrindo para carregar...';setTimeout(()=>location.reload(),1200)}else st.textContent='ALIVI atualizada: '+v.version+'.'}catch(e){st.textContent='Não foi possível verificar: '+e.message;st.classList.add('error')}}
$('update').onclick=update;$('menu-update').onclick=update;render();if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{})}navigator.serviceWorker?.addEventListener('controllerchange',()=>location.reload());


// Agenda local, isolated by authenticated account. No cloud schema changes.
const AGENDAKEY='alivi-mobile-agenda-v1';
let agenda=[],agendaEditing='';
function localDay(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function validDay(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v}
function validTask(t){return t&&typeof t.id==='string'&&t.id.length<=100&&typeof t.title==='string'&&t.title.trim().length>0&&t.title.length<=160&&validDay(t.date)&&typeof t.time==='string'&&(!t.time||/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time))&&typeof t.done==='boolean'}
function resetAgenda(){agenda=[];agendaEditing='';$('agenda-form').reset();$('agenda-filter').value='pending';$('agenda-list').replaceChildren();$('agenda-summary').textContent='';$('agenda-save').textContent='Adicionar';$('agenda-cancel').hidden=true}
function loadAgenda(){resetAgenda();agenda=readList(AGENDAKEY+':'+uid).filter(validTask);$('agenda-date').value=localDay()}
function saveAgenda(next){if(!uid)return false;const previous=agenda,oldQueue={...pending};try{agenda=next;queueChanges('agenda',previous,next)}catch(e){agenda=previous;pending=oldQueue;alert('Não foi possível salvar a agenda: '+e.message);return false}try{localStorage.setItem(AGENDAKEY+':'+uid,JSON.stringify(next))}catch{}renderAgenda();renderAlerts();return true}
function cancelAgendaEdit(){agendaEditing='';$('agenda-form').reset();$('agenda-date').value=localDay();$('agenda-save').textContent='Adicionar';$('agenda-cancel').hidden=true}
function renderAgenda(){const list=$('agenda-list');list.replaceChildren();if(!uid)return;const today=localDay();const pending=agenda.filter(t=>!t.done);$('agenda-summary').textContent='Hoje: '+pending.filter(t=>t.date===today).length+' • Atrasadas: '+pending.filter(t=>t.date<today).length+' • Pendentes: '+pending.length;const mode=$('agenda-filter').value;const rows=agenda.filter(t=>mode==='all'||(mode==='done'?t.done:!t.done)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));if(!rows.length)list.textContent='Nenhum registro nesta seleção.';for(const t of rows){const row=document.createElement('div');row.className='item';const heading=document.createElement('b');heading.textContent=t.title;const date=document.createElement('p');date.textContent=t.date.split('-').reverse().join('/')+(t.time?' às '+t.time:'')+(t.done?' — Concluída':t.date<today?' — Atrasada':'');row.append(heading,date);for(const [label,action] of [[t.done?'Reabrir':'Concluir',()=>saveAgenda(agenda.map(x=>x.id===t.id?{...x,done:!x.done}:x))],['Editar',()=>{agendaEditing=t.id;$('agenda-title').value=t.title;$('agenda-date').value=t.date;$('agenda-time').value=t.time;$('agenda-save').textContent='Salvar edição';$('agenda-cancel').hidden=false;$('agenda-title').focus()}],['Excluir',()=>{if(confirm('Excluir este registro da agenda?')&&saveAgenda(agenda.filter(x=>x.id!==t.id))&&agendaEditing===t.id)cancelAgendaEdit()}]]){const b=document.createElement('button');b.className='secondary';b.textContent=label;b.onclick=action;row.append(b)}list.append(row)}}
$('agenda-form').onsubmit=e=>{e.preventDefault();if(!uid)return;const old=agenda.find(t=>t.id===agendaEditing);const t={...(old||{}),id:old?.id||crypto.randomUUID(),title:$('agenda-title').value.trim(),date:$('agenda-date').value,time:$('agenda-time').value,done:old?.done||false};if(!validTask(t)){alert('Confira título, data e horário.');return}if(saveAgenda(old?agenda.map(x=>x.id===old.id?t:x):[...agenda,t]))cancelAgendaEdit()};
$('agenda-cancel').onclick=cancelAgendaEdit;$('agenda-filter').onchange=renderAgenda;
$('agenda-export').onclick=()=>{if(!uid)return;const url=URL.createObjectURL(new Blob([JSON.stringify({format:AGENDAKEY,agenda},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='alivi_agenda_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('agenda-import').onchange=async e=>{const file=e.target.files[0],g=generation;try{if(!file||!uid)return;if(file.size>5000000)throw Error('Arquivo muito grande');const data=JSON.parse(await file.text());if(g!==generation)return;if(data.format!==AGENDAKEY||!Array.isArray(data.agenda)||data.agenda.length>10000||!data.agenda.every(validTask)||new Set(data.agenda.map(t=>t.id)).size!==data.agenda.length)throw Error('Backup inválido');if(confirm('Substituir a agenda local pelo backup?')&&saveAgenda(data.agenda))cancelAgendaEdit()}catch(err){alert(err.message)}finally{e.target.value=''}};


// Agenda por conversa: comandos locais determinísticos, sem promessas do modelo.
function agendaDay(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function agendaDateLabel(d){return d.split('-').reverse().join('/')}
function agendaNorm(t){return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ')}
function agendaTimeDate(text){let date='',time='',rest=text.trim();let m=rest.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?|hoje|amanh[ãa])(?=\s|[.,!?;:]|$)/iu);if(m){const v=agendaNorm(m[0]);if(v==='hoje'||v==='amanha')date=agendaDay(v==='amanha'?1:0);else if(v.includes('/')){const [day,month,year]=v.split('/');date=(year||localDay().slice(0,4))+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0')}else date=v;rest=rest.replace(m[0],' ').trim()}
 m=rest.match(/(?:(?:^|\s)(?:[àa]s)\s*(\d{1,2})(?:[:h](\d{2}))?\s*h?(?!\d)|\b(\d{1,2})[:h](\d{2})\b|\b(\d{1,2})h\b)/iu);if(m){const h=Number(m[1]||m[3]||m[5]),min=Number(m[2]||m[4]||0);if(h>23||min>59)return {error:'Horário inválido.'};time=String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');rest=rest.replace(m[0],' ').trim()}
 if(date&&!validDay(date))return {error:'Data inválida.'};return {date,time,title:rest.replace(/\s+/g,' ').replace(/\s+(?:para|no dia|dia|em)\s*$/iu,'').trim().replace(/^[\s:,-]+|[\s.,!?-]+$/g,'')};}
function agendaCommand(q){const t=q.trim().replace(/^alivi[,!:]?\s*/iu,'');let m;
 if(/^(?:liste|mostre|consulte|exiba|qual [ée]|quais (?:s[ãa]o|sao))\b/iu.test(t)&&/\b(?:agenda|tarefas|compromissos)\b/iu.test(t)){const normalized=agendaNorm(t);const day=/\bamanha\b/.test(normalized)?agendaDay(1):/\bhoje\b/.test(normalized)?agendaDay():'';const rows=agenda.filter(x=>!x.done&&(!day||x.date===day)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));return rows.length?'Agenda — '+(day?agendaDateLabel(day):'pendências')+':\n'+rows.slice(0,100).map((x,i)=>`${i+1}. ${x.title} — ${agendaDateLabel(x.date)}${x.time?' às '+x.time:''}`).join('\n'):'Não há compromissos pendentes nesta seleção.'}
 if((m=t.match(/^(?:conclu(?:ir|a|[íi]))\s+(?:(?:a|minha)\s+)?(?:tarefa\s*:?\s*)?(.+)$/iu))){const name=agendaNorm(m[1].replace(/[.!?]$/,''));const rows=agenda.filter(x=>!x.done&&agendaNorm(x.title)===name);if(rows.length!==1)return rows.length?'Encontrei mais de uma tarefa com esse título. Conclua a desejada na aba Agenda.':'Não encontrei uma tarefa pendente com esse título exato.';return saveAgenda(agenda.map(x=>x.id===rows[0].id?{...x,done:true}:x))?'Tarefa concluída na agenda: '+rows[0].title+'.':'Não consegui concluir a tarefa.'}
 if((m=t.match(/^(?:reagende|remarque)\s+(.+)$/iu))){const v=agendaTimeDate(m[1]);if(v.error)return v.error;if(!v.date)return 'Informe a nova data, por exemplo: Reagende reunião para amanhã às 10h.';const rows=agenda.filter(x=>!x.done&&agendaNorm(x.title)===agendaNorm(v.title));if(rows.length!==1)return 'Não encontrei exatamente um compromisso com esse título. Confira na aba Agenda.';const next={...rows[0],date:v.date,time:v.time||rows[0].time};return saveAgenda(agenda.map(x=>x.id===next.id?next:x))?'Compromisso atualizado: '+next.title+' — '+agendaDateLabel(next.date)+(next.time?' às '+next.time:'')+'.':'Não consegui atualizar o compromisso.'}
 if((m=t.match(/^(?:agende|marque|cadastre|adicione|registre)\s+(?:(?:um[ a]?|uma|o|a)\s+)?(?:(?:compromisso|tarefa)\s*[:\-]?\s*)?(.+)$/iu))){if(!/^(?:agende|marque)\b/iu.test(t)&&!/\b(?:tarefa|compromisso|agenda)\b/iu.test(t))return '';const v=agendaTimeDate(m[1]);if(v.error)return v.error;if(!v.date||!v.title)return 'Informe o título e a data. Exemplo: Agende reunião amanhã às 9h.';const task={id:crypto.randomUUID(),title:v.title,date:v.date,time:v.time,done:false};if(!validTask(task))return 'Confira o título, a data e o horário.';if(agenda.some(x=>!x.done&&x.date===task.date&&x.time===task.time&&agendaNorm(x.title)===agendaNorm(task.title)))return 'Esse compromisso já está na agenda.';return saveAgenda([...agenda,task])?'Registrado na agenda: '+task.title+' — '+agendaDateLabel(task.date)+(task.time?' às '+task.time:'')+'.':'Não consegui salvar o compromisso.'}
 return ''}
$('menu-advanced').onclick=()=>{const p=$('advanced-options');p.hidden=!p.hidden;$('menu-advanced').setAttribute('aria-expanded',String(!p.hidden))};
$('menu-memories').onclick=()=>{go('settings');$('show-memory').scrollIntoView({block:'center'});showMemories()};
$('menu-backup').onclick=()=>{go('settings');$('export').scrollIntoView({block:'center'})};

if('scrollRestoration'in history)history.scrollRestoration='manual';
// Gestão 3.2 — dados por conta, valores em centavos / gramas e fila local durável.
const MGKEY='alivi-management-v1';
const kinds=['agenda','finance','business','stock'];
let ledger={finance:[],business:[],stock:[]}, edits={}, pending={}, mgRunning=false, mgReady=false, mgCycle=0;
const mgKey=()=>MGKEY+':'+uid;
const mgRows=k=>k==='agenda'?agenda:ledger[k];
function validEntry(k,r){return r&&typeof r.id==='string'&&r.id.length<=100&&typeof r.title==='string'&&r.title.trim()&&r.title.length<=160&&validDay(r.date)&&(r.account===undefined||(typeof r.account==='string'&&r.account.length<=80))&&(r.status===undefined||['paid','pending'].includes(r.status))&&Number.isSafeInteger(r.amount)&&r.amount>0&&r.amount<=999999999000&&(k==='stock'?['in','out']:['income','expense']).includes(r.kind)}
function validManagement(k,r){return k==='agenda'?validTask(r):validEntry(k,r)}
function mgPersist(){localStorage.setItem(mgKey(),JSON.stringify({ledger,agenda,pending,ready:mgReady}))}
function resetManagement(){mgCycle++;mgRunning=false;mgReady=false;ledger={finance:[],business:[],stock:[]};edits={};pending={};$('alert-badge').hidden=false;$('alert-badge').textContent='🔔';$('management-sync').textContent='Aguardando conexão.';for(const k of ['finance','business','stock']){$(k+'-form').reset();$(k+'-list').replaceChildren()}}
function loadManagement(){resetManagement();try{const data=JSON.parse(localStorage.getItem(mgKey())||'{}');for(const k of ['finance','business','stock'])ledger[k]=Array.isArray(data.ledger?.[k])?data.ledger[k].filter(r=>validEntry(k,r)):[];if(Array.isArray(data.agenda))agenda=data.agenda.filter(validTask);pending=data.pending&&typeof data.pending==='object'?data.pending:{};mgReady=data.ready===true}catch{}for(const k of ['finance','business','stock'])$(k+'-date').value=localDay();renderLedger()}
function queueChanges(k,before,after){if(!uid)return;const old=new Map(before.map(r=>[r.id,r])),next=new Map(after.map(r=>[r.id,r]));for(const r of after)if(JSON.stringify(old.get(r.id))!==JSON.stringify(r))pending[k+':'+r.id]={kind:k,record_id:r.id,payload:r,deleted:false,revision:crypto.randomUUID()};for(const r of before)if(!next.has(r.id))pending[k+':'+r.id]={kind:k,record_id:r.id,payload:{},deleted:true,revision:crypto.randomUUID()};mgPersist();$('management-sync').textContent='Alterações locais aguardando sincronização.'}
let mgPromise=null;
async function syncManagement(){if(!uid)return;if(mgPromise){await mgPromise;if(!uid)return;if(mgPromise)return mgPromise;}const p=syncManagementCycle();mgPromise=p;try{return await p}finally{if(mgPromise===p)mgPromise=null}}
async function syncManagementCycle(){if(!uid||mgRunning)return;mgRunning=true;const g=generation,cycle=mgCycle,account=uid;const current=()=>g===generation&&cycle===mgCycle&&account===uid;try{
 // Insert existing local records once without overwriting remote records or tombstones.
 if(!mgReady){for(const k of kinds){const rows=mgRows(k).filter(r=>!pending[k+':'+r.id]).map(r=>({user_id:account,kind:k,record_id:r.id,payload:r,deleted:false}));for(let i=0;i<rows.length;i+=100){await db('alivi_management','POST','on_conflict=user_id,kind,record_id',rows.slice(i,i+100));if(!current())return}}mgReady=true;mgPersist()}
 const batch=Object.entries(pending);for(let i=0;i<batch.length;i+=100){const part=batch.slice(i,i+100);const rows=part.map(([,v])=>({user_id:account,kind:v.kind,record_id:v.record_id,payload:v.payload,deleted:v.deleted}));await db('alivi_management','POST','on_conflict=user_id,kind,record_id',rows,false,true);if(!current())return;mgPersist()}
 let all=[];for(let offset=0;;offset+=500){const rows=await db('alivi_management','GET','select=kind,record_id,payload,deleted&user_id=eq.'+encodeURIComponent(account)+'&order=kind.asc,record_id.asc&limit=500&offset='+offset);if(!current())return;all.push(...rows);if(rows.length<500)break}
 const remote=new Map(all.map(r=>[r.kind+':'+r.record_id,r]));for(const [key,v] of batch){const r=remote.get(key);if(pending[key]?.revision===v.revision&&r&&r.deleted===v.deleted&&(v.deleted||samePayload(r.payload,v.payload)))delete pending[key];}mgPersist();
 for(const k of kinds){const map=new Map(all.filter(r=>r.kind===k&&!r.deleted&&r.payload?.id===r.record_id&&validManagement(k,r.payload)).map(r=>[r.record_id,r.payload]));for(const v of Object.values(pending))if(v.kind===k){if(v.deleted)map.delete(v.record_id);else if(validManagement(k,v.payload))map.set(v.record_id,v.payload)}const next=[...map.values()];if(k==='agenda')agenda=next;else ledger[k]=next}mgPersist();try{localStorage.setItem(AGENDAKEY+':'+uid,JSON.stringify(agenda))}catch{};renderAgenda();renderLedger();renderAlerts();$('management-sync').textContent=Object.keys(pending).length?'Alterações aguardando sincronização.':'Sincronizado em '+new Date().toLocaleString('pt-BR');
 }catch(e){if(current())$('management-sync').textContent='Dados locais preservados. Sincronização indisponível: '+e.message+' (confira instalação SQL e conexão).'}finally{if(current())mgRunning=false}}
function samePayload(a,b){return a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(k=>a[k]===b[k])}
function money(c){return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function kilos(g){return (g/1000).toLocaleString('pt-BR',{maximumFractionDigits:3})+' kg'}
function summary(k){const rows=ledger[k];if(k==='stock'){const totals=new Map();for(const r of rows){const key=agendaNorm(r.title),old=totals.get(key)||{title:r.title,n:0};old.n+=(r.kind==='in'?1:-1)*r.amount;totals.set(key,old)}return totals.size?[...totals.values()].map(r=>r.title+': '+kilos(r.n)+(r.n<0?' (saldo negativo: conferir)':'')).join('\n'):'Nenhum movimento de estoque.'}const incoming=rows.filter(r=>r.kind==='income'&&r.status!=='pending').reduce((n,r)=>n+r.amount,0),out=rows.filter(r=>r.kind==='expense'&&r.status!=='pending').reduce((n,r)=>n+r.amount,0);return 'Receitas: '+money(incoming)+'\nDespesas: '+money(out)+'\nSaldo dos lançamentos: '+money(incoming-out)+'\nTodos os registros • não inclui saldo inicial não lançado.'}
function renderLedger(){for(const k of ['finance','business','stock']){const list=$(k+'-list');list.replaceChildren();$(k+'-summary').textContent=summary(k);for(const r of [...ledger[k]].sort((a,b)=>b.date.localeCompare(a.date))){const item=document.createElement('div');item.className='item';const b=document.createElement('b');b.textContent=r.title;const p=document.createElement('p');p.textContent=agendaDateLabel(r.date)+' • '+(['income','in'].includes(r.kind)?'+':'−')+(k==='stock'?kilos(r.amount):money(r.amount));item.append(b,p);if(k!=='stock'){const info=document.createElement('small');info.textContent=(r.account||'Sem conta')+(r.status==='pending'?' • Pendente':' • Liquidado');item.append(info)}for(const [label,fn] of [['Editar',()=>{edits[k]=r.id;$(k+'-title').value=r.title;$(k+'-kind').value=r.kind;$(k+'-amount').value=r.amount/(k==='stock'?1000:100);$(k+'-date').value=r.date;if(k!=='stock'){$(k+'-account').value=r.account||'';$(k+'-status').value=r.status||'paid'}$(k+'-title').focus()}],['Excluir',()=>{if(confirm('Excluir este lançamento?')){saveLedger(k,ledger[k].filter(x=>x.id!==r.id));clearLedgerForm(k)}}]]){const btn=document.createElement('button');btn.className='secondary';btn.textContent=label;btn.onclick=fn;item.append(btn)}list.append(item)}}}
function saveLedger(k,next){if(!uid)return false;const old=ledger[k];const oldQueue={...pending};try{ledger[k]=next;queueChanges(k,old,next);renderLedger();return true}catch(e){ledger[k]=old;pending=oldQueue;alert('Falha ao salvar: '+e.message);return false}}
function clearLedgerForm(k){delete edits[k];$(k+'-form').reset();$(k+'-date').value=localDay()}
for(const k of ['finance','business','stock']){$(k+'-cancel').onclick=()=>clearLedgerForm(k);$(k+'-form').onsubmit=e=>{e.preventDefault();const previous=ledger[k].find(r=>r.id===edits[k]);const row={...previous,id:edits[k]||crypto.randomUUID(),kind:$(k+'-kind').value,title:$(k+'-title').value.trim(),amount:Math.round(Number($(k+'-amount').value)*(k==='stock'?1000:100)),date:$(k+'-date').value,...(k==='stock'?{}:{account:$(k+'-account').value.trim()||'Sem conta',status:$(k+'-status').value})};if(!validEntry(k,row)){alert('Confira os dados.');return}if(saveLedger(k,[...ledger[k].filter(r=>r.id!==row.id),row]))clearLedgerForm(k)}}
function parseBRMoney(raw){const t=raw.trim();if(!/^(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)$/.test(t))return NaN;const normalized=t.includes(',')?t.replace(/\./g,'').replace(',','.'): /^\d{1,3}(?:\.\d{3})+$/.test(t)?t.replace(/\./g,''):t;const [whole,frac='']=normalized.split('.');const cents=Number(whole)*100+Number(frac.padEnd(2,'0'));return Number.isSafeInteger(cents)?cents:NaN}
function managementCommand(q){const t=q.trim().replace(/^alivi[,!:]?\s*/iu,'');let m;if(/^(?:mostre|liste|consulte|qual [ée])\b/iu.test(t)){const n=agendaNorm(t);if(/\b(?:financeiro pessoal|saldo pessoal|caixa pessoal)\b/.test(n))return summary('finance');if(/\b(?:caixa empresarial|saldo empresarial|financeiro empresarial)\b/.test(n))return summary('business');if(/\b(?:saldo de estoque|estoque de materiais|meu estoque|estoque)\b/.test(n))return summary('stock');if(/\b(?:alertas|lembretes)\b/.test(n))return alertText()}
 let k,kind,amount,title;
 if((m=t.match(/^registre\s+(despesa|receita)\s+(pessoal|empresarial)\s+de\s+(?:R\$\s*)?([\d.,]+)\s+em\s+(.+)$/iu))){k=m[2].toLowerCase()==='pessoal'?'finance':'business';kind=m[1].toLowerCase()==='receita'?'income':'expense';amount=parseBRMoney(m[3]);title=m[4]}
 else if((m=t.match(/^registre\s+(entrada|sa[íi]da)\s+de\s+estoque\s+de\s+(\d+(?:[.,]\d{1,3})?)\s*kg\s+de\s+(.+)$/iu))){k='stock';kind=m[1].toLowerCase()==='entrada'?'in':'out';amount=Math.round(Number(m[2].replace(',','.'))*1000);title=m[3]}
 else return /^registre\s+(?:despesa|receita|entrada|sa[íi]da)\b/iu.test(t)?'Não registrei: confira o formato do lançamento. Exemplo: Registre receita pessoal de R$ 1.000,00 em salário.':'';
 const v=agendaTimeDate(title);if(v.error||v.time)return 'Confira a data e descrição do lançamento.';const row={id:crypto.randomUUID(),kind,amount,title:v.title,date:v.date||localDay()};if(!validEntry(k,row))return 'Lançamento inválido. Confira descrição, data e valor.';if(ledger[k].some(r=>r.kind===kind&&r.amount===amount&&r.date===row.date&&agendaNorm(r.title)===agendaNorm(row.title)))return 'Já existe lançamento igual nesta data. Se for uma operação diferente, use o formulário do módulo para registrar.';return saveLedger(k,[...ledger[k],row])?'Registrado neste aparelho: '+row.title+' — '+(k==='stock'?kilos(amount):money(amount))+' — '+agendaDateLabel(row.date)+'. Sincronização pendente até confirmação no painel de alertas.':'Não consegui salvar o lançamento.'}
function dueTasks(){const now=Date.now(),today=localDay();return agenda.filter(t=>!t.done&&!t.reminder&&(t.date<today||(!t.time?t.date===today:new Date(t.date+'T'+t.time).getTime()<=now+86400000))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))}
function alertText(){const rows=dueTasks();const bills=['finance','business'].flatMap(k=>ledger[k].filter(r=>r.status==='pending'&&r.date<=agendaDay(1)).map(r=>r.title+' — '+money(r.amount)+' — '+agendaDateLabel(r.date)));if(bills.length)return 'Contas próximas ou vencidas:\n'+bills.join('\n')+(rows.length?'\nAgenda:\n'+rows.map(t=>t.title+' — '+agendaDateLabel(t.date)).join('\n'):'');return rows.length?'Alertas — vencidos, hoje sem horário ou próximas 24 horas:\n'+rows.map(t=>t.title+' — '+agendaDateLabel(t.date)+(t.time?' às '+t.time:'')).join('\n'):'Nenhum compromisso vencido ou próximo.'}
function noticeRows(){const today=localDay();return [...reminderRows(),...dueTasks().map(t=>({key:'agenda:'+t.id+':'+t.date+':'+t.time,page:'agenda',category:'Agenda',title:t.title,detail:agendaDateLabel(t.date)+(t.time?' às '+t.time:''),urgent:t.date<=today})),...['finance','business'].flatMap(k=>ledger[k].filter(r=>r.status==='pending'&&r.date<=agendaDay(1)).map(r=>({key:k+':'+r.id+':'+r.date+':'+r.amount,page:k,category:k==='finance'?'Financeiro':'Negócios',title:(r.kind==='income'?'Receber: ':'Pagar: ')+r.title,detail:money(r.amount)+' • '+agendaDateLabel(r.date),urgent:r.date<=today})) )].sort((a,b)=>Number(b.urgent)-Number(a.urgent))}
const noticeKey=()=> 'alivi-notice-v1:'+uid;
let noticeFilter='all',noticeBusy=false;
function noticePrefs(){try{return {...{auto:false,quiet:true,agenda:true,finance:true,business:true,seen:[],sent:[]},...JSON.parse(localStorage.getItem(noticeKey())||'{}')}}catch{return {auto:false,quiet:true,agenda:true,finance:true,business:true,seen:[],sent:[]}}}
function storeNotice(p){localStorage.setItem(noticeKey(),JSON.stringify(p))}
function renderAlerts(){if(!uid)return;const prefs=noticePrefs(),rows=noticeRows(),unseen=rows.filter(r=>!prefs.seen.includes(r.key));$('alert-badge').textContent=unseen.length?'🔔 '+unseen.length:'🔔';$('alert-badge').hidden=false;$('alert-badge').setAttribute('aria-label',unseen.length?'Abrir notificações inteligentes: '+unseen.length+' não vistas':'Abrir notificações inteligentes');$('alert-menu').textContent='🔔 Notificações inteligentes'+(unseen.length?' ('+unseen.length+')':'');$('notice-count').textContent=unseen.length+' não vistas';const root=$('alerts-list');root.replaceChildren();const selected=rows.filter(r=>noticeFilter==='all'||(noticeFilter==='priority'?r.urgent:!prefs.seen.includes(r.key)));if(!selected.length)root.textContent='Nenhum aviso nesta seleção.';for(const r of selected){const item=document.createElement('article');item.className='neon-notice'+(r.urgent?' urgent':'')+(prefs.seen.includes(r.key)?' seen':'');const h=document.createElement('header'),img=document.createElement('img'),label=document.createElement('strong');img.src='./alivi-icon-192-r2.png';img.alt='';label.textContent='ALIVI • '+r.category+(r.urgent?' • Atenção':'');h.append(img,label);const title=document.createElement('h3');title.textContent=r.title;const detail=document.createElement('p');detail.textContent=r.detail;const actions=document.createElement('div');actions.className='neon-actions';const seen=document.createElement('button');seen.className='secondary';seen.textContent=prefs.seen.includes(r.key)?'Visto':'Marcar como visto';seen.disabled=prefs.seen.includes(r.key);seen.onclick=()=>{const p=noticePrefs();p.seen=[...new Set([...p.seen,r.key])];try{storeNotice(p);renderAlerts()}catch{alert('Não consegui salvar a preferência.')}};const open=document.createElement('button');open.className='primary';open.textContent='Abrir';open.onclick=()=>go(r.page);actions.append(seen,open);item.append(h,title,detail,actions);root.append(item)}for(const k of ['auto','quiet','agenda','finance','business'])$('notice-'+k).checked=!!prefs[k];for(const k of ['all','priority','unseen'])$('notice-'+k).setAttribute('aria-pressed',String(noticeFilter===k));renderUpcomingReminders();maybeNotify(rows)}

// Próximos lembretes: consultar, editar e cancelar sem perder sincronização.
function nextReminderOccurrence(t,now=new Date()){
 const base=new Date(t.date+'T'+t.time);
 if(!t.daily)return base;
 const d=new Date(now);
 d.setSeconds(0,0);
 d.setHours(Number(t.time.slice(0,2)),Number(t.time.slice(3,5)),0,0);
 if(d<base)d.setTime(base.getTime());
 if(d<now)d.setDate(d.getDate()+1);
 return d;
}
function renderUpcomingReminders(){
 const root=$('upcoming-reminders'),count=$('upcoming-count');if(!root||!count)return;
 root.replaceChildren();
 const rows=agenda.filter(t=>t.reminder&&!t.done&&t.time).map(t=>({task:t,next:nextReminderOccurrence(t)}))
  .filter(v=>v.task.daily||v.next.getTime()>=Date.now()-60000)
  .sort((a,b)=>a.next-b.next);
 count.textContent=rows.length+' ativo(s)';
 if(!rows.length){const p=document.createElement('p');p.className='hint';p.textContent='Nenhum lembrete futuro ativo. Você pode criar um pelo chat.';root.append(p);return;}
 for(const {task:t,next} of rows.slice(0,30)){
  const item=document.createElement('div');item.className='reminder-entry';
  const wrap=document.createElement('div');wrap.className='reminder-entry-content';
  const name=document.createElement('strong');name.textContent=t.title;
  const time=document.createElement('small');time.textContent=(t.daily?'Todos os dias • Próximo: ':'')+next.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  wrap.append(name,time);
  const actions=document.createElement('div');actions.className='reminder-entry-actions';
  const edit=document.createElement('button');edit.className='secondary';edit.type='button';edit.textContent='Editar';
  edit.onclick=()=>{go('agenda');agendaEditing=t.id;$('agenda-title').value=t.title;$('agenda-date').value=t.date;$('agenda-time').value=t.time;$('agenda-save').textContent='Salvar edição';$('agenda-cancel').hidden=false;$('agenda-title').focus()};
  const cancel=document.createElement('button');cancel.className='secondary';cancel.type='button';cancel.textContent='Cancelar';
  cancel.onclick=()=>{if(confirm('Cancelar o lembrete “'+t.title+'”?'))saveAgenda(agenda.filter(x=>x.id!==t.id))};
  actions.append(edit,cancel);item.append(wrap,actions);root.append(item);
 }
 if(rows.length>30){const info=document.createElement('p');info.className='hint';info.textContent='Mostrando os próximos 30 lembretes. Consulte a agenda para ver todos.';root.append(info)}
}
for(const k of ['all','priority','unseen'])$('notice-'+k).onclick=()=>{noticeFilter=k;renderAlerts()};
for(const k of ['auto','quiet','agenda','finance','business'])$('notice-'+k).onchange=()=>{if(!uid)return;const p=noticePrefs();p[k]=$('notice-'+k).checked;try{storeNotice(p)}catch{alert('Não consegui salvar a configuração.')}if(k==='quiet')syncRemoteQuiet(p.quiet).catch(e=>pushStatus('Preferência remota não sincronizada: '+e.message));renderAlerts()};
function noticePermission(){return typeof Notification!=='undefined'&&Notification.permission==='granted'}
async function showSystemNotice(title,body,tag){if(!noticePermission()||!navigator.serviceWorker)throw Error('Autorize as notificações em um navegador compatível.');const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active)throw Error('Serviço de notificações ainda não disponível.');await reg.showNotification(title,{body,tag,icon:'./alivi-icon-192-r2.png',badge:'./badge-96.png',data:{page:'alerts'}})}
$('notice-enable').onclick=async()=>{try{if(typeof Notification==='undefined')throw Error('Notificações indisponíveis neste navegador. No iPhone, instale a ALIVI na tela inicial.');const result=await Notification.requestPermission();$('notice-status').textContent=result==='granted'?'Notificações autorizadas.':'Permissão não concedida.'}catch(e){$('notice-status').textContent=e.message}};
$('notice-test').onclick=async()=>{try{await showSystemNotice('ALIVI • Teste','Suas notificações estão prontas.','alivi-test');$('notice-status').textContent='Aviso de teste solicitado ao sistema.'}catch(e){$('notice-status').textContent=e.message}};
async function maybeNotify(rows){if(!uid||noticeBusy||!noticePermission())return;const p=noticePrefs(),hour=new Date().getHours(),account=uid;if(!p.auto||(p.quiet&&(hour>=22||hour<6)))return;const next=rows.filter(r=>p[r.page]&&!p.sent.includes(r.key)&&!p.seen.includes(r.key));if(!next.length)return;noticeBusy=true;try{await showSystemNotice('ALIVI • '+next.length+' aviso(s)',next.length===1?next[0].title+' — '+next[0].detail:'Você tem '+next.length+' avisos para conferir.','alivi-reminders');if(uid===account){const latest=noticePrefs();latest.sent=[...new Set([...latest.sent,...next.map(r=>r.key)])];storeNotice(latest)}}catch(e){if(uid===account)$('notice-status').textContent='Aviso não enviado: '+e.message}finally{noticeBusy=false}}
$('alerts-refresh').onclick=renderAlerts;$('management-refresh').onclick=syncManagement;
$('management-export').onclick=()=>{if(!uid)return;const url=URL.createObjectURL(new Blob([JSON.stringify({format:MGKEY,agenda,ledger},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='alivi_gestao_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
setInterval(()=>{if(uid&&!document.hidden){renderAlerts();syncManagement()}},8000);document.addEventListener('visibilitychange',()=>{if(uid&&!document.hidden){renderAlerts();syncManagement()}});


function naturalCommand(q){const t=q.trim().replace(/^alivi[,!:]?\s*/iu,'');let m;
 if((m=t.match(/^abasteci\s+(?:R\$\s*)?([\d.,]+)\s*(?:reais)?\s*(hoje|ontem)?[.!]?$/iu)))return 'Registre despesa pessoal de R$ '+m[1]+' em combustível'+(m[2]?.toLowerCase()==='ontem'?' '+agendaDay(-1):'');
 if((m=t.match(/^(gastei|recebi)\s+(?:R\$\s*)?([\d.,]+)\s*(?:reais)?\s+(?:em|de|com)\s+(.+)$/iu)))return 'Registre '+(m[1].toLowerCase()==='gastei'?'despesa':'receita')+' pessoal de R$ '+m[2]+' em '+m[3];
 if((m=t.match(/^produzi\s+([\d.,]+)\s*kg\s+de\s+(.+)$/iu)))return 'Registre entrada de estoque de '+m[1]+' kg de '+m[2];
 return q;
}
function extendedManagement(q){const t=q.trim().replace(/^alivi[,!:]?\s*/iu,'').replace(/[.!?]$/,'');let m;
 if((m=t.match(/^registre\s+conta\s+a\s+(pagar|receber)\s+(pessoal|empresarial)\s+de\s+(?:R\$\s*)?([\d.,]+)\s+em\s+(.+)$/iu))){const k=m[2].toLowerCase()==='pessoal'?'finance':'business',v=agendaTimeDate(m[4]),row={id:crypto.randomUUID(),kind:m[1].toLowerCase()==='pagar'?'expense':'income',amount:parseBRMoney(m[3]),title:v.title,date:v.date,status:'pending',account:'Sem conta'};if(v.error||!validEntry(k,row))return 'Informe descrição, valor e vencimento.';if(ledger[k].some(r=>r.status==='pending'&&r.kind===row.kind&&r.amount===row.amount&&r.date===row.date&&agendaNorm(r.title)===agendaNorm(row.title)))return 'Essa conta já está cadastrada.';return saveLedger(k,[...ledger[k],row])?'Conta registrada: '+row.title+' — '+money(row.amount)+' — vence '+agendaDateLabel(row.date)+'.':'Não consegui registrar.';}
 if((m=t.match(/^liquide conta\s+(pessoal|empresarial)\s*:\s*(.+)$/iu))){const k=m[1].toLowerCase()==='pessoal'?'finance':'business',rows=ledger[k].filter(r=>r.status==='pending'&&agendaNorm(r.title)===agendaNorm(m[2]));if(rows.length!==1)return 'Encontrei '+rows.length+' contas correspondentes. Confira no painel financeiro.';return saveLedger(k,ledger[k].map(r=>r.id===rows[0].id?{...r,status:'paid',dueDate:r.date,date:localDay()}:r))?'Conta liquidada: '+rows[0].title+' — '+money(rows[0].amount)+'.':'Não consegui liquidar.';}
 if(/^(?:mostre|liste)\s+(?:minhas\s+)?contas a (?:pagar|receber)/iu.test(t)){const kind=/receber/iu.test(t)?'income':'expense';const rows=['finance','business'].flatMap(k=>ledger[k].filter(r=>r.status==='pending'&&r.kind===kind).map(r=>(k==='finance'?'Pessoal':'Empresa')+': '+r.title+' — '+money(r.amount)+' — '+agendaDateLabel(r.date)));return rows.length?rows.join('\n'):'Nenhuma conta pendente.';}
 if((m=t.match(/^(?:mostre|liste)\s+(?:meu\s+)?relat[oó]rio\s+(pessoal|empresarial)\s+(?:de\s+)?(hoje|(?:deste|do) m[eê]s)$/iu))){const k=m[1].toLowerCase()==='pessoal'?'finance':'business',prefix=m[2].toLowerCase()==='hoje'?localDay():localDay().slice(0,7);const rows=ledger[k].filter(r=>r.status!=='pending'&&r.date.startsWith(prefix));const a=rows.filter(r=>r.kind==='income').reduce((n,r)=>n+r.amount,0),b=rows.filter(r=>r.kind==='expense').reduce((n,r)=>n+r.amount,0);return 'Relatório '+m[1]+' — '+prefix+'\nReceitas: '+money(a)+'\nDespesas: '+money(b)+'\nResultado de caixa: '+money(a-b);}
 if(/^(?:mostre|liste)\s+(?:meus\s+)?saldos por conta$/iu.test(t)){const totals=new Map();for(const k of ['finance','business'])for(const r of ledger[k])if(r.status!=='pending'){const key=(k==='finance'?'Pessoal':'Empresa')+' / '+(r.account||'Sem conta');totals.set(key,(totals.get(key)||0)+(r.kind==='income'?1:-1)*r.amount)}return [...totals].map(([k,v])=>k+': '+money(v)).join('\n')||'Nenhum lançamento.';}
 if(/^(?:mostre|liste)\s+(?:meu\s+)?painel gerencial$/iu.test(t))return 'Pessoal\n'+summary('finance')+'\n\nEmpresa\n'+summary('business')+'\n\nEstoque\n'+summary('stock')+'\n\n'+alertText();
 return '';
}


// 3.10.8 — Tolerância a transcrição de voz (“vi me avise”) sem encaminhar o lembrete à IA.
function reminderCleanVoiceLead(q){
 let t=String(q||'').trim();
 // Mantém compatibilidade com “ALIVI, agenda...”, “ALIVI, me avise...”.
 t=t.replace(/^(?:oi\s+|ei\s+)?alivi[,!:\s]*/iu,'');
 // O reconhecimento do navegador às vezes transcreve “ALIVI” como “vi”/“ali vi”.
 // Remover apenas quando seguido de um comando EXPLÍCITO de lembrete evita enganos.
 t=t.replace(/^(?:ali\s*vi|alvi|aliv|ali|vi)[,!:\s]+(?=(?:me\s+)?(?:avise|avisa|avisar|lembre|lembra|lembrar|notifique|notifica|notificar)\b)/iu,'');
 return t.trim();
}
function isReminderIntent(q){
 const t=agendaNorm(reminderCleanVoiceLead(q)).replace(/^(?:o|a)\s+/,'').trim();
 if(/^(?:liste|mostre|consulte)\s+(?:meus\s+)?lembretes\b/.test(t))return true;
 if(/^(?:cancele|cancelar|reagende|remarque)\s+(?:o\s+)?lembrete\b/.test(t))return true;
 if(/^(?:me\s+(?:avise|avisa|avisar|lembre|lembra|lembrar|notifique|notifica|notificar)|(?:avise|avisa|lembre|lembra|notifique|notifica)(?:-me)?|(?:crie|cadastre|agende)\s+(?:um\s+)?lembrete)\b/.test(t))return true;
 if(/^(?:agenda|agende|agendar|marque|programa|programe|programar)\b/.test(t)&&/\b(?:avis\w*|lembr\w*|notific\w*|lembrete)\b/.test(t))return true;
 if(/^(?:quero|preciso|pode|por favor|gostaria|voce|você)\b/.test(t)&&/\b(?:avis\w*|lembr\w*|notific\w*)\b/.test(t))return true;
 return false;
}
function reminderDay(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function reminderClock(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function cleanReminder(t){
 let s=String(t||'').trim();
 for(let i=0;i<8;i++){
  const next=s.replace(/^(?:alivi[,!:]?\s*|(?:eu\s+)?(?:quero|gostaria|preciso|pode|por favor)\s+(?:que\s+)?|(?:você|voce)\s+|(?:o\s+)?(?:agenda|agende|agendar|marque|programa|programe|programar)\s+|(?:para|pra)\s+(?:mim|você|voce|me)\s+|(?:me\s+)?(?:avise|avisa|avisar|lembre|lembra|lembrar|notifique|notifica|notificar)(?:-me)?\s+|(?:crie|cadastre|agende)\s+(?:um\s+)?lembrete\s+|(?:um\s+)?lembrete\s+|(?:de|para|que|sobre)\s+)/iu,'').trim();
  if(next===s)break;s=next;
 }
 return s.replace(/^[\s:,-]+|[\s.,!?-]+$/g,'').replace(/\s+/g,' ').trim();
}
function reminderTime(text,now=new Date()){
 let rest=String(text||'').trim();
 const daily=/\b(?:todos os dias|diariamente|todo dia)\b/iu.test(rest);
 rest=rest.replace(/\b(?:todos os dias|diariamente|todo dia)\b/iu,' ').trim();
 // Aceita minutos numéricos ou falados: daqui um minuto, daqui a dois, em 3 minutos.
 const rel=rest.match(/\b(?:daqui(?:\s+a)?|em)\s+(\d{1,5}|[a-zà-ÿ]+)\s+(minutos?|minutinhos?|mins?|horas?|h)\b/iu);
 if(rel){
  if(daily)return {error:'Para lembrete diário, informe um horário fixo.'};
  const numbers={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,quatorze:14,catorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60};
  const spoken=agendaNorm(rel[1]);
  const n=/^\d+$/.test(spoken)?Number(spoken):numbers[spoken];
  const multiplier=/^h(?:oras?)?$/iu.test(rel[2])?3600000:60000;
  if(!Number.isInteger(n)||n<1||n*multiplier>7*24*3600000)return {error:'Não agendei: informe um intervalo de 1 minuto a 7 dias.'};
  // A agenda armazena HH:mm: nunca marcar antes do intervalo pedido.
  const due=new Date(Math.ceil((now.getTime()+n*multiplier)/60000)*60000);
  let title=cleanReminder(rest.replace(rel[0],' '));
  if(/^(?:me\s+)?(?:avise|avisa|avisar|lembre|lembra|lembrar|notifique|notifica|notificar)(?:-me)?$/iu.test(title))title='';
  return {date:reminderDay(due),time:reminderClock(due),title:title||'Lembrete',daily:false};
 }
 // Horários falados: “às 5 horas da tarde”, “às 17h”, “8h30”, “amanhã às 9”.
 const dateMatch=rest.match(/(?:^|\s)(hoje|amanh[ãa]|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?)(?=\s|[.,!?;:]|$)/iu);
 let day='';
 if(dateMatch){
  const v=agendaNorm(dateMatch[1]);
  if(v==='hoje')day=reminderDay(now);
  else if(v==='amanha'){const d=new Date(now);d.setDate(d.getDate()+1);day=reminderDay(d)}
  else if(v.includes('/')){const [d,m,y]=v.split('/');day=(y||String(now.getFullYear()))+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0')}
  else day=v;
  rest=rest.replace(dateMatch[0],' ').trim();
 }
 const clock=rest.match(/(?:^|\s)[àa]s?\s+(\d{1,2})(?:[:h](\d{1,2}))?\s*(?:horas?|h)?(?:\s+e\s+(\d{1,2})\s*minutos?)?(?:\s+(?:da|de)\s+(manh[ãa]|tarde|noite))?(?=\s|[.,!?;:]|$)/iu)
  ||rest.match(/\b(\d{1,2})h(\d{1,2})?(?:\s+(?:da|de)\s+(manh[ãa]|tarde|noite))?\b/iu)
  ||rest.match(/\b(\d{1,2})\s+horas?(?:\s+(?:da|de)\s+(manh[ãa]|tarde|noite))?\b/iu);
 if(!clock)return {error:'Não agendei. Informe o horário, por exemplo: “Me avise hoje às 19 horas de estudar”.'};
 let hour=Number(clock[1]);
 // Se o horário tiver grupo de minuto por "e X minutos", ele é o terceiro grupo.
 const minute=clock[3]&&/\se\s\d+/iu.test(clock[0])?Number(clock[3]):Number(clock[2]||0);
 // Padrão sem grupo de minutos ("8h30") usa grupo 2; grupo 3 pode ser o período.
 let suffix='';const pm=clock[0].match(/\b(?:da|de)\s+(manh[ãa]|tarde|noite)/iu);if(pm)suffix=agendaNorm(pm[1]);
 if(hour>23||minute>59)return {error:'Não agendei: horário inválido.'};
 if(suffix==='tarde'&&hour>=1&&hour<12)hour+=12;
 else if(suffix==='noite'&&hour>=1&&hour<=11)hour+=12;
 else if(suffix==='manha'&&hour===12)hour=0;
 if(hour>23)return {error:'Não agendei: horário inválido.'};
 const time=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
 rest=rest.replace(clock[0],' ').trim();
 if(day&&!validDay(day))return {error:'Não agendei: data inválida.'};
 if(!day)day=reminderDay(now);
 const due=new Date(day+'T'+time+':00');
 if(due<=now){
  if(!dateMatch&&daily){due.setDate(due.getDate()+1);day=reminderDay(due)}
  else return {error:'Não agendei: esse horário já passou. Informe outro horário ou dia.'};
 }
 const title=cleanReminder(rest);
 if(!title)return {error:'Não agendei: informe também o assunto do lembrete.'};
 return {date:day,time,title,daily};
}
async function confirmReminderRemote(task){
 const key='agenda:'+task.id;
 try{
  await syncManagement();
  if(pending[key])await syncManagement();
  if(pending[key])return false;
  const rows=await db('alivi_management','GET','select=payload,deleted&user_id=eq.'+encodeURIComponent(uid)+'&kind=eq.agenda&record_id=eq.'+encodeURIComponent(task.id)+'&limit=1');
  const row=rows?.[0];
  return !!(row&&!row.deleted&&row.payload?.id===task.id&&row.payload?.title===task.title&&row.payload?.date===task.date&&row.payload?.time===task.time&&row.payload?.reminder===true);
 }catch(e){return false}
}
async function reminderCommand(q){
 const t=reminderCleanVoiceLead(q).replace(/[.!?]+$/,'');let m;
 if(/^(?:liste|mostre|consulte)\s+(?:meus\s+)?lembretes$/iu.test(t)){
  await syncManagement();
  const rows=agenda.filter(x=>x.reminder&&!x.done);
  return rows.length?'Lembretes registrados:\n'+rows.map(x=>x.title+' — '+(x.daily?'Todos os dias, a partir de ':'')+agendaDateLabel(x.date)+' às '+x.time).join('\n'):'Nenhum lembrete ativo registrado.';
 }
 if((m=t.match(/^cancel(?:e|ar)\s+(?:o\s+)?lembrete\s*[: -]?\s*(.+)$/iu))){
  const rows=agenda.filter(x=>x.reminder&&!x.done&&agendaNorm(x.title)===agendaNorm(m[1]));
  if(rows.length!==1)return 'Informe o título exato de um único lembrete ativo.';
  if(!saveAgenda(agenda.filter(x=>x.id!==rows[0].id)))return 'Não consegui cancelar o lembrete.';
  await syncManagement();
  return pending['agenda:'+rows[0].id]?'Cancelamento salvo neste aparelho, aguardando sincronização.':'Cancelamento enviado à sincronização. Confira em Notificações.';
 }
 if((m=t.match(/^(?:reagende|remarque)\s+(?:o\s+)?lembrete\s*[: -]?\s*(.+)$/iu))){
  const v=reminderTime(m[1]);if(v.error)return v.error;
  const rows=agenda.filter(x=>x.reminder&&!x.done&&agendaNorm(x.title)===agendaNorm(v.title));
  if(rows.length!==1)return 'Informe o título exato do lembrete e seu novo horário.';
  const task={...rows[0],date:v.date,time:v.time,daily:v.daily||rows[0].daily};
  if(!saveAgenda(agenda.map(x=>x.id===task.id?task:x)))return 'Não consegui salvar a alteração.';
  return await confirmReminderRemote(task)?'Lembrete atualizado e confirmado no banco: '+task.title+' — '+agendaDateLabel(task.date)+' às '+task.time+'.':'Alteração salva neste aparelho, mas ainda sem confirmação do banco. Confira a sincronização em Notificações.';
 }
 const v=reminderTime(t);
 if(v.error)return v.error;
 const duplicate=agenda.find(x=>x.reminder&&!x.done&&x.date===v.date&&x.time===v.time&&x.daily===v.daily&&agendaNorm(x.title)===agendaNorm(v.title));
 if(duplicate){
  return await confirmReminderRemote(duplicate)?'Esse lembrete já existe e está confirmado no banco: '+duplicate.title+' — '+agendaDateLabel(duplicate.date)+' às '+duplicate.time+'.':'Esse lembrete já existe neste aparelho, mas a confirmação do banco está pendente. Abra Notificações para verificar.';
 }
 const task={id:crypto.randomUUID(),title:v.title,date:v.date,time:v.time,done:false,reminder:true,daily:v.daily};
 if(!validTask(task))return 'Não consegui cadastrar: confira o assunto, a data e a hora.';
 if(!saveAgenda([...agenda,task]))return 'Não consegui salvar o lembrete.';
 const saved=await confirmReminderRemote(task);
 const label=task.title+' — '+(task.daily?'diariamente, a partir de ':'')+agendaDateLabel(task.date)+' às '+task.time+'.';
 return saved?'Lembrete salvo e confirmado no banco: '+label:'Lembrete salvo apenas neste aparelho: '+label+' A sincronização com o banco não foi confirmada. Não posso garantir notificação com o aplicativo fechado. Confira em Notificações.';
}
function reminderRows(now=new Date()){const today=reminderDay(now);return agenda.filter(x=>x.reminder&&!x.done&&x.time).flatMap(x=>{const day=x.daily?today:x.date;if(day<x.date||new Date(day+'T'+x.time)>now)return [];return [{key:'reminder:'+x.id+':'+day+':'+x.time,page:'agenda',category:'Lembrete',title:x.title,detail:agendaDateLabel(day)+' às '+x.time,urgent:true}];});}


// ALIVI 3.6.1 — Firebase Cloud Messaging (FCM), preservando a mesma conta Supabase.
// As configurações de aplicativo Firebase e a chave Web Push são PÚBLICAS.
 // Credenciais para envio ficam SOMENTE na Edge Function do Supabase.
const FIREBASE_CONFIG={
 apiKey:'AIzaSyA-ZCZjAioKCSpN5HVEJjy_vvIWDpYYUrM',
 authDomain:'alivi-ia.firebaseapp.com',
 projectId:'alivi-ia',
 storageBucket:'alivi-ia.firebasestorage.app',
 messagingSenderId:'1020176262495',
 appId:'1:1020176262495:web:ee55571390dbc2b67d02ea'
};
const FIREBASE_VAPID='BJoT1JuBVbPqjAzpVDBeoHJR8mJdiMJKg7IGdDPW_rXS2vXYDHeRdgvXC_NNjw5Uz_eAgG4CGDRR3qiMmsUr6kI';
const FCM_URL=SB+'/functions/v1/alivi-fcm';
let fcmModules=null, fcmMessaging=null, fcmForegroundListener=false;
function pushStatus(t){const el=$('push-status');if(el)el.textContent=t}
function pushAvailable(){return !!(window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window)}
async function initFirebaseMessaging(){
 if(fcmMessaging)return fcmMessaging;
 if(!pushAvailable())throw Error('Notificações indisponíveis neste navegador. No iPhone, instale a ALIVI na tela de início.');
 if(!fcmModules){
  const [appMod,msgMod]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js')
  ]);
  fcmModules={appMod,msgMod};
 }
 const {appMod,msgMod}=fcmModules;
 if(!(await msgMod.isSupported()))throw Error('Firebase Messaging não é compatível com este navegador.');
 const instance=appMod.getApps().find(x=>x.name==='alivi-mobile')||appMod.initializeApp(FIREBASE_CONFIG,'alivi-mobile');
 fcmMessaging=msgMod.getMessaging(instance);
 if(!fcmForegroundListener){
  msgMod.onMessage(fcmMessaging,async payload=>{
   try{
    const v=payload.data||{};
    await showSystemNotice(String(v.title||'ALIVI • Lembrete'),String(v.body||'Você tem um aviso.'),String(v.tag||'alivi-fcm'));
   }catch(e){pushStatus('Aviso recebido, mas não exibido: '+e.message)}
  });
  fcmForegroundListener=true;
 }
 return fcmMessaging;
}
async function fcmRegistration(){
 const reg=await navigator.serviceWorker.ready;
 if(!reg?.pushManager)throw Error('Serviço de notificações indisponível neste aparelho.');
 return reg;
}
async function syncRemoteQuiet(quiet){
 if(!uid)return;
 try{
  const token=localStorage.getItem('alivi-fcm-token:'+uid);
  if(token)await db('alivi_fcm_tokens','PATCH','user_id=eq.'+encodeURIComponent(uid)+'&token=eq.'+encodeURIComponent(token),{quiet:!!quiet});
 }catch(e){pushStatus('Não foi possível sincronizar Não incomodar: '+e.message)}
}
async function registerRemotePush(){
 if(!uid)throw Error('Entre na sua conta ALIVI primeiro.');
 if(!pushAvailable())throw Error('Web Push indisponível neste navegador.');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw Error('Permissão de notificações não concedida.');
 const reg=await fcmRegistration();
 // Migração: desvincular assinatura antiga, assinada com chave de outro provedor.
 const existing=await reg.pushManager.getSubscription();
 if(existing&&localStorage.getItem('alivi-fcm-migrated')!=='yes'){
  await existing.unsubscribe();
  localStorage.setItem('alivi-fcm-migrated','yes');
 }
 const messaging=await initFirebaseMessaging();
 const token=await fcmModules.msgMod.getToken(messaging,{vapidKey:FIREBASE_VAPID,serviceWorkerRegistration:reg});
 if(!token)throw Error('O Firebase não retornou o token de notificações.');
 const account=uid;
 await db('alivi_fcm_tokens','POST','on_conflict=user_id,token',{
  user_id:account,token,quiet:!!noticePrefs().quiet,enabled:true,updated_at:new Date().toISOString()
 },false,true);
 const rows=await db('alivi_fcm_tokens','GET','select=token&user_id=eq.'+encodeURIComponent(account)+'&token=eq.'+encodeURIComponent(token)+'&limit=1');
 if(!rows.length)throw Error('O cadastro do aparelho não foi confirmado no banco.');
 localStorage.setItem('alivi-fcm-token:'+account,token);
 const prefs=noticePrefs();prefs.auto=true;storeNotice(prefs);renderAlerts();
 return 'Avisos do Firebase ativados neste aparelho. Agora use Testar envio remoto.';
}
async function unregisterRemotePush(){
 const account=uid;
 if(!account)return 'Entre na sua conta ALIVI.';
 const token=localStorage.getItem('alivi-fcm-token:'+account);
 if(token){await db('alivi_fcm_tokens','DELETE','user_id=eq.'+encodeURIComponent(account)+'&token=eq.'+encodeURIComponent(token));localStorage.removeItem('alivi-fcm-token:'+account)}
 try{const messaging=await initFirebaseMessaging();await fcmModules.msgMod.deleteToken(messaging)}catch(e){if(!token)throw e}
 return 'Avisos remotos desativados neste aparelho.';
}
async function remotePushTest(){
 if(!uid)throw Error('Entre na sua conta ALIVI.');
 const token=await getToken();if(!token)throw Error('Sua sessão expirou. Entre novamente.');
 const response=await fetch(FCM_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action:'test'})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||result.message||('Erro HTTP '+response.status));
 if(!result.sent)throw Error(result.error||('Nenhum envio confirmado. Falhas: '+(result.failed??0)+'. Verifique as credenciais do Firebase no Supabase.'));
 return 'Firebase aceitou '+result.sent+' envio(s). Confira a barra do celular. A entrega ainda precisa ser verificada.';
}
$('push-enable').onclick=async()=>{const b=$('push-enable');b.disabled=true;pushStatus('Ativando o Firebase no aparelho...');try{pushStatus(await registerRemotePush())}catch(e){pushStatus('Não foi possível ativar: '+e.message)}finally{b.disabled=false}};
$('push-disable').onclick=async()=>{const b=$('push-disable');b.disabled=true;try{pushStatus(await unregisterRemotePush())}catch(e){pushStatus('Não foi possível desativar: '+e.message)}finally{b.disabled=false}};
$('push-test').onclick=async()=>{const b=$('push-test');b.disabled=true;pushStatus('Solicitando teste ao Firebase...');try{pushStatus(await remotePushTest())}catch(e){pushStatus('Teste remoto falhou: '+e.message)}finally{b.disabled=false}};

restore();


// ALIVI FEEDBACK 3.10.5: envio EXPLÍCITO; não envia histórico nem memórias.
const feedbackLabels={suggestion:'Sugestão',bug:'Problema',feature:'Nova função',other:'Outro'};
const feedbackStatuses={received:'Recebido',reviewing:'Em análise',planned:'Planejado',resolved:'Resolvido',closed:'Encerrado'};
let feedbackBusy=false,feedbackRec=null;
function feedbackInfo(text){$('feedback-status').textContent=text}
function feedbackRow(entry){
 const d=document.createElement('div');d.className='item';
 const tag=document.createElement('span');tag.className='feedback-tag';tag.textContent=(feedbackLabels[entry.category]||'Mensagem')+' • '+(feedbackStatuses[entry.status]||entry.status);
 const date=document.createElement('small');date.textContent=new Date(entry.created_at).toLocaleString('pt-BR');
 const p=document.createElement('p');p.textContent=entry.body;
 d.append(tag,date,p);
 if(entry.owner_reply){const reply=document.createElement('p');reply.textContent='Equipe ALIVI: '+entry.owner_reply;d.append(reply)}
 return d;
}
async function loadFeedbackMine(){
 if(!uid)return;
 const user=uid;
 const list=$('feedback-list');list.textContent='Consultando suas mensagens...';
 try{const token=await getToken();if(uid!==user)return;
 const url=SB+'/rest/v1/alivi_feedback_messages?select=id,category,body,app_version,status,owner_reply,created_at&user_id=eq.'+encodeURIComponent(user)+'&order=created_at.desc&limit=15';
 const r=await fetch(url,{headers:{apikey:PUB,Authorization:'Bearer '+token},cache:'no-store'});
 const rows=await r.json().catch(()=>[]);if(!r.ok)throw Error(rows.message||'HTTP '+r.status);
 if(uid!==user)return;list.replaceChildren();if(!rows.length){const p=document.createElement('p');p.className='hint';p.textContent='Nenhum feedback enviado ainda.';list.append(p)}
 for(const row of rows)list.append(feedbackRow(row));
 }catch(e){if(uid===user)list.textContent='Não foi possível carregar. '+e.message}
}
$('feedback-refresh').addEventListener('click',loadFeedbackMine);
$('feedback-form').addEventListener('submit',async ev=>{
 ev.preventDefault();if(!uid||feedbackBusy)return;
 const text=$('feedback-body').value.trim();if(text.length<3||text.length>1800){feedbackInfo('Digite entre 3 e 1800 caracteres.');return}
 if(!window.confirm('Enviar esta mensagem para a equipe ALIVI? Apenas o texto deste formulário será compartilhado.'))return;
 feedbackBusy=true;$('feedback-send').disabled=true;feedbackInfo('Enviando à equipe ALIVI...');
 const who=uid;
 try{const token=await getToken();if(!token||uid!==who)throw Error('Entre novamente para enviar.');
 const r=await fetch(SB+'/rest/v1/alivi_feedback_messages',{method:'POST',headers:{apikey:PUB,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:who,category:$('feedback-category').value,body:text,app_version:VERSION})});
 if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.message||'HTTP '+r.status)}
 if(uid===who){$('feedback-body').value='';feedbackInfo('Mensagem enviada e registrada. Obrigado por ajudar a ALIVI!');await loadFeedbackMine()}
 }catch(e){feedbackInfo('Não foi possível enviar: '+e.message)}finally{feedbackBusy=false;$('feedback-send').disabled=false}
});
const FeedbackRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
$('feedback-dictate').addEventListener('click',()=>{
 if(!FeedbackRecognition){feedbackInfo('Ditado não disponível neste navegador. Escreva sua mensagem.');return}
 if(feedbackRec){feedbackRec.stop();return}
 if(voiceModeOn)setVoiceMode(false);
 const rec=new FeedbackRecognition();feedbackRec=rec;rec.lang='pt-BR';rec.interimResults=true;rec.continuous=false;
 const previous=$('feedback-body').value.trim();let words='';
 $('feedback-dictate').textContent='■ Parar ditado';feedbackInfo('🎙 Ouvindo. Sua fala será escrita, mas não enviada automaticamente.');
 rec.onresult=e=>{let s='';for(let i=0;i<e.results.length;i++)s+=(e.results[i][0]?.transcript||'')+' ';words=s.trim();$('feedback-body').value=(previous+' '+words).trim()};
 rec.onerror=e=>feedbackInfo('Microfone: '+(e.error||'indisponível'));
 rec.onend=()=>{feedbackRec=null;$('feedback-dictate').textContent='🎙 Ditar mensagem';if(words)feedbackInfo('Texto registrado. Revise e clique em Enviar à equipe.')};
 try{rec.start()}catch(e){feedbackRec=null;$('feedback-dictate').textContent='🎙 Ditar mensagem';feedbackInfo('Não foi possível iniciar o microfone: '+e.message)}
});
