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
    const response = await client.request.invoke('getMetrics', { days: 30 });
    const metricsData = response.response.data || {};

    const dates = Object.keys(metricsData).sort();

    if (dates.length === 0) {
      setStatus('No data yet. Metrics will be collected daily by the scheduled job.');
      renderEmptyState();
      return;
    }

    const dailyData = dates
      .filter(function(d) { return metricsData[d].daily; })
      .map(function(d) { return metricsData[d].daily; });

    const latestDate = dates[dates.length - 1];
    const categoryData = metricsData[latestDate].categories || {};
    const agentData = metricsData[latestDate].agents || {};

    renderKPIs(dailyData);
    renderVolumeChart(dailyData);
    renderSLAChart(dailyData);
    renderCategoriesChart(categoryData);
    renderAgentsChart(agentData);

    setStatus('Last updated: ' + new Date().toLocaleString());
  } catch (error) {
    console.error('[InsightDesk] Error loading metrics:', error);
    setStatus('Error loading data. Check console for details.');
    renderEmptyState();
  }
}

function renderKPIs(dailyData) {
  const latest = dailyData[dailyData.length - 1];

  document.getElementById('kpi-open').textContent = latest.open_tickets || 0;

  const totalNew = dailyData.reduce(function(sum, d) { return sum + (d.new_tickets || 0); }, 0);
  const avgNew = dailyData.length > 0 ? Math.round(totalNew / dailyData.length * 10) / 10 : 0;
  document.getElementById('kpi-new').textContent = avgNew;

  document.getElementById('kpi-sla').textContent = (latest.sla_percent || 0) + '%';
  document.getElementById('kpi-mttr').textContent = latest.mttr_hours || '--';
}

function renderVolumeChart(dailyData) {
  const ctx = document.getElementById('chart-volume').getContext('2d');
  const labels = dailyData.map(function(d) { return d.date.substring(5); });
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
  const slaValues = dailyData.map(function(d) { return d.sla_percent || 0; });

  charts.sla = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'SLA Compliance %',
        data: slaValues,
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

  const entries = Object.values(catData);
  const sorted = entries.sort(function(a, b) { return b.count - a.count; }).slice(0, 10);

  const labels = sorted.map(function(e) { return e.category; });
  const data = sorted.map(function(e) { return e.count; });
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

  const entries = Object.values(agentData);
  const sorted = entries.sort(function(a, b) { return b.assigned - a.assigned; }).slice(0, 10);

  const labels = sorted.map(function(e) {
    const id = String(e.agent_id);
    return id === 'unassigned' ? 'Unassigned' : 'Agent ' + id.substring(0, 8);
  });
  const assignedData = sorted.map(function(e) { return e.assigned; });
  const resolvedData = sorted.map(function(e) { return e.resolved; });

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
