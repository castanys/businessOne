/**
 * InsightDesk v3.0 — Advanced Freshservice Analytics
 * Metrics that Freshservice doesn't show you:
 * - First Response Time (median)
 * - Resolution Time Distribution (P50/P90/P95)
 * - Reopened tickets tracking
 * - SLA compliance by priority
 * - Ticket source analysis
 * - Agent performance table
 * - Problem tickets table (slowest + reopened)
 */

let client;
const charts = {};

const PRIORITY_NAMES = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' };
const PRIORITY_COLORS = { 1: '#2ecc71', 2: '#3498db', 3: '#e67e22', 4: '#e74c3c' };
const SOURCE_NAMES = { 1: 'Email', 2: 'Portal', 3: 'Phone', 4: 'Chat', 5: 'Feedback', 6: 'Yammer', 7: 'AWS', 8: 'Walk-up', 9: 'Slack', 10: 'Teams' };

init();

function init() {
  app.initialized().then(function(c) {
    client = c;
    client.events.on('app.activated', onAppActivated);
  }).catch(function(err) {
    console.error('[InsightDesk] Init error:', err);
  });
}

function onAppActivated() {
  setStatus('Loading metrics...');
  fetchPage(1, []);
}

function fetchPage(page, accumulated) {
  client.request.invokeTemplate('getFreshserviceTickets', {
    context: { per_page: 100, page: page, include: 'stats' }
  }).then(function(response) {
    const data = JSON.parse(response.response);
    const batch = data.tickets || [];
    const allTickets = accumulated.concat(batch);
    if (batch.length === 100 && page < 5) {
      setStatus('Loading page ' + (page + 1) + '... (' + allTickets.length + ' tickets)');
      fetchPage(page + 1, allTickets);
    } else {
      onTicketsLoaded(allTickets);
    }
  }).catch(function(error) {
    console.error('[InsightDesk] Fetch error:', error);
    setStatus('Error loading data: ' + (error.message || JSON.stringify(error)));
  });
}

/* ── Metrics computation ── */

function percentile(arr, p) {
  if (arr.length === 0) { return 0; }
  const sorted = arr.slice().sort(function(a, b) { return a - b; });
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function median(arr) {
  return percentile(arr, 50);
}

function buildDailyMap() {
  const now = new Date();
  const map = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().substring(0, 10);
    map[key] = { date: key, created: 0, closed: 0, open: 0 };
  }
  return map;
}

function hoursBetween(dateA, dateB) {
  if (!dateA || !dateB) { return 0; }
  const h = (new Date(dateA) - new Date(dateB)) / 3600000;
  return h > 0 ? h : 0;
}

function collectTimingArrays(tickets) {
  const frt = [];
  const resolve = [];
  let reopens = 0;
  tickets.forEach(function(t) {
    const stats = t.stats || {};
    const frtH = hoursBetween(stats.first_responded_at, t.created_at);
    if (frtH > 0) { frt.push(frtH); }
    const resH = hoursBetween(stats.resolved_at, t.created_at);
    if (resH > 0) { resolve.push(resH); }
    if (stats.reopened_at) { reopens++; }
  });
  return { frt: frt, resolve: resolve, reopens: reopens };
}

function computeTimingMetrics(tickets) {
  const t = collectTimingArrays(tickets);
  const total = tickets.length || 1;
  return {
    frt_median: t.frt.length > 0 ? Math.round(median(t.frt) * 10) / 10 : '--',
    mttr: t.resolve.length > 0 ? Math.round(median(t.resolve) * 10) / 10 : '--',
    resolve_p50: Math.round(percentile(t.resolve, 50) * 10) / 10,
    resolve_p90: Math.round(percentile(t.resolve, 90) * 10) / 10,
    resolve_p95: Math.round(percentile(t.resolve, 95) * 10) / 10,
    resolve_hours: t.resolve,
    reopen_pct: Math.round(t.reopens / total * 100),
    reopen_count: t.reopens,
    resolved_count: t.resolve.length
  };
}

function checkSLACompliance(t, now) {
  const isResolved = t.status === 4 || t.status === 5;
  if (!t.due_by && !t.fr_due_by) { return null; }
  const dueDate = new Date(t.due_by || t.fr_due_by);
  const checkDate = isResolved ? new Date((t.stats || {}).resolved_at || t.updated_at || now) : now;
  return checkDate <= dueDate ? 1 : 0;
}

