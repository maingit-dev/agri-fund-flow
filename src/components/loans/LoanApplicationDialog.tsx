import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoanApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerId: string;
  onSuccess: () => void;
}

export default function LoanApplicationDialog({
  open,
  onOpenChange,
  farmerId,
  onSuccess,
}: LoanApplicationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount_requested: "",
    duration_months: "",
    interest_rate: "5.0",
    purpose: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("loans").insert({
      farmer_id: farmerId,
      amount_requested: parseFloat(formData.amount_requested),
      duration_months: parseInt(formData.duration_months),
      interest_rate: parseFloat(formData.interest_rate),
      purpose: formData.purpose,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Application submitted!",
        description: "Your loan application is now under review.",
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        amount_requested: "",
        duration_months: "",
        interest_rate: "5.0",
        purpose: "",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for a Loan</DialogTitle>
          <DialogDescription>
            Fill in the details below to submit your loan application
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Loan Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min="100"
              step="100"
              placeholder="5000"
              value={formData.amount_requested}
              onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (months)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="60"
              placeholder="12"
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest">Interest Rate (%)</Label>
            <Input
              id="interest"
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={formData.interest_rate}
              onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Loan</Label>
            <Textarea
              id="purpose"
              placeholder="Describe what you'll use the loan for (e.g., purchasing seeds, equipment, livestock)"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-primary">
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
