import { View, Image} from "react-native";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";


interface UserProfileDTO {
  pictureUrl: string | null;
  displayName: string | null;
  email: string;
}

const DEFAULT_IMAGE_URL = require('../../../../assets/images/blotz-icon.jpg')
const imageClass= "w-14 h-14 rounded-full"

export const fetchUserProfile = async (): Promise<UserProfileDTO> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/User`;
  try {
    return await fetchWithAuth<UserProfileDTO>(url);
  }catch (err: any) {
    console.log("Fetch user profile failed:", err);
    throw new Error("Failed to load user profile data");
  }
};

export default function UserProfile() {

  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchUserProfile()
      .then(data =>{
        setProfile(data);
        if(!data.pictureUrl) {
          setImageError(true);
        }
      })
      .catch(error => {
        console.error("Could not render profile (API or Network Error):", error);
        setProfile({
          pictureUrl: null,
          displayName: 'Unknown',
          email: 'Unknown email'
        });
        setImageError(true);
      });
  }, []);

  if (!profile) {
    return <View className="w-14 h-14 rounded-full bg-gray-200" />
  }

  const showPlaceholder = imageError || !profile.pictureUrl;

  return (
        <View className="items-center justify-center mr-2">
            {showPlaceholder ? (
              <Image
                source={DEFAULT_IMAGE_URL}
                className={imageClass}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={{ uri: profile.pictureUrl! }}
                className={imageClass}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
            
        </View>
    );
}