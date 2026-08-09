import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { ShoppingCart, User, LogOut, Home, Package, Mail, Heart } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!data);
    };

    checkAdminStatus();
  }, [user]);

  const customerName = user?.user_metadata?.full_name || "Customer";
  const customerEmail = user?.email || "";

  const handleDashboardClick = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleProfileClick = () => {
    if (isAdmin) {
      navigate("/admin?tab=profile");
    } else {
      navigate("/profile");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">🍄 MushroomMarket</span>
          </Link>
          
          {user && (
            <>
              <Link to={isAdmin ? "/admin" : "/dashboard"}>
                <Button variant="ghost" className="gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/products">
                <Button variant="ghost" className="gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              <Link to="/wishlist">
                <Button variant="ghost" size="icon" title="View Wishlist">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{customerName}</p>
                      <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customerEmail}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDashboardClick}>
                    <Home className="mr-2 h-4 w-4" />
                    My Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!user && (
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};