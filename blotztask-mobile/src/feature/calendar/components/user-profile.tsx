import { View, Image} from "react-native";
import { useState, useEffect } from "react";
import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { IMAGES } from "@/shared/constants/assets";
import { fetchUserProfile } from "@/shared/services/user-service"; 


const DEFAULT_IMAGE_URL = IMAGES.blotzIcon; 

export default function UserProfile() {

  const [profile, setProfile] = useState<UserProfileDTO | null>(null);



const loadUserProfile = async () => {
  try {
    const data = await fetchUserProfile();
    setProfile(data);
    
  }catch(error){
    console.log("Could not render profile (API or Network Error):", error)
    setProfile({
      pictureUrl: null,
      displayName: 'Unknown',
      email: 'Unknown email'
    });
  }
}

useEffect(() => {
  loadUserProfile();
}, [])

  if (!profile) {
    return <View className="w-14 h-14 rounded-full bg-gray-200" />
  }

  const showPlaceholder =  !profile.pictureUrl;

  return (
        <View className="items-center justify-center mr-2">
            {showPlaceholder ? (
              <Image
                source={DEFAULT_IMAGE_URL}
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <Image
                source={{ uri: profile.pictureUrl! }}
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
                onError={() => {
                  setProfile(p => ({
                    ...p!,
                    pictureUrl: null
                  }));
                }}
              />
            )}
            
        </View>
    );
}