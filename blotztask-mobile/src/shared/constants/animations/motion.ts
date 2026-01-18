import {
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";

const _damping = 60;
const _stiffness = 400;

export const MotionAnimations = {
  upEntering: FadeInUp.springify().damping(_damping),
  leftEntering: FadeInLeft.springify().damping(_damping),
  rightEntering: FadeInRight.springify().damping(_damping),
  outExiting: FadeOut.springify().damping(_damping),
  leftExiting: FadeOutLeft.springify().damping(_damping),
  rightExiting: FadeOutRight.springify().damping(_damping),
  layout: LinearTransition.springify().stiffness(_stiffness).damping(_damping),
};
