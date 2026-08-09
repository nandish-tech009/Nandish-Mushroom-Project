import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, TrendingUp, Zap, AlertCircle, Crown, Target, Mail } from "lucide-react";
import { toast } from "sonner";

type CustomerSegment = Database["public"]["Tables"]["customer_segments"]["Row"];

interface CustomerWithProfile extends CustomerSegment {
  profile?: {
    full_name: string | null;
    email?: string;
  };
}

const segmentConfig = {
  high_value_customer: {
    icon: Crown,
    color: "bg-yellow-100 text-yellow-800",
    label: "High Value",
    description: "Top spenders - excellent retention targets",
  },
  vip_customer: {
    icon: TrendingUp,
    color: "bg-purple-100 text-purple-800",
    label: "VIP",
    description: "Loyal customers with good spending",
  },
  regular_customer: {
    icon: Users,
    color: "bg-blue-100 text-blue-800",
    label: "Regular",
    description: "Consistent buyers",
  },
  at_risk_customer: {
    icon: AlertCircle,
    color: "bg-red-100 text-red-800",
    label: "At Risk",
    description: "Inactive for 90+ days",
  },
  inactive_customer: {
    icon: Target,
    color: "bg-orange-100 text-orange-800",
    label: "Inactive",
    description: "No activity for 30+ days",
  },
  new_customer: {
    icon: Zap,
    color: "bg-green-100 text-green-800",
    label: "New",
    description: "Recently joined",
  },
};

interface CustomerSegmentStats {
  segment: Database["public"]["Enums"]["customer_segment"];
  count: number;
  totalSpent: number;
  percentage: number;
}

export const CustomerSegmentAnalytics = () => {
  const [segments, setSegments] = useState<CustomerSegmentStats[]>([]);
  const [customers, setCustomers] = useState<CustomerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Database["public"]["Enums"]["customer_segment"] | null>(null);
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    loadSegmentAnalytics();
  }, []);

  const loadSegmentAnalytics = async () => {
    try {
      // Fetch all customer segments
      const { data: allSegments, error: segmentsError } = await supabase
        .from("customer_segments")
        .select("*");

      if (segmentsError) throw segmentsError;

      // Get all admin user IDs to filter them out
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Filter out admin users from segments
      const customersOnly = (allSegments || []).filter(
        seg => !adminUserIds.has(seg.user_id)
      );

      // Get all unique user IDs we need to fetch
      const userIds = customersOnly.map(c => c.user_id);

      // Fetch profiles for these specific users only
      let profileMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds);

        if (profiles) {
          profiles.forEach(p => {
            profileMap[p.user_id] = p;
          });
        }
      }

      setTotalCustomers(customersOnly.length);

      // Calculate statistics by segment (excluding admins)
      const segmentStats = new Map<Database["public"]["Enums"]["customer_segment"], CustomerSegmentStats>();

      customersOnly.forEach((seg) => {
        if (!segmentStats.has(seg.segment)) {
          segmentStats.set(seg.segment, {
            segment: seg.segment,
            count: 0,
            totalSpent: 0,
            percentage: 0,
          });
        }

        const stat = segmentStats.get(seg.segment)!;
        stat.count += 1;
        stat.totalSpent += seg.total_spent || 0;
      });

      // Calculate percentages
      const statsArray = Array.from(segmentStats.values()).map((stat) => ({
        ...stat,
        percentage: ((stat.count / (customersOnly.length || 1)) * 100),
      }));

      setSegments(statsArray.sort((a, b) => b.totalSpent - a.totalSpent));
      
      // Add profile data to customers
      const customersWithProfiles = customersOnly.map(seg => ({
        ...seg,
        profile: profileMap[seg.user_id] || {}
      })) as CustomerWithProfile[];
      
      setCustomers(customersWithProfiles);
    } catch (error) {
      console.error("Error loading segment analytics:", error);
      toast.error("Failed to load segment analytics");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = selectedSegment
    ? customers.filter((c) => c.segment === selectedSegment)
    : customers;

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer Segment Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">Loading analytics...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segment Overview</CardTitle>
          <CardDescription>
            Total Customers: {totalCustomers} | Total Revenue: ₹
            {segments.reduce((sum, s) => sum + s.totalSpent, 0).toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Segment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((stat) => {
          const config = segmentConfig[stat.segment];
          const Icon = config.icon;

          return (
            <Card
              key={stat.segment}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() =>
                setSelectedSegment(
                  selectedSegment === stat.segment ? null : stat.segment
                )
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge className={config.color}>{stat.percentage.toFixed(1)}%</Badge>
                </div>

                <h3 className="font-semibold text-lg mb-1">{config.label}</h3>
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customers:</span>
                    <span className="font-semibold">{stat.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="font-semibold">₹{stat.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${config.color.split(" ")[0]}`}
                      style={{
                        width: `${(stat.totalSpent / segments[0].totalSpent) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Customer List */}
      {selectedSegment && (
        <Card>
          <CardHeader>
            <CardTitle>
              {segmentConfig[selectedSegment].label} Customers (
              {filteredCustomers.length})
            </CardTitle>
            <CardDescription>
              Click a segment card above to filter customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {customer.profile?.full_name || customer.profile?.email?.split('@')[0] || `Customer ${customer.user_id.substring(0, 8)}`}
                        </p>
                        {customer.profile?.email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {customer.profile.email}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">{customer.reason}</p>
                      </div>
                      <Badge className={segmentConfig[customer.segment].color}>
                        {segmentConfig[customer.segment].label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-gray-600">Orders:</span>
                        <p className="font-semibold">{customer.total_orders}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Spent:</span>
                        <p className="font-semibold">₹{customer.total_spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Order:</span>
                        <p className="font-semibold">
                          ₹{customer.average_order_value.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Days Inactive:</span>
                        <p className="font-semibold">
                          {customer.days_since_last_order || "N/A"}
                        </p>
                      </div>
                    </div>

                    {customer.last_order_date && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last Order: {new Date(customer.last_order_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
