/**
 * InsightDesk — Frontend Dashboard
 * Uses client.request.invokeTemplate() — Platform v3.0 compatible
 */

let client;
const charts = {};

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
    if (batch.length === 100 && page < 3) {
      fetchPage(page + 1, allTickets);
    } else {
      onTicketsLoaded(allTickets);
    }
  }).catch(function(error) {
    console.error('[InsightDesk] Fetch error:', error);
    setStatus('Error loading data: ' + (error.message || JSON.stringify(error)));
    renderEmptyState();
  });
}

function onTicketsLoaded(tickets) {
  if (tickets.length === 0) {
    setStatus('No tickets found.');
    renderEmptyState();
    return;
  }
  const metrics = computeMetrics(tickets);
  renderKPIs(metrics);
  renderVolumeChart(metrics.daily);
  renderSLAChart(metrics.daily);
  renderCategoriesChart(metrics.categories);
  renderAgentsChart(metrics.agents);
  setStatus('Last updated: ' + new Date().toLocaleString() + ' · ' + tickets.length + ' tickets');
}

function buildDailyMap() {
  const now = new Date();
  const map = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().substring(0, 10);
    map[key] = { date: key, new_tickets: 0, closed_tickets: 0, open_tickets: 0, total: 0 };
  }
  return map;
}

function processSLA(t, now) {
  const status = t.status;
  const isOpen = status === 2 || status === 3;
  const isResolved = status === 4 || status === 5;
  let compliant = 0;
  let counted = 0;
  if (t.fr_due_by || t.due_by) {
    counted = 1;
    const dueDate = new Date(t.due_by || t.fr_due_by);
    const updatedDate = new Date(t.updated_at || now);
    if (isResolved && updatedDate <= dueDate) { compliant = 1; }
    else if (isOpen && now <= dueDate) { compliant = 1; }
  }
  return { compliant: compliant, counted: counted };
}

function processMTTR(t) {
  const isResolved = t.status === 4 || t.status === 5;
  if (isResolved && t.stats && t.stats.resolved_at) {
    const created = new Date(t.created_at);
    const resolved = new Date(t.stats.resolved_at);
    const hours = (resolved - created) / 3600000;
    if (hours > 0) { return hours; }
  }
  return 0;
}

function computeMetrics(tickets) {
  const now = new Date();
  const dailyMap = buildDailyMap();
  const categories = {};
  const agents = {};
  let openCount = 0;
  let slaCompliant = 0;
  let slaTotal = 0;
  let resolvedCount = 0;
  let totalResolveHours = 0;

  tickets.forEach(function(t) {
    const createdDate = (t.created_at || '').substring(0, 10);
    const status = t.status;
    const isOpen = status === 2 || status === 3;
    const isResolved = status === 4 || status === 5;

    if (isOpen) { openCount++; }

    const sla = processSLA(t, now);
    slaCompliant += sla.compliant;
    slaTotal += sla.counted;

    const mttrHours = processMTTR(t);
    if (mttrHours > 0) { totalResolveHours += mttrHours; resolvedCount++; }

    if (dailyMap[createdDate]) {
      dailyMap[createdDate].new_tickets++;
      dailyMap[createdDate].total++;
    }

    const cat = t.category || 'Uncategorized';
    if (!categories[cat]) { categories[cat] = { category: cat, count: 0 }; }
    categories[cat].count++;

    const agentKey = String(t.responder_id || 'unassigned');
    if (!agents[agentKey]) { agents[agentKey] = { agent_id: t.responder_id || 'unassigned', assigned: 0, resolved: 0 }; }
    agents[agentKey].assigned++;
    if (isResolved) { agents[agentKey].resolved++; }
  });

  tickets.forEach(function(t) {
    const isResolved = t.status === 4 || t.status === 5;
    if (isResolved && t.stats && t.stats.resolved_at) {
      const resolvedDate = t.stats.resolved_at.substring(0, 10);
      if (dailyMap[resolvedDate]) { dailyMap[resolvedDate].closed_tickets++; }
    }
  });

  const slaPercent = slaTotal > 0 ? Math.round(slaCompliant / slaTotal * 100) : 100;
  let runningOpen = 0;
  const daily = Object.keys(dailyMap).sort().map(function(k) { return dailyMap[k]; });
  daily.forEach(function(day) {
    runningOpen += day.new_tickets - day.closed_tickets;
    day.open_tickets = Math.max(0, runningOpen);
    day.sla_percent = slaPercent;
  });

  return {
    open_count: openCount,
    sla_percent: slaPercent,
    mttr_hours: resolvedCount > 0 ? Math.round(totalResolveHours / resolvedCount * 10) / 10 : '--',
    daily: daily,
    categories: categories,
    agents: agents
  };
}

