import { useMemo } from "react";
import { ProfileService } from "~/services/profileService";
import { useDataFetch } from "./useDataFetch";

/**
 * Hook to fetch all profiles with loading and error states
 */
export function useProfiles() {
    const profileService = useMemo(() => new ProfileService(), []);
    
    return useDataFetch({
        fetchFn: () => profileService.getAllProfiles(),
    });
}
