const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const STATUS = {pending:['قيد الانتظار','st-pending'], confirmed:['مؤكد','st-confirmed'], done:['تمت الزيارة','st-done'], cancelled:['ملغى','st-cancelled']};
const DEF = {
  doctor:'د. محمد زهران', spec:'طبيب - حجز المواعد', address:'', phone:'',
  slug:'dr-zahran', open:true, days:[1,2,3,4,5], start:'10:00', end:'18:00', slot:20, max:30,
  services:['كشف عام','استشارة','متابعة'], blocked:[], pw:'1234'
};
let S = Object.assign({}, DEF, store.get('z_set', {}));
let B = store.get('z_bk', []);
let F = {service:'', date:'', time:'', name:'', phone:'', notes:''};
let tab = 'st', flt = 'all';
const save = () => { store.set('z_set', S); store.set('z_bk', B); };
const ymd = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const toM = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const hm = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');

function slotsFor(date){
  if(!S.open || !date) return [];
  const d = new Date(date+'T00:00');
  if(!S.days.includes(d.getDay()) || S.blocked.includes(date)) return [];
  const act = B.filter(b => b.date===date && b.status!=='cancelled');
  if(act.length >= S.max) return [];
  const now = new Date(), isToday = date===ymd(now), nowM = now.getHours()*60+now.getMinutes();
  const out = [];
  for(let t = toM(S.start); t + S.slot <= toM(S.end); t += S.slot){
    if(isToday && t <= nowM) continue;
    const tm = hm(t);
    if(!act.some(b => b.time===tm)) out.push(tm);
  }
  return out;
}

function renderHeader(){
  $('#hDoc').textContent = S.doctor;
  $('#hSpec').textContent = S.spec;
  $('#hInfo').textContent = [S.address, S.phone].filter(Boolean).join(' | ');
}

