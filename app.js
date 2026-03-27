let dati = JSON.parse(localStorage.getItem("anvamed_dati")) || [];
let medici = JSON.parse(localStorage.getItem("anvamed_medici")) || [];
let fattureStatus = JSON.parse(localStorage.getItem("anvamed_fatture_status")) || {};

let currentMedico = "";
let editId = null;

let homeFiltroTipo = "giorno";
let homeFiltroValore = todayISO();

let reportFiltroTipo = "giorno";
let reportFiltroValore = todayISO();

function saveAll() {
  localStorage.setItem("anvamed_dati", JSON.stringify(dati));
  localStorage.setItem("anvamed_medici", JSON.stringify(medici));
  localStorage.setItem("anvamed_fatture_status", JSON.stringify(fattureStatus));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthISO() {
  return todayISO().slice(0, 7);
}

function currentYearISO() {
  return todayISO().slice(0, 4);
}

function currency(value) {
  return "€" + Number(value || 0).toFixed(2);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function monthLabel(monthIso) {
  const [y, m] = monthIso.split("-");
  const mesi = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  return `${mesi[Number(m) - 1]} ${y}`;
}

function go(pageId, btn = null) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
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
    const idx = map[pageId];
    const buttons = document.querySelectorAll(".menu-btn");
    if (buttons[idx]) buttons[idx].classList.add("active");
  }

  if (pageId === "calendarioPage") renderCalendario();
  if (pageId === "fatturePage") renderFatture();
  if (pageId === "reportPage") renderReport();
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
    id: Date.now(),
    nome,
    giorni: []
  });

  saveAll();
  renderAll();
}

function deleteMedico(id) {
  const medico = medici.find((m) => m.id === id);
  if (!medico) return;

  const collegati = dati.filter((d) => d.m === medico.nome).length;
  const messaggio =
    collegati > 0
      ? `Eliminare ${medico.nome}?\nVerranno eliminate anche ${collegati} prestazioni collegate.`
      : `Eliminare ${medico.nome}?`;

  if (!confirm(messaggio)) return;

  medici = medici.filter((m) => m.id !== id);
  dati = dati.filter((d) => d.m !== medico.nome);

  Object.keys(fattureStatus).forEach((key) => {
    if (key.startsWith(medico.nome + "__")) delete fattureStatus[key];
  });

  if (currentMedico === medico.nome) {
    currentMedico = "";
    go("mediciPage");
  }

  saveAll();
  renderAll();
}

function openPrestazionePopup(id = null) {
  if (!medici.length) {
    alert("Inserisci prima almeno un medico");
    return;
  }

  const popup = document.getElementById("popup");
  const medicoSelect = document.getElementById("medico");

  popup.classList.remove("hidden");
  medicoSelect.innerHTML = medici
    .map((m) => `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`)
    .join("");

  editId = id;
  document.getElementById("popupTitle").innerText = id ? "Modifica Registrazione" : "Nuova Registrazione";

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
    document.getElementById("data").value = homeFiltroTipo === "giorno" ? homeFiltroValore : todayISO();
    document.getElementById("importo").value = "";
    document.getElementById("percM").value = 60;
    document.getElementById("percS").value = 40;
  }

  updatePopupPreview();
}

function closePrestazionePopup() {
  document.getElementById("popup").classList.add("hidden");
  editId = null;
}

function updatePopupPreview() {
  const importo = parseFloat(document.getElementById("importo").value) || 0;
  const percM = Math.max(0, Math.min(100, parseFloat(document.getElementById("percM").value) || 0));
  const quotaMedico = importo * percM / 100;
  const quotaStruttura = importo - quotaMedico;

  document.getElementById("popupMedicoPreview").innerText = currency(quotaMedico);
  document.getElementById("popupStrutturaPreview").innerText = currency(quotaStruttura);
}

document.addEventListener("input", (e) => {
  if (e.target.id === "percM") {
    let v = parseFloat(e.target.value) || 0;
    if (v > 100) v = 100;
    if (v < 0) v = 0;
    e.target.value = v;
    document.getElementById("percS").value = 100 - v;
    updatePopupPreview();
  }

  if (e.target.id === "percS") {
    let v = parseFloat(e.target.value) || 0;
    if (v > 100) v = 100;
    if (v < 0) v = 0;
    e.target.value = v;
    document.getElementById("percM").value = 100 - v;
    updatePopupPreview();
  }

  if (e.target.id === "importo") {
    updatePopupPreview();
  }
});