function computeSLAMetrics(tickets) {
  const now = new Date();
  const byPriority = {};
  const totals = { compliant: 0, counted: 0 };

  tickets.forEach(function(t) {
    const p = t.priority || 1;
    if (!byPriority[p]) { byPriority[p] = { compliant: 0, total: 0 }; }
    const result = checkSLACompliance(t, now);
    if (result !== null) {
      byPriority[p].total++;
      byPriority[p].compliant += result;
      totals.counted++;
      totals.compliant += result;
    }
  });

  const overall = totals.counted > 0 ? Math.round(totals.compliant / totals.counted * 100) : 100;
  return { overall: overall, byPriority: byPriority };
}

function computeSourceMetrics(tickets) {
  const sources = {};
  tickets.forEach(function(t) {
    const s = t.source || 1;
    const name = SOURCE_NAMES[s] || 'Other';
    if (!sources[name]) { sources[name] = 0; }
    sources[name]++;
  });
  return sources;
}

function computeCategoryMetrics(tickets) {
  const cats = {};
  tickets.forEach(function(t) {
    const c = t.category || 'Uncategorized';
    if (!cats[c]) { cats[c] = 0; }
    cats[c]++;
  });
  return cats;
}

function addTicketToAgent(agent, t) {
  agent.assigned++;
  if (t.status === 4 || t.status === 5) { agent.resolved++; }
  const stats = t.stats || {};
  const frtH = hoursBetween(stats.first_responded_at, t.created_at);
  if (frtH > 0) { agent.frt_hours.push(frtH); }
  const resH = hoursBetween(stats.resolved_at, t.created_at);
  if (resH > 0) { agent.resolve_hours.push(resH); }
}

function computeAgentMetrics(tickets) {
  const agents = {};
  tickets.forEach(function(t) {
    const id = t.responder_id || 'unassigned';
    if (!agents[id]) {
      agents[id] = { id: id, assigned: 0, resolved: 0, frt_hours: [], resolve_hours: [] };
    }
    addTicketToAgent(agents[id], t);
  });
  return agents;
}

function computeDailyMetrics(tickets) {
  const dailyMap = buildDailyMap();
  tickets.forEach(function(t) {
    const cd = (t.created_at || '').substring(0, 10);
    if (dailyMap[cd]) { dailyMap[cd].created++; }
    const stats = t.stats || {};
    if (stats.resolved_at) {
      const rd = stats.resolved_at.substring(0, 10);
      if (dailyMap[rd]) { dailyMap[rd].closed++; }
    }
  });
  let running = 0;
  const daily = Object.keys(dailyMap).sort().map(function(k) {
    const d = dailyMap[k];
    running += d.created - d.closed;
    d.open = Math.max(0, running);
    return d;
  });
  return daily;
}

function toProblemEntry(t) {
  const stats = t.stats || {};
  const resolveH = hoursBetween(stats.resolved_at, t.created_at);
  const reopened = !!stats.reopened_at;
  if (!reopened && resolveH <= 24) { return null; }
  return {
    id: t.id,
    subject: (t.subject || '').substring(0, 60),
    priority: t.priority || 1,
    category: t.category || '--',
    resolve_hours: Math.round(resolveH * 10) / 10,
    reopened: reopened
  };
}

function findProblemTickets(tickets) {
  const problems = [];
  tickets.forEach(function(t) {
    const entry = toProblemEntry(t);
    if (entry) { problems.push(entry); }
  });
  problems.sort(function(a, b) {
    if (a.reopened !== b.reopened) { return a.reopened ? -1 : 1; }
    return b.resolve_hours - a.resolve_hours;
  });
  return problems.slice(0, 15);
}

/* ── Rendering ── */

