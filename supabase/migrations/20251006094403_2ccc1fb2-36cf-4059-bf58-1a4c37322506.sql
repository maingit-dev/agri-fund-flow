-- Create enum types
CREATE TYPE user_role AS ENUM ('farmer', 'investor', 'admin');
CREATE TYPE loan_status AS ENUM ('pending', 'under_review', 'approved', 'funded', 'active', 'rejected', 'completed', 'defaulted');
CREATE TYPE investment_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE repayment_status AS ENUM ('pending', 'paid', 'overdue', 'partial');

-- User Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'farmer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Farmer specific info
CREATE TABLE public.farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_size DECIMAL(10,2),
  farm_location TEXT,
  crop_type TEXT,
  years_farming INTEGER,
  credit_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Investor specific info
CREATE TABLE public.investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_invested DECIMAL(15,2) DEFAULT 0,
  active_investments INTEGER DEFAULT 0,
  returns_earned DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Loans Table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_requested DECIMAL(15,2) NOT NULL,
  amount_funded DECIMAL(15,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  duration_months INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  status loan_status NOT NULL DEFAULT 'pending',
  risk_score INTEGER DEFAULT 0,
  risk_category TEXT,
  admin_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loan Investors Table (Junction table for many-to-many relationship)
CREATE TABLE public.loan_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_invested DECIMAL(15,2) NOT NULL,
  expected_return DECIMAL(15,2) NOT NULL,
  actual_return DECIMAL(15,2) DEFAULT 0,
  status investment_status NOT NULL DEFAULT 'active',
  invested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loan_id, investor_id)
);

-- Repayments Table
CREATE TABLE public.repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount_due DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status repayment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions Table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles Table (for admin role management)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security Definer Function for Role Checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security Definer Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for farmer_profiles
CREATE POLICY "Anyone can view farmer profiles"
  ON public.farmer_profiles FOR SELECT
  USING (true);

CREATE POLICY "Farmers can update own profile"
  ON public.farmer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Farmers can insert own profile"
  ON public.farmer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for investor_profiles
CREATE POLICY "Anyone can view investor profiles"
  ON public.investor_profiles FOR SELECT
  USING (true);

CREATE POLICY "Investors can update own profile"
  ON public.investor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Investors can insert own profile"
  ON public.investor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for loans
CREATE POLICY "Anyone can view approved loans"
  ON public.loans FOR SELECT
  USING (true);

CREATE POLICY "Farmers can insert own loans"
  ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own loans"
  ON public.loans FOR UPDATE
  USING (auth.uid() = farmer_id);

CREATE POLICY "Admins can update all loans"
  ON public.loans FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for loan_investments
CREATE POLICY "Anyone can view investments"
  ON public.loan_investments FOR SELECT
  USING (true);

CREATE POLICY "Investors can create investments"
  ON public.loan_investments FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

-- RLS Policies for repayments
CREATE POLICY "Anyone can view repayments"
  ON public.repayments FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert repayments"
  ON public.repayments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update repayments"
  ON public.repayments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer')
  );
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer')
  );
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();