function salvaPrestazione() {
  const m = document.getElementById("medico").value;
  const p = document.getElementById("prestazione").value.trim();
  const d = document.getElementById("data").value;
  const i = parseFloat(document.getElementById("importo").value);
  const percM = parseFloat(document.getElementById("percM").value);

  if (!m) return alert("Seleziona un medico");
  if (!p) return alert("Inserisci la prestazione");
  if (!d) return alert("Inserisci la data");
  if (!i || isNaN(i) || i <= 0) return alert("Inserisci un importo valido");
  if (percM < 0 || percM > 100 || isNaN(percM)) return alert("Percentuale medico non valida");

  const qm = i * percM / 100;
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

  saveAll();
  renderAll();
  closePrestazionePopup();
}

function eliminaPrestazione(id) {
  if (!confirm("Eliminare questa prestazione?")) return;

  dati = dati.filter((x) => x.id !== id);
  saveAll();
  renderAll();

  if (currentMedico) renderDettaglioMedico();
}

function setHomeFiltroTipo(tipo) {
  homeFiltroTipo = tipo;
  if (tipo === "giorno") homeFiltroValore = todayISO();
  if (tipo === "mese") homeFiltroValore = currentMonthISO();
  if (tipo === "anno") homeFiltroValore = currentYearISO();

  document.querySelectorAll("#home .tab").forEach((t) => t.classList.remove("active"));
  document.getElementById(`tab-${tipo}`).classList.add("active");
  renderHomeFilterControl();
  renderHome();
}

function setReportFiltroTipo(tipo) {
  reportFiltroTipo = tipo;
  if (tipo === "giorno") reportFiltroValore = todayISO();
  if (tipo === "mese") reportFiltroValore = currentMonthISO();
  if (tipo === "anno") reportFiltroValore = currentYearISO();

  document.querySelectorAll("#reportPage .tab").forEach((t) => t.classList.remove("active"));
  document.getElementById(`report-tab-${tipo}`).classList.add("active");
  renderReportFilterControl();
  renderReport();
}

function renderHomeFilterControl() {
  const wrap = document.getElementById("homeFilterControlWrap");
  let html = `<div class="filter-control">`;

  if (homeFiltroTipo === "giorno") {
    html += `
      <label for="homeFilterDay">Giorno selezionato</label>
      <input id="homeFilterDay" type="date" value="${homeFiltroValore}" />
    `;
  }
  if (homeFiltroTipo === "mese") {
    html += `
      <label for="homeFilterMonth">Mese selezionato</label>
      <input id="homeFilterMonth" type="month" value="${homeFiltroValore}" />
    `;
  }
  if (homeFiltroTipo === "anno") {
    html += `
      <label for="homeFilterYear">Anno selezionato</label>
      <input id="homeFilterYear" type="number" min="2000" max="2100" value="${homeFiltroValore}" />
    `;
  }

  html += `</div>`;
  wrap.innerHTML = html;

  const day = document.getElementById("homeFilterDay");
  const month = document.getElementById("homeFilterMonth");
  const year = document.getElementById("homeFilterYear");

  if (day) day.addEventListener("change", (e) => { homeFiltroValore = e.target.value || todayISO(); renderHome(); });
  if (month) month.addEventListener("change", (e) => { homeFiltroValore = e.target.value || currentMonthISO(); renderHome(); });
  if (year) year.addEventListener("change", (e) => { homeFiltroValore = String(e.target.value || currentYearISO()); renderHome(); });
}

