import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { AdminVerificationsList } from "@/components/admin/AdminVerificationsList";

const AdminVerificationsPage = () => {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t("admin.verifications.title", "Vérifications")} — AutoNex Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-4 p-4 md:p-6">
        <AdminVerificationsList />
      </div>
    </>
  );
};

export default AdminVerificationsPage;
