import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/hooks/useUserProfile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils-finance";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard({ profile }: { profile: UserProfile }) {
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalLoans: 0,
    pendingReview: 0,
    totalFunded: 0,
    activeUsers: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: loans } = await supabase.from("loans").select("*");
    const { data: pending } = await supabase.from("loans").select("*").eq("status", "pending");
    
    if (loans) {
      const totalFunded = loans.filter(l => l.status === 'funded' || l.status === 'active')
        .reduce((sum, l) => sum + Number(l.amount_funded), 0);
      
      setStats({
        totalLoans: loans.length,
        pendingReview: pending?.length || 0,
        totalFunded,
        activeUsers: 0,
      });
    }
    
    if (pending) setPendingLoans(pending);
  };

  const handleApprove = async (loanId: string) => {
    const { error } = await supabase
      .from("loans")
      .update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() })
      .eq("id", loanId);

    if (!error) {
      toast({ title: "Loan approved successfully" });
      fetchData();
    }
  };

  const handleReject = async (loanId: string) => {
    const { error } = await supabase.from("loans").update({ status: "rejected" }).eq("id", loanId);
    if (!error) {
      toast({ title: "Loan rejected" });
      fetchData();
    }
  };

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLoans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Funded</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalFunded)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Loan Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{loan.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(loan.amount_requested)} • {loan.duration_months} months
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(loan.id)} className="bg-success">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(loan.id)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