function renderReportFilterControl() {
  const wrap = document.getElementById("reportFilterControlWrap");
  let html = `<div class="filter-control">`;

  if (reportFiltroTipo === "giorno") {
    html += `
      <label for="reportFilterDay">Giorno selezionato</label>
      <input id="reportFilterDay" type="date" value="${reportFiltroValore}" />
    `;
  }
  if (reportFiltroTipo === "mese") {
    html += `
      <label for="reportFilterMonth">Mese selezionato</label>
      <input id="reportFilterMonth" type="month" value="${reportFiltroValore}" />
    `;
  }
  if (reportFiltroTipo === "anno") {
    html += `
      <label for="reportFilterYear">Anno selezionato</label>
      <input id="reportFilterYear" type="number" min="2000" max="2100" value="${reportFiltroValore}" />
    `;
  }

  html += `</div>`;
  wrap.innerHTML = html;

  const day = document.getElementById("reportFilterDay");
  const month = document.getElementById("reportFilterMonth");
  const year = document.getElementById("reportFilterYear");

  if (day) day.addEventListener("change", (e) => { reportFiltroValore = e.target.value || todayISO(); renderReport(); });
  if (month) month.addEventListener("change", (e) => { reportFiltroValore = e.target.value || currentMonthISO(); renderReport(); });
  if (year) year.addEventListener("change", (e) => { reportFiltroValore = String(e.target.value || currentYearISO()); renderReport(); });
}

function getFilteredData(tipo, valore) {
  return dati.filter((x) => {
    if (tipo === "giorno") return x.d === valore;
    if (tipo === "mese") return x.d.startsWith(valore);
    if (tipo === "anno") return x.d.startsWith(String(valore));
    return true;
  });
}

function getMapFromList(lista) {
  const map = {};
  lista.forEach((x) => {
    if (!map[x.m]) map[x.m] = { tot: 0, m: 0, s: 0, c: 0, percM: x.percM || 0 };
    map[x.m].tot += x.i;
    map[x.m].m += x.qm;
    map[x.m].s += x.qs;
    map[x.m].c += 1;
    map[x.m].percM = x.percM || map[x.m].percM || 0;
  });
  return map;
}

function renderTopMonthlyCards() {
  const mese = currentMonthISO();
  const lista = dati.filter((x) => x.d.startsWith(mese));

  let tot = 0, str = 0, med = 0;
  lista.forEach((x) => {
    tot += x.i;
    str += x.qs;
    med += x.qm;
  });

  document.getElementById("meseCorrenteTotale").innerText = currency(tot);
  document.getElementById("meseCorrenteStruttura").innerText = currency(str);
  document.getElementById("meseCorrenteMedici").innerText = currency(med);
}

function buildMedicoCard(m, d, showDelete = false) {
  const percM = Math.round(d.percM || 0);
  const percS = 100 - percM;

  return `
    <div class="medico-card clickable" onclick="openMedico('${escapeHtml(m.nome).replaceAll("&#039;", "\\'")}')">
      <div class="medico-top">
        <div class="avatar">👨‍⚕️</div>

        <div class="medico-main">
          <div class="medico-name">${escapeHtml(m.nome)}</div>

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
          ${showDelete ? `<button class="icon-btn" type="button" onclick="deleteMedico(${m.id})">🗑️</button>` : ``}
        </div>
      </div>
    </div>
  `;
}

function renderHome() {
  renderTopMonthlyCards();

  const lista = getFilteredData(homeFiltroTipo, homeFiltroValore);
  const map = getMapFromList(lista);

  let tot = 0, str = 0;
  lista.forEach((x) => {
    tot += x.i;
    str += x.qs;
  });

  document.getElementById("guadagno").innerText = currency(tot);
  document.getElementById("utile").innerText = currency(str);

  const html = medici.map((m) => {
    const d = map[m.nome] || { tot: 0, m: 0, s: 0, c: 0, percM: 0 };
    return buildMedicoCard(m, d, false);
  }).join("");

  document.getElementById("homeMedici").innerHTML =
    html || `<div class="medico-card">Nessun medico inserito.</div>`;
}

function renderMediciPage() {
  const lista = getFilteredData(homeFiltroTipo, homeFiltroValore);
  const map = getMapFromList(lista);

  const html = medici.map((m) => {
    const d = map[m.nome] || { tot: 0, m: 0, s: 0, c: 0, percM: 0 };
    return buildMedicoCard(m, d, true);
  }).join("");

  document.getElementById("mediciList").innerHTML =
    html || `<div class="medico-card">Nessun medico inserito.</div>`;
}

