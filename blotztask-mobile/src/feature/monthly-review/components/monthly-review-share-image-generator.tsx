import { useEffect, useRef } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { MonthlyReviewShareCard } from "./monthly-review-share-card";

type Props = {
  displayMonth: string;
  recipientName: string;
  body: string;
  onGenerated: (uri: string) => void;
  onError: (error: unknown) => void;
};

export function MonthlyReviewShareImageGenerator({
  displayMonth,
  recipientName,
  body,
  onGenerated,
  onError,
}: Props) {
  const cardRef = useRef<View>(null);
  const hasCapturedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const generate = async () => {
      try {
        if (hasCapturedRef.current) {
          return;
        }

        hasCapturedRef.current = true;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        if (!cardRef.current || !isActive) {
          return;
        }

        const uri = await captureRef(cardRef.current, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });

        if (isActive) {
          onGenerated(uri);
        }
      } catch (error: unknown) {
        if (isActive) {
          onError(error);
        }
      }
    };

    void generate();

    return () => {
      isActive = false;
    };
  }, [onError, onGenerated]);

  return (
    <View
      pointerEvents="none"
      className="absolute left-0 top-0 -z-10"
      collapsable={false}
    >
      <View ref={cardRef} collapsable={false}>
        <MonthlyReviewShareCard
          displayMonth={displayMonth}
          recipientName={recipientName}
          body={body}
        />
      </View>
    </View>
  );
}
