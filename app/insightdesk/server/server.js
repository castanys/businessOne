/**
 * InsightDesk — Serverless Backend
 *
 * Handles scheduled data collection from Freshservice API
 * and stores aggregated metrics in Entity Storage.
 */

const ENTITIES = {
  DAILY_METRICS: 'daily_metrics',
  CATEGORY_METRICS: 'category_metrics',
  AGENT_METRICS: 'agent_metrics',
  SLA_METRICS: 'sla_metrics',
  APP_CONFIG: 'app_config'
};

/**
 * Scheduled event handler — runs daily to collect and aggregate ticket data
 */
exports = {

  onScheduledEvent: async function() {
    const today = new Date().toISOString().split('T')[0];
    console.info(`[InsightDesk] Scheduled collection started for ${today}`);

    try {
      // 1. Fetch tickets from Freshservice API
      const tickets = await fetchAllTickets();

      // 2. Aggregate metrics
      const dailyMetrics = aggregateDailyMetrics(tickets, today);
      const categoryMetrics = aggregateCategoryMetrics(tickets, today);
      const agentMetrics = aggregateAgentMetrics(tickets, today);
      const slaMetrics = aggregateSLAMetrics(tickets, today);

      // 3. Store in Entity Storage
      await storeMetrics(ENTITIES.DAILY_METRICS, `daily_${today}`, dailyMetrics);

      for (const [category, data] of Object.entries(categoryMetrics)) {
        const key = `cat_${today}_${sanitizeKey(category)}`;
        await storeMetrics(ENTITIES.CATEGORY_METRICS, key, data);
      }

      for (const [agentId, data] of Object.entries(agentMetrics)) {
        const key = `agent_${today}_${agentId}`;
        await storeMetrics(ENTITIES.AGENT_METRICS, key, data);
      }

      for (const [priority, data] of Object.entries(slaMetrics)) {
        const key = `sla_${today}_${priority}`;
        await storeMetrics(ENTITIES.SLA_METRICS, key, data);
      }

      console.info(`[InsightDesk] Collection complete: ${tickets.length} tickets processed`);
    } catch (error) {
      console.error(`[InsightDesk] Collection failed: ${error.message}`);
    }
  },

  // SMI (Server Method Invocation) — called from frontend
  getMetrics: async function(args) {
    const { entity, days } = args;
    const results = [];
    const now = new Date();

    for (let i = 0; i < (days || 30); i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const key = entity === ENTITIES.DAILY_METRICS
          ? `daily_${dateStr}`
          : `${dateStr}`;
        const record = await $db.read(entity, { key });
        if (record) results.push(record);
      } catch (e) {
        // No data for this date, skip
      }
    }

    return { data: results };
  },

  getMetricsByPrefix: async function(args) {
    const { entity, prefix } = args;
    try {
      const records = await $db.readAll(entity, {
        query: { prefix }
      });
      return { data: records || [] };
    } catch (e) {
      return { data: [] };
    }
  }
};

// --- Helper Functions ---

async function fetchAllTickets() {
  const tickets = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) { // Max 10 pages to stay within rate limits
    try {
      const response = await $request.invokeTemplate('getFreshserviceTickets', {
        query: {
          per_page: 100,
          page: page,
          include: 'stats',
          updated_since: getYesterdayISO()
        }
      });

      const body = JSON.parse(response.body);
      if (body.tickets && body.tickets.length > 0) {
        tickets.push(...body.tickets);
        page++;
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error(`[InsightDesk] API error page ${page}: ${e.message}`);
      hasMore = false;
    }
  }

  return tickets;
}

function aggregateDailyMetrics(tickets, date) {
  const open = tickets.filter(t => t.status !== 5).length; // 5 = Closed
  const closed = tickets.filter(t => t.status === 5).length;
  const newTickets = tickets.filter(t => {
    const created = t.created_at.split('T')[0];
    return created === date;
  }).length;

  // Calculate MTTR (Mean Time To Resolution) for closed tickets
  const resolvedTickets = tickets.filter(t => t.stats && t.stats.resolved_at);
  let mttrHours = 0;
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((sum, t) => {
      const created = new Date(t.created_at);
      const resolved = new Date(t.stats.resolved_at);
      return sum + (resolved - created) / (1000 * 60 * 60);
    }, 0);
    mttrHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10;
  }

  return {
    date,
    open_tickets: open,
    closed_tickets: closed,
    new_tickets: newTickets,
    mttr_hours: mttrHours,
    total_processed: tickets.length
  };
}

function aggregateCategoryMetrics(tickets, date) {
  const categories = {};
  for (const ticket of tickets) {
    const cat = ticket.category || 'Uncategorized';
    if (!categories[cat]) {
      categories[cat] = { date, category: cat, count: 0, open: 0, closed: 0 };
    }
    categories[cat].count++;
    if (ticket.status === 5) {
      categories[cat].closed++;
    } else {
      categories[cat].open++;
    }
  }
  return categories;
}

function aggregateAgentMetrics(tickets, date) {
  const agents = {};
  for (const ticket of tickets) {
    const agentId = ticket.responder_id || 'unassigned';
    if (!agents[agentId]) {
      agents[agentId] = { date, agent_id: agentId, assigned: 0, resolved: 0, open: 0 };
    }
    agents[agentId].assigned++;
    if (ticket.status === 5) {
      agents[agentId].resolved++;
    } else {
      agents[agentId].open++;
    }
  }
  return agents;
}

function aggregateSLAMetrics(tickets, date) {
  const priorities = {};
  const priorityNames = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' };

  for (const ticket of tickets) {
    const pName = priorityNames[ticket.priority] || 'Unknown';
    if (!priorities[pName]) {
      priorities[pName] = { date, priority: pName, total: 0, sla_met: 0, sla_breached: 0 };
    }
    priorities[pName].total++;

    if (ticket.is_escalated) {
      priorities[pName].sla_breached++;
    } else {
      priorities[pName].sla_met++;
    }
  }
  return priorities;
}

function sanitizeKey(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}
