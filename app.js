const STORAGE_KEYS = {
  doctors: "anvamed_doctors_v2",
  entries: "anvamed_entries_v2",
  invoiceStates: "anvamed_invoice_states_v2"
};

const PIE_COLORS = ["#2d8cff", "#59cf82", "#9a62d8", "#eead42", "#dd5a52", "#39b86b", "#6e7b88"];

let doctors = JSON.parse(localStorage.getItem(STORAGE_KEYS.doctors)) || [];
let entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.entries)) || [];
let invoiceStates = JSON.parse(localStorage.getItem(STORAGE_KEYS.invoiceStates)) || {};

let currentDoctorId = null;
let editingEntryId = null;

let homeFilterType = "giorno";
let homeFilterValue = todayISO();

let reportFilterType = "giorno";
let reportFilterValue = todayISO();

function saveAll() {
  localStorage.setItem(STORAGE_KEYS.doctors, JSON.stringify(doctors));
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  localStorage.setItem(STORAGE_KEYS.invoiceStates, JSON.stringify(invoiceStates));
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

function formatDateLabel(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getDoctorById(id) {
  return doctors.find((d) => d.id === id) || null;
}

function getDoctorNameById(id) {
  const doctor = getDoctorById(id);
  return doctor ? doctor.name : "";
}

function go(pageId) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".menu-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  if (pageId === "homePage") {
    homeFilterType = "giorno";
    homeFilterValue = todayISO();
    setActiveTab("home", "giorno");
    renderHomeFilterControl();
    renderHome();
  }

  if (pageId === "reportPage") renderReport();
  if (pageId === "fatturePage") renderInvoices();
  if (pageId === "calendarPage") renderCalendar();
}

function setActiveTab(section, type) {
  const prefix = section === "home" ? "homeTab" : "reportTab";
  ["Giorno", "Mese", "Anno"].forEach((label) => {
    const el = document.getElementById(prefix + label);
    if (el) el.classList.remove("active");
  });

  const map = { giorno: "Giorno", mese: "Mese", anno: "Anno" };
  const target = document.getElementById(prefix + map[type]);
  if (target) target.classList.add("active");
}

function addDoctor() {
  let name = prompt("Nome medico");
  if (!name) return;

  name = name.trim();
  if (!name) return;

  if (doctors.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
    alert("Medico già esistente");
    return;
  }

  doctors.push({
    id: Date.now(),
    name,
    availability: []
  });

  saveAll();
  renderAll();
}

function editDoctor(id) {
  const doctor = getDoctorById(id);
  if (!doctor) return;

  let name = prompt("Modifica nome medico", doctor.name);
  if (!name) return;

  name = name.trim();
  if (!name) return;

  if (doctors.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase())) {
    alert("Esiste già un medico con questo nome");
    return;
  }

  doctor.name = name;
  saveAll();
  renderAll();
}

function deleteDoctor(id) {
  const doctor = getDoctorById(id);
  if (!doctor) return;

  const linkedCount = entries.filter((e) => e.doctorId === id).length;
  const msg = linkedCount
    ? `Eliminare ${doctor.name}? Verranno eliminate anche ${linkedCount} prestazioni collegate.`
    : `Eliminare ${doctor.name}?`;

  if (!confirm(msg)) return;

  doctors = doctors.filter((d) => d.id !== id);
  entries = entries.filter((e) => e.doctorId !== id);

  Object.keys(invoiceStates).forEach((key) => {
    if (key.startsWith(id + "__")) delete invoiceStates[key];
  });

  if (currentDoctorId === id) {
    currentDoctorId = null;
    go("mediciPage");
  }

  saveAll();
  renderAll();
}

function openEntryPopup(entryId = null, forcedDoctorId = null, forcedDate = null) {
  if (!doctors.length) {
    alert("Inserisci prima almeno un medico");
    return;
  }

  editingEntryId = entryId;
  document.getElementById("popup").classList.remove("hidden");
  document.getElementById("popupTitle").textContent = entryId ? "Modifica Registrazione" : "Nuova Registrazione";

  const doctorSelect = document.getElementById("popupDoctorSelect");
  doctorSelect.innerHTML = doctors
    .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
    .join("");

  const dateInput = document.getElementById("popupData");
  dateInput.max = todayISO();

  if (entryId) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    doctorSelect.value = String(entry.doctorId);
    document.getElementById("popupPrestazione").value = entry.prestazione;
    document.getElementById("popupData").value = entry.data;
    document.getElementById("popupImporto").value = entry.importo;
    document.getElementById("popupPercMedico").value = entry.percMedico;
    document.getElementById("popupPercStruttura").value = 100 - entry.percMedico;
  } else {
    doctorSelect.value = forcedDoctorId ? String(forcedDoctorId) : String(doctors[0].id);
    document.getElementById("popupPrestazione").value = "";
    document.getElementById("popupData").value = forcedDate || (homeFilterType === "giorno" ? homeFilterValue : todayISO());
    document.getElementById("popupImporto").value = "";
    document.getElementById("popupPercMedico").value = 60;
    document.getElementById("popupPercStruttura").value = 40;
  }

  updatePopupPreview();
}

