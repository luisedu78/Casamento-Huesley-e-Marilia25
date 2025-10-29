// ---- Utils ----
function $id(id){ return document.getElementById(id); }

// ---- Countdown ----
function startCountdown() {
  const el = $id('counter');
  if (!el) return;
  function tick() {
    const target = new Date('2025-12-13T16:30:00-03:00').getTime();
    const now = Date.now();
    let diff = target - now;
    if (diff <= 0) {
      el.innerHTML = `<div class="box"><div class="num">0</div><div>dias</div></div>
      <div class="box"><div class="num">0</div><div>h</div></div>
      <div class="box"><div class="num">0</div><div>min</div></div>
      <div class="box"><div class="num">0</div><div>s</div></div>`;
      return;
    }
    const days = Math.floor(diff / (1000*60*60*24));
    diff -= days * (1000*60*60*24);
    const hours = Math.floor(diff / (1000*60*60));
    diff -= hours * (1000*60*60);
    const mins = Math.floor(diff / (1000*60));
    diff -= mins * (1000*60);
    const secs = Math.floor(diff / 1000);
    function pad(n){ return String(n).padStart(2,'0'); }
    el.innerHTML = `
      <div class="box"><div class="num">${pad(days)}</div><div>dias</div></div>
      <div class="box"><div class="num">${pad(hours)}</div><div>h</div></div>
      <div class="box"><div class="num">${pad(mins)}</div><div>min</div></div>
      <div class="box"><div class="num">${pad(secs)}</div><div>s</div></div>`;
  }
  tick();
  setInterval(tick, 1000);
}

// ---- Gifts ----
function readInlineGifts(){
  try{
    const tag = document.getElementById('gifts-inline');
    if (!tag) return null;
    return JSON.parse(tag.textContent);
  }catch(e){ return null; }
}

