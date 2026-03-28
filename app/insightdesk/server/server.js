/**
 * InsightDesk — Serverless Backend
 *
 * Handles scheduled data collection from Freshservice API
 * and stores aggregated metrics in Entity Storage.
 *
 * Entity Storage API (Platform 3.0):
 *   $db.set(key, { data }) → create/update
 *   $db.get(key) → read
 *   $db.delete(key) → delete
 */

exports = {

  onScheduledEvent: async function() {
    const today = new Date().toISOString().split('T')[0];
    console.info(`[InsightDesk] Scheduled collection started for ${today}`);

    try {
      // 1. Fetch tickets from Freshservice API
      const tickets = await fetchAllTickets();
      console.info(`[InsightDesk] Fetched ${tickets.length} tickets`);

      if (tickets.length === 0) {
        console.info('[InsightDesk] No tickets found, skipping storage');
        return;
      }

      // 2. Aggregate metrics
      const dailyMetrics = aggregateDailyMetrics(tickets, today);
      const categoryMetrics = aggregateCategoryMetrics(tickets, today);
      const agentMetrics = aggregateAgentMetrics(tickets, today);
      const slaMetrics = aggregateSLAMetrics(tickets, today);

      // 3. Store in Entity Storage using $db.set(key, {data})
      await $db.set(`daily_${today}`, { data: dailyMetrics });
      console.info(`[InsightDesk] Stored daily metrics`);

      await $db.set(`categories_${today}`, { data: categoryMetrics });
      console.info(`[InsightDesk] Stored category metrics`);

      await $db.set(`agents_${today}`, { data: agentMetrics });
      console.info(`[InsightDesk] Stored agent metrics`);

      await $db.set(`sla_${today}`, { data: slaMetrics });
      console.info(`[InsightDesk] Stored SLA metrics`);

      // Store latest date reference
      await $db.set('latest_date', { data: { date: today } });

      console.info(`[InsightDesk] Collection complete: ${tickets.length} tickets processed`);
    } catch (error) {
      console.error(`[InsightDesk] Collection failed: ${error.message}`);
    }
  },

  // SMI (Server Method Invocation) — called from frontend
  getMetrics: async function(args) {
    const results = {};
    const days = (args && args.days) || 30;
    const now = new Date();
    const prefixes = ['daily', 'categories', 'agents', 'sla'];

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      for (const prefix of prefixes) {
        try {
          const record = await $db.get(`${prefix}_${dateStr}`);
          if (record && record.data) {
            if (!results[dateStr]) results[dateStr] = {};
            results[dateStr][prefix === 'daily' ? 'daily' : prefix] = record.data;
          }
        } catch {
          // No data for this date/prefix
        }
      }
    }

    return { data: results };
  }
};

// --- Helper Functions ---

async function fetchAllTickets() {
  const tickets = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    try {
      const response = await $request.invokeTemplate('getFreshserviceTickets', {
        query: {
          per_page: 100,
          page: page,
          include: 'stats'
        }
      });

      console.info(`[InsightDesk] API response type: ${typeof response}, keys: ${Object.keys(response || {})}`);
      const bodyStr = response.response || response.body || response;
      console.info(`[InsightDesk] Body preview: ${String(bodyStr).substring(0, 200)}`);

      const body = JSON.parse(bodyStr);
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
  const open = tickets.filter(t => t.status !== 5).length;
  const closed = tickets.filter(t => t.status === 5).length;
  const newTickets = tickets.filter(t => {
    const created = t.created_at.split('T')[0];
    return created === date;
  }).length;

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

  // SLA compliance
  const slaTotal = tickets.length;
  const slaMet = tickets.filter(t => !t.is_escalated).length;
  const slaPercent = slaTotal > 0 ? Math.round((slaMet / slaTotal) * 100) : 0;

  return {
    date,
    open_tickets: open,
    closed_tickets: closed,
    new_tickets: newTickets,
    mttr_hours: mttrHours,
    sla_percent: slaPercent,
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

