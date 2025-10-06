import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, calculateExpectedReturn } from "@/lib/utils-finance";

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: any;
  investorId: string;
  onSuccess: () => void;
}

export default function InvestmentDialog({
  open,
  onOpenChange,
  loan,
  investorId,
  onSuccess,
}: InvestmentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");

  const remainingAmount = loan.amount_requested - loan.amount_funded;
  const expectedReturn = amount
    ? calculateExpectedReturn(parseFloat(amount), loan.interest_rate, loan.duration_months)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const investmentAmount = parseFloat(amount);

    if (investmentAmount > remainingAmount) {
      toast({
        title: "Investment exceeds remaining amount",
        description: `Maximum investment: ${formatCurrency(remainingAmount)}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error: investmentError } = await supabase.from("loan_investments").insert({
      loan_id: loan.id,
      investor_id: investorId,
      amount_invested: investmentAmount,
      expected_return: expectedReturn,
      status: "active",
    });

    if (!investmentError) {
      const newFundedAmount = loan.amount_funded + investmentAmount;
      const { error: loanError } = await supabase
        .from("loans")
        .update({
          amount_funded: newFundedAmount,
          status: newFundedAmount >= loan.amount_requested ? "funded" : "approved",
        })
        .eq("id", loan.id);

      if (!loanError) {
        toast({
          title: "Investment successful!",
          description: `You invested ${formatCurrency(investmentAmount)} in this loan.`,
        });
        onSuccess();
      }
    }

    if (investmentError) {
      toast({
        title: "Investment failed",
        description: investmentError.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invest in Loan</DialogTitle>
          <DialogDescription>
            {loan.purpose}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan Amount:</span>
              <span className="font-medium">{formatCurrency(loan.amount_requested)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Funded:</span>
              <span className="font-medium">{formatCurrency(loan.amount_funded)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-medium text-primary">{formatCurrency(remainingAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest Rate:</span>
              <span className="font-medium">{loan.interest_rate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{loan.duration_months} months</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investment-amount">Investment Amount ($)</Label>
              <Input
                id="investment-amount"
                type="number"
                min="10"
                max={remainingAmount}
                step="10"
                placeholder={`Max: ${formatCurrency(remainingAmount)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="p-4 bg-secondary-light rounded-lg">
                <p className="text-sm font-medium mb-2">Investment Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Investment:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Return:</span>
                    <span className="font-medium text-success">
                      +{formatCurrency(expectedReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total Expected:</span>
                    <span className="text-primary">
                      {formatCurrency(parseFloat(amount) + expectedReturn)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !amount} className="flex-1 bg-gradient-secondary">
                {loading ? "Investing..." : "Invest Now"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
