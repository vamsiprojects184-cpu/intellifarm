import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized("Not authenticated");
  return ok({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      preferredLang: user.preferredLang,
      state: user.state,
      district: user.district,
      village: user.village,
      farmingExp: user.farmingExp,
      primaryCrop: user.primaryCrop,
      farmSizeAcres: user.farmSizeAcres,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      expertProfile: user.expertProfile
        ? {
            id: user.expertProfile.id,
            specialization: user.expertProfile.specialization,
            experience: user.expertProfile.experience,
            qualification: user.expertProfile.qualification,
            bio: user.expertProfile.bio,
            isVerified: user.expertProfile.isVerified,
            rating: user.expertProfile.rating,
            totalConsultations: user.expertProfile.totalConsultations,
          }
        : null,
    },
  });
}
