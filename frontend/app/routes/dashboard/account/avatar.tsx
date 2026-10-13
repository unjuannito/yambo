import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/avatar";
import { useAuth } from "~/hooks/useAuth";
import { useApiMutation } from "~/hooks/useApiMutation";
import { userService } from "~/services/userService";
import type { CurrentUser } from "~/types/userType";
import { avatarFromSeed, sameAvatar, type ElephantAvatarConfig } from "~/components/ElephantAvatar";
import { ElephantAvatarEditor } from "~/components/ElephantAvatarEditor";
import { isStaff } from "~/utils/roleHelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPalette } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Mi elefante" },
    { name: "Yambo - Mi elefante", content: "Yambo - Mi elefante" },
  ];
}

export default function MyElephant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, reload } = useAuth();

  const saveMutation = useApiMutation<CurrentUser, ElephantAvatarConfig>({
    // Guardar el elefante de serie equivale a no tener uno personalizado
    mutationFn: (avatar) =>
      user && sameAvatar(avatar, avatarFromSeed(user.id))
        ? userService.resetStaffAvatar()
        : userService.updateStaffAvatar(avatar),
    successMessage: t("avatar.saved"),
    onSuccess: () => {
      reload();
    },
  });

  if (!user) return null;

  return (
    <main className="flex flex-col items-center p-4 md:p-8 w-full min-h-screen">
      <div className="w-full max-w-5xl">
        <Link
          to="/mi-espacio/cuenta"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-yambo-green-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          {t("avatar.back")}
        </Link>

        <section className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-yambo-purple-50 to-yambo-purple-100/50 border-b border-yambo-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yambo-purple-500 to-yambo-purple-600 rounded-xl text-white">
                <FontAwesomeIcon icon={faPalette} className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display text-yambo-black">{t("avatar.title")}</h1>
                <p className="text-sm text-gray-400">{t("avatar.subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isStaff(user) ? (
              <ElephantAvatarEditor
                seed={user.id}
                value={user.staff?.avatar}
                name={user.staff?.nickname || user.name}
                onSave={(avatar) => saveMutation.mutate(avatar)}
                onCancel={() => navigate("/mi-espacio/cuenta")}
                saving={saveMutation.isLoading}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">{t("avatar.onlyStaff")}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
