import { Text, TextInput } from "react-native";

type WithDefaultProps = { defaultProps?: { allowFontScaling?: boolean } };

(Text as unknown as WithDefaultProps).defaultProps = {
  ...(Text as unknown as WithDefaultProps).defaultProps,
  allowFontScaling: false,
};

(TextInput as unknown as WithDefaultProps).defaultProps = {
  ...(TextInput as unknown as WithDefaultProps).defaultProps,
  allowFontScaling: false,
};
