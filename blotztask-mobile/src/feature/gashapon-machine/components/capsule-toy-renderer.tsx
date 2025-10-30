import { Image } from "react-native";

export const CapsuleToyRenderer = (props: any) => {
  const BALL_RADIUS = 30;
  const { body, texture } = props;
  const x = body.position.x - BALL_RADIUS;
  const y = body.position.y - BALL_RADIUS;

  return (
    <Image
      source={texture}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: BALL_RADIUS * 2,
        height: BALL_RADIUS * 2,
        borderRadius: BALL_RADIUS,
      }}
      resizeMode="contain"
    />
  );
};