function renderBook(){
  renderHeader();
  const app = $('#app');
  if(!S.open){ app.innerHTML = `<div class="card empty">الحجز متوقف مؤقتاً، يرجى المحاولة لاحقاً.</div>`; return; }
  const today = ymd(new Date());
  const slots = slotsFor(F.date);
  app.innerHTML = `
  <div class="card">
    <h2>1. اختر نوع الزيارة</h2>
    <div class="chips">${S.services.map(s => `<button class="chip ${F.service===s?'on':''}" data-b="svc" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  </div>
  <div class="card">
    <h2>2. اختر التاريخ والوقت</h2>
    <label class="lbl">التاريخ</label>
    <input type="date" id="bDate" min="${today}" value="${esc(F.date)}">
    <label class="lbl">الأوقات المتاحة</label>
    ${!F.date ? `<div class="muted">اختر تاريخاً لعرض الأوقات</div>` :
      slots.length ? `<div class="slots">${slots.map(t => `<button class="slot ${F.time===t?'on':''}" data-b="time" data-v="${t}">${t}</button>`).join('')}</div>`
      : `<div class="empty">لا توجد أوقات متاحة في هذا اليوم</div>`}
  </div>
  <div class="card">
    <h2>3. بياناتك</h2>
    <label class="lbl">الاسم الكامل</label>
    <input id="bName" value="${esc(F.name)}" placeholder="الاسم الثلاثي">
    <div class="row">
      <div><label class="lbl">رقم الهاتف</label><input id="bPhone" value="${esc(F.phone)}" placeholder="05xxxxxxxxx" inputmode="tel"></div>
      <div><label class="lbl">ملاحظات (اختياري)</label><input id="bNotes" value="${esc(F.notes)}"></div>
    </div>
    <div id="bMsg"></div>
    <button class="btn full" id="bSubmit">تأكيد الحجز</button>
  </div>`;
}

function bindBook(){
  $('#app').onclick = e => {
    const t = e.target.closest('[data-b]'); if(!t) return;
    readForm();
    if(t.dataset.b==='svc') F.service = t.dataset.v;
    if(t.dataset.b==='time') F.time = t.dataset.v;
    renderBook();
  };
  $('#app').onchange = e => {
    if(e.target.id==='bDate'){ readForm(); F.date = e.target.value; F.time=''; renderBook(); }
  };
  $('#app').oninput = e => readForm();
  $('#app').addEventListener('click', e => { if(e.target.id==='bSubmit') submitBooking(); });
}
function readForm(){
  const n=$('#bName'), p=$('#bPhone'), o=$('#bNotes');
  if(n) F.name=n.value; if(p) F.phone=p.value; if(o) F.notes=o.value;
}

function submitBooking(){
  readForm();
  const msg = m => $('#bMsg').innerHTML = `<div class="msg err">${m}</div>`;
  if(!F.service) return msg('يرجى اختيار نوع الزيارة');
  if(!F.date) return msg('يرجى اختيار التاريخ');
  if(!F.time) return msg('يرجى اختيار الوقت');
  if(F.name.trim().length < 3) return msg('يرجى إدخال الاسم الكامل');
  if(F.phone.replace(/\D/g,'').length < 7) return msg('يرجى إدخال رقم هاتف صحيح');
  if(!slotsFor(F.date).includes(F.time)) return msg('هذا الموعد لم يعد متاحاً، يرجى اختيار وقت آخر');
  const code = 'Z' + Math.random().toString(36).slice(2,7).toUpperCase();
  B.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), code, date:F.date, time:F.time, service:F.service,
    name:F.name.trim(), phone:F.phone.trim(), notes:F.notes.trim(), status:'pending', created:new Date().toISOString()});
  save();
  $('#app').innerHTML = `<div class="card" style="text-align:center">
    <h2>تم استلام طلب الحجز ✔</h2>
    <p class="muted">احتفظ برمز الحجز التالي للرجوع إليه</p>
    <div class="code">${code}</div>
    <p><b>${esc(F.date)}</b> الساعة <b>${esc(F.time)}</b></p>
    <p class="muted">${esc(F.service)} - ${esc(S.doctor)}</p>
    <button class="btn g" id="again">حجز موعد آخر</button></div>`;
  F = {service:'', date:'', time:'', name:'', phone:'', notes:''};
  $('#again').onclick = renderBook;
}

/* ---------- Events & routing ---------- */
$('#lgo').onclick = tryLogin;
$('#lcx').onclick = () => { $('#login').hidden = true; if(location.hash==='#admin') location.hash=''; };
$('#lpw').onkeydown = e => { if(e.key==='Enter') tryLogin(); };

$('#admBody').parentElement.onclick = e => {};
$('#adm').onclick = e => {
  const t = e.target.closest('[data-a]'); if(!t) return;
  const a = t.dataset.a, id = t.dataset.id;
  if(a==='tab') tab = t.dataset.t;
  else if(a==='close'){ $('#adm').hidden = true; if(location.hash==='#admin') location.hash=''; return; }
  else if(a==='st'){ const b = B.find(x=>x.id===id); if(b) b.status = t.dataset.s; }
  else if(a==='del'){ if(!confirm('حذف هذا الحجز نهائياً؟')) return; B = B.filter(x=>x.id!==id); }
  else if(a==='saveset') return readSet();
  else if(a==='addhol'){ const v=$('#hd').value; if(v && !S.blocked.includes(v)){ S.blocked.push(v); S.blocked.sort(); } }
  else if(a==='rmhol') S.blocked = S.blocked.filter(x=>x!==t.dataset.d);
  else if(a==='csv') return exportCsv();
  else if(a==='copy'){ navigator.clipboard?.writeText($('#lk').value).then(()=>alert('تم نسخ الرابط')).catch(()=>{ $('#lk').select(); }); return; }
  else if(a==='tog') S.open = !S.open;
  else if(a==='reset'){ if(!confirm('سيتم حذف جميع الحجوزات نهائياً، هل أنت متأكد؟')) return; B = []; }
  save(); renderAdm(); renderBook();
};
$('#adm').onchange = e => { if(e.target.id==='flt'){ flt = e.target.value; renderAdm(); } };

/* Typing "admin" anywhere on the booking page opens the login */
let buf = '';
document.addEventListener('keydown', e => {
  if(e.target.matches('input,textarea,select') || e.ctrlKey || e.metaKey || e.key.length!==1) return;
  buf = (buf + e.key.toLowerCase()).slice(-5);
  if(buf === 'admin'){ buf=''; askLogin(); }
});

function route(){
  const h = location.hash.slice(1);
  if(h === 'admin'){ askLogin(); return; }
  if(h && h !== S.slug){
    $('#app').innerHTML = `<div class="card empty">الرابط غير صحيح. يرجى التحقق من رابط الحجز.</div>`; renderHeader(); return;
  }
  renderBook();
}
window.addEventListener('hashchange', () => { S = Object.assign({}, DEF, store.get('z_set', {})); route(); });
bindBook();
renderHeader();
route();
