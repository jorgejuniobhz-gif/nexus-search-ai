const $=id=>document.getElementById(id);
let offset=0,total=0,folder='',timer,controller,version=0,downloads=false,currentUser=null;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function message(s){$('status').textContent=s;}
async function api(url,options={}){const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});const data=await res.json();if(res.status===401){showLogin();}if(!res.ok)throw Error(data.error||'Não foi possível concluir.');return data;}
function showLogin(){$('searchMode').value='names';$('contentOption').disabled=true;$('changePassword').hidden=true;for(const id of ['query','ext','category','modifiedFrom','modifiedTo'])$(id).value='';$('type').value='all';$('location').replaceChildren();$('summary').textContent='Pronto para pesquisar';$('page').textContent='';document.dispatchEvent(new Event('nexus-session-ended'));currentUser=null;$('usersPanel').hidden=true;$('manageUsers').hidden=true;$('identity').textContent='● Acesso protegido';resetTree();folder='';offset=0;controller?.abort();clearTimeout(timer);version++;$('login').hidden=false;$('workspace').hidden=true;$('logout').hidden=true;$('results').replaceChildren();$('password').value='';}
async function enter(){const session=await api('/api/session');downloads=session.downloads;$('contentOption').disabled=!session.contentEnabled;$('changePassword').hidden=false;currentUser=session.user;$('identity').textContent='● '+session.user.name;$('manageUsers').hidden=session.user.role!=='admin';$('usersPanel').hidden=true;$('login').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;$('password').value='';message('Sessão de 30 minutos.');search();loadTree();}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',body:JSON.stringify({username:$('username').value,password:$('password').value})});await enter();}catch(e){message(e.message);}});
$('logout').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST',body:'{}'});showLogin();message('Sessão encerrada.');}catch(e){message(e.message);}});
function navigate(p){folder=p;offset=0;markSelection();search();}
function crumbs(p,root){const nav=el('div',undefined,'crumbs');const parts=p.split('\\');let accumulated='';parts.forEach((part,i)=>{accumulated+=part+(i<parts.length-1?'\\':'');if(!part)return;const target=accumulated;const within=target.replace(/\\$/,'').length>=root.replace(/\\$/,'').length;nav.append(within?button(part,()=>navigate(target)):el('span',part));if(i<parts.length-1)nav.append(el('span','›'));});return nav;}
async function copy(text){if(!text){message('UNC não configurado. Configure o mapeamento local da raiz.');return false;}try{await navigator.clipboard.writeText(text);message('Caminho copiado.');return true;}catch{message('Cópia automática indisponível. Caminho: '+text);return false;}}
function render(items){$('results').replaceChildren();if(!items.length){$('results').append(el('div','Nenhum resultado encontrado. Tente outro termo ou ajuste os filtros.','empty'));return;}
 for(const item of items){const row=el('article',undefined,'row'),icon=el('div',item.type==='folder'?'PASTA':(item.name.split('.').pop().slice(0,6).toUpperCase()),'icon'),info=el('div',undefined,'info');info.append(el('h3',item.name,'name'),crumbs(item.path,item.rootPath),el('div',item.type==='folder'?'Pasta':item.size===null?'Arquivo':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(item.size/1024)+' KB','meta'));
 if(item.page){info.append(el('div','Página '+item.page,'meta'),el('p',item.snippet,'snippet'));}
 const actions=el('div',undefined,'actions');actions.append(button('Copiar UNC',()=>copy(item.unc)));
 if(item.type==='folder')actions.append(button('Explorar →',()=>navigate(item.fullPath)));
 else{actions.append(button('Abrir no Windows',async()=>{if(await copy(item.unc||item.fullPath))message('Caminho copiado. Cole na barra do Explorador do Windows para abrir o original com sua conta Windows. O navegador pode bloquear links locais.');}));if(downloads)actions.append(button('Verificar download',async()=>{try{await api('/api/access',{method:'POST',body:JSON.stringify({id:item.id})});const link=el('a','Baixar arquivo');link.href='/api/download?id='+encodeURIComponent(item.id);link.download='';actions.append(link);message('Leitura autorizada para sua conta no Nexus. O acesso será revalidado ao baixar.');}catch(e){message(e.message);}}));}
 row.append(icon,info,actions);$('results').append(row);}
}
function hasSearchFilter(){return Boolean($('query').value.trim()||$('ext').value.trim()||$('category').value||$('modifiedFrom').value||$('modifiedTo').value);}
async function search(){clearTimeout(timer);controller?.abort();controller=new AbortController();const current=++version;$('results').setAttribute('aria-busy','true');$('summary').textContent='Pesquisando…';$('previous').disabled=true;$('next').disabled=true;message('');$('location').replaceChildren();if(folder){const root=treeRoots.find(r=>isUnder(r.path,folder));$('location').append(crumbs(folder,root?.path||folder),el('small',hasSearchFilter()?'Pesquisando nesta pasta e subpastas':'Conteúdo direto desta pasta'));}else $('location').append(el('span','Pesquisa em todas as pastas permitidas'));$('query').placeholder=$('searchMode').value==='content'?'Pesquisar texto dentro de PDFs e imagens…':folder?'Pesquisar nesta pasta e nas subpastas…':'Pesquisar nomes ou caminhos de arquivos…';
 try{if($('searchMode').value==='content'&&!$('query').value.trim()){$('results').replaceChildren(el('div','Digite um termo para pesquisar no conteúdo indexado.','empty'));$('summary').textContent='Pesquisa por conteúdo';$('page').textContent='';return;}if($('modifiedFrom').value&&$('modifiedTo').value&&$('modifiedFrom').value>$('modifiedTo').value)throw Error('A data inicial deve ser anterior ou igual à data final.');const params=new URLSearchParams({modifiedFrom:$('modifiedFrom').value,modifiedTo:$('modifiedTo').value,q:$('query').value,type:$('type').value,ext:$('ext').value.trim().toLowerCase()||$('category').value,folder,view:folder&&!hasSearchFilter()&&$('searchMode').value!=='content'?'children':'subtree',offset,count:$('count').value});const data=await api(($('searchMode').value==='content'?'/api/content-search?':'/api/search?')+params,{signal:controller.signal});if(current!==version)return;total=data.total;render(data.items);$('summary').textContent=total.toLocaleString('pt-BR')+($('searchMode').value==='content'?(total===1?' página encontrada':' páginas encontradas'):(total===1?' resultado':' resultados'));$('page').textContent=total?`${offset+1}–${Math.min(offset+data.items.length,total)} de ${total.toLocaleString('pt-BR')}`:'Sem resultados';$('previous').disabled=offset===0;$('next').disabled=offset+Number($('count').value)>=total;
 }catch(e){if(current!==version||e.name==='AbortError')return;$('results').replaceChildren(el('div','Não foi possível carregar os resultados.','empty'));$('summary').textContent='Pesquisa indisponível';$('page').textContent='';message(e.message);}finally{if(current===version)$('results').setAttribute('aria-busy','false');}}