function onTicketsLoaded(tickets) {
  if (tickets.length === 0) {
    setStatus('No tickets found.');
    return;
  }

  const timing = computeTimingMetrics(tickets);
  const sla = computeSLAMetrics(tickets);
  const sources = computeSourceMetrics(tickets);
  const categories = computeCategoryMetrics(tickets);
  const agents = computeAgentMetrics(tickets);
  const daily = computeDailyMetrics(tickets);
  const problems = findProblemTickets(tickets);

  const openCount = tickets.filter(function(t) { return t.status === 2 || t.status === 3; }).length;
  const totalNew = daily.reduce(function(s, d) { return s + d.created; }, 0);
  const avgNew = daily.length > 0 ? Math.round(totalNew / daily.length * 10) / 10 : 0;

  renderKPIs(openCount, avgNew, sla.overall, timing);
  renderVolumeChart(daily);
  renderResolutionChart(timing);
  renderSLAPriorityChart(sla.byPriority);
  renderSourceChart(sources);
  renderCategoriesChart(categories);
  renderAgentTable(agents);
  renderProblemTable(problems);

  setStatus('Last updated: ' + new Date().toLocaleString() + ' \u00b7 ' + tickets.length + ' tickets analyzed');
}

function renderKPIs(openCount, avgNew, slaPct, timing) {
  document.getElementById('kpi-open').textContent = openCount;
  document.getElementById('kpi-new').textContent = avgNew;

  const slaEl = document.getElementById('kpi-sla');
  slaEl.textContent = slaPct + '%';
  slaEl.className = 'kpi-value ' + (slaPct >= 90 ? 'good' : slaPct >= 70 ? 'warn' : 'bad');

  document.getElementById('kpi-mttr').textContent = timing.mttr;
  document.getElementById('kpi-frt').textContent = timing.frt_median;

  const reopenEl = document.getElementById('kpi-reopen');
  reopenEl.textContent = timing.reopen_pct + '%';
  reopenEl.className = 'kpi-value ' + (timing.reopen_pct <= 5 ? 'good' : timing.reopen_pct <= 15 ? 'warn' : 'bad');
}

function renderVolumeChart(daily) {
  const ctx = document.getElementById('chart-volume').getContext('2d');
  const labels = daily.map(function(d) { return d.date.substring(5); });
  charts.volume = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Open', data: daily.map(function(d) { return d.open; }), borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.08)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 1 },
        { label: 'Created', data: daily.map(function(d) { return d.created; }), borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.08)', fill: false, tension: 0.3, borderWidth: 2, pointRadius: 1 },
        { label: 'Closed', data: daily.map(function(d) { return d.closed; }), borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.08)', fill: false, tension: 0.3, borderWidth: 2, pointRadius: 1 }
      ]
    },
    options: { responsive: true, scales: { yAxes: [{ ticks: { beginAtZero: true } }] }, legend: { position: 'bottom', labels: { boxWidth: 12, fontSize: 11 } } }
  });
}

function renderResolutionChart(timing) {
  const ctx = document.getElementById('chart-resolution').getContext('2d');
  const buckets = { '< 1h': 0, '1-4h': 0, '4-8h': 0, '8-24h': 0, '1-3d': 0, '3-7d': 0, '> 7d': 0 };
  timing.resolve_hours.forEach(function(h) {
    if (h < 1) { buckets['< 1h']++; }
    else if (h < 4) { buckets['1-4h']++; }
    else if (h < 8) { buckets['4-8h']++; }
    else if (h < 24) { buckets['8-24h']++; }
    else if (h < 72) { buckets['1-3d']++; }
    else if (h < 168) { buckets['3-7d']++; }
    else { buckets['> 7d']++; }
  });
  const colors = ['#2ecc71', '#27ae60', '#3498db', '#f39c12', '#e67e22', '#e74c3c', '#c0392b'];
  charts.resolution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [{ label: 'Tickets', data: Object.values(buckets), backgroundColor: colors }]
    },
    options: {
      responsive: true,
      scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
      legend: { display: false },
      title: { display: true, text: 'P50=' + timing.resolve_p50 + 'h  P90=' + timing.resolve_p90 + 'h  P95=' + timing.resolve_p95 + 'h', fontSize: 11, fontColor: '#6b7c93' }
    }
  });
}