function openMedico(nome) {
  currentMedico = nome;
  go("dettaglioPage");

  const medico = medici.find((x) => x.nome === nome);
  if (!medico) return;

  document.getElementById("dettaglioNome").innerText = nome;

  let giorniHtml = "";
  ["L", "M", "M", "G", "V", "S", "D"].forEach((g, idx) => {
    const key = `${g}-${idx}`;
    const active = medico.giorni.includes(key);
    giorniHtml += `<span onclick="toggleGiornoMedico('${key}')" class="${active ? "active" : ""}">${g}</span>`;
  });

  document.getElementById("giorniMedico").innerHTML = giorniHtml;

  const monthInput = document.getElementById("detailMonth");
  if (!monthInput.value) monthInput.value = currentMonthISO();

  renderDettaglioMedico();
}

function toggleGiornoMedico(dayKey) {
  const m = medici.find((x) => x.nome === currentMedico);
  if (!m) return;

  if (m.giorni.includes(dayKey)) m.giorni = m.giorni.filter((x) => x !== dayKey);
  else m.giorni.push(dayKey);

  saveAll();
  openMedico(currentMedico);
}

function renderDettaglioMedico() {
  const month = document.getElementById("detailMonth").value || currentMonthISO();
  document.getElementById("detailMonthLabel").innerText = `Prestazioni di ${monthLabel(month)}`;

  const lista = dati
    .filter((x) => x.m === currentMedico && x.d.startsWith(month))
    .sort((a, b) => new Date(b.d) - new Date(a.d));

  let totM = 0, totS = 0;
  lista.forEach((x) => {
    totM += x.qm;
    totS += x.qs;
  });

  document.getElementById("detTotM").innerText = currency(totM);
  document.getElementById("detTotS").innerText = currency(totS);
  document.getElementById("detCount").innerText = lista.length;

  const html = lista.map((x) => `
    <div class="medico-card">
      <div class="prestazione-top">
        <div>
          <div class="prestazione-title">${escapeHtml(x.p)}</div>
          <div class="prestazione-date">${x.d}</div>
        </div>
        <div class="prestazione-amount">${currency(x.i)}</div>
      </div>

      <div class="prestazione-gains">
        <span class="medico-val">👨‍⚕️ ${currency(x.qm)}</span>
        <span class="struttura-val">🏥 ${currency(x.qs)}</span>
      </div>

      <div class="card-actions" style="margin-top:12px;">
        <button class="icon-btn" type="button" onclick="openPrestazionePopup(${x.id})">✏️</button>
        <button class="icon-btn" type="button" onclick="eliminaPrestazione(${x.id})">🗑️</button>
      </div>
    </div>
  `).join("");

  document.getElementById("detailPrestazioni").innerHTML =
    html || `<div class="medico-card">Nessuna prestazione nel mese selezionato.</div>`;
}