function schedule(){offset=0;controller?.abort();version++;timer&&clearTimeout(timer);timer=setTimeout(search,350);}
$('query').addEventListener('input',schedule);$('ext').addEventListener('input',schedule);for(const id of ['searchMode','category','type','count','modifiedFrom','modifiedTo'])$(id).addEventListener('change',()=>{offset=0;search();});
$('clear').addEventListener('click',()=>{for(const id of ['query','ext','category','modifiedFrom','modifiedTo'])$(id).value='';$('type').value='all';offset=0;search();});
$('previous').addEventListener('click',()=>{offset=Math.max(0,offset-Number($('count').value));search();});$('next').addEventListener('click',()=>{offset+=Number($('count').value);search();});

// Tree requests belong to one login generation and are discarded after logout/refresh.
let treeEpoch=0,treeRoots=[],treeNodes=new Map(),treeRequests=new Set();
const pathKey=p=>p.replace(/\\$/,'').toLowerCase();
const isUnder=(parent,p)=>pathKey(p)===pathKey(parent)||pathKey(p).startsWith(pathKey(parent)+'\\');
function resetTree(){treeEpoch++;for(const c of treeRequests)c.abort();treeRequests.clear();treeRoots=[];treeNodes.clear();$('folderTree').replaceChildren();$('treeStatus').textContent='';}
function markSelection(){for(const node of treeNodes.values()){const selected=pathKey(node.item.fullPath)===pathKey(folder);node.label.classList.toggle('selected',selected);if(selected)node.label.setAttribute('aria-current','location');else node.label.removeAttribute('aria-current');}$('allRoots').classList.toggle('selected',!folder);}
async function treeApi(url,epoch){const c=new AbortController();treeRequests.add(c);try{const data=await api(url,{signal:c.signal});if(epoch!==treeEpoch)throw new DOMException('Cancelled','AbortError');return data;}finally{treeRequests.delete(c);}}
function treeNode(item){
 const li=el('li'),row=el('div',undefined,'tree-row'),children=el('ul',undefined,'tree-children');children.hidden=true;
 const toggle=button('▸',()=>{if(node.open){node.open=false;children.hidden=true;toggle.textContent='▸';toggle.setAttribute('aria-expanded','false');}else{node.open=true;children.hidden=false;toggle.textContent='▾';toggle.setAttribute('aria-expanded','true');if(!node.loaded&&!node.loading)loadChildren(node);}});
 toggle.className='tree-toggle';toggle.setAttribute('aria-label','Expandir ou recolher '+item.name);toggle.setAttribute('aria-expanded','false');
 const label=button('▱ '+item.name,()=>navigate(item.fullPath));label.className='tree-label';label.title=item.fullPath;
 const node={item,li,label,toggle,children,open:false,loaded:false,loading:false,offset:0};row.append(toggle,label);li.append(row,children);treeNodes.set(pathKey(item.fullPath),node);return node;
}
async function loadChildren(node){
 const epoch=treeEpoch;node.loading=true;node.children.querySelector(':scope > .tree-control')?.remove();const control=el('li',undefined,'tree-control');control.append(el('span','Carregando…'));node.children.append(control);node.toggle.setAttribute('aria-busy','true');
 try{const params=new URLSearchParams({folder:node.item.fullPath,offset:node.offset});const data=await treeApi('/api/folders?'+params,epoch);control.remove();for(const item of data.items)node.children.append(treeNode(item).li);node.offset+=data.items.length;node.loaded=true;
  if(!node.offset)node.children.append(el('li','Sem subpastas indexadas.','tree-empty'));
  if(node.offset<data.total){const more=el('li',undefined,'tree-control');more.append(button('Carregar mais pastas',()=>loadChildren(node)));node.children.append(more);}markSelection();
 }catch(e){if(epoch!==treeEpoch||e.name==='AbortError')return;control.replaceChildren(el('span','Não foi possível carregar. '),button('Tentar novamente',()=>loadChildren(node)));}
 finally{node.loading=false;node.toggle.removeAttribute('aria-busy');}
}
async function loadTree(){resetTree();const epoch=treeEpoch;$('treeStatus').textContent='Carregando pastas permitidas…';try{const data=await treeApi('/api/roots',epoch);treeRoots=data.roots;const list=el('ul',undefined,'tree-roots');for(const root of treeRoots)list.append(treeNode({name:root.name,fullPath:root.path}).li);$('folderTree').append(list);$('treeStatus').textContent='';markSelection();}catch(e){if(epoch===treeEpoch&&e.name!=='AbortError')$('treeStatus').textContent=e.message;}}
$('allRoots').addEventListener('click',()=>navigate(''));
$('refreshTree').addEventListener('click',()=>loadTree());
enter().catch(()=>message('Entre para pesquisar suas pastas permitidas.'));

$('changePassword').addEventListener('click',()=>{$('passwordForm').reset();$('passwordStatus').textContent='';$('passwordDialog').showModal();});
$('cancelPassword').addEventListener('click',()=>$('passwordDialog').close());
$('passwordDialog').addEventListener('close',()=>{$('passwordForm').reset();$('passwordStatus').textContent='';});
document.addEventListener('nexus-session-ended',()=>{$('passwordDialog').close();$('passwordForm').reset();});
$('passwordForm').addEventListener('submit',async e=>{
 e.preventDefault();if($('newPassword').value!==$('confirmPassword').value){$('passwordStatus').textContent='A confirmação deve ser igual à nova senha.';return;}
 $('savePassword').disabled=true;try{await api('/api/password',{method:'POST',body:JSON.stringify({currentPassword:$('currentPassword').value,newPassword:$('newPassword').value,confirmPassword:$('confirmPassword').value})});showLogin();message('Senha alterada. Entre novamente com sua nova senha.');}catch(e){$('passwordStatus').textContent=e.message;}finally{$('savePassword').disabled=false;}
});