function renderSLAPriorityChart(byPriority) {
  const ctx = document.getElementById('chart-sla-priority').getContext('2d');
  const labels = [];
  const data = [];
  const colors = [];
  [4, 3, 2, 1].forEach(function(p) {
    if (byPriority[p] && byPriority[p].total > 0) {
      labels.push(PRIORITY_NAMES[p] + ' (' + byPriority[p].total + ')');
      data.push(Math.round(byPriority[p].compliant / byPriority[p].total * 100));
      colors.push(PRIORITY_COLORS[p]);
    }
  });
  if (labels.length === 0) {
    labels.push('No SLA data');
    data.push(0);
    colors.push('#ccc');
  }
  charts.slaPriority = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: labels,
      datasets: [{ label: 'SLA %', data: data, backgroundColor: colors }]
    },
    options: {
      responsive: true,
      scales: { xAxes: [{ ticks: { beginAtZero: true, max: 100 } }] },
      legend: { display: false }
    }
  });
}

function renderSourceChart(sources) {
  const ctx = document.getElementById('chart-source').getContext('2d');
  const sorted = Object.keys(sources).sort(function(a, b) { return sources[b] - sources[a]; });
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  charts.source = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted,
      datasets: [{ data: sorted.map(function(k) { return sources[k]; }), backgroundColor: colors.slice(0, sorted.length) }]
    },
    options: { responsive: true, legend: { position: 'bottom', labels: { boxWidth: 12, fontSize: 11 } } }
  });
}

function renderCategoriesChart(categories) {
  const ctx = document.getElementById('chart-categories').getContext('2d');
  const entries = Object.keys(categories).map(function(k) { return { name: k, count: categories[k] }; });
  entries.sort(function(a, b) { return b.count - a.count; });
  const top = entries.slice(0, 10);
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'];
  charts.categories = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: top.map(function(e) { return e.name; }),
      datasets: [{ label: 'Tickets', data: top.map(function(e) { return e.count; }), backgroundColor: colors.slice(0, top.length) }]
    },
    options: { responsive: true, scales: { xAxes: [{ ticks: { beginAtZero: true } }] }, legend: { display: false } }
  });
}

function renderAgentTable(agents) {
  const container = document.getElementById('agent-table-container');
  const rows = Object.keys(agents).map(function(k) { return agents[k]; });
  rows.sort(function(a, b) { return b.assigned - a.assigned; });
  const top = rows.slice(0, 10);

  let html = '<table class="data-table">';
  html += '<thead><tr><th>Agent</th><th class="num">Assigned</th><th class="num">Resolved</th><th class="num">Res. Rate</th><th class="num">Avg FRT</th><th class="num">Avg Resolve</th></tr></thead>';
  html += '<tbody>';
  top.forEach(function(a) {
    const name = a.id === 'unassigned' ? 'Unassigned' : 'Agent ' + String(a.id).substring(0, 8);
    const rate = a.assigned > 0 ? Math.round(a.resolved / a.assigned * 100) + '%' : '--';
    const avgFrt = a.frt_hours.length > 0 ? Math.round(median(a.frt_hours) * 10) / 10 + 'h' : '--';
    const avgRes = a.resolve_hours.length > 0 ? Math.round(median(a.resolve_hours) * 10) / 10 + 'h' : '--';
    html += '<tr><td>' + name + '</td><td class="num">' + a.assigned + '</td><td class="num">' + a.resolved + '</td><td class="num">' + rate + '</td><td class="num">' + avgFrt + '</td><td class="num">' + avgRes + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderProblemTable(problems) {
  const container = document.getElementById('problem-table-container');
  if (problems.length === 0) {
    container.innerHTML = '<p class="empty-msg">No problem tickets detected</p>';
    return;
  }

  let html = '<table class="data-table">';
  html += '<thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Category</th><th class="num">Resolve Time</th><th>Flags</th></tr></thead>';
  html += '<tbody>';
  problems.forEach(function(p) {
    const prioClass = ['', 'low', 'medium', 'high', 'urgent'][p.priority] || 'low';
    const prioName = PRIORITY_NAMES[p.priority] || 'Low';
    const flags = p.reopened ? '<span class="badge badge-reopen">Reopened</span>' : '';
    const resolveStr = p.resolve_hours > 0 ? p.resolve_hours + 'h' : 'Open';
    html += '<tr>';
    html += '<td>#' + p.id + '</td>';
    html += '<td>' + p.subject + '</td>';
    html += '<td><span class="badge badge-' + prioClass + '">' + prioName + '</span></td>';
    html += '<td>' + p.category + '</td>';
    html += '<td class="num">' + resolveStr + '</td>';
    html += '<td>' + flags + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function setStatus(text) {
  document.getElementById('status-bar').textContent = text;
}
