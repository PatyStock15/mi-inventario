const $=id=>document.getElementById(id);
let db=JSON.parse(localStorage.getItem('miInventarioUniversal_v2')||'{"products":[],"moves":[]}');
db.products.forEach(p=>{p.damaged=p.damaged||0});
db.moves.forEach(m=>{if(m.type==='venta'&&m.total==null){m.total=(m.qty||0)*(m.unitPrice||0)-(m.discount||0);m.costTotal=(m.qty||0)*(m.costUnit||0);m.profit=m.total-m.costTotal}});
const save=()=>{localStorage.setItem('miInventarioUniversal_v2',JSON.stringify(db));render()};
const n=x=>Number(x||0).toLocaleString('es-PA',{maximumFractionDigits:2});
const money=x=>'$'+Number(x||0).toLocaleString('es-PA',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>{let d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
$('mDate').value=today();
$('rFrom').value=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
$('rTo').value=today();

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
 ['products','movement','reports','settings'].forEach(id=>$(id).classList.toggle('hidden',id!==b.dataset.tab));
 render();
});

$('productForm').onsubmit=e=>{
 e.preventDefault();
 let p={id:crypto.randomUUID(),name:$('pName').value.trim(),code:$('pCode').value.trim(),barcode:$('pBarcode').value.trim(),category:$('pCategory').value.trim(),supplier:$('pSupplier').value.trim(),unit:$('pUnit').value,cost:+$('pCost').value||0,price:+$('pPrice').value||0,stock:+$('pStock').value||0,damaged:0,min:+$('pMin').value||0,expiry:$('pExpiry').value,location:$('pLocation').value.trim()};
 if(!p.name)return;
 db.products.push(p);
 if(p.stock)db.moves.unshift({id:crypto.randomUUID(),productId:p.id,type:'entrada',qty:p.stock,date:today(),ref:'',note:'Stock inicial'});
 e.target.reset();
 $('pCost').value=0;$('pPrice').value=0;$('pStock').value=0;$('pMin').value=0;
 save();
};

function saleCalc(){
 let p=db.products.find(x=>x.id===$('mProduct').value),q=+$('mQty').value||0,price=+$('mSalePrice').value||0,discount=+$('mDiscount').value||0,total=Math.max(0,q*price-discount),cost=q*(p?.cost||0);
 $('saleTotal').textContent=money(total);
 $('saleCost').textContent=money(cost);
 $('saleProfit').textContent=money(total-cost);
}
function toggleSale(){
 let is=$('mType').value==='venta';
 $('saleFields').classList.toggle('hidden',!is);
 if(is){
  let p=db.products.find(x=>x.id===$('mProduct').value);
  if(p&&$('mSalePrice').dataset.manual!=='1')$('mSalePrice').value=p.price||0;
  saleCalc();
 }
}
$('mType').onchange=toggleSale;
$('mProduct').onchange=()=>{
 if($('mSalePrice').dataset.manual!=='1'){
  let p=db.products.find(x=>x.id===$('mProduct').value);
  $('mSalePrice').value=p?.price||0;
 }
 toggleSale();
};
$('mQty').oninput=saleCalc;
$('mSalePrice').oninput=()=>{$('mSalePrice').dataset.manual='1';saleCalc()};
$('mDiscount').oninput=saleCalc;

