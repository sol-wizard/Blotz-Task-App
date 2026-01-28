import { Image } from "expo-image";

export const CapsuleToyRenderer = (props: any) => {
  const BALL_RADIUS = 20;
  const { body, texture } = props;
  const { position, angle } = body;
  const x = position.x - BALL_RADIUS;
  const y = position.y - BALL_RADIUS * 2;

  return (
    <Image
      source={texture}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: BALL_RADIUS * 3,
        height: BALL_RADIUS * 3,
        zIndex: Math.round(body.position.y),
        transform: [{ rotate: `${angle}rad` }],
      }}
      resizeMode="cover"
    />
  );
};
