import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Auth from "@/pages/Auth";
import AdminUsers from "@/pages/AdminUsers";
import AdminAudit from "@/pages/AdminAudit";
import AdminPermissions from "@/pages/AdminPermissions";
import DocumentEditor from "@/pages/DocumentEditor";
import Documents from "@/pages/Documents";
import Matching from "@/pages/Matching";
import Requirements from "@/pages/Requirements";
import Collaboration from "@/pages/Collaboration";
import Quality from "@/pages/Quality";
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
          <Route path="/matching" component={Matching} />
          <Route path="/collaboration" component={Collaboration} />
          <Route path="/quality" component={Quality} />
          <Route path="/admin/audit" component={AdminAudit} />
          <Route path="/admin/permissions" component={AdminPermissions} />
          <Route path="/editor" component={DocumentEditor} />
          <Route path="/requirements" component={Requirements} />
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
