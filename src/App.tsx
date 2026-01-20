import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Request from "@/pages/Request";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/request" component={Request} />
          <Route component={Home} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}
