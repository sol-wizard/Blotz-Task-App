import { BottomSheetBackdrop, BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

export const renderBottomSheetBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    appearsOnIndex={0}
    disappearsOnIndex={-1}
    pressBehavior="close"
    opacity={0.5}
  />
);