function renderKPIs(metrics) {
  const daily = metrics.daily;
  const totalNew = daily.reduce(function(s, d) { return s + d.new_tickets; }, 0);
  const avgNew = daily.length > 0 ? Math.round(totalNew / daily.length * 10) / 10 : 0;
  document.getElementById('kpi-open').textContent = metrics.open_count;
  document.getElementById('kpi-new').textContent = avgNew;
  document.getElementById('kpi-sla').textContent = metrics.sla_percent + '%';
  document.getElementById('kpi-mttr').textContent = metrics.mttr_hours;
}

function renderVolumeChart(daily) {
  const ctx = document.getElementById('chart-volume').getContext('2d');
  const labels = daily.map(function(d) { return d.date.substring(5); });
  charts.volume = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Open', data: daily.map(function(d) { return d.open_tickets; }), borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)', fill: true, tension: 0.3 },
        { label: 'Closed', data: daily.map(function(d) { return d.closed_tickets; }), borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.1)', fill: true, tension: 0.3 }
      ]
    },
    options: { responsive: true, scales: { yAxes: [{ ticks: { beginAtZero: true } }] }, legend: { position: 'bottom' } }
  });
}

function renderSLAChart(daily) {
  const ctx = document.getElementById('chart-sla').getContext('2d');
  charts.sla = new Chart(ctx, {
    type: 'line',
    data: {
      labels: daily.map(function(d) { return d.date.substring(5); }),
      datasets: [{ label: 'SLA %', data: daily.map(function(d) { return d.sla_percent; }), borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.1)', fill: true, tension: 0.3 }]
    },
    options: { responsive: true, scales: { yAxes: [{ ticks: { beginAtZero: true, max: 100 } }] }, legend: { position: 'bottom' } }
  });
}

function renderCategoriesChart(catData) {
  const ctx = document.getElementById('chart-categories').getContext('2d');
  const sorted = Object.keys(catData).map(function(k) { return catData[k]; }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10);
  const colors = ['#3498db','#2ecc71','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#16a085','#c0392b'];
  charts.categories = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: sorted.map(function(e) { return e.category; }),
      datasets: [{ label: 'Tickets', data: sorted.map(function(e) { return e.count; }), backgroundColor: colors.slice(0, sorted.length) }]
    },
    options: { responsive: true, scales: { xAxes: [{ ticks: { beginAtZero: true } }] }, legend: { display: false } }
  });
}

function renderAgentsChart(agentData) {
  const ctx = document.getElementById('chart-agents').getContext('2d');
  const sorted = Object.keys(agentData).map(function(k) { return agentData[k]; }).sort(function(a, b) { return b.assigned - a.assigned; }).slice(0, 10);
  charts.agents = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(function(e) { return e.agent_id === 'unassigned' ? 'Unassigned' : 'Agent ' + String(e.agent_id).substring(0, 6); }),
      datasets: [
        { label: 'Assigned', data: sorted.map(function(e) { return e.assigned; }), backgroundColor: '#3498db' },
        { label: 'Resolved', data: sorted.map(function(e) { return e.resolved; }), backgroundColor: '#2ecc71' }
      ]
    },
    options: { responsive: true, scales: { yAxes: [{ ticks: { beginAtZero: true } }] }, legend: { position: 'bottom' } }
  });
}

function renderEmptyState() {
  ['chart-volume','chart-sla','chart-categories','chart-agents'].forEach(function(id) {
    const canvas = document.getElementById(id);
    if (!canvas) { return; }
    const msg = document.createElement('p');
    msg.style.cssText = 'text-align:center;color:#6b7c93;padding:40px 0';
    msg.textContent = 'No data available yet';
    canvas.parentElement.appendChild(msg);
  });
}

function setStatus(text) {
  document.getElementById('status-bar').textContent = text;
}