function closeEntryPopup() {
  document.getElementById("popup").classList.add("hidden");
  editingEntryId = null;
}

function updatePopupPreview() {
  const amount = parseFloat(document.getElementById("popupImporto").value) || 0;
  const percMedico = Math.max(0, Math.min(100, parseFloat(document.getElementById("popupPercMedico").value) || 0));
  const quotaMedico = amount * percMedico / 100;
  const quotaStruttura = amount - quotaMedico;

  document.getElementById("popupMedicoPreview").textContent = currency(quotaMedico);
  document.getElementById("popupStrutturaPreview").textContent = currency(quotaStruttura);
}

function saveEntry() {
  const doctorId = Number(document.getElementById("popupDoctorSelect").value);
  const prestazione = document.getElementById("popupPrestazione").value.trim();
  const data = document.getElementById("popupData").value;
  const importo = parseFloat(document.getElementById("popupImporto").value);
  const percMedico = parseFloat(document.getElementById("popupPercMedico").value);

  if (!doctorId) return alert("Seleziona un medico");
  if (!prestazione) return alert("Inserisci la prestazione");
  if (!data) return alert("Inserisci la data");
  if (data > todayISO()) return alert("Non puoi inserire una data futura");
  if (!importo || isNaN(importo) || importo <= 0) return alert("Inserisci un importo valido");
  if (isNaN(percMedico) || percMedico < 0 || percMedico > 100) return alert("Percentuale medico non valida");

  const quotaMedico = importo * percMedico / 100;
  const quotaStruttura = importo - quotaMedico;

  if (editingEntryId) {
    const entry = entries.find((e) => e.id === editingEntryId);
    if (!entry) return;

    entry.doctorId = doctorId;
    entry.prestazione = prestazione;
    entry.data = data;
    entry.importo = importo;
    entry.percMedico = percMedico;
    entry.quotaMedico = quotaMedico;
    entry.quotaStruttura = quotaStruttura;
  } else {
    entries.push({
      id: Date.now(),
      doctorId,
      prestazione,
      data,
      importo,
      percMedico,
      quotaMedico,
      quotaStruttura
    });
  }

  saveAll();
  renderAll();
  closeEntryPopup();
}

function deleteEntry(id) {
  if (!confirm("Eliminare questa prestazione?")) return;
  entries = entries.filter((e) => e.id !== id);
  saveAll();
  renderAll();

  if (currentDoctorId) renderDoctorDetail();
}

function setHomeFiltroTipo(type) {
  homeFilterType = type;
  if (type === "giorno") homeFilterValue = todayISO();
  if (type === "mese") homeFilterValue = currentMonthISO();
  if (type === "anno") homeFilterValue = currentYearISO();
  setActiveTab("home", type);
  renderHomeFilterControl();
  renderHome();
}

function setReportFiltroTipo(type) {
  reportFilterType = type;
  if (type === "giorno") reportFilterValue = todayISO();
  if (type === "mese") reportFilterValue = currentMonthISO();
  if (type === "anno") reportFilterValue = currentYearISO();
  setActiveTab("report", type);
  renderReportFilterControl();
  renderReport();
}

