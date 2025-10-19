import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  avgVisitsPerCustomer: number;
  totalRevenue: number;
  customerAcquisitionRate: number;
  rewardRedemptionRate: number;
  popularMenuItems: { name: string; count: number }[];
  loading: boolean;
  error: string | null;
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    avgVisitsPerCustomer: 0,
    totalRevenue: 0,
    customerAcquisitionRate: 0,
    rewardRedemptionRate: 0,
    popularMenuItems: [],
    loading: true,
    error: null
  });

  const loadAnalytics = async () => {
    setAnalytics(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Get total customers and total visits for average
      const [customersRes, visitsRes, ordersRes, rewardsRes] = await Promise.all([
        supabase.from('customer_stats').select('total_visits'),
        supabase.from('visits').select('id, created_at'),
        supabase.from('orders').select('total_amount, items'),
        supabase.from('rewards').select('status')
      ]);

      if (customersRes.error) throw customersRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (rewardsRes.error) throw rewardsRes.error;

      // Calculate average visits per customer
      const totalCustomers = customersRes.data?.length || 0;
      const totalVisitsSum = customersRes.data?.reduce((sum, stat) => sum + stat.total_visits, 0) || 0;
      const avgVisitsPerCustomer = totalCustomers > 0 ? totalVisitsSum / totalCustomers : 0;

      // Calculate total revenue
      const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Calculate customer acquisition rate (new customers in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentVisits = visitsRes.data?.filter(visit => 
        new Date(visit.created_at) >= thirtyDaysAgo
      ).length || 0;
      const customerAcquisitionRate = recentVisits;

      // Calculate reward redemption rate
      const totalRewards = rewardsRes.data?.length || 0;
      const claimedRewards = rewardsRes.data?.filter(r => r.status === 'claimed').length || 0;
      const rewardRedemptionRate = totalRewards > 0 ? (claimedRewards / totalRewards) * 100 : 0;

      // Get popular menu items from orders
      const itemCounts: Record<string, number> = {};
      ordersRes.data?.forEach(order => {
        const items = order.items as any[];
        items?.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
        });
      });
      
      const popularMenuItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        avgVisitsPerCustomer: Math.round(avgVisitsPerCustomer * 10) / 10,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        customerAcquisitionRate,
        rewardRedemptionRate: Math.round(rewardRedemptionRate * 10) / 10,
        popularMenuItems,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      setAnalytics(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load analytics'
      }));
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return { ...analytics, refresh: loadAnalytics };
};
