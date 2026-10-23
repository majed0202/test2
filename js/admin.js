/* ---------- Admin ---------- */
function fmtDate(d){ return new Date(d+'T00:00').toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }

function renderAdm(){
  const today = ymd(new Date());
  const tabsHtml = [['st','الإحصائيات'],['bk','الحجوزات'],['set','الإعدادات'],['hol','الإجازات'],['lnk','رابط الحجز']]
    .map(([k,l]) => `<button class="${tab===k?'on':''}" data-a="tab" data-t="${k}">${l}</button>`).join('');
  let body = '';
  if(tab==='st'){
    const cnt = s => B.filter(b => b.status===s).length;
    const up = B.filter(b => b.status!=='cancelled' && b.date>=today).sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time)).slice(0,6);
    body = `<div class="card"><h2>نظرة عامة</h2><div class="stats">
      <div class="stat"><b>${B.length}</b>إجمالي الحجوزات</div>
      <div class="stat"><b>${B.filter(b=>b.date===today&&b.status!=='cancelled').length}</b>حجوزات اليوم</div>
      <div class="stat"><b>${cnt('pending')}</b>قيد الانتظار</div>
      <div class="stat"><b>${cnt('cancelled')}</b>ملغاة</div></div></div>
      <div class="card"><h2>المواعيد القادمة</h2>${up.length ? up.map(b=>`<div class="item"><div><b>${esc(b.name)}</b> <span class="muted">${esc(b.service)}</span><div class="muted">${b.date} - ${b.time}</div></div><span class="badge ${STATUS[b.status][1]}">${STATUS[b.status][0]}</span></div>`).join('') : `<div class="empty">لا توجد مواعيد قادمة</div>`}</div>`;
  }
  if(tab==='bk'){
    let list = B.filter(b => flt==='all' || b.status===flt).sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time));
    body = `<div class="card"><div class="toolbar"><h2 style="margin:0">الحجوزات (${list.length})</h2>
      <div class="acts"><select id="flt" style="width:auto">
        <option value="all">الكل</option>${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${flt===k?'selected':''}>${v[0]}</option>`).join('')}
      </select><button class="btn s g" data-a="csv">تصدير Excel</button></div></div>
      ${list.length ? list.map(b => `<div class="item">
        <div style="flex:1;min-width:200px"><div><b>${esc(b.name)}</b> <span class="badge ${STATUS[b.status][1]}">${STATUS[b.status][0]}</span></div>
        <div class="muted">${b.date} - ${b.time} | ${esc(b.service)} | ${esc(b.phone)} | رمز: ${b.code}</div>
        ${b.notes ? `<div class="muted">ملاحظة: ${esc(b.notes)}</div>` : ''}</div>
        <div class="acts">
          <button class="btn s o" data-a="st" data-id="${b.id}" data-s="confirmed">تأكيد</button>
          <button class="btn s i" data-a="st" data-id="${b.id}" data-s="done">تمت</button>
          <button class="btn s w" data-a="st" data-id="${b.id}" data-s="cancelled">إلغاء</button>
          <button class="btn s d" data-a="del" data-id="${b.id}">حذف</button>
        </div></div>`).join('') : `<div class="empty">لا توجد حجوزات</div>`}</div>`;
  }
  if(tab==='set'){
    body = `<div class="card"><h2>إعدادات العيادة والحجز</h2>
      <div class="row"><div><label class="lbl">اسم الطبيب</label><input id="s_doc" value="${esc(S.doctor)}"></div>
      <div><label class="lbl">التخصص / العنوان الفرعي</label><input id="s_spec" value="${esc(S.spec)}"></div></div>
      <div class="row"><div><label class="lbl">العنوان</label><input id="s_addr" value="${esc(S.address)}"></div>
      <div><label class="lbl">هاتف العيادة</label><input id="s_phone" value="${esc(S.phone)}"></div></div>
      <div class="row"><div><label class="lbl">بداية الدوام</label><input type="time" id="s_start" value="${S.start}"></div>
      <div><label class="lbl">نهاية الدوام</label><input type="time" id="s_end" value="${S.end}"></div></div>
      <div class="row"><div><label class="lbl">مدة الموعد (دقيقة)</label><input type="number" id="s_slot" min="5" max="120" value="${S.slot}"></div>
      <div><label class="lbl">الحد الأقصى للحجوزات يومياً</label><input type="number" id="s_max" min="1" value="${S.max}"></div></div>
      <label class="lbl">أيام العمل</label>
      <div class="dgrid">${DAYS.map((d,i)=>`<label><input type="checkbox" class="dy" value="${i}" ${S.days.includes(i)?'checked':''}>${d}</label>`).join('')}</div>
      <label class="lbl">أنواع الزيارات (سطر لكل نوع)</label>
      <textarea id="s_sv">${esc(S.services.join('\n'))}</textarea>
      <div class="row"><div><label class="lbl">رابط الحجز (المعرف)</label><input id="s_sl" value="${esc(S.slug)}"></div>
      <div><label class="lbl">كلمة مرور لوحة التحكم</label><input id="s_pw" value="${esc(S.pw)}"></div></div>
      <p class="muted">${S.pw==='1234' ? '⚠ كلمة المرور الحالية الافتراضية، يُنصح بتغييرها.' : ''}</p>
      <button class="btn full" data-a="saveset">حفظ الإعدادات</button></div>`;
  }
  if(tab==='hol'){
    body = `<div class="card"><h2>الإجازات والأيام المغلقة</h2>
      <div class="acts"><input type="date" id="hd" min="${today}" style="width:auto"><button class="btn" data-a="addhol">إضافة</button></div>
      <div style="margin-top:12px">${S.blocked.length ? S.blocked.map(d=>`<div class="item"><span>${fmtDate(d)}</span><button class="btn s d" data-a="rmhol" data-d="${d}">إزالة</button></div>`).join('') : `<div class="empty">لا توجد إجازات مضافة</div>`}</div></div>`;
  }
  if(tab==='lnk'){
    const link = location.origin + location.pathname + '#' + S.slug;
    body = `<div class="card"><h2>رابط الحجز</h2>
      <label class="lbl">أرسل هذا الرابط للمرضى</label>
      <div class="acts"><input id="lk" readonly value="${esc(link)}" style="flex:1"><button class="btn" data-a="copy">نسخ</button></div>
      <p class="muted">لتغيير الرابط عدّل "رابط الحجز (المعرف)" من تبويب الإعدادات.</p>
      <div class="toolbar" style="margin-top:14px"><div><b>حالة الحجز:</b> <span class="badge ${S.open?'st-confirmed':'st-cancelled'}">${S.open?'مفتوح':'مغلق'}</span></div>
      <button class="btn ${S.open?'d':'o'}" data-a="tog">${S.open?'إيقاف الحجز مؤقتاً':'فتح الحجز'}</button></div>
      <div class="toolbar" style="margin-top:14px"><div class="muted">حذف جميع البيانات نهائياً</div><button class="btn d" data-a="reset">إعادة ضبط البيانات</button></div></div>`;
  }
  $('#admBody').innerHTML = `<div class="tabs">${tabsHtml}</div>${body}`;
}

function readSet(){
  const v = id => $(id).value.trim();
  if(toM(v('#s_start')) >= toM(v('#s_end'))) return alert('وقت النهاية يجب أن يكون بعد وقت البداية');
  S.doctor = v('#s_doc') || DEF.doctor;
  S.spec = v('#s_spec');
  S.address = v('#s_addr');
  S.phone = v('#s_phone');
  S.start = v('#s_start'); S.end = v('#s_end');
  S.slot = Math.max(5, +v('#s_slot') || 20);
  S.max = Math.max(1, +v('#s_max') || 1);
  S.days = [...document.querySelectorAll('.dy:checked')].map(x => +x.value);
  S.services = v('#s_sv').split('\n').map(s => s.trim()).filter(Boolean);
  if(!S.services.length) S.services = DEF.services.slice();
  S.slug = v('#s_sl').replace(/\s+/g,'-').replace(/[^\w\u0600-\u06FF-]/g,'') || DEF.slug;
  S.pw = v('#s_pw') || S.pw;
  save(); alert('تم حفظ الإعدادات');
}

function exportCsv(){
  const rows = [['رمز الحجز','التاريخ','الوقت','الاسم','الهاتف','نوع الزيارة','الحالة','ملاحظات']];
  B.forEach(b => rows.push([b.code,b.date,b.time,b.name,b.phone,b.service,STATUS[b.status][0],b.notes]));
  const csv = '\uFEFF' + rows.map(r => r.map(c => '"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download = 'bookings.csv'; a.click();
}

function openAdmin(){ $('#adm').hidden = false; renderAdm(); }
function askLogin(){ $('#login').hidden = false; $('#lerr').hidden = true; $('#lpw').value=''; setTimeout(()=>$('#lpw').focus(),50); }
function tryLogin(){
  if($('#lpw').value === S.pw){ $('#login').hidden = true; openAdmin(); }
  else $('#lerr').hidden = false;
}

