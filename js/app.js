/* ============================================================
   FRACAS POC — html/css/js demo (no backend)
   Data: data.json seed → localStorage working copy.
   Entry: Entra ID sign-in (simulated) → every workspace from the nav.
   Phase 1: Admin/configuration · Phase 2: Reporting & review
   ============================================================ */
'use strict';

/* ---------------- persistence ---------------- */
const LS_KEY = 'fracas_poc_v2';
let DB = null;

async function loadDB(){
  const cached = localStorage.getItem(LS_KEY);
  if(cached){ try{ DB = JSON.parse(cached); return; }catch(e){ /* fall through */ } }
  try{
    const r = await fetch('data.json');
    if(r.ok){ DB = await r.json(); saveDB(); return; }
  }catch(e){ /* file:// — fetch blocked */ }
  DB = JSON.parse(JSON.stringify(window.SEED)); // embedded fallback
  saveDB();
}
function saveDB(){ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function resetDB(){
  confirmBox('Reset demo data', 'This clears every change you made and reloads the seed data.json. Continue?', ()=>{
    localStorage.removeItem(LS_KEY); location.reload();
  });
}
function exportJSON(){
  const blob = new Blob([JSON.stringify(DB, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fracas-data.json';
  a.click(); URL.revokeObjectURL(a.href);
  toast('Current dataset exported as fracas-data.json');
}
function importJSON(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,application/json';
  inp.onchange = ()=>{
    const f = inp.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = ()=>{
      try{
        const d = JSON.parse(rd.result);
        if(!d.products || !d.nodes || !d.dispositions) throw new Error('missing keys');
        DB = d; saveDB(); toast('Dataset imported'); render();
      }catch(e){ toast('Import failed — not a valid FRACAS dataset', true); }
    };
    rd.readAsText(f);
  };
  inp.click();
}

/* ---------------- helpers ---------------- */
const $app = ()=>document.getElementById('app');
function uid(p){ return p + '_' + Math.random().toString(36).slice(2,9); }
function nowTS(){ const d=new Date(); return d.toISOString().slice(0,10)+' '+d.toTimeString().slice(0,5); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function audit(action, detail){
  DB.audit.unshift({ ts: nowTS(), user: state.user.name, action, detail });
  saveDB();
}
let toastTimer=null;
function toast(msg, isErr){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.className=isErr?'err':'';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.remove(), 3200);
}

/* generic modal */
function modal(title, bodyHTML, footHTML){
  const root=document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-wrap" id="mwrap">
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="m-h"><h3>${esc(title)}</h3></div>
      <div class="m-b">${bodyHTML}</div>
      <div class="m-f">${footHTML}</div>
    </div></div>`;
  root.querySelector('#mwrap').addEventListener('click', e=>{ if(e.target.id==='mwrap') closeModal(); });
  const first=root.querySelector('input,select,textarea,button'); if(first) first.focus();
}
function closeModal(){ document.getElementById('modal-root').innerHTML=''; }
function confirmBox(title, msg, onYes){
  modal(title, `<p style="margin:0">${esc(msg)}</p>`,
    `<button class="btn line" onclick="closeModal()">Cancel</button>
     <button class="btn danger" id="cf-yes">Yes, continue</button>`);
  document.getElementById('cf-yes').onclick=()=>{ closeModal(); onYes(); };
}

/* ---------------- session (Entra ID SSO, simulated) ---------------- */
/* One signed-in work account. In production the actor comes from the user's
   Entra ID group membership (NFR-2 / NFR-3) and cannot be changed from the UI;
   the POC's Impersonate control below stands in for that assignment so the
   demo can walk through each actor's workspace. */
const ROLES = {
  Engineering_Administrator: {
    label:'Engineering Administrator',
    nav:['catalog','reports','audit','dispositions'],   // nav[0] is this role's landing view
    canCorrect:false,
  },
  Engineering_Representative: {
    label:'Engineering Representative',
    nav:['reports'],
    canCorrect:true,
  },
  Failure_Reporter: {
    label:'Failure Reporter',
    nav:['reports','newReport'],
    canCorrect:false,
  },
  Finance_Representative: {
    label:'Finance Representative',
    nav:['finance'],
    canCorrect:false,
  },
};
const ACTORS = Object.keys(ROLES);
const DEFAULT_ROLE = 'Engineering_Administrator';

const SESSION = {
  name:'T. Therrien',
  email:'t.therrien@traxtion.com',
  initials:'TT',
};

/* ---------------- brand mark ----------------
   Official TraXtion logo. To run fully offline, save the PNG next to
   index.html as assets/traxtion-logo.png and point LOGO_SRC at it. */
const LOGO_SRC = 'https://traxtion.com/wp-content/uploads/2021/09/TraXtion-logo-CMYK_Registered-1536x204.png';
function logoTag(cls, fbClass){
  return `<span class="logo ${cls}"><img src="${LOGO_SRC}" alt="TraXtion"
    onerror="logoFallback(this,'${fbClass}')"></span>`;
}
/* if the image can't load (offline demo), fall back to the wordmark */
function logoFallback(img, cls){
  img.parentNode.outerHTML = `<span class="${cls}">Tra<i>X</i>tion</span>`;
}

/* ---------------- icons ---------------- */
const ICONS = {
  reports:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9.5l2 2 3.5-3.5"/><path d="M7 15h4"/><path d="M14.5 15H17"/></svg>',
  newReport:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/></svg>',
  finance:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8h18z"/><path d="M3 8h18"/><path d="M6 11v6M10 11v6M14 11v6M18 11v6"/><path d="M3 20h18"/></svg>',
  catalog:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/></svg>',
  audit:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 4.4 8 7 5"/><path d="M3 12.5 4.4 14 7 11"/><path d="M3 18.5 4.4 20 7 17"/><path d="M10.5 6.5h10M10.5 12.5h10M10.5 18.5h10"/></svg>',
  dispositions:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h10M18 6h3"/><circle cx="15.5" cy="6" r="2.1"/><path d="M3 12h4M11 12h10"/><circle cx="9" cy="12" r="2.1"/><path d="M3 18h8M16 18h5"/><circle cx="13.5" cy="18" r="2.1"/></svg>',
  users:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M2.8 19c0-3 2.8-4.7 6.2-4.7s6.2 1.7 6.2 4.7"/><path d="M16.4 11.1a3 3 0 1 0-1.1-5.6"/><path d="M18 19c0-2.2-.8-3.7-2.3-4.5"/></svg>',
  data:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H8a2 2 0 0 0-2 2v3.4L4 12l2 2.6V18a2 2 0 0 0 2 2h1"/><path d="M15 4h1a2 2 0 0 1 2 2v3.4l2 2.6-2 2.6V18a2 2 0 0 1-2 2h-1"/></svg>'
};
/* row-action icons for the report list — pen for the actor that may correct,
   eye for everyone else (see canCorrect / ROLES) */
const ACTION_ICONS = {
  view:'<svg class="ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12z"/><circle cx="12" cy="12" r="2.9"/></svg>',
  edit:'<svg class="ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5h3.6L19.3 8.3a1.9 1.9 0 0 0 0-2.7l-.9-.9a1.9 1.9 0 0 0-2.7 0L4.5 15.9v3.6z"/><path d="M14.3 6.7l3.6 3.6"/></svg>',
  trash:'<svg class="ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1z"/><path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12"/><path d="M10 11v6M14 11v6"/></svg>',
};
const CHEVRON = '<svg class="ico-sm chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>';
const MS_LOGO = '<svg viewBox="0 0 21 21" aria-hidden="true">'
  + '<rect x="1" y="1" width="9" height="9" fill="#f25022"/>'
  + '<rect x="11" y="1" width="9" height="9" fill="#7fba00"/>'
  + '<rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>'
  + '<rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>';

/* ---------------- navigation ----------------
   One flat list. Which items appear is decided by the impersonated actor
   (ROLES[state.role].nav), so the nav needs no group headings. */
const NAV_ITEMS = {
  reports:      'Failure reports',
  newReport:    'New report',
  finance:      'Disposition summary',
  catalog:      'Products & variants',
  audit:        'Audit logs',
  dispositions: 'Disposition list',
  users:        'User access',
  data:         'Data (JSON)',
};
const roleDef      = r => ROLES[r] || ROLES[DEFAULT_ROLE];
const navFor       = r => roleDef(r).nav.map(id=>({id, label:NAV_ITEMS[id]||id}));
const defaultViewFor = r => roleDef(r).nav[0];
const canSeeView   = (r,v) => roleDef(r).nav.includes(v);

/* ---------------- state ---------------- */
const state = {
  user:null, role:DEFAULT_ROLE, view:defaultViewFor(DEFAULT_ROLE),
  sel:{ productId:null, variantId:null, nodeId:null }, // admin catalog selection
  collapsed:{ products:false, variants:false },        // catalog panels folded to their header
  draft:null,          // failure report draft
  openReportId:null,   // detail view
  detailFocus:null,    // node focused in detail master-detail
  correction:null,     // {reportId, working} while a correction is being edited
  filters:{ q:'', product:'', origin:'', from:'', to:'' },
  sort:{ key:'date', dir:-1 },
};

/* ---------------- data accessors ---------------- */
const prodById   = id => DB.products.find(p=>p.id===id);
const varById    = id => DB.variants.find(v=>v.id===id);
const nodeById   = id => DB.nodes.find(n=>n.id===id);
const dispById   = id => DB.dispositions.find(d=>d.id===id);
const variantsOf = pid => DB.variants.filter(v=>v.productId===pid);
const nodesOf    = vid => DB.nodes.filter(n=>n.variantId===vid);
const childrenOf = (vid,parentId) => nodesOf(vid).filter(n=>n.parentId===parentId);

function descendantIds(nodeId){
  const out=[]; const walk=(id)=>{ DB.nodes.filter(n=>n.parentId===id).forEach(c=>{ out.push(c.id); walk(c.id); }); };
  walk(nodeId); return out;
}
function nodePath(node){
  const parts=[node.name]; let p=node.parentId;
  while(p){ const pn=nodeById(p); if(!pn) break; parts.unshift(pn.name); p=pn.parentId; }
  return parts.join(' / ');
}
function partPath(p){ // snapshot first (FR-2.8: report shows what was true at submission), live lookup as fallback
  if(p.nodePath) return p.nodePath;
  const n=nodeById(p.nodeId); return n?nodePath(n):'(node removed)';
}
function partName(p){ return p.nodeName || nodeById(p.nodeId)?.name || '(node removed)'; }
function partType(p){ return p.nodeType || nodeById(p.nodeId)?.type || 'component'; }
function nextReportId(){
  const yr=new Date().getFullYear();
  const nums=DB.reports.map(r=>{ const m=r.id.match(/(\d+)$/); return m?+m[1]:0; });
  const n=(Math.max(0,...nums)+1).toString().padStart(4,'0');
  return `FR-${yr}-${n}`;
}

/* ============================================================
   RENDER ROOT
   ============================================================ */
function render(){
  if(!state.user){ renderLogin(); return; }
  renderShell();
}

/* ---------------- login (landing) ----------------
   One way in: Microsoft Entra ID single sign-on (NFR-2). */
function renderLogin(){
  $app().innerHTML = `
  <div class="login">
    <div class="groove"></div>
    <div class="login-body">
      <div class="login-card">
        <div class="card-b">
          <div class="login-lockup">
            ${logoTag('logo-login','login-mark')}
            <span class="pipe" aria-hidden="true"></span>
            <h1>FRACAS</h1>
          </div>
          <p class="lede">Failure reporting, analysis and corrective action. Sign in with your TraXtion work account to continue.</p>
          <button class="ms-btn" id="ms-signin" onclick="signIn()">
            ${MS_LOGO}<span>Sign in with Microsoft</span></button>
        </div>
        <div class="login-strip">Proof of concept — the sign-in is simulated</div>
      </div>
    </div>
    <div class="login-foot">TraXtion FRACAS · demo data stays in this browser</div>
    <div class="groove"></div>
  </div>`;
}
function signIn(){
  const b=document.getElementById('ms-signin');
  if(b){ b.disabled=true; b.querySelector('span').textContent='Signing in…'; }
  setTimeout(()=>{
    state.user={...SESSION};
    state.role=DEFAULT_ROLE;
    state.view=defaultViewFor(state.role);
    state.openReportId=null; state.draft=null; state.correction=null; state.detailFocus=null;
    render();
    toast(`Signed in as ${SESSION.name}`);
  }, 450);
}
function signOut(){
  confirmBox('Sign out', 'You will be returned to the sign-in screen. Any unsubmitted draft is kept in this browser.', ()=>{
    state.user=null; state.correction=null; state.openReportId=null; state.detailFocus=null;
    render();
  });
}

/* ---------------- impersonate (POC ONLY) ----------------
   Not part of the specified product. In production the actor is fixed by the
   signed-in user's Entra ID assignment (NFR-3); this control exists purely so
   the demo can show each actor's workspace without four sign-ins. */
function impersonate(){
  const rows = ACTORS.map(k=>`
    <label class="role-opt ${k===state.role?'on':''}">
      <input type="radio" name="imp-role" value="${k}" ${k===state.role?'checked':''}>
      <span class="role-opt-txt">
        <b>${esc(ROLES[k].label)}</b>
        <span>${esc(roleDef(k).nav.map(id=>NAV_ITEMS[id]||id).join(' · '))}</span>
      </span>
    </label>`).join('');
  modal('Impersonate a role',
    `<p class="m-lede">Proof-of-concept control — switches which workspaces the nav offers.
      Real deployments take this from Entra ID.</p>
     <div class="role-opts">${rows}</div>`,
    `<button class="btn line" onclick="closeModal()">Cancel</button>
     <button class="btn primary" id="imp-go">Switch role</button>`);
  const syncPick=()=>document.querySelectorAll('.role-opt').forEach(l=>
    l.classList.toggle('on', l.querySelector('input').checked));
  document.querySelectorAll('input[name="imp-role"]').forEach(r=>{ r.onchange=syncPick; });
  document.getElementById('imp-go').onclick=()=>{
    const picked=document.querySelector('input[name="imp-role"]:checked');
    if(!picked) return;
    closeModal();
    setRole(picked.value);
  };
}
function setRole(role){
  if(!ROLES[role] || role===state.role) return;
  const apply=()=>{
    state.role=role;
    state.correction=null; state.openReportId=null; state.detailFocus=null;
    if(!canSeeView(state.role, state.view)) state.view=defaultViewFor(state.role);
    render();
    toast(`Now impersonating ${ROLES[role].label}`);
  };
  if(state.correction){
    confirmBox('Discard correction','Switching role will close this report. Unsaved correction changes will be lost.', apply);
    return;
  }
  apply();
}

/* ---------------- shell ---------------- */
function renderShell(){
  const nav = `<div class="nav-group">${navFor(state.role).map(v=>`
      <button class="${state.view===v.id?'active':''}" onclick="go('${v.id}')">
        ${ICONS[v.id]||''}<span>${esc(v.label)}</span></button>`).join('')}</div>`;
  $app().innerHTML = `
  <div class="topbar">
    ${logoTag('logo-top','wordmark')}
    <span class="divider"></span>
    <span class="app-name">FRACAS</span>
    <span class="user-chip">
      <span class="avatar" aria-hidden="true">${esc(state.user.initials)}</span>
      <span class="who"><b>${esc(state.user.name)}</b><span>${esc(state.user.email)}</span></span>
      <button class="btn-ghost impersonate" onclick="impersonate()" title="POC only — switch actor">
        <span class="role-dot" aria-hidden="true"></span>${esc(roleDef(state.role).label)}</button>
      <button class="btn-ghost" onclick="signOut()">Sign out</button>
    </span>
  </div>
  <div class="groove"></div>
  <div class="shell">
    <nav class="sidenav" aria-label="Workspaces">${nav}</nav>
    <main class="content" id="view"></main>
  </div>`;
  renderView();
}
function go(viewId){
  if(!canSeeView(state.role, viewId)) return;
  if(state.correction){ confirmBox('Discard correction','Leave this report? Unsaved correction changes will be lost.',()=>{ state.correction=null; state.openReportId=null; state.detailFocus=null; state.view=viewId; render(); }); return; }
  state.view=viewId; state.openReportId=null; state.detailFocus=null; render();
}

function renderView(){
  const el=document.getElementById('view');
  switch(state.view){
    case 'catalog':      el.innerHTML=viewCatalog(); break;
    case 'dispositions': el.innerHTML=viewDispositions(); break;
    case 'users':        el.innerHTML=viewUsers(); break;
    case 'audit':        el.innerHTML=viewAudit(); break;
    case 'data':         el.innerHTML=viewData(); break;
    case 'newReport':    el.innerHTML=viewNewReport(); break;
    case 'reports':      el.innerHTML= state.openReportId ? viewReportDetail() : viewReports(); break;
    case 'finance':      el.innerHTML=viewFinance(); break;
    default: el.innerHTML='<div class="empty">Nothing here yet.</div>';
  }
}

/* ============================================================
   PHASE 1 — ADMIN
   ============================================================ */
function viewCatalog(){
  const p=state.sel.productId ? prodById(state.sel.productId) : null;
  const v=state.sel.variantId ? varById(state.sel.variantId) : null;

  const prodList = DB.products.map(x=>selRow({
      name:x.name, sub:x.desc||'', on:x.id===state.sel.productId,
      pick:`selProduct('${x.id}')`, rename:`editProduct('${x.id}')`, remove:`delProduct('${x.id}')`,
    })).join('') || '<div class="empty">No products yet.</div>';

  const varList = p ? (variantsOf(p.id).map(x=>selRow({
      name:x.name, sub:`${nodesOf(x.id).length} nodes`, subMono:true,
      on:x.id===state.sel.variantId,
      pick:`selVariant('${x.id}')`, rename:`editVariant('${x.id}')`, remove:`delVariant('${x.id}')`,
    })).join('') || '<div class="empty">No variants yet.</div>')
    : '<div class="empty">Select a product.</div>';

  const n = state.sel.nodeId ? nodeById(state.sel.nodeId) : null;

  return `
  <h2 class="page-title">Products &amp; variants</h2>
  <p class="page-sub">Product Family → Variant → hierarchical Tree of Parts, with per-node failure symptoms &amp; modes.
    Collapse the two upper panels once a variant is picked — the tree and node panel then own the view.</p>
  <div class="cols catalog-grid">
    ${collapsiblePanel('products', 'Products', p && p.name,
      `<button class="btn primary sm" onclick="addProduct()">+ Add</button>`, prodList)}
    ${collapsiblePanel('variants', 'Variants', v && v.name,
      p?`<button class="btn primary sm" onclick="addVariant()">+ Add</button>`:'', varList)}
    ${v ? treePanel(v) : `<div class="panel">
      <div class="panel-h"><h3>Tree of Parts</h3></div>
      <div class="empty">Select a product and variant to build its tree of parts.</div></div>`}
    ${n ? nodeDetailPanel(n) : `<div class="panel">
      <div class="panel-h"><h3>Node symptoms &amp; modes</h3></div>
      <div class="empty">Click a node in the tree of parts to configure its failure symptoms &amp; modes here.</div></div>`}
  </div>`;
}

/* A selectable products/variants row: name over its sub-line, with that entry's
   own rename/remove to the right — the actions belong to the row they act on,
   not to a header bar that only appears once something is selected. */
function selRow(o){
  return `<div class="item ${o.on?'on':''}">
    <button class="item-main" onclick="${o.pick}" title="${esc(o.name)}">
      <span class="nm">${esc(o.name)}</span>
      <span class="ds ${o.subMono?'mono':''}">${esc(o.sub)}</span>
    </button>
    <span class="row-tools">
      <button class="icon-btn act" onclick="${o.rename}"
        title="Rename ${esc(o.name)}" aria-label="Rename ${esc(o.name)}">${ACTION_ICONS.edit}</button>
      <button class="icon-btn act red" onclick="${o.remove}"
        title="Remove ${esc(o.name)}" aria-label="Remove ${esc(o.name)}">${ACTION_ICONS.trash}</button>
    </span>
  </div>`;
}

/* One catalog cell that folds down to its header bar. Collapsed, the header still
   names the current selection, so the choice stays visible without the list. */
function collapsiblePanel(key, title, selName, headBtns, body){
  const open = !state.collapsed[key];
  return `<div class="panel ${open?'':'collapsed'}">
    <div class="panel-h">
      <button class="collapse-btn" aria-expanded="${open}" title="${open?'Collapse':'Expand'} ${esc(title)}"
        onclick="toggleCollapse('${key}')">${CHEVRON}</button>
      <h3>${esc(title)}</h3>
      ${!open && selName ? `<span class="panel-sel">${esc(selName)}</span>` : ''}
      <span class="spacer"></span>${headBtns}
    </div>
    ${open ? `<div class="panel-b sel-list">${body}</div>` : ''}
  </div>`;
}
function toggleCollapse(key){ state.collapsed[key] = !state.collapsed[key]; render(); }
function selProduct(id){ state.sel.productId=id; state.sel.variantId=null; state.sel.nodeId=null; render(); }
function selVariant(id){ state.sel.variantId=id; state.sel.nodeId=null; render(); }
function selNode(id){ state.sel.nodeId = (state.sel.nodeId===id? null : id); render(); }

function treePanel(v){
  const renderKids=(parentId)=>{
    const kids=childrenOf(v.id,parentId);
    if(!kids.length) return '';
    return `<ul>${kids.map(n=>`
      <li>
        <div class="node-row ${state.sel.nodeId===n.id?'on':''}">
          <span class="badge ${n.type==='subsystem'?'sub':'comp'}">${n.type==='subsystem'?'SUB':'CMP'}</span>
          <button class="icon-btn" style="border:none;background:none;font-size:14px;padding:0" onclick="selNode('${n.id}')">
            <span class="nname">${esc(n.name)}</span></button>
          <span class="muted mono" style="font-size:11px">${n.symptoms.length}S · ${n.modes.length}M</span>
          <span class="tools">
            ${n.type==='subsystem'?`<button class="icon-btn" title="Add child subsystem" onclick="addNode('${v.id}','${n.id}','subsystem')">+Sub</button>
            <button class="icon-btn" title="Add child component" onclick="addNode('${v.id}','${n.id}','component')">+Cmp</button>`:''}
            <button class="icon-btn" title="Move ${esc(n.name)}" onclick="moveNode('${n.id}')">Move</button>
            <button class="icon-btn act" onclick="renameNode('${n.id}')"
              title="Rename ${esc(n.name)}" aria-label="Rename ${esc(n.name)}">${ACTION_ICONS.edit}</button>
            <button class="icon-btn act red" onclick="delNode('${n.id}')"
              title="Remove ${esc(n.name)}" aria-label="Remove ${esc(n.name)}">${ACTION_ICONS.trash}</button>
          </span>
        </div>
        ${renderKids(n.id)}
      </li>`).join('')}</ul>`;
  };
  return `<div class="panel">
    <div class="panel-h"><h3>Tree of Parts</h3><span class="panel-sel">${esc(v.name)}</span><span class="spacer"></span>
      <button class="btn sm line" title="Add a root subsystem" onclick="addNode('${v.id}',null,'subsystem')">+ Subsystem</button>
      <button class="btn sm line" title="Add a root component" onclick="addNode('${v.id}',null,'component')">+ Component</button>
    </div>
    <div class="panel-b tree">
      ${nodesOf(v.id).length ? renderKids(null) : '<div class="empty">Empty tree. Add a root subsystem or component.</div>'}
    </div>
    <p class="flow-note" style="margin:0;padding:10px 16px 14px">Click a node name to configure its failure symptoms &amp; modes. Names must be unique within this variant. Subsystems can nest; components are leaf nodes.</p>
  </div>`;
}

function nodeDetailPanel(n){
  const chipList=(arr,kind)=>arr.map((s,i)=>`<span class="chip">${esc(s)}
      <button title="Remove" onclick="removeAssign('${n.id}','${kind}',${i})">✕</button></span>`).join('')
    || '<span class="muted" style="font-size:13px">None configured yet.</span>';
  return `<div class="panel">
    <div class="panel-h"><h3>Node · ${esc(nodePath(n))}</h3>
      <span class="badge ${n.type==='subsystem'?'sub':'comp'}">${n.type}</span></div>
    <div class="panel-b">
      <div class="cols cols-fit">
        <div>
          <label class="f">Failure symptoms</label>
          <div style="margin-bottom:8px">${chipList(n.symptoms,'symptoms')}</div>
          <button class="btn sm line" onclick="addAssign('${n.id}','symptoms')">+ Add symptom</button>
        </div>
        <div>
          <label class="f">Failure modes</label>
          <div style="margin-bottom:8px">${chipList(n.modes,'modes')}</div>
          <button class="btn sm line" onclick="addAssign('${n.id}','modes')">+ Add mode</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ----- product CRUD ----- */
function promptName(title, initial, onOk, extraHTML=''){
  modal(title, `
    <div class="field"><label class="f">Name <span class="req">*</span></label>
      <input type="text" id="pm-name" value="${esc(initial||'')}"></div>${extraHTML}`,
    `<button class="btn line" onclick="closeModal()">Cancel</button>
     <button class="btn primary" id="pm-ok">Save</button>`);
  const ok=()=>{ const nm=document.getElementById('pm-name').value.trim();
    if(!nm){ toast('Name is required', true); return; } onOk(nm); };
  document.getElementById('pm-ok').onclick=ok;
  document.getElementById('pm-name').addEventListener('keydown',e=>{ if(e.key==='Enter') ok(); });
}
function addProduct(){
  promptName('Add product family', '', (nm)=>{
    if(DB.products.some(p=>p.name.toLowerCase()===nm.toLowerCase())){ toast('A product with this name already exists', true); return; }
    const desc=document.getElementById('pm-desc').value.trim();
    const p={id:uid('prod'), name:nm, desc}; DB.products.push(p);
    audit('Product created', nm); closeModal(); state.sel.productId=p.id; state.sel.variantId=null; render(); toast('Product created');
  }, `<div class="field"><label class="f">Description</label><input type="text" id="pm-desc"></div>`);
}
function editProduct(id){
  const p=prodById(id);
  promptName('Rename product', p.name, (nm)=>{
    if(DB.products.some(x=>x.id!==id && x.name.toLowerCase()===nm.toLowerCase())){ toast('A product with this name already exists', true); return; }
    audit('Product renamed', `${p.name} → ${nm}`); p.name=nm;
    p.desc=document.getElementById('pm-desc').value.trim();
    saveDB(); closeModal(); render(); toast('Product updated');
  }, `<div class="field"><label class="f">Description</label><input type="text" id="pm-desc" value="${esc(p.desc||'')}"></div>`);
}
function delProduct(id){
  const p=prodById(id);
  const vs=variantsOf(id);
  const used=DB.reports.some(r=>r.productId===id);
  if(used){ toast('Cannot remove — failure reports reference this product', true); return; }
  confirmBox('Remove product', `Remove "${p.name}" and its ${vs.length} variant(s) and their trees?`, ()=>{
    vs.forEach(v=>{ DB.nodes=DB.nodes.filter(n=>n.variantId!==v.id); });
    DB.variants=DB.variants.filter(v=>v.productId!==id);
    DB.products=DB.products.filter(x=>x.id!==id);
    audit('Product removed', p.name);
    if(state.sel.productId===id){ state.sel.productId=null; state.sel.variantId=null; state.sel.nodeId=null; }
    saveDB(); render(); toast('Product removed');
  });
}

/* ----- variant CRUD (FR-1.2 uniqueness) ----- */
function addVariant(){
  const pid=state.sel.productId;
  promptName('Add variant', '', (nm)=>{
    if(variantsOf(pid).some(v=>v.name.toLowerCase()===nm.toLowerCase())){
      toast('Rejected: variant name must be unique within this product (FR-1.2)', true); return; }
    const v={id:uid('var'), productId:pid, name:nm}; DB.variants.push(v);
    audit('Variant created', `${prodById(pid).name} / ${nm}`);
    closeModal(); state.sel.variantId=v.id; render(); toast('Variant created');
  });
}
function editVariant(id){
  const v=varById(id);
  promptName('Rename variant', v.name, (nm)=>{
    if(variantsOf(v.productId).some(x=>x.id!==id && x.name.toLowerCase()===nm.toLowerCase())){
      toast('Rejected: variant name must be unique within this product (FR-1.2)', true); return; }
    audit('Variant renamed', `${v.name} → ${nm}`); v.name=nm;
    saveDB(); closeModal(); render(); toast('Variant updated');
  });
}
function delVariant(id){
  const v=varById(id);
  if(DB.reports.some(r=>r.variantId===id)){ toast('Cannot remove — failure reports reference this variant', true); return; }
  confirmBox('Remove variant', `Remove "${v.name}" and its entire tree of parts?`, ()=>{
    DB.nodes=DB.nodes.filter(n=>n.variantId!==id);
    DB.variants=DB.variants.filter(x=>x.id!==id);
    audit('Variant removed', v.name);
    if(state.sel.variantId===id){ state.sel.variantId=null; state.sel.nodeId=null; }
    saveDB(); render(); toast('Variant removed');
  });
}

/* ----- tree CRUD (FR-1.3 / FR-1.4) ----- */
function treeNameTaken(variantId, name, exceptId){
  return nodesOf(variantId).some(n=>n.id!==exceptId && n.name.toLowerCase()===name.toLowerCase());
}
function addNode(variantId, parentId, type){
  promptName(`Add ${type}${parentId?` under "${nodeById(parentId).name}"`:' at root'}`, '', (nm)=>{
    if(treeNameTaken(variantId, nm)){ toast('Rejected: node names must be unique within this tree (FR-1.4)', true); return; }
    const n={id:uid('n'), variantId, parentId, type, name:nm, symptoms:[], modes:[]};
    DB.nodes.push(n);
    audit(`${type==='subsystem'?'Subsystem':'Component'} added`, `${varById(variantId).name} / ${nodePath(n)}`);
    closeModal(); state.sel.nodeId=n.id; render(); toast('Node added — now assign its symptoms & modes');
  });
}
function renameNode(id){
  const n=nodeById(id);
  promptName('Rename node', n.name, (nm)=>{
    if(treeNameTaken(n.variantId, nm, id)){ toast('Rejected: node names must be unique within this tree (FR-1.4)', true); return; }
    audit('Node renamed', `${n.name} → ${nm}`); n.name=nm;
    saveDB(); closeModal(); render(); toast('Node renamed');
  });
}
function moveNode(id){
  const n=nodeById(id);
  const banned=new Set([id, ...descendantIds(id)]);
  const targets=nodesOf(n.variantId).filter(t=>t.type==='subsystem' && !banned.has(t.id));
  const opts=[`<option value="">— Root level —</option>`,
    ...targets.map(t=>`<option value="${t.id}" ${t.id===n.parentId?'selected':''}>${esc(nodePath(t))}</option>`)].join('');
  modal(`Move "${esc(n.name)}"`, `
    <div class="field"><label class="f">New parent (subsystems only)</label>
      <select id="mv-parent">${opts}</select></div>
    <p class="muted" style="font-size:12.5px;margin:0">A node cannot be moved into itself or its own descendants.</p>`,
    `<button class="btn line" onclick="closeModal()">Cancel</button>
     <button class="btn primary" id="mv-ok">Move</button>`);
  document.getElementById('mv-ok').onclick=()=>{
    const val=document.getElementById('mv-parent').value || null;
    audit('Node re-parented', `${nodePath(n)} → ${val?nodePath(nodeById(val)):'root'}`);
    n.parentId=val; saveDB(); closeModal(); render(); toast('Node moved');
  };
}
function delNode(id){
  const n=nodeById(id);
  const desc=descendantIds(id);
  const usedIds=new Set([id,...desc]);
  if(DB.reports.some(r=>r.parts.some(p=>usedIds.has(p.nodeId)))){
    toast('Cannot remove — failure reports reference this node or its children', true); return; }
  confirmBox('Remove node', `Remove "${n.name}"${desc.length?` and ${desc.length} child node(s)`:''}?`, ()=>{
    DB.nodes=DB.nodes.filter(x=>!usedIds.has(x.id));
    audit('Node removed', nodePath(n));
    if(usedIds.has(state.sel.nodeId)) state.sel.nodeId=null;
    saveDB(); render(); toast('Node removed');
  });
}

/* ----- symptom / mode assignment (FR-1.5 / FR-1.6) ----- */
function addAssign(nodeId, kind){
  const n=nodeById(nodeId);
  const label = kind==='symptoms' ? 'failure symptom' : 'failure mode';
  promptName(`Add ${label} → ${n.name}`, '', (nm)=>{
    if(n[kind].some(s=>s.toLowerCase()===nm.toLowerCase())){ toast('Already assigned to this node', true); return; }
    n[kind].push(nm);
    audit(`${kind==='symptoms'?'Symptom':'Mode'} assigned`, `${nodePath(n)}: ${nm}`);
    saveDB(); closeModal(); render();
  });
}
function removeAssign(nodeId, kind, idx){
  const n=nodeById(nodeId);
  const val=n[kind][idx];
  n[kind].splice(idx,1);
  audit(`${kind==='symptoms'?'Symptom':'Mode'} unassigned`, `${nodePath(n)}: ${val}`);
  saveDB(); render();
}

/* ----- disposition list (FR-1.7) ----- */
function viewDispositions(){
  const rows=DB.dispositions.map((d,i)=>`
    <tr>
      <td class="muted">${i+1}</td>
      <td>${d.retired?`<span class="badge retired">${esc(d.label)}</span>`:esc(d.label)}</td>
      <td>${d.retired?'<span class="muted">Retired</span>':'<span style="color:var(--brand-deep)">Active</span>'}</td>
      <td style="white-space:nowrap">
        <button class="icon-btn" ${i===0?'disabled':''} onclick="moveDisp(${i},-1)">↑</button>
        <button class="icon-btn" ${i===DB.dispositions.length-1?'disabled':''} onclick="moveDisp(${i},1)">↓</button>
        <button class="icon-btn" onclick="editDisp('${d.id}')">Edit</button>
        <button class="icon-btn ${d.retired?'':'btn danger'}" onclick="toggleDisp('${d.id}')">${d.retired?'Reinstate':'Retire'}</button>
      </td>
    </tr>`).join('');
  return `
  <h2 class="page-title">Disposition list</h2>
  <p class="page-sub">One shared, system-wide list used by every subsystem/component in every failure report. Retired values stay for history but can't be picked on new reports.</p>
  <div class="panel">
    <div class="panel-h"><h3>Entries</h3><span class="spacer"></span>
      <button class="btn primary sm" onclick="addDisp()">+ Add entry</button></div>
    <div class="panel-b">
      <table class="tbl"><thead><tr><th class="nosort">#</th><th class="nosort">Disposition</th><th class="nosort">Status</th><th class="nosort">Actions</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
  </div>`;
}
function addDisp(){
  promptName('Add disposition', '', (nm)=>{
    if(DB.dispositions.some(d=>d.label.toLowerCase()===nm.toLowerCase())){ toast('This disposition already exists', true); return; }
    DB.dispositions.push({id:uid('d'), label:nm, retired:false});
    audit('Disposition added', nm); closeModal(); render(); toast('Disposition added');
  });
}
function editDisp(id){
  const d=dispById(id);
  promptName('Edit disposition', d.label, (nm)=>{
    audit('Disposition edited', `${d.label} → ${nm}`); d.label=nm;
    saveDB(); closeModal(); render(); toast('Disposition updated');
  });
}
function toggleDisp(id){
  const d=dispById(id); d.retired=!d.retired;
  audit(d.retired?'Disposition retired':'Disposition reinstated', d.label);
  saveDB(); render();
}
function moveDisp(i,dir){
  const j=i+dir; const a=DB.dispositions;
  [a[i],a[j]]=[a[j],a[i]];
  audit('Disposition list reordered', a[j].label); saveDB(); render();
}

/* ----- user access (FR-1.8, demo only) ----- */
function viewUsers(){
  const opts=(sel)=>ACTORS.map(k=>`<option ${k===sel?'selected':''}>${k.replace(/_/g,' ')}</option>`).join('');
  const rows=DB.userAssignments.map((u,i)=>`
    <tr><td>${esc(u.user)}</td>
      <td><select onchange="setUserActor(${i}, this.value.replace(/ /g,'_'))" style="max-width:280px">${opts(u.actor)}</select></td>
      <td><button class="icon-btn red" onclick="delUser(${i})">Remove</button></td></tr>`).join('');
  return `
  <h2 class="page-title">User access</h2>
  <p class="page-sub">FR-1.8 · User-to-actor assignment (in production this is coordinated with IT via Entra ID; here it's a simple demo table).</p>
  <div class="panel">
    <div class="panel-h"><h3>Assignments</h3><span class="spacer"></span>
      <button class="btn primary sm" onclick="addUser()">+ Add user</button></div>
    <div class="panel-b"><table class="tbl">
      <thead><tr><th class="nosort">User</th><th class="nosort">Actor</th><th class="nosort"></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
  </div>`;
}
function addUser(){
  promptName('Add user', '', (nm)=>{
    DB.userAssignments.push({user:nm, actor:'Failure_Reporter'});
    audit('User added', nm); closeModal(); render();
  });
}
function setUserActor(i,actor){
  const u=DB.userAssignments[i];
  audit('User actor changed', `${u.user}: ${u.actor} → ${actor}`);
  u.actor=actor; saveDB(); render();
}
function delUser(i){
  const u=DB.userAssignments[i];
  confirmBox('Remove user', `Remove access for ${u.user}?`, ()=>{
    DB.userAssignments.splice(i,1); audit('User removed', u.user); saveDB(); render();
  });
}

/* ----- audit trail (FR-1.9 / NFR-4) ----- */
function viewAudit(){
  const rows=DB.audit.map(a=>`
    <tr class="audit-row"><td>${esc(a.ts)}</td>
      <td>${esc(a.user)}</td><td><strong>${esc(a.action)}</strong></td><td>${esc(a.detail)}</td></tr>`).join('');
  return `
  <h2 class="page-title">Audit logs</h2>
  <p class="page-sub">Every configuration change and report action, attributed and timestamped.</p>
  <div class="panel"><div class="panel-b">
    <table class="tbl"><thead><tr><th class="nosort">When</th><th class="nosort">Who</th><th class="nosort">Action</th><th class="nosort">Detail</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="empty">No entries.</td></tr>'}</tbody></table>
  </div></div>`;
}

/* ----- data / JSON view ----- */
function viewData(){
  return `
  <h2 class="page-title">Data (JSON)</h2>
  <p class="page-sub">The POC keeps its working copy in your browser (localStorage), seeded from <span class="mono">data.json</span>. Export the current state, edit it, and import it back.</p>
  <div class="panel"><div class="panel-b">
    <button class="btn primary" onclick="exportJSON()">Export current data as JSON</button>
    <button class="btn line" onclick="importJSON()">Import JSON…</button>
    <button class="btn danger" onclick="resetDB()">Reset to seed data</button>
    <hr class="sep">
    <label class="f">Live snapshot</label>
    <textarea readonly style="min-height:340px;font-family:var(--mono);font-size:12px">${esc(JSON.stringify(DB,null,2))}</textarea>
  </div></div>`;
}

/* ============================================================
   PHASE 2 — NEW FAILURE REPORT (Failure_Reporter)
   ============================================================ */
function ensureDraft(){
  if(!state.draft) state.draft={
    productId:'', variantId:'',
    reporter:state.user.name, date:new Date().toISOString().slice(0,10),
    origin:'Field Return', ticket:'', customer:'', notes:'',
    parts:{},        // nodeId -> part entry
    focusNodeId:null // UI-req 3: node whose System/Part Information panel is open
  };
  return state.draft;
}
function viewNewReport(){
  const d=ensureDraft();
  const prodBtns=DB.products.map(p=>`<button class="btn ${d.productId===p.id?'on':'line'} sm"
      style="margin:0 6px 6px 0" onclick="draftProduct('${p.id}')">${esc(p.name)}</button>`).join('');
  const varBtns=d.productId ? (variantsOf(d.productId).map(v=>`<button class="btn ${d.variantId===v.id?'on':'line'} sm"
      style="margin:0 6px 6px 0" onclick="draftVariant('${v.id}')">${esc(v.name)}</button>`).join('')
      || '<span class="muted">No variants configured for this product.</span>')
    : '<span class="muted">Pick a product family first.</span>';

  return `
  <h2 class="page-title">New report <span class="mono muted" style="font-size:14px">${nextReportId()}</span></h2>
  <p class="page-sub">Product Family → Variant → tree of parts → per-part entry. Fields marked <span class="req">*</span> are required to submit.</p>

  <div class="panel">
    <div class="panel-h"><h3>1 · Product family <span class="req">*</span></h3></div>
    <div class="panel-b">${prodBtns}</div>
  </div>
  <div class="panel">
    <div class="panel-h"><h3>2 · Variant <span class="req">*</span></h3></div>
    <div class="panel-b">${varBtns}</div>
  </div>

  <div class="panel">
    <div class="panel-h"><h3>3 · Case details</h3></div>
    <div class="panel-b">
      <div class="grid-form">
        <div class="field"><label class="f">Reporter <span class="req">*</span></label>
          <input type="text" value="${esc(d.reporter)}" oninput="draftField('reporter',this.value)"></div>
        <div class="field"><label class="f">Date <span class="req">*</span></label>
          <input type="date" value="${esc(d.date)}" oninput="draftField('date',this.value)"></div>
        <div class="field"><label class="f">Origin <span class="req">*</span></label>
          <select onchange="draftField('origin',this.value)">
            <option ${d.origin==='Field Return'?'selected':''}>Field Return</option>
            <option ${d.origin==='New-Build QC'?'selected':''}>New-Build QC</option>
          </select></div>
        <div class="field"><label class="f">CRM / Ticket ID</label>
          <input type="text" value="${esc(d.ticket)}" oninput="draftField('ticket',this.value)"></div>
        <div class="field"><label class="f">Customer</label>
          <input type="text" value="${esc(d.customer)}" oninput="draftField('customer',this.value)"></div>
      </div>
      <div class="field" style="margin-top:4px"><label class="f">Case notes</label>
        <textarea oninput="draftField('notes',this.value)">${esc(d.notes)}</textarea></div>
    </div>
  </div>

  ${d.variantId ? reportTreePanel(d) : ''}

  ${d.variantId ? `
  <div class="panel"><div class="panel-b" style="display:flex;gap:10px;align-items:center">
    <button class="btn primary" onclick="submitReport()">Submit failure report</button>
    <button class="btn line" onclick="discardDraft()">Discard draft</button>
    <span class="muted" style="font-size:13px">${Object.keys(d.parts).length} failed part entr${Object.keys(d.parts).length===1?'y':'ies'} attached</span>
  </div></div>`:''}`;
}
function draftProduct(pid){ const d=ensureDraft(); if(d.productId!==pid){ d.productId=pid; d.variantId=''; d.parts={}; } render(); }
function draftVariant(vid){ const d=ensureDraft(); if(d.variantId!==vid){ d.variantId=vid; d.parts={}; d.focusNodeId=null; } render(); }
function draftField(k,v){ ensureDraft()[k]=v; }
function discardDraft(){ confirmBox('Discard draft','Throw away this unsubmitted report?',()=>{ state.draft=null; render(); }); }

function reportTreePanel(d){
  const renderKids=(parentId)=>{
    const kids=childrenOf(d.variantId,parentId);
    if(!kids.length) return '';
    return `<ul>${kids.map(n=>`
      <li><div class="node-row ${d.focusNodeId===n.id?'on':''}">
        <input class="pickbox" type="checkbox" id="pk_${n.id}" ${d.parts[n.id]?'checked':''} onchange="togglePart('${n.id}')" title="Include in report">
        <span class="badge ${n.type==='subsystem'?'sub':'comp'}">${n.type==='subsystem'?'SUB':'CMP'}</span>
        <button class="nname" style="border:none;background:none;padding:0;cursor:pointer;font:inherit;font-weight:500;text-align:left"
          onclick="focusPart('${n.id}')">${esc(n.name)}</button>
        ${d.parts[n.id]?(d.parts[n.id].dispositionId?'<span class="mono" style="color:var(--brand-deep);font-size:11px">✓</span>':'<span class="mono" style="color:var(--red);font-size:11px">needs disp.</span>'):''}
      </div>${renderKids(n.id)}</li>`).join('')}</ul>`;
  };
  const tree = renderKids(null);
  const chips = Object.keys(d.parts).map(nid=>{
    const n=nodeById(nid), ok=!!d.parts[nid].dispositionId;
    return `<button class="btn sm ${d.focusNodeId===nid?'on':'line'}" style="margin:0 6px 6px 0"
      onclick="focusPart('${nid}')">${esc(n.name)} ${ok?'✓':'⚠'}</button>`;
  }).join('');
  return `<div class="panel">
    <div class="panel-h"><h3>4 · Failed parts — select a node to open its panel <span class="req">*</span></h3></div>
    <div class="panel-b">
      ${chips?`<div style="margin-bottom:10px"><label class="f">Entries in this report</label>${chips}</div>`:''}
      <div class="master-detail">
        <div class="tree" style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--sunken)">
          ${tree || '<div class="empty">This variant has no tree of parts configured. Ask the Engineering Administrator to build it (Phase 1).</div>'}
        </div>
        <div>
          ${d.focusNodeId && d.parts[d.focusNodeId] ? partCard(d.focusNodeId)
            : `<div class="panel" style="margin:0"><div class="empty">Select a node in the tree — its <strong>System / Part Information</strong> panel opens here, scoped to that node (part number, serials, its configured symptoms &amp; modes, notes, disposition).</div></div>`}
        </div>
      </div>
      <p class="flow-note" style="margin:12px 0 0">Checkbox = include in report · node name = open its panel · FR-2.6: one report can carry many failed part entries.</p>
    </div>
  </div>`;
}
function togglePart(nodeId){
  const d=ensureDraft();
  if(d.parts[nodeId]){
    delete d.parts[nodeId];
    if(d.focusNodeId===nodeId) d.focusNodeId=Object.keys(d.parts)[0]||null;
  } else {
    d.parts[nodeId]={ nodeId, partNumber:'', serial:'', mfg:'', mfgSerial:'', symptoms:[], modes:[], notes:'', dispositionId:'' };
    d.focusNodeId=nodeId;             // UI-req 3: selecting a node opens its panel
  }
  render();
}
function focusPart(nodeId){           // clicking a node name selects it (creates entry if new) and opens its panel
  const d=ensureDraft();
  if(!d.parts[nodeId]) { togglePart(nodeId); return; }
  d.focusNodeId=nodeId; render();
}

function checklist(nodeId, kind, entry){
  const n=nodeById(nodeId);
  const opts=n[kind];
  const sel=entry[kind];
  const box=(val,special)=>`
    <label class="${special?'special':''}"><input type="checkbox" ${sel.includes(val)?'checked':''}
      onchange="togglePick('${nodeId}','${kind}','${esc(val)}')"> ${esc(val)}</label>`;
  return `<div class="checklist">
    ${opts.map(o=>box(o)).join('')}
    ${box('None',true)}${box('Other',true)}
  </div>`;
}
function togglePick(nodeId, kind, val){
  const e=ensureDraft().parts[nodeId]; if(!e) return;
  const i=e[kind].indexOf(val);
  if(i>=0) e[kind].splice(i,1); else e[kind].push(val);
}
function partField(nodeId,k,v){ const e=ensureDraft().parts[nodeId]; if(e) e[k]=v; }

function partCard(nodeId){
  const d=state.draft, e=d.parts[nodeId], n=nodeById(nodeId);
  const dispOpts=['<option value="">— select disposition —</option>',
    ...DB.dispositions.filter(x=>!x.retired).map(x=>`<option value="${x.id}" ${e.dispositionId===x.id?'selected':''}>${esc(x.label)}</option>`)].join('');
  return `<div class="part-card ${e.dispositionId?'':'invalid'}">
    <div class="ph"><span class="badge ${n.type==='subsystem'?'sub':'comp'}">${n.type==='subsystem'?'SUB':'CMP'}</span>
      <h4>System / Part Information · ${esc(nodePath(n))}</h4><span class="spacer" style="flex:1"></span>
      <button class="icon-btn red" onclick="togglePart('${nodeId}')">Remove entry</button></div>
    <div class="pb">
      <div class="grid-form" style="margin-bottom:14px">
        <div class="field" style="margin:0"><label class="f">Part number (+rev)</label>
          <input type="text" class="mono" value="${esc(e.partNumber)}" oninput="partField('${nodeId}','partNumber',this.value)"></div>
        <div class="field" style="margin:0"><label class="f">Serial number</label>
          <input type="text" class="mono" value="${esc(e.serial)}" oninput="partField('${nodeId}','serial',this.value)"></div>
        <div class="field" style="margin:0"><label class="f">Manufacturer</label>
          <input type="text" value="${esc(e.mfg)}" oninput="partField('${nodeId}','mfg',this.value)"></div>
        <div class="field" style="margin:0"><label class="f">Mfg serial number</label>
          <input type="text" class="mono" value="${esc(e.mfgSerial)}" oninput="partField('${nodeId}','mfgSerial',this.value)"></div>
      </div>
      <div class="cols cols-2">
        <div><label class="f">Failure symptoms (0+, FR-2.5)</label>${checklist(nodeId,'symptoms',e)}</div>
        <div><label class="f">Failure modes (0+, FR-2.5)</label>${checklist(nodeId,'modes',e)}</div>
      </div>
      <div class="grid-form" style="margin-top:14px">
        <div class="field" style="margin:0;grid-column:1/-1"><label class="f">Observations / notes</label>
          <textarea oninput="partField('${nodeId}','notes',this.value)">${esc(e.notes)}</textarea></div>
        <div class="field" style="margin:0"><label class="f">Disposition <span class="req">* (exactly one)</span></label>
          <select onchange="partField('${nodeId}','dispositionId',this.value); render()">${dispOpts}</select></div>
      </div>
    </div>
  </div>`;
}

function submitReport(){
  const d=state.draft;
  const errs=[];
  if(!d.productId) errs.push('Select a product family.');
  if(!d.variantId) errs.push('Select a variant.');
  if(!d.reporter.trim()) errs.push('Reporter is required.');
  if(!d.date) errs.push('Date is required.');
  if(!d.origin) errs.push('Origin is required.');
  const parts=Object.values(d.parts);
  if(!parts.length) errs.push('Select at least one failed subsystem/component.');
  parts.forEach(p=>{ if(!p.dispositionId) errs.push(`"${nodeById(p.nodeId).name}" is missing a disposition.`); });
  if(errs.length){
    modal('Cannot submit yet (FR-2.7)',
      `<ul style="margin:0;padding-left:18px">${errs.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`,
      `<button class="btn primary" onclick="closeModal()">Back to the form</button>`);
    return;
  }
  const rep={
    id: nextReportId(), reporter:d.reporter.trim(), date:d.date, origin:d.origin,
    ticket:d.ticket.trim(), customer:d.customer.trim()||'—', notes:d.notes.trim(),
    productId:d.productId, variantId:d.variantId,
    parts: parts.map(p=>{ const n=nodeById(p.nodeId);   // Tree_of_Parts node (reference) + snapshot at submission
      return { nodeId:p.nodeId, nodeName:n.name, nodePath:nodePath(n), nodeType:n.type, ...p }; }),
    corrections:[]
  };
  DB.reports.unshift(rep);
  audit('Failure report submitted', `${rep.id} · ${varById(rep.variantId).name} · ${rep.parts.length} part(s)`);
  state.draft=null; state.view='reports'; state.openReportId=rep.id; state.detailFocus=rep.parts[0]?.nodeId||null;
  saveDB(); render(); toast(`${rep.id} submitted`);
}

/* ============================================================
   PHASE 2 — TABULATED REVIEW (FR-3.1 → FR-3.3)
   ============================================================ */
function canCorrect(){ return !!roleDef(state.role).canCorrect; }  /* in production this gate comes from Entra ID (NFR-3) */

function viewReports(){
  const f=state.filters;
  let rows=DB.reports.slice();
  if(f.product) rows=rows.filter(r=>r.productId===f.product);
  if(f.origin)  rows=rows.filter(r=>r.origin===f.origin);
  if(f.from)    rows=rows.filter(r=>r.date>=f.from);
  if(f.to)      rows=rows.filter(r=>r.date<=f.to);
  if(f.q){ const q=f.q.toLowerCase();
    rows=rows.filter(r=>[r.id,r.customer,r.ticket,varById(r.variantId)?.name].join(' ').toLowerCase().includes(q)); }
  const key=state.sort.key, dir=state.sort.dir;
  const val=r=>({date:r.date, id:r.id, product:prodById(r.productId)?.name||'', variant:varById(r.variantId)?.name||'',
    origin:r.origin, customer:r.customer, parts:r.parts.length}[key]);
  rows.sort((a,b)=> (val(a)>val(b)?1:val(a)<val(b)?-1:0)*dir );

  const th=(k,lbl)=>`<th onclick="setSort('${k}')">${lbl}${state.sort.key===k?(dir>0?' ▲':' ▼'):''}</th>`;
  /* the pen goes to the actor that may correct a report; everyone else gets the eye.
     Both open the same detail view — the correct/read-only gate lives there (canCorrect). */
  const mayEdit=canCorrect();
  const actLbl = mayEdit ? 'Open to correct' : 'View report';
  const actIco = mayEdit ? ACTION_ICONS.edit : ACTION_ICONS.view;
  const trs=rows.map(r=>`
    <tr>
      <td>${esc(r.id)}</td>
      <td>${esc(r.date)}</td>
      <td>${esc(prodById(r.productId)?.name||'?')}</td>
      <td>${esc(varById(r.variantId)?.name||'?')}</td>
      <td>${esc(r.origin)}</td>
      <td>${esc(r.customer)}</td>
      <td>${r.parts.length}</td>
      <td>${r.corrections.length?`<span class="badge disp">corrected ×${r.corrections.length}</span>`:''}</td>
      <td><button class="icon-btn" onclick="openReport('${r.id}')"
        title="${actLbl} ${esc(r.id)}" aria-label="${actLbl} ${esc(r.id)}">${actIco}</button></td>
    </tr>`).join('');

  return `
  <h2 class="page-title">Failure reports</h2>
  <p class="page-sub">Tabulated view — filter and sort by date, product, variant, origin, customer. Use the action button for full detail.</p>
  <div class="panel"><div class="panel-b">
    <div class="grid-form" style="margin-bottom:12px">
      <div><label class="f">Search (ID / customer / ticket)</label>
        <input type="text" value="${esc(f.q)}" oninput="setFilter('q',this.value)"></div>
      <div><label class="f">Product</label>
        <select onchange="setFilter('product',this.value)">
          <option value="">All</option>
          ${DB.products.map(p=>`<option value="${p.id}" ${f.product===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
        </select></div>
      <div><label class="f">Origin</label>
        <select onchange="setFilter('origin',this.value)">
          <option value="">All</option>
          <option ${f.origin==='Field Return'?'selected':''}>Field Return</option>
          <option ${f.origin==='New-Build QC'?'selected':''}>New-Build QC</option>
        </select></div>
      <div><label class="f">From</label><input type="date" value="${esc(f.from)}" onchange="setFilter('from',this.value)"></div>
      <div><label class="f">To</label><input type="date" value="${esc(f.to)}" onchange="setFilter('to',this.value)"></div>
    </div>
    <table class="tbl hoverable"><thead><tr>
      ${th('id','Report')}${th('date','Date')}${th('product','Product')}${th('variant','Variant')}
      ${th('origin','Origin')}${th('customer','Customer')}${th('parts','Parts')}<th class="nosort"></th>
      <th class="nosort act-cell">Action</th>
    </tr></thead>
    <tbody>${trs || '<tr><td colspan="9" class="empty">No reports match these filters.</td></tr>'}</tbody></table>
  </div></div>`;
}
function setFilter(k,v){ state.filters[k]=v; renderView(); }
function setSort(k){
  if(state.sort.key===k) state.sort.dir*=-1; else { state.sort.key=k; state.sort.dir=1; }
  renderView();
}
function openReport(id){ state.openReportId=id; const r=DB.reports.find(x=>x.id===id); state.detailFocus=r&&r.parts[0]?r.parts[0].nodeId:null; renderView(); }
function closeReport(){
  if(state.correction){ confirmBox('Discard correction','Leave without saving? Your correction changes will be lost.',()=>{ state.correction=null; state.openReportId=null; state.detailFocus=null; renderView(); }); return; }
  state.openReportId=null; state.detailFocus=null; renderView();
}

function viewReportDetail(){
  const orig=DB.reports.find(x=>x.id===state.openReportId);
  if(!orig) return '<div class="empty">Report not found.</div>';
  const editing = !!(state.correction && state.correction.reportId===orig.id);
  const r = editing ? state.correction.working : orig;
  const dis = editing ? '' : 'disabled';

  // 1/2 · product & variant shown as the same button rows as submission, locked
  const prodBtns=DB.products.map(p=>`<button class="btn ${r.productId===p.id?'on':'line'} sm" style="margin:0 6px 6px 0" disabled>${esc(p.name)}</button>`).join('');
  const varBtns=variantsOf(r.productId).map(v=>`<button class="btn ${r.variantId===v.id?'on':'line'} sm" style="margin:0 6px 6px 0" disabled>${esc(v.name)}</button>`).join('');

  // 4 · tree of parts — same master-detail as submission; checkboxes disabled in view mode
  const partsBy={}; r.parts.forEach(p=>partsBy[p.nodeId]=p);
  const renderKids=(parentId)=>{
    const kids=childrenOf(r.variantId,parentId);
    if(!kids.length) return '';
    return `<ul>${kids.map(n=>`
      <li><div class="node-row ${state.detailFocus===n.id?'on':''}">
        <input class="pickbox" type="checkbox" ${partsBy[n.id]?'checked':''} ${editing?'':'disabled'}
          ${editing?`onchange="corrToggleNode('${n.id}')"`:''} title="${editing?'Include in report':'Reported (locked in view mode)'}">
        <span class="badge ${n.type==='subsystem'?'sub':'comp'}">${n.type==='subsystem'?'SUB':'CMP'}</span>
        <button class="nname" style="border:none;background:none;padding:0;cursor:pointer;font:inherit;font-weight:500;text-align:left"
          onclick="detailFocusNode('${n.id}')">${esc(n.name)}</button>
        ${partsBy[n.id]?(partsBy[n.id].dispositionId?'<span class="mono" style="color:var(--brand-deep);font-size:11px">✓</span>':'<span class="mono" style="color:var(--red);font-size:11px">needs disp.</span>'):''}
      </div>${renderKids(n.id)}</li>`).join('')}</ul>`;
  };
  const chips=r.parts.map(p=>`<button class="btn sm ${state.detailFocus===p.nodeId?'on':'line'}" style="margin:0 6px 6px 0"
      onclick="detailFocusNode('${p.nodeId}')">${esc(partName(p))} ${editing?(p.dispositionId?'✓':'⚠'):''}</button>`).join('');
  const focusEntry = state.detailFocus ? r.parts.find(p=>p.nodeId===state.detailFocus) : null;
  const panel = focusEntry ? detailPartPanel(focusEntry, editing)
    : `<div class="panel" style="margin:0"><div class="empty">Select a checked node (or an entry chip) — its <strong>System / Part Information</strong> panel opens here${editing?', editable in correction mode':''}.</div></div>`;

  const corrLog = orig.corrections.length ? `
    <div class="panel"><div class="panel-h"><h3>Correction log (FR-2.10)</h3></div><div class="panel-b">
      <table class="tbl"><thead><tr><th class="nosort">When</th><th class="nosort">Who</th><th class="nosort">Change</th></tr></thead>
      <tbody>${orig.corrections.map(c=>`<tr><td class="muted">${esc(c.ts)}</td><td>${esc(c.user)}</td><td>${esc(c.change)}</td></tr>`).join('')}</tbody></table>
    </div></div>`:'';

  return `
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn line sm" onclick="closeReport()">← Back to list</button>
    <span style="flex:1"></span>
    ${!editing && canCorrect() ? `<button class="btn primary sm" onclick="startCorrection()">Correct this report</button>`:''}
    ${editing ? `<button class="btn primary sm" onclick="saveCorrection()">Save correction…</button>
                 <button class="btn line sm" onclick="cancelCorrection()">Cancel correction</button>`:''}
  </div>
  <h2 class="page-title" style="margin-top:12px">${esc(r.id)} ${editing?'<span class="badge disp">correction mode</span>':''}</h2>
  <p class="page-sub">${editing
    ? 'Correction mode — edit the case details, the failed-part tree, and each part panel. On save, your changes are diffed against the original and logged with a reason (FR-2.10).'
    : 'Same flow as submission, locked for viewing (FR-2.8). Click a checked node or entry chip to open its System / Part Information panel.'}</p>

  <div class="panel"><div class="panel-h"><h3>1 · Product family</h3></div><div class="panel-b">${prodBtns}
    ${editing?'<p class="flow-note" style="margin:8px 0 0">Product/variant are fixed — the failed parts reference this tree. To re-attribute a report to a different variant, file a new report.</p>':''}</div></div>
  <div class="panel"><div class="panel-h"><h3>2 · Variant</h3></div><div class="panel-b">${varBtns}</div></div>

  <div class="panel"><div class="panel-h"><h3>3 · Case details</h3></div><div class="panel-b">
    <div class="grid-form">
      <div class="field"><label class="f">Reporter <span class="req">*</span></label>
        <input type="text" value="${esc(r.reporter)}" ${dis} oninput="corrField('reporter',this.value)"></div>
      <div class="field"><label class="f">Date <span class="req">*</span></label>
        <input type="date" value="${esc(r.date)}" ${dis} onchange="corrField('date',this.value)"></div>
      <div class="field"><label class="f">Origin <span class="req">*</span></label>
        <select ${dis} onchange="corrField('origin',this.value)">
          <option ${r.origin==='Field Return'?'selected':''}>Field Return</option>
          <option ${r.origin==='New-Build QC'?'selected':''}>New-Build QC</option>
        </select></div>
      <div class="field"><label class="f">CRM / Ticket ID</label>
        <input type="text" value="${esc(r.ticket)}" ${dis} oninput="corrField('ticket',this.value)"></div>
      <div class="field"><label class="f">Customer</label>
        <input type="text" value="${esc(r.customer)}" ${dis} oninput="corrField('customer',this.value)"></div>
    </div>
    <div class="field" style="margin-top:4px"><label class="f">Case notes</label>
      <textarea ${dis} oninput="corrField('notes',this.value)">${esc(r.notes)}</textarea></div>
  </div></div>

  <div class="panel"><div class="panel-h"><h3>4 · Failed parts (${r.parts.length})</h3></div>
    <div class="panel-b">
      ${chips?`<div style="margin-bottom:10px"><label class="f">Entries in this report</label>${chips}</div>`:''}
      <div class="master-detail">
        <div class="tree" style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--sunken)">
          ${renderKids(null) || '<div class="empty">This variant no longer has a configured tree.</div>'}
        </div>
        <div>${panel}</div>
      </div>
      ${editing?'<p class="flow-note" style="margin:12px 0 0">Checkbox = add/remove a failed part entry · node name = open its panel. Removing an entry deletes its data on save.</p>':''}
    </div>
  </div>
  ${corrLog}`;
}

/* scoped System/Part Information panel in detail view — read-only or correction-editable */
function detailPartPanel(p, editing){
  const n=nodeById(p.nodeId);
  const snapPath=partPath(p), liveDiff = n && p.nodePath && nodePath(n)!==p.nodePath;
  const dis = editing ? '' : 'disabled';
  const checklist=(kind)=>{
    const base = n ? n[kind] : [];
    const legacy = p[kind].filter(v=>!base.includes(v) && v!=='None' && v!=='Other');
    const box=(val,extra)=>`<label class="${extra?'special':''}"><input type="checkbox" ${p[kind].includes(val)?'checked':''} ${dis}
        onchange="corrTogglePick('${p.nodeId}','${kind}','${esc(val)}')"> ${esc(val)}${extra==='legacy'?' <span class="muted" style="font-size:11px">(no longer configured)</span>':''}</label>`;
    return `<div class="checklist">
      ${base.map(o=>box(o)).join('')}
      ${legacy.map(o=>box(o,'legacy')).join('')}
      ${box('None','special')}${box('Other','special')}
    </div>`;
  };
  const dispOpts=DB.dispositions.filter(x=>!x.retired || x.id===p.dispositionId)
    .map(x=>`<option value="${x.id}" ${p.dispositionId===x.id?'selected':''}>${esc(x.label)}${x.retired?' (retired)':''}</option>`).join('');
  return `<div class="part-card" style="margin-bottom:0">
    <div class="ph"><span class="badge ${partType(p)==='subsystem'?'sub':'comp'}">${partType(p)==='subsystem'?'SUB':'CMP'}</span>
      <h4>System / Part Information · ${esc(snapPath)}</h4><span class="spacer" style="flex:1"></span>
      ${editing?`<button class="icon-btn red" onclick="corrToggleNode('${p.nodeId}')">Remove entry</button>`:''}</div>
    <div class="pb">
      <dl class="detail-kv" style="margin-bottom:12px">
        <dt>Tree node (reference)</dt><dd><span class="mono">${esc(p.nodeId)}</span> · ${esc(snapPath)}
          ${liveDiff?`<div class="muted" style="font-size:12.5px">In today's tree this node is: ${esc(nodePath(n))} <span class="badge">renamed/moved since submission</span></div>`
          : (!n?`<div class="muted" style="font-size:12.5px"><span class="badge retired">no longer in tree</span></div>`:'')}</dd>
      </dl>
      <div class="grid-form" style="margin-bottom:14px">
        <div class="field" style="margin:0"><label class="f">Part number (+rev)</label>
          <input type="text" class="mono" value="${esc(p.partNumber)}" ${dis} oninput="corrPartField('${p.nodeId}','partNumber',this.value)"></div>
        <div class="field" style="margin:0"><label class="f">Serial number</label>
          <input type="text" class="mono" value="${esc(p.serial)}" ${dis} oninput="corrPartField('${p.nodeId}','serial',this.value)"></div>
        <div class="field" style="margin:0"><label class="f">Manufacturer</label>
          <input type="text" value="${esc(p.mfg)}" ${dis} oninput="corrPartField('${p.nodeId}','mfg',this.value)"></div>
        <div class="field" style="margin:0"><label class="f">Mfg serial number</label>
          <input type="text" class="mono" value="${esc(p.mfgSerial)}" ${dis} oninput="corrPartField('${p.nodeId}','mfgSerial',this.value)"></div>
      </div>
      <div class="cols cols-2">
        <div><label class="f">Failure symptoms</label>${checklist('symptoms')}</div>
        <div><label class="f">Failure modes</label>${checklist('modes')}</div>
      </div>
      <div class="grid-form" style="margin-top:14px">
        <div class="field" style="margin:0;grid-column:1/-1"><label class="f">Observations / notes</label>
          <textarea ${dis} oninput="corrPartField('${p.nodeId}','notes',this.value)">${esc(p.notes)}</textarea></div>
        <div class="field" style="margin:0"><label class="f">Disposition <span class="req">*</span></label>
          <select ${dis} onchange="corrPartField('${p.nodeId}','dispositionId',this.value); renderView()">${dispOpts}</select></div>
      </div>
    </div>
  </div>`;
}

/* ----- correction workflow (FR-2.10): full-report correction with logged diff ----- */
function detailFocusNode(id){ state.detailFocus=id; renderView(); }
function startCorrection(){
  const orig=DB.reports.find(x=>x.id===state.openReportId);
  state.correction={ reportId:orig.id, working: JSON.parse(JSON.stringify(orig)) };
  if(!state.detailFocus && orig.parts[0]) state.detailFocus=orig.parts[0].nodeId;
  renderView();
}
function cancelCorrection(){
  confirmBox('Cancel correction','Discard all unsaved correction changes?',()=>{ state.correction=null; renderView(); });
}
function corrField(k,v){ if(state.correction) state.correction.working[k]=v; }
function corrPartField(nodeId,k,v){
  if(!state.correction) return;
  const p=state.correction.working.parts.find(x=>x.nodeId===nodeId); if(p) p[k]=v;
}
function corrTogglePick(nodeId,kind,val){
  if(!state.correction) return;
  const p=state.correction.working.parts.find(x=>x.nodeId===nodeId); if(!p) return;
  const i=p[kind].indexOf(val); if(i>=0) p[kind].splice(i,1); else p[kind].push(val);
}
function corrToggleNode(nodeId){
  if(!state.correction) return;
  const w=state.correction.working;
  const i=w.parts.findIndex(p=>p.nodeId===nodeId);
  if(i>=0){
    w.parts.splice(i,1);
    if(state.detailFocus===nodeId) state.detailFocus=w.parts[0]?.nodeId||null;
  } else {
    const n=nodeById(nodeId);
    w.parts.push({ nodeId, nodeName:n.name, nodePath:nodePath(n), nodeType:n.type,
      partNumber:'', serial:'', mfg:'', mfgSerial:'', symptoms:[], modes:[], notes:'', dispositionId:'' });
    state.detailFocus=nodeId;
  }
  renderView();
}
function diffReport(a,b){
  const ch=[];
  [['reporter','reporter'],['date','date'],['origin','origin'],['ticket','ticket ID'],['customer','customer']]
    .forEach(([k,l])=>{ if((a[k]||'')!==(b[k]||'')) ch.push(`${l} "${a[k]||'—'}" → "${b[k]||'—'}"`); });
  if((a.notes||'')!==(b.notes||'')) ch.push('case notes updated');
  const am=Object.fromEntries(a.parts.map(p=>[p.nodeId,p]));
  const bm=Object.fromEntries(b.parts.map(p=>[p.nodeId,p]));
  a.parts.forEach(p=>{ if(!bm[p.nodeId]) ch.push(`removed part entry: ${partName(p)}`); });
  b.parts.forEach(p=>{ if(!am[p.nodeId]) ch.push(`added part entry: ${p.nodePath||partName(p)} (${dispById(p.dispositionId)?.label||'?'})`); });
  b.parts.forEach(p=>{
    const o=am[p.nodeId]; if(!o) return; const sub=[];
    if((o.partNumber||'')!==(p.partNumber||'')) sub.push(`part number ${o.partNumber||'—'} → ${p.partNumber||'—'}`);
    if((o.serial||'')!==(p.serial||'')) sub.push(`serial ${o.serial||'—'} → ${p.serial||'—'}`);
    if((o.mfg||'')!==(p.mfg||'')) sub.push('manufacturer updated');
    if((o.mfgSerial||'')!==(p.mfgSerial||'')) sub.push('mfg serial updated');
    if(o.dispositionId!==p.dispositionId) sub.push(`disposition ${dispById(o.dispositionId)?.label||'—'} → ${dispById(p.dispositionId)?.label||'—'}`);
    if(o.symptoms.slice().sort().join('|')!==p.symptoms.slice().sort().join('|')) sub.push('symptoms updated');
    if(o.modes.slice().sort().join('|')!==p.modes.slice().sort().join('|')) sub.push('modes updated');
    if((o.notes||'')!==(p.notes||'')) sub.push('notes updated');
    if(sub.length) ch.push(`${partName(p)}: ${sub.join(', ')}`);
  });
  return ch;
}
function saveCorrection(){
  const orig=DB.reports.find(x=>x.id===state.correction.reportId);
  const w=state.correction.working;
  const errs=[];
  if(!w.reporter.trim()) errs.push('Reporter is required.');
  if(!w.date) errs.push('Date is required.');
  if(!w.parts.length) errs.push('A report must keep at least one failed part entry.');
  w.parts.forEach(p=>{ if(!p.dispositionId) errs.push(`"${partName(p)}" is missing a disposition.`); });
  if(errs.length){
    modal('Cannot save this correction yet',
      `<ul style="margin:0;padding-left:18px">${errs.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`,
      `<button class="btn primary" onclick="closeModal()">Back to the report</button>`);
    return;
  }
  const changes=diffReport(orig,w);
  if(!changes.length){ toast('Nothing changed', true); return; }
  modal('Save correction',
    `<label class="f">Changes to be logged</label>
     <ul style="margin:0 0 14px;padding-left:18px;font-size:13.5px">${changes.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
     <div class="field"><label class="f">Reason for correction <span class="req">*</span></label>
       <input type="text" id="cr-why" placeholder="e.g. intake missed a damaged part"></div>`,
    `<button class="btn line" onclick="closeModal()">Back</button>
     <button class="btn primary" id="cr-ok">Save &amp; log correction</button>`);
  document.getElementById('cr-ok').onclick=()=>{
    const why=document.getElementById('cr-why').value.trim();
    if(!why){ toast('A reason is required — corrections are logged (FR-2.10)', true); return; }
    ['reporter','date','origin','ticket','customer','notes'].forEach(k=>orig[k]=w[k]);
    orig.parts=w.parts;
    orig.corrections.push({ ts:nowTS(), user:state.user.name, change:`${changes.join('; ')} — ${why}` });
    audit('Report corrected', `${orig.id} · ${changes.length} change(s) — ${why}`);
    state.correction=null; saveDB(); closeModal(); renderView(); toast('Correction saved and logged');
  };
}

/* ============================================================
   PHASE 2 — FINANCE AGGREGATION (FR-3.4)
   ============================================================ */
function viewFinance(){
  const f=state.filters;
  let reps=DB.reports.slice();
  if(f.from) reps=reps.filter(r=>r.date>=f.from);
  if(f.to)   reps=reps.filter(r=>r.date<=f.to);

  const rows=[]; // {date, component, product, disposition}
  reps.forEach(r=>r.parts.forEach(p=>rows.push({
    date:r.date, report:r.id,
    component: partName(p),
    product: prodById(r.productId)?.name || '?',
    disp: dispById(p.dispositionId)?.label || '?',
  })));

  const byDisp={};
  rows.forEach(x=>{ byDisp[x.disp]=(byDisp[x.disp]||0)+1; });
  const max=Math.max(1,...Object.values(byDisp));
  const bars=Object.entries(byDisp).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`
    <div class="bar-row"><span class="lbl">${esc(k)}</span>
      <span class="bar-track"><span class="bar" style="width:${Math.round((n/max)*100)}%"></span></span>
      <span class="n">${n}</span></div>`).join('')
    || '<div class="empty">No data in this date range.</div>';

  const detail=rows.sort((a,b)=>a.date<b.date?1:-1).map(x=>`
    <tr><td>${esc(x.date)}</td><td>${esc(x.report)}</td>
      <td>${esc(x.product)}</td><td>${esc(x.component)}</td>
      <td><span class="badge disp">${esc(x.disp)}</span></td></tr>`).join('');

  return `
  <h2 class="page-title">Disposition summary</h2>
  <p class="page-sub">Read-only aggregation of components and disposition type, by date, for tax purposes.</p>
  <div class="panel"><div class="panel-b">
    <div class="grid-form" style="max-width:460px;margin-bottom:6px">
      <div><label class="f">From</label><input type="date" value="${esc(f.from)}" onchange="setFilter('from',this.value)"></div>
      <div><label class="f">To</label><input type="date" value="${esc(f.to)}" onchange="setFilter('to',this.value)"></div>
    </div>
  </div></div>
  <div class="tiles">
    <div class="tile"><div class="v">${reps.length}</div><div class="k">Reports in range</div></div>
    <div class="tile"><div class="v">${rows.length}</div><div class="k">Component entries</div></div>
    <div class="tile"><div class="v">${Object.keys(byDisp).length}</div><div class="k">Disposition types used</div></div>
  </div>
  <div class="panel"><div class="panel-h"><h3>Entries per disposition</h3></div>
    <div class="panel-b">${bars}</div></div>
  <div class="panel"><div class="panel-h"><h3>Component-level detail</h3><span class="spacer"></span>
    <button class="btn sm line" onclick="exportFinanceCSV()">Export CSV</button></div>
    <div class="panel-b"><table class="tbl">
      <thead><tr><th class="nosort">Date</th><th class="nosort">Report</th><th class="nosort">Product</th><th class="nosort">Component</th><th class="nosort">Disposition</th></tr></thead>
      <tbody>${detail || '<tr><td colspan="5" class="empty">No entries.</td></tr>'}</tbody></table></div></div>`;
}
function exportFinanceCSV(){
  const f=state.filters;
  let reps=DB.reports.slice();
  if(f.from) reps=reps.filter(r=>r.date>=f.from);
  if(f.to)   reps=reps.filter(r=>r.date<=f.to);
  const lines=[['Date','Report','Product','Component','Disposition'].join(',')];
  reps.forEach(r=>r.parts.forEach(p=>lines.push([
    r.date, r.id, (prodById(r.productId)?.name||''), partName(p), (dispById(p.dispositionId)?.label||'')
  ].map(s=>`"${String(s).replace(/"/g,'""')}"`).join(','))));
  const blob=new Blob([lines.join('\n')],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='fracas-disposition-summary.csv'; a.click(); URL.revokeObjectURL(a.href);
}

/* ---------------- boot ---------------- */
// console/debug handle (top-level `let` doesn't attach to window)
Object.defineProperty(window, 'DB', { get: () => DB });
loadDB().then(render);
