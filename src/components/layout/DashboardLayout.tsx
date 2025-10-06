import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/hooks/useUserProfile";
import { LogOut, Sprout, TrendingUp, Shield, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: UserProfile;
}

export default function DashboardLayout({ children, profile }: DashboardLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getRoleIcon = () => {
    switch (profile.role) {
      case "farmer":
        return <Sprout className="h-5 w-5" />;
      case "investor":
        return <TrendingUp className="h-5 w-5" />;
      case "admin":
        return <Shield className="h-5 w-5" />;
    }
  };

  const getRoleBadge = () => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      farmer: "default",
      investor: "secondary",
      admin: "outline",
    };

    return (
      <Badge variant={variants[profile.role]} className="capitalize">
        {profile.role}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/30 via-background to-secondary-light/30">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                {getRoleIcon()}
              </div>
              <div>
                <h1 className="text-xl font-bold">AgriFinance</h1>
                <p className="text-xs text-muted-foreground">Micro Financing Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  {getRoleBadge()}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
