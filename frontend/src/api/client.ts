import axios from 'axios';
import type {
  CustomerListResponse, Customer, Segment, Campaign, CampaignFunnel,
  DecisionLog, Activity, Opportunity, AnalyticsOverview, ChannelPerformance,
  StrategyResponse, OpportunityInvestigationResponse, CampaignMessage, CampaignTimelineEvent,
  SegmentMemberResponse,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Customers
export const getCustomers = (params?: Record<string, string | number>) =>
  api.get<CustomerListResponse>('/customers', { params }).then(r => r.data);

export const getCustomer = (id: string) =>
  api.get<Customer>(`/customers/${id}`).then(r => r.data);

export const getCustomerDecisions = (id: string) =>
  api.get<DecisionLog[]>(`/customers/${id}/decisions`).then(r => r.data);

// Segments
export const getSegments = () =>
  api.get<Segment[]>('/segments').then(r => r.data);

export const getSegmentMembers = (segmentId: string) =>
  api.get<SegmentMemberResponse>(`/segments/${segmentId}/members`).then(r => r.data);

export const buildSegment = (query: string) =>
  api.post('/segments/build', { query }).then(r => r.data);

// Campaigns
export const getCampaigns = () =>
  api.get<Campaign[]>('/campaigns').then(r => r.data);

export const getCampaign = (id: string) =>
  api.get<Campaign>(`/campaigns/${id}`).then(r => r.data);

export const createCampaign = (data: Record<string, unknown>) =>
  api.post<Campaign>('/campaigns', data).then(r => r.data);

export const launchCampaign = (id: string) =>
  api.post<Campaign>(`/campaigns/${id}/launch`).then(r => r.data);

export const getCampaignFunnel = (id: string) =>
  api.get<CampaignFunnel>(`/campaigns/${id}/funnel`).then(r => r.data);

export const getCampaignTimeline = (id: string) =>
  api.get<CampaignTimelineEvent[]>(`/campaigns/${id}/timeline`).then(r => r.data);

export const getCampaignDecisions = (id: string) =>
  api.get<DecisionLog[]>(`/campaigns/${id}/decisions`).then(r => r.data);

export const getCampaignMessages = (id: string) =>
  api.get<CampaignMessage[]>(`/campaigns/${id}/messages`).then(r => r.data);

// AI Strategist — goal-driven (secondary entry point)
export const analyzeGoal = (goal: string) =>
  api.post<StrategyResponse>('/strategist/analyze', { goal }).then(r => r.data);

// AI Strategist — Opportunity Investigation (primary flow)
export const investigateOpportunity = (opportunity_id: string) =>
  api.post<OpportunityInvestigationResponse>('/strategist/investigate', { opportunity_id }).then(r => r.data);

// Opportunities
export const getOpportunities = () =>
  api.get<Opportunity[]>('/opportunities').then(r => r.data);

export const refreshOpportunities = () =>
  api.post<Opportunity[]>('/opportunities/refresh').then(r => r.data);

export const dismissOpportunity = (id: string) =>
  api.post(`/opportunities/${id}/dismiss`).then(r => r.data);

// Analytics
export const getAnalyticsOverview = () =>
  api.get<AnalyticsOverview>('/analytics/overview').then(r => r.data);

export const getChannelPerformance = () =>
  api.get<ChannelPerformance[]>('/analytics/channels').then(r => r.data);

export const getAudiencePerformance = () =>
  api.get('/analytics/audiences').then(r => r.data);

// Activities
export const getActivities = (params?: Record<string, string | number>) =>
  api.get<Activity[]>('/activities', { params }).then(r => r.data);

// Decisions
export const getDecisions = (params?: Record<string, string | number>) =>
  api.get<DecisionLog[]>('/decisions', { params }).then(r => r.data);

export default api;
