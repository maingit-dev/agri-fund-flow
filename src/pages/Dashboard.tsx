import { useUserProfile } from "@/hooks/useUserProfile";
import FarmerDashboard from "@/components/dashboards/FarmerDashboard";
import InvestorDashboard from "@/components/dashboards/InvestorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { profile, loading } = useUserProfile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  switch (profile.role) {
    case "farmer":
      return <FarmerDashboard profile={profile} />;
    case "investor":
      return <InvestorDashboard profile={profile} />;
    case "admin":
      return <AdminDashboard profile={profile} />;
    default:
      return <Navigate to="/auth" replace />;
  }
}
