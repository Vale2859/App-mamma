const PIN="1003";

let spese=JSON.parse(localStorage.getItem("spese")||"[]");
let prestazioni=JSON.parse(localStorage.getItem("prestazioni")||"[]");
let registrazioni=JSON.parse(localStorage.getItem("registrazioni")||"[]");
let suggerimenti=JSON.parse(localStorage.getItem("suggerimenti")||"[]");

function save(){
localStorage.setItem("spese",JSON.stringify(spese));
localStorage.setItem("prestazioni",JSON.stringify(prestazioni));
localStorage.setItem("registrazioni",JSON.stringify(registrazioni));
localStorage.setItem("suggerimenti",JSON.stringify(suggerimenti));
}

function login(){
 if(pinInput.value===PIN){
  pinScreen.style.display="none";
  app.classList.remove("hidden");
  page("home");
 } else alert("PIN errato");
}

function page(p){
 let c=content;

 if(p==="home"){
  c.innerHTML=`
  <div class='card'>
  <input id="medicoSel" placeholder="Medico" oninput="mostraPrestazioni(this.value)">
  <div id="pillole"></div>
  <input id="prestazione" placeholder="Prestazione">
  <input id="percentuale" type="number" placeholder="%">
  <input id="prezzo" type="number" placeholder="€">
  <button onclick="salvaRegistrazione()">Salva</button>
  </div>`;
 }

 if(p==="prestazioni"){
  c.innerHTML=`
  <div class='card'>
  <input id='medico' placeholder='Medico'>
  <input id='nome' placeholder='Prestazione'>
  <input id='perc' placeholder='%'>
  <input id='prezzoP' placeholder='€'>
  <button onclick='addPrest()'>Salva</button>
  </div>
  <div id='listPrest'></div>`;
  renderPrest();
 }

 if(p==="spese"){
  c.innerHTML=`
  <div class='card'>
  <input id='nomeSpesa' placeholder='Nome' oninput='suggerisci(this.value)'>
  <div id='suggest'></div>
  <input id='importoSpesa' type='number' placeholder='€'>
  <button onclick='addSpesa()'>Salva</button>
  </div>
  <div id='tot'></div>
  <div id='listSpese'></div>`;
  renderSpese();
 }

 if(p==="report"){
  let entrate=registrazioni.reduce((a,b)=>a+b.prezzo,0);
  let uscite=spese.reduce((a,b)=>a+b.importo,0);

  c.innerHTML=`
  <div class='card'>Entrate €${entrate}</div>
  <div class='card'>Spese €${uscite}</div>
  <div class='card'><b>Utile €${entrate-uscite}</b></div>
  <canvas id="chart1"></canvas>
  <canvas id="chart2"></canvas>`;

  let medici={};
  registrazioni.forEach(r=>{
    medici[r.medico]=(medici[r.medico]||0)+r.prezzo;
  });

  new Chart(chart2,{type:'bar',
    data:{labels:Object.keys(medici),
    datasets:[{data:Object.values(medici)}]}});

  let cat={};
  spese.forEach(s=>{
    cat[s.nome]=(cat[s.nome]||0)+s.importo;
  });

  new Chart(chart1,{type:'pie',
    data:{labels:Object.keys(cat),
    datasets:[{data:Object.values(cat)}]}});
 }

 if(p==="calendario"){
  let g={};
  registrazioni.forEach(r=>{
    g[r.data]=(g[r.data]||0)+1;
  });

  c.innerHTML=Object.keys(g).map(d=>`
    <div class='card'>
    ${d}<br>Registrazioni: ${g[d]}
    </div>`).join("");
 }
}

function addPrest(){
 let m=medico.value,n=nome.value,p=parseFloat(perc.value),pr=parseFloat(prezzoP.value);
 if(!m||!n||!p||!pr)return alert("Compila");
 prestazioni.push({medico:m,nome:n,percentuale:p,prezzo:pr});
 save();renderPrest();
}

function renderPrest(){
 listPrest.innerHTML=prestazioni.map(x=>`<div class='card'>${x.medico} - ${x.nome}</div>`).join("");
}

function mostraPrestazioni(m){
 let f=prestazioni.filter(p=>p.medico===m);
 pillole.innerHTML=f.map(p=>`<div class='pill' onclick="selectPrest('${p.nome}',${p.percentuale},${p.prezzo})">${p.nome}</div>`).join("");
}

function selectPrest(n,p,pr){
 prestazione.value=n;percentuale.value=p;prezzo.value=pr;
}

function salvaRegistrazione(){
 let m=medicoSel.value,n=prestazione.value,p=parseFloat(percentuale.value),pr=parseFloat(prezzo.value);
 if(!m||!n||!p||!pr)return alert("Compila");
 registrazioni.unshift({medico:m,prestazione:n,percentuale:p,prezzo:pr,data:new Date().toLocaleDateString()});
 save();
}

function suggerisci(v){
 if(!v){suggest.innerHTML="";return;}
 let f=suggerimenti.filter(s=>s.toLowerCase().includes(v.toLowerCase()));
 suggest.innerHTML=f.map(s=>`<div class='pill' onclick="nomeSpesa.value='${s}'">${s}</div>`).join("");
}

function addSpesa(){
 let n=nomeSpesa.value,i=parseFloat(importoSpesa.value);
 if(!n||!i)return alert("Dati mancanti");
 spese.unshift({nome:n,importo:i,data:new Date().toLocaleDateString()});
 if(!suggerimenti.includes(n))suggerimenti.push(n);
 save();renderSpese();
}

function renderSpese(){
 let tot=spese.reduce((a,b)=>a+b.importo,0);
 document.getElementById("tot").innerHTML=`<div class='card'>Totale €${tot}</div>`;
 listSpese.innerHTML=spese.map(s=>`<div class='card'>${s.nome} €${s.importo}</div>`).join("");
}
