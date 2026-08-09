import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import heroImage from "@/assets/hero-mushrooms.jpg";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="mb-6 text-5xl font-bold leading-tight text-foreground md:text-6xl">
              Premium Organic Mushrooms
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Farm-fresh, locally sourced mushrooms delivered to your door. Experience the finest quality and flavor.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="group">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Sign Up Free
                </Button>
              </Link>
              <Link to="/admin/login">
                <Button size="lg" variant="secondary">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          {/* Admin Credentials Card */}
          <Card className="mb-12 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="text-2xl">🔑 Admin Login Credentials</CardTitle>
              <CardDescription>For testing admin features and order management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 rounded-lg bg-card p-4 font-mono text-sm">
                <div>
                  <span className="font-semibold text-primary">Email:</span> admin@mushroommarket.com
                </div>
                <div>
                  <span className="font-semibold text-primary">Password:</span> Admin@123
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Admin can approve orders through 4 stages: Pending Approval → Confirmed → Processing → Delivered (with realtime updates)
              </p>
              <Link to="/admin/login">
                <Button className="mt-4 w-full">Go to Admin Login</Button>
              </Link>
            </CardContent>
          </Card>

          <h2 className="mb-12 text-center text-3xl font-bold">Why Choose Us</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Leaf className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">100% Organic</h3>
              <p className="text-muted-foreground">
                Grown naturally without pesticides or chemicals
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Fast Delivery</h3>
              <p className="text-muted-foreground">
                Fresh mushrooms delivered within 24-48 hours
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Quality Guaranteed</h3>
              <p className="text-muted-foreground">
                100% satisfaction guarantee on all products
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;