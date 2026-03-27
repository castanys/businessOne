/**
 * InsightDesk — Frontend Dashboard
 * Renders KPIs and charts from stored metrics
 */

let client;
const charts = {};

init();

async function init() {
  client = await app.initialized();
  client.events.on('app.activated', onAppActivated);
}

async function onAppActivated() {
  setStatus('Loading metrics...');

  try {
    // Fetch daily metrics from serverless backend
    const response = await client.request.invoke('getMetrics', {
      entity: 'daily_metrics',
      days: 30
    });

    const dailyData = response.data || [];

    if (dailyData.length === 0) {
      setStatus('No data yet. Metrics will be collected daily by the scheduled job.');
      renderEmptyState();
      return;
    }

    // Sort by date ascending
    dailyData.sort(function(a, b) {
      return a.date > b.date ? 1 : -1;
    });

    renderKPIs(dailyData);
    renderVolumeChart(dailyData);
    renderSLAChart(dailyData);

    // Fetch category metrics
    const catResponse = await client.request.invoke('getMetricsByPrefix', {
      entity: 'category_metrics',
      prefix: 'cat_'
    });
    renderCategoriesChart(catResponse.data || []);

    // Fetch agent metrics
    const agentResponse = await client.request.invoke('getMetricsByPrefix', {
      entity: 'agent_metrics',
      prefix: 'agent_'
    });
    renderAgentsChart(agentResponse.data || []);

    setStatus('Last updated: ' + new Date().toLocaleString());
  } catch (error) {
    console.error('[InsightDesk] Error loading metrics:', error);
    setStatus('Error loading data. Check console for details.');
    renderEmptyState();
  }
}

// --- KPI Rendering ---

function renderKPIs(dailyData) {
  const latest = dailyData[dailyData.length - 1];

  // Open tickets (latest)
  document.getElementById('kpi-open').textContent = latest.open_tickets || 0;

  // Average new tickets per day
  const totalNew = dailyData.reduce(function(sum, d) { return sum + (d.new_tickets || 0); }, 0);
  const avgNew = dailyData.length > 0 ? Math.round(totalNew / dailyData.length * 10) / 10 : 0;
  document.getElementById('kpi-new').textContent = avgNew;

  // MTTR
  document.getElementById('kpi-mttr').textContent = latest.mttr_hours || '--';

  // SLA % (placeholder until SLA data loaded)
  document.getElementById('kpi-sla').textContent = '--';
}

// --- Chart Rendering ---

function renderVolumeChart(dailyData) {
  const ctx = document.getElementById('chart-volume').getContext('2d');
  const labels = dailyData.map(function(d) { return d.date.substring(5); }); // MM-DD
  const openData = dailyData.map(function(d) { return d.open_tickets || 0; });
  const closedData = dailyData.map(function(d) { return d.closed_tickets || 0; });

  charts.volume = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Open',
          data: openData,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Closed',
          data: closedData,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }]
      },
      legend: { position: 'bottom' }
    }
  });
}

function renderSLAChart(dailyData) {
  const ctx = document.getElementById('chart-sla').getContext('2d');
  const labels = dailyData.map(function(d) { return d.date.substring(5); });

  // Placeholder: calculate SLA from open vs total
  const slaData = dailyData.map(function(d) {
    const total = (d.open_tickets || 0) + (d.closed_tickets || 0);
    return total > 0 ? Math.round((d.closed_tickets || 0) / total * 100) : 0;
  });

  charts.sla = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Resolution Rate %',
        data: slaData,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, max: 100 } }]
      },
      legend: { position: 'bottom' }
    }
  });
}

function renderCategoriesChart(catData) {
  const ctx = document.getElementById('chart-categories').getContext('2d');

  // Aggregate by category
  const catTotals = {};
  catData.forEach(function(d) {
    const cat = d.category || 'Unknown';
    catTotals[cat] = (catTotals[cat] || 0) + (d.count || 0);
  });

  // Sort and take top 10
  const sorted = Object.entries(catTotals)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 10);

  const labels = sorted.map(function(e) { return e[0]; });
  const data = sorted.map(function(e) { return e[1]; });
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
                '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'];

  charts.categories = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tickets',
        data: data,
        backgroundColor: colors.slice(0, data.length)
      }]
    },
    options: {
      responsive: true,
      scales: {
        xAxes: [{ ticks: { beginAtZero: true } }]
      },
      legend: { display: false }
    }
  });
}

function renderAgentsChart(agentData) {
  const ctx = document.getElementById('chart-agents').getContext('2d');

  // Aggregate by agent
  const agentTotals = {};
  agentData.forEach(function(d) {
    const id = d.agent_id || 'unassigned';
    if (!agentTotals[id]) {
      agentTotals[id] = { assigned: 0, resolved: 0, open: 0 };
    }
    agentTotals[id].assigned += d.assigned || 0;
    agentTotals[id].resolved += d.resolved || 0;
    agentTotals[id].open += d.open || 0;
  });

  const sorted = Object.entries(agentTotals)
    .sort(function(a, b) { return b[1].assigned - a[1].assigned; })
    .slice(0, 10);

  const labels = sorted.map(function(e) { return 'Agent ' + e[0].substring(0, 8); });
  const assignedData = sorted.map(function(e) { return e[1].assigned; });
  const resolvedData = sorted.map(function(e) { return e[1].resolved; });

  charts.agents = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Assigned',
          data: assignedData,
          backgroundColor: '#3498db'
        },
        {
          label: 'Resolved',
          data: resolvedData,
          backgroundColor: '#2ecc71'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }]
      },
      legend: { position: 'bottom' }
    }
  });
}

function renderEmptyState() {
  const containers = ['chart-volume', 'chart-sla', 'chart-categories', 'chart-agents'];
  containers.forEach(function(id) {
    const canvas = document.getElementById(id);
    const parent = canvas.parentElement;
    const msg = document.createElement('p');
    msg.style.textAlign = 'center';
    msg.style.color = '#6b7c93';
    msg.style.padding = '40px 0';
    msg.textContent = 'No data available yet';
    parent.appendChild(msg);
  });
}

function setStatus(text) {
  document.getElementById('status-bar').textContent = text;
}
