import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Auth from "@/pages/Auth";
import AdminUsers from "@/pages/AdminUsers";
import AdminAudit from "@/pages/AdminAudit";
import AdminPermissions from "@/pages/AdminPermissions";
import DocumentEditor from "@/pages/DocumentEditor";
import CustomerOverviewSingle from "@/pages/CustomerOverviewSingle";
import CustomerOverviewTabs from "@/pages/CustomerOverviewTabs";
import MyRequirements from "@/pages/MyRequirements";
import RequirementDetailTabs from "@/pages/RequirementDetailTabs";
import RequirementDetail from "@/pages/RequirementDetail";
import Documents from "@/pages/Documents";
import Notifications from "@/pages/Notifications";
import Support from "@/pages/Support";
import Matching from "@/pages/Matching";
import Requirements from "@/pages/Requirements";
import Collaboration from "@/pages/Collaboration";
import Quality from "@/pages/Quality";
import Home from "@/pages/Home";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectNew from "@/pages/ProjectNew";
import Projects from "@/pages/Projects";
import ProjectWorkspace from "@/pages/ProjectWorkspace";
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
          <Route path="/notifications" component={Notifications} />
          <Route path="/support" component={Support} />
          <Route path="/matching" component={Matching} />
          <Route path="/collaboration" component={Collaboration} />
          <Route path="/quality" component={Quality} />
          <Route path="/admin/audit" component={AdminAudit} />
          <Route path="/admin/permissions" component={AdminPermissions} />
          <Route path="/editor" component={DocumentEditor} />
          <Route path="/preview/customer-single" component={CustomerOverviewSingle} />
          <Route path="/preview/customer-tabs" component={CustomerOverviewTabs} />
          <Route path="/my/requirements" component={MyRequirements} />
          <Route path="/my/requirements/:id" component={RequirementDetailTabs} />
          <Route path="/requirements/:id" component={RequirementDetail} />
          <Route path="/requirements" component={Requirements} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/projects/new" component={ProjectNew} />
          <Route path="/workspace" component={ProjectWorkspace} />
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