function printDettaglioMedico() {
  if (!currentMedico) return;

  const month = document.getElementById("detailMonth").value || currentMonthISO();
  const lista = dati
    .filter((x) => x.m === currentMedico && x.d.startsWith(month))
    .sort((a, b) => new Date(a.d) - new Date(b.d));

  let totM = 0, totS = 0;
  lista.forEach((x) => {
    totM += x.qm;
    totS += x.qs;
  });

  const medico = medici.find((m) => m.nome === currentMedico);
  const giorni = medico ? medico.giorni : [];

  const daysMap = ["L", "M", "M", "G", "V", "S", "D"]
    .map((g, idx) => `${g}-${idx}`)
    .map((key, idx) => `${["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][idx]}: ${giorni.includes(key) ? "Sì" : "No"}`)
    .join(" | ");

  const rows = lista.map((x) => `
    <tr>
      <td>${x.d}</td>
      <td>${escapeHtml(x.p)}</td>
      <td>${currency(x.i)}</td>
      <td>${currency(x.qm)}</td>
      <td>${currency(x.qs)}</td>
    </tr>
  `).join("");

  const html = `
    <html>
    <head>
      <title>Riepilogo medico</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1,h2{margin:0 0 10px}
        .meta{margin:0 0 18px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f4f4f4}
      </style>
    </head>
    <body>
      <h1>${escapeHtml(currentMedico)}</h1>
      <div class="meta"><strong>Mese:</strong> ${monthLabel(month)}</div>
      <div class="meta"><strong>Giorni presenza:</strong> ${daysMap}</div>
      <div class="meta"><strong>Guadagno medico:</strong> ${currency(totM)}</div>
      <div class="meta"><strong>Guadagno struttura:</strong> ${currency(totS)}</div>
      <div class="meta"><strong>Prestazioni:</strong> ${lista.length}</div>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Prestazione</th>
            <th>Importo</th>
            <th>Medico</th>
            <th>Struttura</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function renderReport() {
  const lista = getFilteredData(reportFiltroTipo, reportFiltroValore);

  let tot = 0, str = 0, med = 0;
  lista.forEach((x) => {
    tot += x.i;
    str += x.qs;
    med += x.qm;
  });

  const map = getMapFromList(lista);
  const mediciRows = medici.map((m) => {
    const d = map[m.nome] || { tot: 0, m: 0, s: 0, c: 0 };
    return `
      <div class="card report-card">
        <div class="report-card-title">${escapeHtml(m.nome)}</div>
        <div class="report-card-value">${currency(d.tot)}</div>
        <div class="page-subtitle">Prestazioni: ${d.c} · Medico: ${currency(d.m)} · Struttura: ${currency(d.s)}</div>
      </div>
    `;
  }).join("");

  document.getElementById("reportPeriodoLabel").innerText =
    `${reportFiltroTipo.toUpperCase()} selezionato: ${reportFiltroValore}`;

  document.getElementById("reportGrid").innerHTML = `
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
      <div class="report-card-value">${lista.length}</div>
    </div>
    ${mediciRows}
  `;
}

function fatturaKey(nome, fromMonth, toMonth) {
  return `${nome}__${fromMonth}__${toMonth}`;
}

function getMonthRange(fromMonth, toMonth) {
  const months = [];
  const start = new Date(fromMonth + "-01");
  const end = new Date(toMonth + "-01");
  const current = new Date(start);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function getFattureFilters() {
  const fromMonth = document.getElementById("fattureMonthFrom").value || currentMonthISO();
  const toMonthRaw = document.getElementById("fattureMonthTo").value || fromMonth;
  const toMonth = toMonthRaw < fromMonth ? fromMonth : toMonthRaw;
  const statusFilter = document.getElementById("fattureStatusFilter").value || "tutti";
  return { fromMonth, toMonth, statusFilter };
}

function cycleFatturaStatus(nome, fromMonth, toMonth) {
  const key = fatturaKey(nome, fromMonth, toMonth);
  const current = fattureStatus[key] || "da_fatturare";

  if (current === "da_fatturare") fattureStatus[key] = "fatturato";
  else if (current === "fatturato") fattureStatus[key] = "pagato";
  else fattureStatus[key] = "da_fatturare";

  saveAll();
  renderFatture();
}

function renderFatture() {
  const { fromMonth, toMonth, statusFilter } = getFattureFilters();
  const months = getMonthRange(fromMonth, toMonth);

  const lista = dati.filter((x) => months.some((m) => x.d.startsWith(m)));
  const map = {};

  lista.forEach((x) => {
    if (!map[x.m]) map[x.m] = 0;
    map[x.m] += x.qm;
  });

  let totalePeriodo = 0;
  Object.values(map).forEach((v) => totalePeriodo += v);

  document.getElementById("fatturePeriodoLabel").innerText =
    `Periodo: ${monthLabel(fromMonth)}${fromMonth !== toMonth ? " → " + monthLabel(toMonth) : ""}`;

  document.getElementById("fattureChart").innerHTML = `
    <div class="card report-card">
      <div class="report-card-title">Totale da pagare</div>
      <div class="report-card-value">${currency(totalePeriodo)}</div>
    </div>
    <div class="card report-card">
      <div class="report-card-title">Mesi selezionati</div>
      <div class="report-card-value">${months.length}</div>
    </div>
  `;

  let html = medici.map((m) => {
    const amount = map[m.nome] || 0;
    const status = fattureStatus[fatturaKey(m.nome, fromMonth, toMonth)] || "da_fatturare";

    if (statusFilter !== "tutti" && status !== statusFilter) return "";

    return `
      <div class="card fattura-card">
        <div class="fattura-name">${escapeHtml(m.nome)}</div>
        <div class="fattura-amount">${currency(amount)}</div>
        <button
          type="button"
          class="fattura-status-btn status-${status}"
          onclick="cycleFatturaStatus('${escapeHtml(m.nome).replaceAll("&#039;", "\\'")}', '${fromMonth}', '${toMonth}')"
        >
          ${status.replaceAll("_", " ")}
        </button>
      </div>
    `;
  }).join("");

  document.getElementById("fattureList").innerHTML =
    html || `<div class="medico-card">Nessuna fattura per il filtro selezionato.</div>`;
}

function printFatture() {
  const { fromMonth, toMonth, statusFilter } = getFattureFilters();
  const months = getMonthRange(fromMonth, toMonth);
  const lista = dati.filter((x) => months.some((m) => x.d.startsWith(m)));
  const map = {};

  lista.forEach((x) => {
    if (!map[x.m]) map[x.m] = 0;
    map[x.m] += x.qm;
  });

  const rows = medici.map((m) => {
    const amount = map[m.nome] || 0;
    const status = fattureStatus[fatturaKey(m.nome, fromMonth, toMonth)] || "da_fatturare";
    if (statusFilter !== "tutti" && status !== statusFilter) return "";
    return `
      <tr>
        <td>${escapeHtml(m.nome)}</td>
        <td>${currency(amount)}</td>
        <td>${status.replaceAll("_", " ")}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <html>
    <head>
      <title>Stampa fatture</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{margin:0 0 12px}
        .meta{margin:0 0 18px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f4f4f4}
      </style>
    </head>
    <body>
      <h1>Riepilogo fatture</h1>
      <div class="meta"><strong>Da:</strong> ${monthLabel(fromMonth)}</div>
      <div class="meta"><strong>A:</strong> ${monthLabel(toMonth)}</div>
      <div class="meta"><strong>Filtro stato:</strong> ${statusFilter.replaceAll("_", " ")}</div>
      <table>
        <thead>
          <tr>
            <th>Medico</th>
            <th>Importo da fatturare</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function renderCalendario() {
  const input = document.getElementById("calendarMonth");
  const monthValue = input.value || currentMonthISO();
  input.value = monthValue;

  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const firstDay = new Date(year, monthIndex, 1);
  let jsDay = firstDay.getDay();
  jsDay = jsDay === 0 ? 6 : jsDay - 1;

  const totalDays = daysInMonth(year, monthIndex);
  const container = document.getElementById("calendarGrid");

  const dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  let html = dayNames.map((d) => `<div class="calendar-day-name">${d}</div>`).join("");

  for (let i = 0; i < jsDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const iso = `${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`;
    const count = dati.filter((x) => x.d === iso).length;

    html += `
      <button type="button" class="calendar-day ${count ? "has-data" : ""}" onclick="openDayFromCalendar('${iso}')">
        <div class="calendar-day-number">${d}</div>
        <div class="calendar-day-count">${count ? count + " reg." : ""}</div>
      </button>
    `;
  }

  container.innerHTML = html;
}

function openDayFromCalendar(isoDay) {
  homeFiltroTipo = "giorno";
  homeFiltroValore = isoDay;
  document.querySelectorAll("#home .tab").forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-giorno").classList.add("active");
  renderHomeFilterControl();
  renderHome();
  go("home");
}

function renderAll() {
  renderTopMonthlyCards();
  renderHome();
  renderMediciPage();
  renderReport();
  renderFatture();

  if (currentMedico && document.getElementById("dettaglioPage").classList.contains("active")) {
    renderDettaglioMedico();
  }

  if (document.getElementById("calendarioPage").classList.contains("active")) {
    renderCalendario();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHomeFilterControl();
  renderReportFilterControl();

  document.getElementById("detailMonth").value = currentMonthISO();
  document.getElementById("detailMonth").addEventListener("change", renderDettaglioMedico);

  document.getElementById("fattureMonthFrom").value = currentMonthISO();
  document.getElementById("fattureMonthTo").value = currentMonthISO();
  document.getElementById("fattureMonthFrom").addEventListener("change", renderFatture);
  document.getElementById("fattureMonthTo").addEventListener("change", renderFatture);
  document.getElementById("fattureStatusFilter").addEventListener("change", renderFatture);

  document.getElementById("calendarMonth").value = currentMonthISO();
  document.getElementById("calendarMonth").addEventListener("change", renderCalendario);

  renderAll();
});
