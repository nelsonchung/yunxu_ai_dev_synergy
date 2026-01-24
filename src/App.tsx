import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Auth from "@/pages/Auth";
import AdminUsers from "@/pages/AdminUsers";
import Documents from "@/pages/Documents";
import Home from "@/pages/Home";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectNew from "@/pages/ProjectNew";
import Projects from "@/pages/Projects";
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
          <Route path="/documents" component={Documents} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/projects/new" component={ProjectNew} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/projects" component={Projects} />
          <Route path="/request" component={Request} />
          <Route component={Home} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}
