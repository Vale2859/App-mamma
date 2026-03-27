let dati = JSON.parse(localStorage.getItem("dati")) || [];
let medici = JSON.parse(localStorage.getItem("medici")) || [];

let current = "";
let editId = null;

function save() {
  localStorage.setItem("dati", JSON.stringify(dati));
  localStorage.setItem("medici", JSON.stringify(medici));
}

function currency(value) {
  const n = Number(value || 0);
  return "€" + n.toFixed(2);
}

function go(pageId, btn = null) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".menu-btn").forEach((b) => b.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    const map = {
      home: 0,
      mediciPage: 1,
      reportPage: 2,
      fatturePage: 3
    };
    const index = map[pageId];
    const buttons = document.querySelectorAll(".menu-btn");
    if (buttons[index]) buttons[index].classList.add("active");
  }
}

function addMedico() {
  let nome = prompt("Nome medico");
  if (!nome) return;

  nome = nome.trim();
  if (!nome) return;

  const exists = medici.find((m) => m.nome.toLowerCase() === nome.toLowerCase());
  if (exists) {
    alert("Medico già esistente");
    return;
  }

  medici.push({
    nome,
    giorni: [],
    stato: "da_fatturare"
  });

  save();
  render();
}

function openPopup(id = null) {
  const popup = document.getElementById("popup");
  const sel = document.getElementById("medico");

  popup.classList.remove("hidden");
  sel.innerHTML = "";

  medici.forEach((m) => {
    sel.innerHTML += `<option>${m.nome}</option>`;
  });

  editId = id;

  if (id) {
    const r = dati.find((x) => x.id === id);
    if (!r) return;

    document.getElementById("medico").value = r.m;
    document.getElementById("prestazione").value = r.p;
    document.getElementById("data").value = r.d;
    document.getElementById("importo").value = r.i;
    document.getElementById("percM").value = r.percM;
    document.getElementById("percS").value = 100 - r.percM;
  } else {
    document.getElementById("prestazione").value = "";
    document.getElementById("data").value = "";
    document.getElementById("importo").value = "";
    document.getElementById("percM").value = 60;
    document.getElementById("percS").value = 40;
  }
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
  editId = null;
}

document.addEventListener("input", (e) => {
  if (e.target.id === "percM") {
    let v = parseFloat(e.target.value) || 0;
    if (v > 100) v = 100;
    if (v < 0) v = 0;
    e.target.value = v;
    document.getElementById("percS").value = 100 - v;
  }

  if (e.target.id === "percS") {
    let v = parseFloat(e.target.value) || 0;
    if (v > 100) v = 100;
    if (v < 0) v = 0;
    e.target.value = v;
    document.getElementById("percM").value = 100 - v;
  }
});

function salva() {
  const m = document.getElementById("medico").value;
  const p = document.getElementById("prestazione").value.trim();
  const d = document.getElementById("data").value;
  const i = parseFloat(document.getElementById("importo").value);
  const percM = parseFloat(document.getElementById("percM").value);

  if (!m) {
    alert("Aggiungi prima almeno un medico");
    return;
  }

  if (!p) {
    alert("Inserisci prestazione");
    return;
  }

  if (!d) {
    alert("Inserisci data");
    return;
  }

  if (!i || isNaN(i) || i <= 0) {
    alert("Importo non valido");
    return;
  }

  const qm = (i * percM) / 100;
  const qs = i - qm;

  if (editId) {
    const r = dati.find((x) => x.id === editId);
    if (!r) return;

    r.m = m;
    r.p = p;
    r.d = d;
    r.i = i;
    r.qm = qm;
    r.qs = qs;
    r.percM = percM;
  } else {
    dati.push({
      id: Date.now(),
      m,
      p,
      d,
      i,
      qm,
      qs,
      percM
    });
  }

  save();
  render();
  closePopup();
}

function elimina(id) {
  if (!confirm("Eliminare questa prestazione?")) return;

  dati = dati.filter((x) => x.id !== id);
  save();
  render();

  if (current) {
    renderDettaglio();
  }
}

function openMedico(nome) {
  current = nome;
  go("dettaglio");

  const medico = medici.find((x) => x.nome === nome);
  if (!medico) return;

  let giorniHtml = "";
  ["L", "M", "M", "G", "V", "S", "D"].forEach((g, idx) => {
    const key = `${g}-${idx}`;
    const active = medico.giorni.includes(key);
    giorniHtml += `<span onclick="toggle('${key}')" class="${active ? "active" : ""}">${g}</span>`;
  });

  document.getElementById("giorni").innerHTML = giorniHtml;
  document.getElementById("nome").innerText = nome;

  renderDettaglio();
}

function toggle(dayKey) {
  const m = medici.find((x) => x.nome === current);
  if (!m) return;

  if (m.giorni.includes(dayKey)) {
    m.giorni = m.giorni.filter((x) => x !== dayKey);
  } else {
    m.giorni.push(dayKey);
  }

  save();
  openMedico(current);
}

