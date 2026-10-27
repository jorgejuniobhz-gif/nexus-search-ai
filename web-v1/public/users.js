// Administration requests are protected again by the backend; hiding controls is not authorization.
let editedUser=null,accountList=[],selectedPaths=new Set(),pickerEpoch=0,pickerControllers=new Set();
const userMessage=text=>$('userStatus').textContent=text;
function cancelPicker(){pickerEpoch++;for(const c of pickerControllers)c.abort();pickerControllers.clear();}
document.addEventListener('nexus-session-ended',()=>{cancelPicker();accountList=[];selectedPaths.clear();editedUser=null;$('permissionTree').replaceChildren();$('userList').replaceChildren();$('selectedPaths').replaceChildren();$('userForm').reset();userMessage('');});
async function pickerApi(url,epoch){const c=new AbortController();pickerControllers.add(c);try{const result=await api(url,{signal:c.signal});if(epoch!==pickerEpoch)throw new DOMException('Cancelled','AbortError');return result;}finally{pickerControllers.delete(c);}}
function paintSelected(){
 $('selectedPaths').replaceChildren();for(const p of selectedPaths){const row=el('div',undefined,'grant-tag');row.append(el('span',p),button('Remover',()=>{selectedPaths.delete(p);paintSelected();}));$('selectedPaths').append(row);}
 for(const box of $('permissionTree').querySelectorAll('input[type=checkbox]'))box.checked=selectedPaths.has(box.value);
}
function permissionNode(item){
 const li=el('li'),row=el('div',undefined,'permission-row'),children=el('ul',undefined,'tree-children');children.hidden=true;let loaded=false,loading=false,offset=0;
 const checkbox=el('input');checkbox.type='checkbox';checkbox.value=item.path;checkbox.checked=selectedPaths.has(item.path);checkbox.addEventListener('change',()=>{if(checkbox.checked)selectedPaths.add(item.path);else selectedPaths.delete(item.path);paintSelected();});
 const label=el('label');label.append(checkbox,el('span',item.name));label.title=item.path;
 const expand=button('▸',()=>{children.hidden=!children.hidden;expand.setAttribute('aria-expanded',String(!children.hidden));expand.textContent=children.hidden?'▸':'▾';if(!children.hidden&&!loaded&&!loading)load();});expand.className='tree-toggle';expand.setAttribute('aria-label','Mostrar subpastas para permissão: '+item.name);expand.setAttribute('aria-expanded','false');
 async function load(){
  loading=true;const epoch=pickerEpoch;children.querySelector(':scope > .tree-control')?.remove();const control=el('li',undefined,'tree-control');control.textContent='Carregando…';children.append(control);
  try{const data=await pickerApi('/api/folders?'+new URLSearchParams({folder:item.path,offset}),epoch);control.remove();for(const folder of data.items)children.append(permissionNode({path:folder.fullPath,name:folder.name}));offset+=data.items.length;loaded=true;if(!offset)children.append(el('li','Sem subpastas indexadas.','tree-empty'));if(offset<data.total){const more=el('li',undefined,'tree-control');more.append(button('Carregar mais pastas',load));children.append(more);}paintSelected();}
  catch(e){if(epoch===pickerEpoch&&e.name!=='AbortError')control.replaceChildren(el('span','Falha ao carregar. '),button('Tentar novamente',load));}finally{loading=false;}
 }
 row.append(expand,label);li.append(row,children);return li;
}
async function loadPermissionRoots(){cancelPicker();const epoch=pickerEpoch;$('permissionTree').replaceChildren(el('p','Carregando pastas…','tree-help'));try{const result=await pickerApi('/api/roots',epoch);const list=el('ul',undefined,'tree-roots');for(const root of result.roots)list.append(permissionNode(root));$('permissionTree').replaceChildren(list);paintSelected();}catch(e){if(epoch===pickerEpoch&&e.name!=='AbortError')$('permissionTree').replaceChildren(el('p',e.message,'tree-help'),button('Tentar novamente',loadPermissionRoots));}}
function editAccount(user=null){
 editedUser=user;$('userForm').reset();$('userFormTitle').textContent=user?'Editar '+user.name:'Novo usuário';$('userName').value=user?.name||'';$('userLogin').value=user?.username||'';$('userPassword').required=!user;$('userPassword').value='';$('userActive').checked=user?.active??true;$('userDownloads').checked=user?.downloads??false;selectedPaths=new Set(user?.paths||[]);$('passwordHelp').textContent=user?'Deixe a senha vazia para mantê-la. Se trocar, use pelo menos 12 caracteres.':'Pelo menos 12 caracteres. Informe a senha à pessoa por um canal privado.';userMessage('');paintSelected();loadPermissionRoots();
}
function renderAccounts(){
 $('userList').replaceChildren();if(!accountList.length){$('userList').append(el('p','Nenhum usuário cadastrado. Comece em “Novo usuário”.','tree-help'));return;}
 for(const user of [...accountList].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))){const row=el('article',undefined,'account-row'),info=el('div');info.append(el('h4',user.name),el('p',user.username+' · '+(user.active?'Ativo':'Desativado')+' · '+user.paths.length+' pasta(s)'));const actions=el('div',undefined,'account-actions');actions.append(button('Editar',()=>editAccount(user)),button(user.active?'Desativar':'Ativar',async()=>{const epoch=pickerEpoch;try{const data=await api('/api/admin/users/'+user.id,{method:'POST',body:JSON.stringify({...user,active:!user.active})});if(epoch!==pickerEpoch||currentUser?.role!=='admin'||$('usersPanel').hidden)return;accountList=accountList.map(u=>u.id===data.user.id?data.user:u);renderAccounts();if(editedUser?.id===user.id)editAccount(data.user);userMessage('Conta atualizada. As sessões anteriores foram encerradas.');}catch(e){userMessage(e.message);}}));row.append(info,actions);$('userList').append(row);}
}
async function openAccounts(){
 if(currentUser?.role!=='admin')return;
 $('workspace').hidden=true;$('usersPanel').hidden=false;userMessage('Carregando usuários…');try{const data=await api('/api/admin/users');if(currentUser?.role!=='admin'||$('usersPanel').hidden)return;accountList=data.users;renderAccounts();$('globalDownloads').textContent=data.downloadsEnabled?'Downloads globais habilitados. Cada pessoa também precisa desta permissão.':'Downloads globais desativados no .env. A permissão individual só terá efeito quando forem habilitados.';editAccount();}catch(e){userMessage(e.message);}
}
$('manageUsers').addEventListener('click',openAccounts);
$('backToSearch').addEventListener('click',()=>{cancelPicker();$('userPassword').value='';$('usersPanel').hidden=true;$('workspace').hidden=false;});
$('newUser').addEventListener('click',()=>editAccount());$('cancelUser').addEventListener('click',()=>editAccount());
$('userForm').addEventListener('submit',async e=>{
 e.preventDefault();$('saveUser').disabled=true;const epoch=pickerEpoch;
 try{const input={username:$('userLogin').value,name:$('userName').value,password:$('userPassword').value,active:$('userActive').checked,downloads:$('userDownloads').checked,paths:[...selectedPaths],...(editedUser?{version:editedUser.version}:{})};const data=await api('/api/admin/users'+(editedUser?'/'+editedUser.id:''),{method:'POST',body:JSON.stringify(input)});if(epoch!==pickerEpoch||currentUser?.role!=='admin')return;accountList=accountList.filter(u=>u.id!==data.user.id).concat(data.user);renderAccounts();editAccount(data.user);userMessage('Usuário salvo. Senha não é exibida nem recuperável. Sessões anteriores encerradas.');}
 catch(e){userMessage(e.message);}finally{$('saveUser').disabled=false;}
});
