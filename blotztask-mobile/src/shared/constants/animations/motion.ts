import { FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";

const _damping = 60;
const _stiffness = 400;

export const MotionAnimations = {
  entering: FadeInUp.springify().damping(_damping),
  exiting: FadeOut.springify().damping(_damping),
  layout: LinearTransition.springify().stiffness(_stiffness).damping(_damping),
};