$('moveForm').onsubmit=e=>{
 e.preventDefault();
 let p=db.products.find(x=>x.id===$('mProduct').value),type=$('mType').value,q=+$('mQty').value;
 if(!p||q<=0)return;
 if((['venta','salida','dañado'].includes(type))&&q>p.stock){
  alert('Stock insuficiente. Disponible: '+n(p.stock));
  return;
 }
 let m={id:crypto.randomUUID(),productId:p.id,type,qty:q,date:$('mDate').value,ref:$('mRef').value.trim(),note:$('mNote').value.trim()};
 if(type==='entrada')p.stock+=q;
 if(type==='venta'){
  let unitPrice=+$('mSalePrice').value||0,discount=+$('mDiscount').value||0,total=Math.max(0,q*unitPrice-discount),costTotal=q*(p.cost||0);
  p.stock-=q;
  Object.assign(m,{unitPrice,discount,total,costUnit:p.cost||0,costTotal,profit:total-costTotal});
 }
 if(type==='salida')p.stock-=q;
 if(type==='dañado'){p.stock-=q;p.damaged=(p.damaged||0)+q}
 if(type==='ajuste'){
  let delta=q-p.stock;
  p.stock=q;
  m.qty=Math.abs(delta);
  m.note=(m.note?m.note+' · ':'')+'Ajuste de stock a '+q;
 }
 db.moves.unshift(m);
 $('mQty').value='';$('mRef').value='';$('mNote').value='';
 $('mDiscount').value=0;$('mSalePrice').dataset.manual='';
 e.target.reset();
 $('mDate').value=today();
 $('saleFields').classList.add('hidden');
 save();
};

$('search').oninput=renderProducts;
function esc(s){
 return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function render(){
 let stock=db.products.reduce((a,p)=>a+(+p.stock||0),0),dam=db.products.reduce((a,p)=>a+(+p.damaged||0),0),value=db.products.reduce((a,p)=>a+(+p.stock||0)*(+p.cost||0),0);
 $('sProd').textContent=db.products.length;
 $('sStock').textContent=n(stock);
 $('sDam').textContent=n(dam);
 $('sValue').textContent=money(value);
 let old=$('mProduct').value;
 $('mProduct').innerHTML=db.products.map(p=>`<option value="${p.id}">${esc(p.name)} — ${n(p.stock)} ${esc(p.unit)}</option>`).join('');
 if(db.products.some(p=>p.id===old))$('mProduct').value=old;
 renderProducts();renderMoves();
}
function renderProducts(){
 let q=$('search').value.toLowerCase(),arr=db.products.filter(p=>(p.name+' '+p.code+' '+p.barcode+' '+p.category+' '+p.supplier).toLowerCase().includes(q));
 $('productList').innerHTML=arr.length?arr.map(p=>`<div class="item"><div class="top"><div><h3>${esc(p.name)}</h3><div class="sub">${esc(p.category||'Sin categoría')} · ${esc(p.code||'Sin SKU')} · ${esc(p.supplier||'Sin proveedor')}</div></div><div class="qty">${n(p.stock)} ${esc(p.unit)}</div></div><div class="sub">Costo: ${money(p.cost)} · Venta: ${money(p.price)} · Valor stock: ${money(p.stock*p.cost)}</div><div class="sub">Dañadas: ${n(p.damaged)} · Mínimo: ${n(p.min)} ${p.stock<=p.min?'<span class="pill">Stock bajo</span>':''} ${p.expiry?`· Vence: ${esc(p.expiry)}`:''}</div><div class="actions"><button class="secondary" onclick="quick('${p.id}','entrada')">+ Entrada</button><button class="secondary" onclick="quick('${p.id}','venta')">Vender</button><button class="secondary" onclick="quick('${p.id}','dañado')">Dañado</button></div></div>`).join(''):'<div class="empty">No hay productos que mostrar.</div>';
}
function quick(id,t){
 $('mProduct').value=id;$('mType').value=t;$('mSalePrice').dataset.manual='';
 let p=db.products.find(x=>x.id===id);
 $('mSalePrice').value=p?.price||0;
 document.querySelector('[data-tab="movement"]').click();
 toggleSale();$('mQty').focus();
}
function renderMoves(){
 let arr=db.moves.slice(0,12);
 $('movementList').innerHTML=arr.length?arr.map(m=>{
  let p=db.products.find(x=>x.id===m.productId),label={entrada:'Entrada',venta:'Venta',salida:'Salida sin cobro',dañado:'Dañado',ajuste:'Ajuste'}[m.type]||m.type;
  return `<div class="item"><div class="top"><b>${esc(label)} · ${esc(p?.name||'Producto eliminado')}</b><span>${esc(m.date||'')}</span></div><div class="sub">Cantidad: ${n(m.qty)} ${esc(p?.unit||'')} ${m.type==='venta'?`· Cobrado: ${money(m.total)} · Ganancia: ${money(m.profit)}`:''}</div><div class="sub">${esc(m.ref||'')} ${esc(m.note||'')}</div></div>`;
 }).join(''):'<div class="empty">Aún no hay movimientos.</div>';
}
function csv(name,rows){
 let s=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
 download(name,'\ufeff'+s,'text/csv;charset=utf-8');
}
function download(name,data,type){
 let a=document.createElement('a'),u=URL.createObjectURL(new Blob([data],{type}));
 a.href=u;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(u),1000);
}
$('backup').onclick=()=>download('respaldo-mi-inventario.json',JSON.stringify(db,null,2),'application/json');
$('restore').onchange=async e=>{
 let f=e.target.files[0];if(!f)return;
 try{
  let d=JSON.parse(await f.text());
  if(!Array.isArray(d.products)||!Array.isArray(d.moves))throw 0;
  if(confirm('¿Reemplazar los datos actuales con este respaldo?')){db=d;save();alert('Respaldo restaurado correctamente.')}
 }catch{alert('Archivo de respaldo inválido.')}
 e.target.value='';
};
$('exportProducts').onclick=()=>csv('productos-inventario.csv',[['Producto','SKU','Código barras','Categoría','Proveedor','Unidad','Stock','Dañadas','Mínimo','Costo','Precio venta','Vencimiento','Ubicación'],...db.products.map(p=>[p.name,p.code,p.barcode,p.category,p.supplier,p.unit,p.stock,p.damaged,p.min,p.cost,p.price,p.expiry,p.location])]);
$('exportMoves').onclick=()=>csv('movimientos-inventario.csv',[['Fecha','Producto','Tipo','Cantidad','Precio unitario','Descuento','Total cobrado','Costo mercancía','Ganancia bruta','Referencia','Detalle'],...db.moves.map(m=>[m.date,db.products.find(p=>p.id===m.productId)?.name||'Eliminado',m.type,m.qty,m.unitPrice,m.discount,m.total,m.costTotal,m.profit,m.ref,m.note])]);

