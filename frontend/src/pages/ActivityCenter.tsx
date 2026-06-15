import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Filter } from 'lucide-react';
import { getActivities } from '../api/client';
import type { Activity as ActivityType } from '../types';

const eventTypes = [
  '', 'campaign_queued', 'processing_started', 'messages_sent', 'delivery_callback',
  'read_event', 'click_event', 'purchase_event', 'retry_triggered', 'failure_recorded', 'campaign_completed',
];

const channelFilters = ['', 'whatsapp', 'sms', 'email', 'rcs'];

export default function ActivityCenter() {
  const [eventType, setEventType] = useState('');
  const [channel, setChannel] = useState('');

  const { data: activities } = useQuery<ActivityType[]>({
    queryKey: ['activities', eventType, channel],
    queryFn: () => getActivities({ event_type: eventType, channel, limit: 100 }),
  });

  useEffect(() => { document.title = 'Synapse — Activity Center'; }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Activity Center</h1>
        <p>Real-time operational visibility into campaign execution</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
          <Filter size={16} /> Filters:
        </div>
        <div className="filter-pills">
          {channelFilters.map(c => (
            <button key={c || 'all-ch'} className={`filter-pill ${channel === c ? 'active' : ''}`} onClick={() => setChannel(c)}>
              {c || 'All Channels'}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-pills" style={{ marginBottom: 'var(--space-6)' }}>
        {eventTypes.map(e => (
          <button key={e || 'all-ev'} className={`filter-pill ${eventType === e ? 'active' : ''}`} onClick={() => setEventType(e)}>
            {e ? e.replace(/_/g, ' ') : 'All Events'}
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="timeline">
        {activities?.map((a, i) => (
          <motion.div key={a.id} className="timeline-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <div className={`timeline-dot ${a.status}`} />
            <div className="timeline-content">
              <div className="timeline-time">{new Date(a.created_at).toLocaleString()}</div>
              <div className="timeline-desc">{a.description}</div>
              <div className="timeline-meta">
                <span className={`badge badge-${a.status === 'success' ? 'success' : a.status === 'warning' ? 'warning' : a.status === 'error' ? 'error' : 'info'}`}>
                  {a.event_type.replace(/_/g, ' ')}
                </span>
                {a.channel && <span className={`badge badge-${a.channel}`}>{a.channel}</span>}
                {a.campaign_name && <span>📋 {a.campaign_name}</span>}
                {a.affected_count > 0 && <span>{a.affected_count.toLocaleString()} affected</span>}
              </div>
            </div>
          </motion.div>
        ))}
        {activities?.length === 0 && (
          <div className="empty-state">
            <Activity size={48} />
            <h3>No activities yet</h3>
            <p>Campaign events will appear here as campaigns are executed</p>
          </div>
        )}
      </div>
    </div>
  );
}