function renderHomeFilterControl() {
  const wrap = document.getElementById("homeFilterControlWrap");
  let html = `<div class="filter-control">`;

  if (homeFilterType === "giorno") {
    html += `<label for="homeFilterDay">Giorno selezionato</label><input id="homeFilterDay" type="date" max="${todayISO()}" value="${homeFilterValue}" />`;
  } else if (homeFilterType === "mese") {
    html += `<label for="homeFilterMonth">Mese selezionato</label><input id="homeFilterMonth" type="month" value="${homeFilterValue}" />`;
  } else {
    html += `<label for="homeFilterYear">Anno selezionato</label><input id="homeFilterYear" type="number" min="2000" max="${currentYearISO()}" value="${homeFilterValue}" />`;
  }

  html += `</div>`;
  wrap.innerHTML = html;

  const day = document.getElementById("homeFilterDay");
  const month = document.getElementById("homeFilterMonth");
  const year = document.getElementById("homeFilterYear");

  if (day) day.addEventListener("change", (e) => {
    homeFilterValue = e.target.value || todayISO();
    renderHome();
  });

  if (month) month.addEventListener("change", (e) => {
    homeFilterValue = e.target.value || currentMonthISO();
    renderHome();
  });

  if (year) year.addEventListener("change", (e) => {
    homeFilterValue = String(e.target.value || currentYearISO());
    renderHome();
  });
}

function renderReportFilterControl() {
  const wrap = document.getElementById("reportFilterControlWrap");
  let html = `<div class="filter-control">`;

  if (reportFilterType === "giorno") {
    html += `<label for="reportFilterDay">Giorno selezionato</label><input id="reportFilterDay" type="date" max="${todayISO()}" value="${reportFilterValue}" />`;
  } else if (reportFilterType === "mese") {
    html += `<label for="reportFilterMonth">Mese selezionato</label><input id="reportFilterMonth" type="month" value="${reportFilterValue}" />`;
  } else {
    html += `<label for="reportFilterYear">Anno selezionato</label><input id="reportFilterYear" type="number" min="2000" max="${currentYearISO()}" value="${reportFilterValue}" />`;
  }

  html += `</div>`;
  wrap.innerHTML = html;

  const day = document.getElementById("reportFilterDay");
  const month = document.getElementById("reportFilterMonth");
  const year = document.getElementById("reportFilterYear");

  if (day) day.addEventListener("change", (e) => {
    reportFilterValue = e.target.value || todayISO();
    renderReport();
  });

  if (month) month.addEventListener("change", (e) => {
    reportFilterValue = e.target.value || currentMonthISO();
    renderReport();
  });

  if (year) year.addEventListener("change", (e) => {
    reportFilterValue = String(e.target.value || currentYearISO());
    renderReport();
  });
}

function getEntriesByFilter(type, value) {
  return entries.filter((e) => {
    if (type === "giorno") return e.data === value;
    if (type === "mese") return e.data.startsWith(value);
    if (type === "anno") return e.data.startsWith(String(value));
    return true;
  });
}

function buildStatsMap(list) {
  const map = {};
  list.forEach((e) => {
    if (!map[e.doctorId]) {
      map[e.doctorId] = {
        total: 0,
        doctor: 0,
        structure: 0,
        count: 0,
        percMedico: e.percMedico || 0
      };
    }
    map[e.doctorId].total += e.importo;
    map[e.doctorId].doctor += e.quotaMedico;
    map[e.doctorId].structure += e.quotaStruttura;
    map[e.doctorId].count += 1;
    map[e.doctorId].percMedico = e.percMedico || map[e.doctorId].percMedico || 0;
  });
  return map;
}

function renderTopMonthlyCards() {
  const month = currentMonthISO();
  const monthEntries = entries.filter((e) => e.data.startsWith(month));

  let total = 0;
  let structure = 0;
  let doctor = 0;

  monthEntries.forEach((e) => {
    total += e.importo;
    structure += e.quotaStruttura;
    doctor += e.quotaMedico;
  });

  document.getElementById("meseCorrenteTotale").textContent = currency(total);
  document.getElementById("meseCorrenteStruttura").textContent = currency(structure);
  document.getElementById("meseCorrenteMedici").textContent = currency(doctor);
}