function renderDettaglio() {
  const lista = dati.filter((x) => x.m === current);

  let totM = 0;
  let totS = 0;

  lista.forEach((x) => {
    totM += x.qm;
    totS += x.qs;
  });

  document.getElementById("totM").innerText = currency(totM);
  document.getElementById("totS").innerText = currency(totS);
  document.getElementById("count").innerText = lista.length;

  const container = document.getElementById("prestazioni");
  container.className = "cards-list";

  let html = "";

  lista
    .sort((a, b) => new Date(b.d) - new Date(a.d))
    .forEach((x) => {
      html += `
        <div class="medico-card">
          <div class="prestazione-top">
            <div>
              <div class="prestazione-title">${x.p}</div>
              <div class="prestazione-date">${x.d}</div>
            </div>
            <div class="prestazione-amount">${currency(x.i)}</div>
          </div>

          <div class="prestazione-gains">
            <span class="medico-val">👨‍⚕️ ${currency(x.qm)}</span>
            <span class="struttura-val">🏥 ${currency(x.qs)}</span>
          </div>

          <div class="card-actions" style="margin-top:12px;">
            <button class="icon-btn" type="button" onclick="event.stopPropagation(); openPopup(${x.id});">✏️</button>
            <button class="icon-btn" type="button" onclick="event.stopPropagation(); elimina(${x.id});">🗑️</button>
          </div>
        </div>
      `;
    });

  container.innerHTML = html || `<div class="medico-card">Nessuna prestazione registrata.</div>`;
}

function cambiaStato(nome) {
  const m = medici.find((x) => x.nome === nome);
  if (!m) return;

  if (m.stato === "da_fatturare") m.stato = "fatturato";
  else if (m.stato === "fatturato") m.stato = "pagato";
  else m.stato = "da_fatturare";

  save();
  render();
}

function render() {
  let tot = 0;
  let str = 0;
  let med = 0;
  const map = {};

  dati.forEach((x) => {
    tot += x.i;
    str += x.qs;
    med += x.qm;

    if (!map[x.m]) {
      map[x.m] = { tot: 0, m: 0, s: 0, c: 0, percM: x.percM || 0 };
    }

    map[x.m].tot += x.i;
    map[x.m].m += x.qm;
    map[x.m].s += x.qs;
    map[x.m].c += 1;
    map[x.m].percM = x.percM || map[x.m].percM || 0;
  });

  document.getElementById("mese").innerText = currency(tot);
  document.getElementById("struttura").innerText = currency(str);
  document.getElementById("medici").innerText = currency(med);

  document.getElementById("guadagno").innerText = currency(tot);
  document.getElementById("utile").innerText = currency(str);

  let cardsHtml = "";

  medici.forEach((m) => {
    const d = map[m.nome] || { tot: 0, m: 0, s: 0, c: 0, percM: 0 };
    const percM = Math.round(d.percM || 0);
    const percS = 100 - percM;

    cardsHtml += `
      <div class="medico-card clickable" onclick="openMedico('${m.nome.replace(/'/g, "\\'")}')">
        <div class="medico-top">
          <div class="avatar">👨‍⚕️</div>

          <div class="medico-main">
            <div class="medico-name">${m.nome}</div>

            <div class="medico-sub">
              <span class="medico-total">Totale: ${currency(d.tot)}</span>
              <span class="medico-badge">${d.c} prestazioni</span>
            </div>

            <div class="percent-row">
              <div class="percent-seg medico">${percM}% Medico</div>
              <div class="percent-seg struttura">${percS}% Struttura</div>
            </div>

            <div class="gains-row">
              <span class="medico-val">${currency(d.m)}</span>
              <span class="struttura-val">${currency(d.s)}</span>
            </div>
          </div>

          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="icon-btn" type="button">✏️</button>
            <button class="icon-btn" type="button">🗑️</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("mediciList").innerHTML =
    cardsHtml || `<div class="medico-card">Nessun medico inserito.</div>`;
  document.getElementById("homeMedici").innerHTML =
    cardsHtml || `<div class="medico-card">Nessun medico inserito.</div>`;

  let reportHtml = `
    <div class="report-grid">
      <div class="card report-card">
        <div class="report-card-title">Guadagno totale</div>
        <div class="report-card-value">${currency(tot)}</div>
      </div>
      <div class="card report-card">
        <div class="report-card-title">Totale struttura</div>
        <div class="report-card-value">${currency(str)}</div>
      </div>
      <div class="card report-card">
        <div class="report-card-title">Totale medici</div>
        <div class="report-card-value">${currency(med)}</div>
      </div>
      <div class="card report-card">
        <div class="report-card-title">Prestazioni totali</div>
        <div class="report-card-value">${dati.length}</div>
      </div>
    </div>
  `;
  document.getElementById("report").innerHTML = reportHtml;

  let fattHtml = `<div class="fatture-grid">`;
  medici.forEach((m) => {
    const d = map[m.nome] || { s: 0 };
    fattHtml += `
      <div class="card fattura-card">
        <div class="fattura-name">${m.nome}</div>
        <div class="fattura-amount">${currency(d.s)}</div>
        <button
          type="button"
          class="fattura-status-btn status-${m.stato}"
          onclick="cambiaStato('${m.nome.replace(/'/g, "\\'")}')"
        >
          ${m.stato.replaceAll("_", " ")}
        </button>
      </div>
    `;
  });
  fattHtml += `</div>`;

  document.getElementById("fattureList").innerHTML =
    medici.length ? fattHtml : `<div class="medico-card">Nessuna fattura disponibile.</div>`;

  if (current && document.getElementById("dettaglio").classList.contains("active")) {
    renderDettaglio();
  }
}

render();
