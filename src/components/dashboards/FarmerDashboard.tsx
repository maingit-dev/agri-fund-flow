import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/hooks/useUserProfile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertCircle, Plus, CheckCircle } from "lucide-react";
import LoanApplicationDialog from "@/components/loans/LoanApplicationDialog";
import { formatCurrency } from "@/lib/utils-finance";

interface Loan {
  id: string;
  amount_requested: number;
  amount_funded: number;
  interest_rate: number;
  duration_months: number;
  purpose: string;
  status: string;
  risk_score: number;
  created_at: string;
}

export default function FarmerDashboard({ profile }: { profile: UserProfile }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    totalBorrowed: 0,
    pendingLoans: 0,
  });
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, [profile.id]);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("farmer_id", profile.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLoans(data as Loan[]);
      
      const totalBorrowed = data
        .filter(l => l.status === 'active' || l.status === 'funded')
        .reduce((sum, l) => sum + Number(l.amount_requested), 0);
      
      setStats({
        totalLoans: data.length,
        activeLoans: data.filter(l => l.status === 'active').length,
        totalBorrowed,
        pendingLoans: data.filter(l => l.status === 'pending' || l.status === 'under_review').length,
      });
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      under_review: "secondary",
      approved: "default",
      funded: "default",
      active: "default",
      rejected: "destructive",
      completed: "outline",
      defaulted: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Farmer Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
          </div>
          <Button onClick={() => setShowLoanDialog(true)} className="bg-gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Apply for Loan
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLoans}</div>
              <p className="text-xs text-muted-foreground">All time applications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLoans}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
              <DollarSign className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalBorrowed)}</div>
              <p className="text-xs text-muted-foreground">Active loans amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingLoans}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Loan Applications</CardTitle>
            <CardDescription>Track the status of your loan applications</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't applied for any loans yet.</p>
                <Button onClick={() => setShowLoanDialog(true)} className="bg-gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Apply for Your First Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{loan.purpose}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatCurrency(loan.amount_requested)}</span>
                        <span>•</span>
                        <span>{loan.duration_months} months</span>
                        <span>•</span>
                        <span>{loan.interest_rate}% interest</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(loan.amount_funded)} funded
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {loan.amount_funded > 0
                            ? `${Math.round((loan.amount_funded / loan.amount_requested) * 100)}% complete`
                            : "Not funded yet"}
                        </p>
                      </div>
                      {getStatusBadge(loan.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <LoanApplicationDialog
          open={showLoanDialog}
          onOpenChange={setShowLoanDialog}
          farmerId={profile.id}
          onSuccess={fetchLoans}
        />
      </div>
    </DashboardLayout>
  );
}
