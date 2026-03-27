let dati = JSON.parse(localStorage.getItem("dati")) || [];
let medici = JSON.parse(localStorage.getItem("medici")) || [];

let current="";
let editId=null;

function save(){
localStorage.setItem("dati",JSON.stringify(dati));
localStorage.setItem("medici",JSON.stringify(medici));
}

function go(p){
document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
document.getElementById(p).classList.add("active");
}

function addMedico(){
let nome=prompt("Nome medico");
if(!nome) return;

nome=nome.trim();

if(medici.find(x=>x.nome.toLowerCase()===nome.toLowerCase())){
alert("Medico già esistente");
return;
}

medici.push({nome,giorni:[],stato:"da_fatturare"});
save();
render();
}

function openPopup(id=null){
document.getElementById("popup").classList.remove("hidden");

let sel=document.getElementById("medico");
sel.innerHTML="";
medici.forEach(m=>sel.innerHTML+=`<option>${m.nome}</option>`);

editId=id;

if(id){
let r=dati.find(x=>x.id===id);
document.getElementById("medico").value=r.m;
document.getElementById("prestazione").value=r.p;
document.getElementById("data").value=r.d;
document.getElementById("importo").value=r.i;
document.getElementById("percM").value=r.percM;
document.getElementById("percS").value=100-r.percM;
}else{
document.getElementById("prestazione").value="";
document.getElementById("data").value="";
document.getElementById("importo").value="";
document.getElementById("percM").value=60;
document.getElementById("percS").value=40;
}
}

function closePopup(){
document.getElementById("popup").classList.add("hidden");
}

document.addEventListener("input", e=>{
if(e.target.id==="percM"){
let v=parseFloat(e.target.value)||0;
if(v>100)v=100;
if(v<0)v=0;
e.target.value=v;
document.getElementById("percS").value=100-v;
}
if(e.target.id==="percS"){
let v=parseFloat(e.target.value)||0;
if(v>100)v=100;
if(v<0)v=0;
e.target.value=v;
document.getElementById("percM").value=100-v;
}
});

function salva(){

let m=document.getElementById("medico").value;
let p=document.getElementById("prestazione").value.trim();
let d=document.getElementById("data").value;
let i=parseFloat(document.getElementById("importo").value);
let percM=parseFloat(document.getElementById("percM").value);

if(!p){alert("Inserisci prestazione");return;}
if(!d){alert("Inserisci data");return;}
if(!i||isNaN(i)||i<=0){alert("Importo non valido");return;}

let qm=i*percM/100;
let qs=i-qm;

if(editId){
let r=dati.find(x=>x.id===editId);
r.m=m;r.p=p;r.d=d;r.i=i;r.qm=qm;r.qs=qs;r.percM=percM;
}else{
dati.push({id:Date.now(),m,p,d,i,qm,qs,percM});
}

save();
render();
closePopup();
}

function elimina(id){
if(confirm("Eliminare?")){
dati=dati.filter(x=>x.id!==id);
save();
render();
}
}

function openMedico(nome){
current=nome;
go("dettaglio");

let medico=medici.find(x=>x.nome===nome);

let html="";
["L","M","M","G","V","S","D"].forEach(g=>{
html+=`<span onclick="toggle('${g}')" class="${medico.giorni.includes(g)?"active":""}">${g}</span>`;
});

document.getElementById("giorni").innerHTML=html;
document.getElementById("nome").innerText=nome;

renderDettaglio();
}

function toggle(g){
let m=medici.find(x=>x.nome===current);
if(m.giorni.includes(g)){
m.giorni=m.giorni.filter(x=>x!==g);
}else{
m.giorni.push(g);
}
save();
openMedico(current);
}

function renderDettaglio(){

let lista=dati.filter(x=>x.m===current);

let totM=0,totS=0;

lista.forEach(x=>{
totM+=x.qm;
totS+=x.qs;
});

document.getElementById("totM").innerText=totM.toFixed(2);
document.getElementById("totS").innerText=totS.toFixed(2);
document.getElementById("count").innerText=lista.length;

let html="";
lista.forEach(x=>{
html+=`
<div class="medico-card">
${x.d} - ${x.p}<br>
€${x.i}<br>
👨‍⚕️ €${x.qm.toFixed(2)} | 🏥 €${x.qs.toFixed(2)}
<br>
<button onclick="openPopup(${x.id})">✏️</button>
<button onclick="elimina(${x.id})">🗑</button>
</div>`;
});

document.getElementById("prestazioni").innerHTML=html;
}

function cambiaStato(nome){
let m=medici.find(x=>x.nome===nome);

if(m.stato==="da_fatturare") m.stato="fatturato";
else if(m.stato==="fatturato") m.stato="pagato";
else m.stato="da_fatturare";

save();
render();
}

function render(){

let tot=0,str=0,med=0;
let map={};

dati.forEach(x=>{
tot+=x.i;
str+=x.qs;
med+=x.qm;

if(!map[x.m]) map[x.m]={tot:0,m:0,s:0,c:0};

map[x.m].tot+=x.i;
map[x.m].m+=x.qm;
map[x.m].s+=x.qs;
map[x.m].c++;
});

document.getElementById("mese").innerText="€"+tot.toFixed(2);
document.getElementById("struttura").innerText="€"+str.toFixed(2);
document.getElementById("medici").innerText="€"+med.toFixed(2);

document.getElementById("guadagno").innerText="€"+tot.toFixed(2);
document.getElementById("utile").innerText="€"+str.toFixed(2);

let html="";
medici.forEach(m=>{
let d=map[m.nome]||{tot:0,m:0,s:0,c:0};

html+=`
<div class="medico-card" onclick="openMedico('${m.nome}')">
<strong>${m.nome}</strong><br>
${d.c} prestazioni<br>
€${d.tot.toFixed(2)}
</div>`;
});

document.getElementById("mediciList").innerHTML=html;
document.getElementById("homeMedici").innerHTML=html;

let fatt="";
medici.forEach(m=>{
let d=map[m.nome]||{s:0};

fatt+=`
<div class="medico-card">
<strong>${m.nome}</strong><br>
€${d.s.toFixed(2)}<br>
<button onclick="cambiaStato('${m.nome}')">${m.stato}</button>
</div>`;
});

document.getElementById("fattureList").innerHTML=fatt;

}

render();
