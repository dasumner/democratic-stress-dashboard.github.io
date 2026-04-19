// ─── CONFIG ───────────────────────────────────────────────────────────────────
const DATA_URL = "./data/metrics.json";

const METRICS = [
  { key: "institutional",  label: "Institutional Integrity", color: "#3a7bd5", invert: false },
  { key: "economic",       label: "Economic Health",         color: "#e8a427", invert: false },
  { key: "civil_rights",   label: "Civil Rights Index",      color: "#c94040", invert: false },
  { key: "distraction",    label: "Distraction Index",       color: "#8b5cf6", invert: true  },
  { key: "gini",           label: "Gini Coefficient",        color: "#2d9e6b", invert: true  },
];

const SOURCE_DEFS = [
  { key: "institutional", label: "Institutional Integrity", color: "#3a7bd5",
    desc: "Congressional oversight actions, court order compliance, executive overreach indicators.",
    query: "US Congress executive oversight actions court order compliance 2025 2026" },
  { key: "economic", label: "Economic Health", color: "#e8a427",
    desc: "Median household wages, inflation, employment conditions, middle class indicators.",
    query: "US median household income inflation unemployment economic conditions 2025 2026" },
  { key: "civil_rights", label: "Civil Rights Index", color: "#c94040",
    desc: "DEI policy rollbacks, voting access, minority protections, gender rights legislation.",
    query: "US civil rights rollbacks DEI voting rights minority protections policy 2025 2026" },
  { key: "distraction", label: "Distraction Index", color: "#8b5cf6",
    desc: "Culture war legislation volume, wedge issue media activity, scapegoating events.",
    query: "US culture war legislation wedge issues media political distraction 2025 2026" },
  { key: "gini", label: "Wealth Divergence (Gini)", color: "#2d9e6b",
    desc: "Gini coefficient, top 1% wealth share, median vs. elite wealth divergence trends.",
    query: "US wealth inequality top 1 percent gini coefficient 2025 2026" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function scoreColor(key, val) {
  if (key === "distraction" || key === "gini") {
    return val > 70 ? "#c94040" : val > 50 ? "#e8a427" : "#2d9e6b";
  }
  return val > 60 ? "#2d9e6b" : val > 40 ? "#e8a427" : "#c94040";
}

function statusLabel(key, val) {
  if (key === "distraction") return val > 70 ? "CRITICAL" : val > 50 ? "ELEVATED" : "LOW";
  if (key === "gini")        return val > 51 ? "SEVERE"   : val > 48 ? "HIGH"     : "MODERATE";
  return val > 60 ? "STABLE" : val > 40 ? "STRAINED" : "CRITICAL";
}

function fmtDate(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

// ─── TAB LOGIC ────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ─── METRIC CARDS ─────────────────────────────────────────────────────────────
function renderCards(current) {
  const container = document.getElementById("metricCards");
  container.innerHTML = "";

  METRICS.forEach(m => {
    const val = current[m.key];
    const color = scoreColor(m.key, val);
    const status = statusLabel(m.key, val);
    const displayVal = m.key === "gini" ? val.toFixed(1) : Math.round(val);

    const card = document.createElement("div");
    card.className = "metric-card";
    card.style.borderTopColor = color;
    card.innerHTML = `
      <div class="card-label">${m.label}</div>
      <div class="card-value" style="color:${color}">${displayVal}</div>
      <div class="card-footer">
        <span class="status-badge" style="color:${color}">${status}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
function renderSummary(data) {
  document.getElementById("summaryText").textContent = data.summary || "No summary available.";

  const sourcesRow = document.getElementById("sourcesRow");
  sourcesRow.innerHTML = "";
  if (data.sources_consulted?.length) {
    const label = document.createElement("span");
    label.className = "mono small dim";
    label.textContent = "SOURCES: ";
    sourcesRow.appendChild(label);
    data.sources_consulted.forEach(s => {
      const tag = document.createElement("span");
      tag.className = "source-tag";
      tag.textContent = s;
      sourcesRow.appendChild(tag);
    });
  }
}

// ─── HEADER META ──────────────────────────────────────────────────────────────
function renderMeta(data) {
  const comp = data.current.composite_stress;
  const el = document.getElementById("compositeScore");
  el.textContent = comp;
  el.style.color = comp > 65 ? "#c94040" : "#e8a427";

  document.getElementById("lastUpdated").textContent =
    "UPDATED: " + fmtDate(data.meta.last_updated);

  if (data.meta.run_count) {
    document.getElementById("runCount").textContent =
      `RUNS: ${data.meta.run_count}`;
  }
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
let radarChart = null;
function renderRadar(current) {
  const ctx = document.getElementById("radarChart").getContext("2d");
  const labels = METRICS.map(m => m.label);
  const values = METRICS.map(m => {
    const v = current[m.key];
    // Normalize gini to 0-100 for radar: (gini - 40) * 5
    if (m.key === "gini") return Math.min(100, Math.max(0, (v - 40) * 5));
    return v;
  });

  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Current",
        data: values,
        backgroundColor: "rgba(232, 164, 39, 0.12)",
        borderColor: "#e8a427",
        borderWidth: 1.5,
        pointBackgroundColor: values.map((_, i) => METRICS[i].color),
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          grid: { color: "#1a2030" },
          ticks: { display: false },
          pointLabels: {
            color: "#5a6880",
            font: { family: "IBM Plex Mono", size: 9 },
          },
          angleLines: { color: "#1a2030" },
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#060809",
          borderColor: "#1a2030",
          borderWidth: 1,
          titleColor: "#e8a427",
          bodyColor: "#c9d1d9",
          titleFont: { family: "IBM Plex Mono" },
          bodyFont: { family: "IBM Plex Mono", size: 11 },
        }
      }
    }
  });
}

// ─── LINE CHART ───────────────────────────────────────────────────────────────
let lineChart = null;
function renderLineChart(history) {
  const ctx = document.getElementById("lineChart").getContext("2d");
  const labels = history.map(h => h.date);

  const datasets = [
    { key: "institutional", label: "Institutional",  color: "#3a7bd5" },
    { key: "economic",      label: "Economic",        color: "#e8a427" },
    { key: "civil_rights",  label: "Civil Rights",    color: "#c94040" },
    { key: "distraction",   label: "Distraction",     color: "#8b5cf6", dash: [5,3] },
  ].map(d => ({
    label: d.label,
    data: history.map(h => h[d.key]),
    borderColor: d.color,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderDash: d.dash || [],
    pointRadius: 3,
    pointBackgroundColor: d.color,
    tension: 0.3,
  }));

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: "#1a2030" },
          ticks: { color: "#5a6880", font: { family: "IBM Plex Mono", size: 10 } },
        },
        y: {
          min: 0, max: 100,
          grid: { color: "#1a2030" },
          ticks: { color: "#5a6880", font: { family: "IBM Plex Mono", size: 10 } },
        }
      },
      plugins: {
        legend: {
          labels: {
            color: "#5a6880",
            font: { family: "IBM Plex Mono", size: 9 },
            boxWidth: 12,
          }
        },
        tooltip: {
          backgroundColor: "#060809",
          borderColor: "#1a2030",
          borderWidth: 1,
          titleColor: "#e8a427",
          bodyColor: "#c9d1d9",
          titleFont: { family: "IBM Plex Mono" },
          bodyFont: { family: "IBM Plex Mono", size: 11 },
        }
      }
    }
  });
}

// ─── HISTORY TABLE ────────────────────────────────────────────────────────────
function renderTable(history) {
  const body = document.getElementById("historyBody");
  body.innerHTML = "";
  [...history].reverse().forEach(row => {
    const comp = row.composite_stress || Math.round(
      (100 - row.institutional + 100 - row.economic + 100 - row.civil_rights + row.distraction) / 4
    );
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="dim">${row.date}</td>
      <td style="color:${scoreColor('institutional', row.institutional)}">${row.institutional}</td>
      <td style="color:${scoreColor('economic', row.economic)}">${row.economic}</td>
      <td style="color:${scoreColor('civil_rights', row.civil_rights)}">${row.civil_rights}</td>
      <td style="color:${scoreColor('distraction', row.distraction)}">${row.distraction}</td>
      <td style="color:${comp > 65 ? '#c94040' : '#e8a427'}; font-weight:700">${comp}</td>
    `;
    body.appendChild(tr);
  });
}

// ─── ALERTS ───────────────────────────────────────────────────────────────────
function renderAlerts(alerts) {
  const container = document.getElementById("alertsList");
  if (!alerts?.length) {
    container.innerHTML = '<p class="dim mono small">No alerts recorded yet.</p>';
    return;
  }
  container.innerHTML = "";
  alerts.forEach(a => {
    const div = document.createElement("div");
    div.className = `alert-item ${a.severity}`;
    div.innerHTML = `
      <div class="alert-meta">${a.severity.toUpperCase()} · ${a.date || ""}</div>
      <div class="alert-title">${a.title}</div>
    `;
    container.appendChild(div);
  });
}

// ─── SOURCE DEFS ─────────────────────────────────────────────────────────────
function renderSourceDefs() {
  const container = document.getElementById("sourceDefinitions");
  SOURCE_DEFS.forEach(s => {
    const div = document.createElement("div");
    div.className = "source-def";
    div.style.borderLeftColor = s.color;
    div.innerHTML = `
      <div class="source-def-name" style="color:${s.color}">${s.label}</div>
      <div class="source-def-desc">${s.desc}</div>
      <div class="source-def-query mono small">Search hint: <span>${s.query}</span></div>
    `;
    container.appendChild(div);
  });
}

// ─── MAIN LOAD ────────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderMeta(data);
    renderCards(data.current);
    renderSummary(data);
    renderRadar(data.current);
    renderLineChart(data.history);
    renderTable(data.history);
    renderAlerts(data.alerts);
    renderSourceDefs();

  } catch (err) {
    console.error("Failed to load metrics:", err);
    document.getElementById("summaryText").textContent =
      "⚠ Could not load metrics.json — " + err.message;
  }
}

loadData();
