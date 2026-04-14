import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

function AdminModerationPage() {
  return (
    <>
      <Helmet>
        <title>Admin — Modération — ImmoNex</title>
      </Helmet>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h1 className="font-serif text-2xl font-bold">Modération</h1>
        <p className="text-sm text-muted-foreground font-sans">
          Les opérations de modération sont actuellement gérées dans la section monétisation admin.
        </p>
        <Link to="/admin/monetisation" className="text-sm text-primary font-sans hover:underline">
          Ouvrir la modération actuelle
        </Link>
      </div>
    </>
  );
}

export default AdminModerationPage;
