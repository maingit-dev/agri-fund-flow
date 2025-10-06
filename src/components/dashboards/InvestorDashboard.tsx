import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/hooks/useUserProfile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, PieChart, Target } from "lucide-react";
import InvestmentDialog from "@/components/loans/InvestmentDialog";
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
  risk_category: string;
  farmer_id: string;
  profiles?: {
    full_name: string;
  };
}

export default function InvestorDashboard({ profile }: { profile: UserProfile }) {
  const [availableLoans, setAvailableLoans] = useState<Loan[]>([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [stats, setStats] = useState({
    totalInvested: 0,
    activeInvestments: 0,
    expectedReturns: 0,
    portfolioValue: 0,
  });
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile.id]);

  const fetchData = async () => {
    const { data: loans } = await supabase
      .from("loans")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (loans) {
      const loansWithProfiles = await Promise.all(
        loans.map(async (loan) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", loan.farmer_id)
            .single();
          return { ...loan, profiles: profile };
        })
      );
      setAvailableLoans(loansWithProfiles as Loan[]);
    }

    const { data: investments } = await supabase
      .from("loan_investments")
      .select(`
        *,
        loans (*)
      `)
      .eq("investor_id", profile.id);

    if (investments) {
      setMyInvestments(investments);
      
      const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount_invested), 0);
      const expectedReturns = investments.reduce((sum, inv) => sum + Number(inv.expected_return), 0);
      
      setStats({
        totalInvested,
        activeInvestments: investments.filter(inv => inv.status === 'active').length,
        expectedReturns,
        portfolioValue: totalInvested + expectedReturns,
      });
    }

    setLoading(false);
  };

  const getRiskBadge = (riskScore: number, riskCategory?: string) => {
    if (riskScore < 40) {
      return <Badge className="bg-success">Low Risk</Badge>;
    } else if (riskScore < 70) {
      return <Badge variant="secondary">Medium Risk</Badge>;
    } else {
      return <Badge variant="destructive">High Risk</Badge>;
    }
  };

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Investor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalInvested)}</div>
              <p className="text-xs text-muted-foreground">Across all loans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
              <Target className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeInvestments}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected Returns</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.expectedReturns)}</div>
              <p className="text-xs text-muted-foreground">Total returns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <PieChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.portfolioValue)}</div>
              <p className="text-xs text-muted-foreground">Investment + Returns</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Loan Opportunities</CardTitle>
            <CardDescription>Browse and invest in approved farmer loans</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : availableLoans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No approved loans available for investment at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{loan.purpose}</p>
                        {getRiskBadge(loan.risk_score, loan.risk_category)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Farmer: {loan.profiles?.full_name || "Unknown"}</span>
                        <span>•</span>
                        <span>{formatCurrency(loan.amount_requested)} requested</span>
                        <span>•</span>
                        <span>{loan.interest_rate}% return</span>
                        <span>•</span>
                        <span>{loan.duration_months} months</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((loan.amount_funded / loan.amount_requested) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(loan.amount_funded)} / {formatCurrency(loan.amount_requested)} funded (
                        {Math.round((loan.amount_funded / loan.amount_requested) * 100)}%)
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedLoan(loan)}
                      className="ml-4 bg-gradient-secondary"
                      disabled={loan.amount_funded >= loan.amount_requested}
                    >
                      {loan.amount_funded >= loan.amount_requested ? "Fully Funded" : "Invest"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedLoan && (
          <InvestmentDialog
            open={!!selectedLoan}
            onOpenChange={(open) => !open && setSelectedLoan(null)}
            loan={selectedLoan}
            investorId={profile.id}
            onSuccess={() => {
              fetchData();
              setSelectedLoan(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