$('runReport').onclick=()=>{
 let from=$('rFrom').value,to=$('rTo').value,ms=db.moves.filter(m=>(!from||m.date>=from)&&(!to||m.date<=to)),sum=t=>ms.filter(m=>m.type===t).reduce((a,m)=>a+(+m.qty||0),0),sales=ms.filter(m=>m.type==='venta'),revenue=sales.reduce((a,m)=>a+(+m.total||0),0),cost=sales.reduce((a,m)=>a+(+m.costTotal||0),0),profit=sales.reduce((a,m)=>a+(+m.profit||0),0);
 $('reportResult').innerHTML=`<hr><b>Período:</b> ${esc(from||'inicio')} al ${esc(to||'hoy')}<br><b>Movimientos:</b> ${ms.length}<br><b>Entradas:</b> ${n(sum('entrada'))}<br><b>Ventas:</b> ${n(sum('venta'))}<br><b>Salidas sin cobro:</b> ${n(sum('salida'))}<br><b>Productos dañados:</b> ${n(sum('dañado'))}<br><b>Ajustes:</b> ${n(sum('ajuste'))}<hr><b>Número de ventas:</b> ${sales.length}<br><b>Total cobrado:</b> ${money(revenue)}<br><b>Costo de mercancía vendida:</b> ${money(cost)}<br><b>Ganancia bruta:</b> <strong>${money(profit)}</strong><br><br><b>Stock valorizado a costo:</b> ${money(db.products.reduce((a,p)=>a+p.stock*p.cost,0))}<br><b>Valor potencial de venta:</b> ${money(db.products.reduce((a,p)=>a+p.stock*p.price,0))}`;
};
render();$('runReport').click();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
