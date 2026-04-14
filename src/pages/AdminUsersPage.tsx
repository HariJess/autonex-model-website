import { Helmet } from "react-helmet-async";

function AdminUsersPage() {
  return (
    <>
      <Helmet>
        <title>Admin — Utilisateurs — ImmoNex</title>
      </Helmet>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-serif text-2xl font-bold">Utilisateurs</h1>
        <p className="mt-2 text-sm text-muted-foreground font-sans">
          Section réservée au back-office admin. V1 : page de structure prête pour les outils utilisateurs.
        </p>
      </div>
    </>
  );
}

export default AdminUsersPage;