async function loadGifts() {
  const grid = $id('gift-grid');
  if (!grid) return;
  grid.innerHTML = '<p class="subtitle">Carregando presentes...</p>';
  let gifts = readInlineGifts();
  if (!gifts) {
    try{
      const res = await fetch('assets/gifts.json');
      if (res.ok) gifts = await res.json();
    }catch(e){ /* ignore */ }
  }
  if (!gifts || !gifts.length){
    grid.innerHTML = '<div class="empty"><h3>Lista em atualização</h3><p class="subtitle">Em breve os novos presentes com imagem, descrição e link.</p></div>';
    return;
  }
  grid.innerHTML = '';
  for (const g of gifts) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="p">
        <div class="gift-img-wrap"><img src="${g.image_url}" alt="${g.name}" loading="lazy"></div>
        <h3>${g.name}</h3>
        <p class="subtitle">${g.description ?? ''}</p>
        <p class="price">R$ ${(g.price_cents/100).toFixed(2).replace('.', ',')}</p>
        <a class="button terracotta" href="${g.mp_link}" target="_blank" rel="noopener">Presentear</a>
      </div>`;
    grid.appendChild(card);
  }
}

// ---- RSVP ----
function setupRSVP() {
  const form = $id('rsvp-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = $id('rsvp-ok');
    if (ok) ok.style.display = 'block';
    form.reset();
  });
}

// ---- Simple Auth (MVP) ----
async function sha256(text){ const enc=new TextEncoder().encode(text); const buf=await crypto.subtle.digest('SHA-256',enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function getConfig(){ try{const r=await fetch('assets/config.json',{cache:'no-store'}); if(!r.ok) throw 0; return await r.json();}catch(e){return null;} }
async function isLoggedIn(){ const t=localStorage.getItem('mh_admin_token'); const cfg=await getConfig(); return !!(t && cfg && t===cfg.admin_pass_sha256); }
async function requireAuth(){ const g=document.querySelector('[data-auth-guard=\"true\"]'); if(!g) return; if(!await isLoggedIn()) location.href='login.html'; else { const btn=document.getElementById('logout'); if(btn) btn.onclick=(e)=>{e.preventDefault(); localStorage.removeItem('mh_admin_token'); location.href='login.html';}; } }
async function setupLogin(){ const f=document.getElementById('login-form'); if(!f) return; f.addEventListener('submit', async (e)=>{ e.preventDefault(); const pass=new FormData(f).get('passcode'); const hash=await sha256(pass); const cfg=await getConfig(); const msg=document.getElementById('login-msg'); if(cfg && hash===cfg.admin_pass_sha256){ localStorage.setItem('mh_admin_token', hash); msg.textContent='Login bem-sucedido!'; setTimeout(()=>location.href='historico.html',500);} else { msg.textContent='Senha incorreta.';} }); }

// ---- Orders (mock) ----
function loadOrders(){
  const table=document.getElementById('orders-table'); if(!table) return;
  fetch('assets/orders.json').then(r=>r.json()).then(orders=>{
    const tbody=table.querySelector('tbody'); tbody.innerHTML='';
    for(const o of orders){
      const tr=document.createElement('tr');
      const amount=(o.amount_cents/100).toFixed(2).replace('.',',');
      tr.innerHTML=`
      <td style="padding:10px; border-bottom:1px solid #f0f0f0;">${new Date(o.created_at).toLocaleString('pt-BR')}</td>
      <td style="padding:10px; border-bottom:1px solid #f0f0f0;">${o.gift_name}</td>
      <td style="padding:10px; border-bottom:1px solid #f0f0f0;">R$ ${amount}</td>
      <td style="padding:10px; border-bottom:1px solid #f0f0f0;">${o.guest_name}</td>
      <td style="padding:10px; border-bottom:1px solid #f0f0f0;">${o.status}</td>
      <td style="padding:10px; border-bottom:1px solid #f0f0f0;"><a href="${o.receipt_url}">Ver recibo</a></td>`;
      tbody.appendChild(tr);
    }
  }).catch(()=>{});
}

// ---- Cookies ----
// ---- Consent storage helpers (cookie + localStorage fallback) ----
function setConsent(value){
  try { setCookie('cookie_consent', String(value), 365); } catch(e){}
  try { localStorage.setItem('cookie_consent', String(value)); } catch(e){}
}
function getConsent(){
  try{
    const c = getCookie('cookie_consent');
    if (c !== undefined && c !== null) return c;
  }catch(e){}
  try{
    const v = localStorage.getItem('cookie_consent');
    if (v !== undefined && v !== null) return v;
  }catch(e){}
  return null;
}

function setCookie(name, value, days){
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}
function getCookie(name){
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function setupCookieBanner(){
  const banner = document.getElementById('cookie-toast');
  if (!banner) return;
  const consent = getConsent();
  if (consent !== null) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';
  const acc = document.getElementById('cookie-accept');
  const dec = document.getElementById('cookie-decline');
  if (acc) acc.onclick = () => { setConsent(1); banner.style.display='none'; };
  if (dec) dec.onclick = () => { setConsent(0); banner.style.display='none'; };
}

// ---- Init ----
function init(){
  try{ startCountdown(); }catch(e){}
  try{ loadGifts(); }catch(e){}
  try{ setupRSVP(); }catch(e){}
  try{ requireAuth(); }catch(e){}
  try{ setupLogin(); }catch(e){}
  try{ loadOrders(); }catch(e){}
  try{ setupCookieBanner(); }catch(e){}
}
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', init);


// Safety retry to ensure countdown appears even if DOM timing is odd
(function(){
  let tries = 0;
  const max = 5;
  const timer = setInterval(()=>{
    const el = document.getElementById('counter');
    if (!el) return;
    if (el.textContent && el.textContent.trim().length > 0){ clearInterval(timer); return; }
    try{ startCountdown(); }catch(e){}
    if (++tries >= max) clearInterval(timer);
  }, 500);
})();



// === Mobile nav toggle (append-only) ===
(function(){
  const nav = document.querySelector('nav');
  const btn = document.querySelector('.nav-toggle');
  if(!nav || !btn) return;
  btn.addEventListener('click', ()=>{
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('#menu a').forEach(a=>{
    a.addEventListener('click', ()=>{
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    });
  });
})();