function renderHome() {
  renderTopMonthlyCards();

  const filtered = getEntriesByFilter(homeFilterType, homeFilterValue);
  const statsMap = buildStatsMap(filtered);

  let total = 0;
  let structure = 0;

  filtered.forEach((e) => {
    total += e.importo;
    structure += e.quotaStruttura;
  });

  document.getElementById("homeGuadagno").textContent = currency(total);
  document.getElementById("homeUtile").textContent = currency(structure);

  let label = "Giorno/periodo selezionato";
  if (homeFilterType === "giorno") label = `Giorno selezionato: ${formatDateLabel(homeFilterValue)}`;
  if (homeFilterType === "mese") label = `Periodo selezionato: ${monthLabel(homeFilterValue)}`;
  if (homeFilterType === "anno") label = `Periodo selezionato: ${homeFilterValue}`;
  document.getElementById("homePeriodoLabel").textContent = label;

  const workedDoctors = doctors.filter((d) => statsMap[d.id]);
  const html = workedDoctors.map((doctor) => {
    const s = statsMap[doctor.id];
    const percMedico = Math.round(s.percMedico || 0);
    const percStruttura = 100 - percMedico;

    return `
      <div class="medico-card clickable" data-doctor-id="${doctor.id}">
        <div class="medico-top">
          <div class="avatar">👨‍⚕️</div>
          <div class="medico-main">
            <div class="medico-name">${escapeHtml(doctor.name)}</div>
            <div class="medico-sub">
              <span class="medico-total">Totale: ${currency(s.total)}</span>
              <span class="medico-badge">${s.count} prestazioni</span>
            </div>
            <div class="percent-row">
              <div class="percent-seg medico">${percMedico}% Medico</div>
              <div class="percent-seg struttura">${percStruttura}% Struttura</div>
            </div>
            <div class="gains-row">
              <span class="medico-val">${currency(s.doctor)}</span>
              <span class="struttura-val">${currency(s.structure)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("homeWorkedDoctors").innerHTML =
    html || `<div class="medico-card">Nessun medico ha lavorato nel giorno/periodo selezionato.</div>`;

  document.querySelectorAll("#homeWorkedDoctors .medico-card.clickable").forEach((card) => {
    card.addEventListener("click", () => {
      openDoctorDetail(Number(card.dataset.doctorId));
    });
  });
}

function renderDoctorsPage() {
  const html = doctors.map((doctor) => `
    <div class="simple-medico-row">
      <div class="simple-medico-name" data-open-doctor="${doctor.id}">${escapeHtml(doctor.name)}</div>
      <div class="simple-medico-actions">
        <button class="icon-btn" type="button" data-edit-doctor="${doctor.id}">✏️</button>
        <button class="icon-btn" type="button" data-delete-doctor="${doctor.id}">🗑️</button>
      </div>
    </div>
  `).join("");

  document.getElementById("doctorsSimpleList").innerHTML =
    html || `<div class="medico-card">Nessun medico inserito.</div>`;

  document.querySelectorAll("[data-open-doctor]").forEach((el) => {
    el.addEventListener("click", () => openDoctorDetail(Number(el.dataset.openDoctor)));
  });

  document.querySelectorAll("[data-edit-doctor]").forEach((btn) => {
    btn.addEventListener("click", () => editDoctor(Number(btn.dataset.editDoctor)));
  });

  document.querySelectorAll("[data-delete-doctor]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDoctor(Number(btn.dataset.deleteDoctor)));
  });
}

function openDoctorDetail(doctorId) {
  currentDoctorId = doctorId;
  go("doctorDetailPage");

  const doctor = getDoctorById(doctorId);
  if (!doctor) return;

  document.getElementById("doctorDetailName").textContent = doctor.name;

  const availabilityHtml = ["L", "M", "M", "G", "V", "S", "D"].map((label, idx) => {
    const key = `${label}-${idx}`;
    const active = doctor.availability.includes(key);
    return `<span class="${active ? "active" : ""}" data-availability-key="${key}">${label}</span>`;
  }).join("");

  const availabilityWrap = document.getElementById("doctorAvailability");
  availabilityWrap.innerHTML = availabilityHtml;

  availabilityWrap.querySelectorAll("[data-availability-key]").forEach((el) => {
    el.addEventListener("click", () => toggleDoctorAvailability(el.dataset.availabilityKey));
  });

  if (!document.getElementById("doctorDetailMonth").value) {
    document.getElementById("doctorDetailMonth").value = currentMonthISO();
  }

  renderDoctorDetail();
}

function toggleDoctorAvailability(key) {
  const doctor = getDoctorById(currentDoctorId);
  if (!doctor) return;

  if (doctor.availability.includes(key)) {
    doctor.availability = doctor.availability.filter((x) => x !== key);
  } else {
    doctor.availability.push(key);
  }

  saveAll();
  openDoctorDetail(currentDoctorId);
}

function renderDoctorDetail() {
  const month = document.getElementById("doctorDetailMonth").value || currentMonthISO();
  const doctor = getDoctorById(currentDoctorId);
  if (!doctor) return;

  document.getElementById("doctorMonthLabel").textContent = `Prestazioni di ${monthLabel(month)}`;

  const list = entries
    .filter((e) => e.doctorId === currentDoctorId && e.data.startsWith(month))
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  let totalDoctor = 0;
  let totalStructure = 0;

  list.forEach((e) => {
    totalDoctor += e.quotaMedico;
    totalStructure += e.quotaStruttura;
  });

  document.getElementById("doctorTotMedico").textContent = currency(totalDoctor);
  document.getElementById("doctorTotStruttura").textContent = currency(totalStructure);
  document.getElementById("doctorTotPrestazioni").textContent = list.length;

  const html = list.map((entry) => `
    <div class="medico-card">
      <div class="prestazione-top">
        <div>
          <div class="prestazione-title">${escapeHtml(entry.prestazione)}</div>
          <div class="prestazione-date">${entry.data}</div>
        </div>
        <div class="prestazione-amount">${currency(entry.importo)}</div>
      </div>
      <div class="prestazione-gains">
        <span class="medico-val">👨‍⚕️ ${currency(entry.quotaMedico)}</span>
        <span class="struttura-val">🏥 ${currency(entry.quotaStruttura)}</span>
      </div>
      <div class="card-actions" style="margin-top:12px;">
        <button class="icon-btn" type="button" data-edit-entry="${entry.id}">✏️</button>
        <button class="icon-btn" type="button" data-delete-entry="${entry.id}">🗑️</button>
      </div>
    </div>
  `).join("");

  const wrap = document.getElementById("doctorMonthPrestazioni");
  wrap.innerHTML = html || `<div class="medico-card">Nessuna prestazione nel mese selezionato.</div>`;

  wrap.querySelectorAll("[data-edit-entry]").forEach((btn) => {
    btn.addEventListener("click", () => openEntryPopup(Number(btn.dataset.editEntry)));
  });

  wrap.querySelectorAll("[data-delete-entry]").forEach((btn) => {
    btn.addEventListener("click", () => deleteEntry(Number(btn.dataset.deleteEntry)));
  });
}

function printDoctorDetail() {
  if (!currentDoctorId) return;

  const doctor = getDoctorById(currentDoctorId);
  if (!doctor) return;

  const month = document.getElementById("doctorDetailMonth").value || currentMonthISO();
  const list = entries
    .filter((e) => e.doctorId === currentDoctorId && e.data.startsWith(month))
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  let totalDoctor = 0;
  let totalStructure = 0;
  list.forEach((e) => {
    totalDoctor += e.quotaMedico;
    totalStructure += e.quotaStruttura;
  });

  const availabilityText = ["L", "M", "M", "G", "V", "S", "D"]
    .map((label, idx) => `${["Lun","Mar","Mer","Gio","Ven","Sab","Dom"][idx]}: ${doctor.availability.includes(`${label}-${idx}`) ? "Sì" : "No"}`)
    .join(" | ");

  const rows = list.map((entry) => `
    <tr>
      <td>${entry.data}</td>
      <td>${escapeHtml(entry.prestazione)}</td>
      <td>${currency(entry.importo)}</td>
      <td>${currency(entry.quotaMedico)}</td>
      <td>${currency(entry.quotaStruttura)}</td>
    </tr>
  `).join("");

  const html = `
    <html>
    <head>
      <title>Riepilogo medico</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{margin:0 0 12px}
        .meta{margin:0 0 10px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{background:#f4f4f4}
      </style>
    </head>
    <body>
      <h1>${escapeHtml(doctor.name)}</h1>
      <div class="meta"><strong>Mese:</strong> ${monthLabel(month)}</div>
      <div class="meta"><strong>Disponibilità:</strong> ${availabilityText}</div>
      <div class="meta"><strong>Guadagno medico:</strong> ${currency(totalDoctor)}</div>
      <div class="meta"><strong>Guadagno struttura:</strong> ${currency(totalStructure)}</div>
      <div class="meta"><strong>Prestazioni:</strong> ${list.length}</div>
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

function buildPieSVG(items) {
  const total = items.reduce((sum, x) => sum + x.value, 0);
  if (!total) return "";

  let cumulative = 0;
  const radius = 70;
  const center = 90;
  const circumference = 2 * Math.PI * radius;

  const circles = items.map((item) => {
    const fraction = item.value / total;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const offset = -cumulative * circumference;
    cumulative += fraction;

    return `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="transparent"
        stroke="${item.color}"
        stroke-width="28"
        stroke-dasharray="${dash} ${gap}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 ${center} ${center})"
      />
    `;
  }).join("");

  return `
    <svg class="pie-svg" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r="70" fill="transparent" stroke="#eef2f6" stroke-width="28"></circle>
      ${circles}
      <circle cx="90" cy="90" r="42" fill="#fff"></circle>
      <text x="90" y="86" text-anchor="middle" font-size="12" fill="#6e7b88" font-weight="700">Totale</text>
      <text x="90" y="104" text-anchor="middle" font-size="14" fill="#18202a" font-weight="900">${currency(total)}</text>
    </svg>
  `;
}

function renderReport() {
  const list = getEntriesByFilter(reportFilterType, reportFilterValue);
  const stats = buildStatsMap(list);
  const workedDoctors = doctors.filter((d) => stats[d.id]);

  let total = 0;
  let structure = 0;
  let doctor = 0;
  list.forEach((e) => {
    total += e.importo;
    structure += e.quotaStruttura;
    doctor += e.quotaMedico;
  });

  const pieItems = workedDoctors.map((doctorItem, idx) => ({
    name: doctorItem.name,
    value: stats[doctorItem.id].total,
    color: PIE_COLORS[idx % PIE_COLORS.length]
  }));

  const legend = pieItems.map((item) => `
    <div class="legend-row">
      <div class="legend-left">
        <span class="legend-dot" style="background:${item.color}"></span>
        <span class="legend-name">${escapeHtml(item.name)}</span>
      </div>
      <span class="legend-val">${currency(item.value)}</span>
    </div>
  `).join("");

  document.getElementById("reportPeriodoLabel").textContent =
    `${reportFilterType.toUpperCase()} selezionato: ${reportFilterValue}`;

  document.getElementById("reportPieWrap").innerHTML = pieItems.length ? `
    <div class="pie-card">
      <div class="pie-layout">
        ${buildPieSVG(pieItems)}
        <div class="pie-legend">${legend}</div>
      </div>
    </div>
  ` : `<div class="medico-card">Nessun medico ha lavorato nel periodo selezionato.</div>`;

  const cards = workedDoctors.map((doctorItem) => {
    const s = stats[doctorItem.id];
    return `
      <div class="card report-card">
        <div class="report-card-title">${escapeHtml(doctorItem.name)}</div>
        <div class="report-card-value">${currency(s.total)}</div>
        <div class="page-subtitle">Prestazioni: ${s.count} · Medico: ${currency(s.doctor)} · Struttura: ${currency(s.structure)}</div>
      </div>
    `;
  }).join("");

  document.getElementById("reportCards").innerHTML = `
    <div class="card report-card">
      <div class="report-card-title">Guadagno totale</div>
      <div class="report-card-value">${currency(total)}</div>
    </div>
    <div class="card report-card">
      <div class="report-card-title">Totale struttura</div>
      <div class="report-card-value">${currency(structure)}</div>
    </div>
    <div class="card report-card">
      <div class="report-card-title">Totale medici</div>
      <div class="report-card-value">${currency(doctor)}</div>
    </div>
    <div class="card report-card">
      <div class="report-card-title">Prestazioni totali</div>
      <div class="report-card-value">${list.length}</div>
    </div>
    ${cards}
  `;
}

function printReport() {
  const list = getEntriesByFilter(reportFilterType, reportFilterValue);
  const stats = buildStatsMap(list);
  const workedDoctors = doctors.filter((d) => stats[d.id]);

  const rows = workedDoctors.map((doctorItem) => {
    const s = stats[doctorItem.id];
    return `
      <tr>
        <td>${escapeHtml(doctorItem.name)}</td>
        <td>${s.count}</td>
        <td>${currency(s.total)}</td>
        <td>${currency(s.doctor)}</td>
        <td>${currency(s.structure)}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <html>
    <head>
      <title>Stampa report</title>
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
      <h1>Report</h1>
      <div class="meta"><strong>Filtro:</strong> ${reportFilterType} - ${reportFilterValue}</div>
      <table>
        <thead>
          <tr>
            <th>Medico</th>
            <th>Prestazioni</th>
            <th>Totale</th>
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

function invoiceKey(doctorId, fromDate, toDate) {
  return `${doctorId}__${fromDate}__${toDate}`;
}

function getInvoiceFilters() {
  const fromDate = document.getElementById("fattureDateFrom").value || todayISO();
  const toDateRaw = document.getElementById("fattureDateTo").value || fromDate;
  const toDate = toDateRaw < fromDate ? fromDate : toDateRaw;
  const status = document.getElementById("fattureStatusFilter").value || "tutti";
  return { fromDate, toDate, status };
}

function cycleInvoiceStatus(doctorId, fromDate, toDate) {
  const key = invoiceKey(doctorId, fromDate, toDate);
  const current = invoiceStates[key] || "da_fatturare";

  if (current === "da_fatturare") invoiceStates[key] = "fatturato";
  else if (current === "fatturato") invoiceStates[key] = "pagato";
  else invoiceStates[key] = "da_fatturare";

  saveAll();
  renderInvoices();
}

function renderInvoices() {
  const { fromDate, toDate, status } = getInvoiceFilters();
  const list = entries.filter((e) => e.data >= fromDate && e.data <= toDate);

  const map = {};
  list.forEach((e) => {
    if (!map[e.doctorId]) map[e.doctorId] = 0;
    map[e.doctorId] += e.quotaMedico;
  });

  const workedDoctors = doctors.filter((d) => map[d.id]);
  let total = 0;
  Object.values(map).forEach((v) => total += v);

  document.getElementById("fatturePeriodoLabel").textContent =
    `Fatture del periodo: ${formatDateLabel(fromDate)} → ${formatDateLabel(toDate)}`;

  document.getElementById("fattureSummary").innerHTML = `
    <div class="card report-card">
      <div class="report-card-title">Totale da fatturare</div>
      <div class="report-card-value">${currency(total)}</div>
    </div>
    <div class="card report-card">
      <div class="report-card-title">Medici nel periodo</div>
      <div class="report-card-value">${workedDoctors.length}</div>
    </div>
  `;

  const html = workedDoctors.map((doctor) => {
    const amount = map[doctor.id] || 0;
    const currentStatus = invoiceStates[invoiceKey(doctor.id, fromDate, toDate)] || "da_fatturare";
    if (status !== "tutti" && currentStatus !== status) return "";

    return `
      <div class="card fattura-card">
        <div class="fattura-name">${escapeHtml(doctor.name)}</div>
        <div class="fattura-amount">${currency(amount)}</div>
        <button class="fattura-status-btn status-${currentStatus}" type="button" data-invoice-doctor="${doctor.id}">
          ${currentStatus.replaceAll("_", " ")}
        </button>
      </div>
    `;
  }).join("");

  const wrap = document.getElementById("fattureList");
  wrap.innerHTML = html || `<div class="medico-card">Nessun medico nel periodo/filtro selezionato.</div>`;

  wrap.querySelectorAll("[data-invoice-doctor]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cycleInvoiceStatus(Number(btn.dataset.invoiceDoctor), fromDate, toDate);
    });
  });
}

function printInvoices() {
  const { fromDate, toDate, status } = getInvoiceFilters();
  const list = entries.filter((e) => e.data >= fromDate && e.data <= toDate);

  const map = {};
  list.forEach((e) => {
    if (!map[e.doctorId]) map[e.doctorId] = 0;
    map[e.doctorId] += e.quotaMedico;
  });

  const workedDoctors = doctors.filter((d) => map[d.id]);

  const rows = workedDoctors.map((doctor) => {
    const amount = map[doctor.id] || 0;
    const currentStatus = invoiceStates[invoiceKey(doctor.id, fromDate, toDate)] || "da_fatturare";
    if (status !== "tutti" && currentStatus !== status) return "";

    const color =
      currentStatus === "pagato" ? "#39b86b" :
      currentStatus === "fatturato" ? "#eead42" : "#dd5a52";

    return `
      <tr>
        <td>${escapeHtml(doctor.name)}</td>
        <td>${currency(amount)}</td>
        <td style="font-weight:700;color:${color}">${currentStatus.replaceAll("_", " ")}</td>
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
      <div class="meta"><strong>Da:</strong> ${formatDateLabel(fromDate)}</div>
      <div class="meta"><strong>A:</strong> ${formatDateLabel(toDate)}</div>
      <div class="meta"><strong>Filtro stato:</strong> ${status.replaceAll("_", " ")}</div>
      <table>
        <thead>
          <tr>
            <th>Medico</th>
            <th>Importo</th>
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

function renderCalendar() {
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
  const names = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  let html = names.map((name) => `<div class="calendar-day-name">${name}</div>`).join("");

  for (let i = 0; i < jsDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const iso = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
    const count = entries.filter((e) => e.data === iso).length;

    html += `
      <button class="calendar-day ${count ? "has-data" : ""}" type="button" data-calendar-day="${iso}">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-day-count">${count ? `${count} reg.` : ""}</div>
      </button>
    `;
  }

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = html;

  grid.querySelectorAll("[data-calendar-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      homeFilterType = "giorno";
      homeFilterValue = btn.dataset.calendarDay;
      setActiveTab("home", "giorno");
      renderHomeFilterControl();
      renderHome();
      go("homePage");
    });
  });
}

function renderAll() {
  renderTopMonthlyCards();
  renderHome();
  renderDoctorsPage();
  renderReport();
  renderInvoices();

  if (currentDoctorId && document.getElementById("doctorDetailPage").classList.contains("active")) {
    renderDoctorDetail();
  }

  if (document.getElementById("calendarPage").classList.contains("active")) {
    renderCalendar();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("newRegistrationBtn").addEventListener("click", () => openEntryPopup());
  document.getElementById("openCalendarBtn").addEventListener("click", () => go("calendarPage"));
  document.getElementById("addDoctorBtn").addEventListener("click", addDoctor);
  document.getElementById("backToDoctorsBtn").addEventListener("click", () => go("mediciPage"));
  document.getElementById("backToHomeBtn").addEventListener("click", () => go("homePage"));
  document.getElementById("quickAddDoctorBtn").addEventListener("click", () => {
    if (!currentDoctorId) return;
    const month = document.getElementById("doctorDetailMonth").value || currentMonthISO();
    openEntryPopup(null, currentDoctorId, `${month}-01`);
  });
  document.getElementById("printDoctorBtn").addEventListener("click", printDoctorDetail);
  document.getElementById("printReportBtn").addEventListener("click", printReport);
  document.getElementById("printInvoicesBtn").addEventListener("click", printInvoices);

  document.getElementById("homeTabGiorno").addEventListener("click", () => setHomeFiltroTipo("giorno"));
  document.getElementById("homeTabMese").addEventListener("click", () => setHomeFiltroTipo("mese"));
  document.getElementById("homeTabAnno").addEventListener("click", () => setHomeFiltroTipo("anno"));

  document.getElementById("reportTabGiorno").addEventListener("click", () => setReportFiltroTipo("giorno"));
  document.getElementById("reportTabMese").addEventListener("click", () => setReportFiltroTipo("mese"));
  document.getElementById("reportTabAnno").addEventListener("click", () => setReportFiltroTipo("anno"));

  document.querySelectorAll(".menu-btn").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.page));
  });

  document.getElementById("closePopupBtn").addEventListener("click", closeEntryPopup);
  document.getElementById("cancelPopupBtn").addEventListener("click", closeEntryPopup);
  document.getElementById("savePopupBtn").addEventListener("click", saveEntry);

  document.getElementById("popupPercMedico").addEventListener("input", (e) => {
    let value = parseFloat(e.target.value) || 0;
    if (value > 100) value = 100;
    if (value < 0) value = 0;
    e.target.value = value;
    document.getElementById("popupPercStruttura").value = 100 - value;
    updatePopupPreview();
  });

  document.getElementById("popupPercStruttura").addEventListener("input", (e) => {
    let value = parseFloat(e.target.value) || 0;
    if (value > 100) value = 100;
    if (value < 0) value = 0;
    e.target.value = value;
    document.getElementById("popupPercMedico").value = 100 - value;
    updatePopupPreview();
  });

  document.getElementById("popupImporto").addEventListener("input", updatePopupPreview);

  document.getElementById("doctorDetailMonth").value = currentMonthISO();
  document.getElementById("doctorDetailMonth").addEventListener("change", renderDoctorDetail);

  document.getElementById("fattureDateFrom").value = todayISO();
  document.getElementById("fattureDateTo").value = todayISO();
  document.getElementById("fattureDateFrom").max = todayISO();
  document.getElementById("fattureDateTo").max = todayISO();
  document.getElementById("fattureDateFrom").addEventListener("change", renderInvoices);
  document.getElementById("fattureDateTo").addEventListener("change", renderInvoices);
  document.getElementById("fattureStatusFilter").addEventListener("change", renderInvoices);

  document.getElementById("calendarMonth").value = currentMonthISO();
  document.getElementById("calendarMonth").addEventListener("change", renderCalendar);

  renderHomeFilterControl();
  renderReportFilterControl();
  renderAll();
});
