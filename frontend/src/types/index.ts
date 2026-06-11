export interface Persona {
  id: string;
  customer_id: string;
  primary_category: string;
  secondary_category: string | null;
  channel_affinity: string;
  channel_scores: Record<string, number>;
  discount_affinity: string;
  discount_response_rate: number;
  engagement_score: number;
  risk_level: string;
  price_sensitivity: string;
  preferred_time: string;
  avg_days_between_purchases: number;
  computation_factors: Record<string, number>;
  last_computed_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_spend: number;
  average_order_value: number;
  order_count: number;
  last_purchase_date: string | null;
  lifetime_value: number;
  created_at: string;
  updated_at: string;
  persona: Persona | null;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  segment_type: string;
  query_text: string | null;
  customer_count: number;
  revenue_contribution: number;
  engagement_rate: number;
  growth_trend: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  goal: string;
  segment_id: string | null;
  channel: string;
  status: string;
  message_headline: string;
  message_body: string;
  message_cta: string;
  ai_strategy: Record<string, unknown>;
  predicted_reach: number;
  predicted_opens: number;
  predicted_clicks: number;
  predicted_conversions: number;
  predicted_revenue: number;
  actual_sent: number;
  actual_delivered: number;
  actual_read: number;
  actual_clicked: number;
  actual_converted: number;
  actual_failed: number;
  actual_revenue: number;
  created_at: string;
  launched_at: string | null;
  completed_at: string | null;
  segment_name: string | null;
}

export interface CampaignFunnel {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  converted: number;
  failed: number;
}

export interface DecisionLog {
  id: string;
  campaign_id: string | null;
  customer_id: string | null;
  decision_type: string;
  decision: string;
  reasoning: string;
  confidence_score: number;
  source: string;
  persona_snapshot: Record<string, unknown> | null;
  alternatives_considered: Record<string, unknown> | null;
  created_at: string;
  customer_name: string | null;
  campaign_name: string | null;
}

export interface Activity {
  id: string;
  campaign_id: string | null;
  event_type: string;
  channel: string | null;
  status: string;
  description: string;
  affected_count: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  campaign_name: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  opportunity_type: string;
  potential_revenue: number;
  affected_customers: number;
  recommended_action: string;
  priority: string;
  status: string;
  ai_reasoning: string;
  created_at: string;
}

export interface AnalyticsOverview {
  total_customers: number;
  active_customers: number;
  dormant_customers: number;
  total_revenue: number;
  orders_this_month: number;
  active_campaigns: number;
  avg_customer_ltv: number;
  revenue_influenced: number;
  campaign_roi: number;
  conversion_rate: number;
  read_rate: number;
  retention_rate: number;
}

export interface ChannelPerformance {
  channel: string;
  delivery_rate: number;
  read_rate: number;
  click_rate: number;
  conversion_rate: number;
  revenue: number;
  campaigns_count: number;
}

export interface StrategyResponse {
  goal_summary: string;
  audience: {
    segment_name: string;
    customer_count: number;
    revenue_opportunity: number;
    characteristics: string[];
    reasoning: string;
  };
  strategy: {
    campaign_type: string;
    approach: string;
    confidence_score: number;
    expected_outcome: string;
    reasoning: string;
  };
  channel: {
    primary_channel: string;
    reasoning: string;
    channel_metrics: Record<string, { read_rate: number; click_rate: number; conversion_rate: number }>;
  };
  message: {
    headline: string;
    body: string;
    cta: string;
    personalization_tokens: string[];
    tone: string;
  };
  performance: {
    estimated_reach: number;
    estimated_opens: number;
    estimated_clicks: number;
    estimated_conversions: number;
    estimated_revenue: number;
  };
  decision_reasoning: string[];
}
