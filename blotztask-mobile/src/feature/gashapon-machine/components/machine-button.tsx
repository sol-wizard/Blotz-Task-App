import React from "react";
import { StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ASSETS } from "@/shared/constants/assets";

type MachineButtonProps = {
  // 父组件持有的累计角度（总共已经被拧了多少度）
  totalRotation: SharedValue<number>;

  // 用户松手时回调
  // deltaThisTurn: 这一次从按下到松手实际拧了多少度（正=顺时针，负=逆时针）
  // newTotal: 松手后累计角度
  onRelease?: (deltaThisTurn: number, newTotal: number) => void;
};

const SIZE = 120;

export const MachineButton: React.FC<MachineButtonProps> = ({ totalRotation, onRelease }) => {
  // 本次手势的临时旋转（松手后会清零）
  const dragRotation = useSharedValue(0);

  // 松手时叠加用：按下时的 totalRotation 快照
  const startTotalRotation = useSharedValue(0);

  // ---- 角度 unwrap 相关的状态 ----
  // 上一帧的原始角度（-180 ~ 180）
  const prevRawAngle = useSharedValue(0);

  // 当前“连续角度”，已消除跳变，比如可以走到 250°, 720°, ...
  const unwrappedFingerAngle = useSharedValue(0);

  // 手指按下那一刻的连续角度，后面用它当 reference
  const startUnwrappedAngle = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      // 以控件中心为(0,0)来算手指角度
      const centerX = SIZE / 2;
      const centerY = SIZE / 2;

      const dx = e.x - centerX;
      const dy = e.y - centerY;

      // atan2 返回弧度 -> 转成角度，范围是 -180 ~ 180
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI;

      // 初始化 unwrap tracker
      prevRawAngle.value = angleDeg;
      unwrappedFingerAngle.value = angleDeg;
      startUnwrappedAngle.value = angleDeg;

      // 记录下这次手势开始前的总角度
      startTotalRotation.value = totalRotation.value;

      // 当前手势增量清零
      dragRotation.value = 0;
    })
    .onUpdate((e) => {
      const centerX = SIZE / 2;
      const centerY = SIZE / 2;

      const dx = e.x - centerX;
      const dy = e.y - centerY;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI; // -180 ~ 180

      // 1. 计算当前角度和上一帧的差
      let diff = angleDeg - prevRawAngle.value;

      // 2. 处理跨越 -180/180 边界时的跳变
      //    例子：从 +179° 到 -179°，其实是顺时针 +2°，不是 -358°
      if (diff > 180) {
        diff -= 360;
      } else if (diff < -180) {
        diff += 360;
      }

      // 3. 把修正后的差值累加到“连续角度”上
      unwrappedFingerAngle.value = unwrappedFingerAngle.value + diff;

      // 4. 存下当前原始角度，供下一帧比较
      prevRawAngle.value = angleDeg;

      // 5. 这一次手势相对于按下时的实际转动量
      const deltaThisTurn = unwrappedFingerAngle.value - startUnwrappedAngle.value;

      dragRotation.value = deltaThisTurn;
    })
    .onEnd(() => {
      // 计算新的累计角度
      const newTotal = startTotalRotation.value + dragRotation.value;
      const deltaThisTurn = dragRotation.value;

      // 累计角度写回父组件传进来的 sharedValue
      totalRotation.value = newTotal;

      // 清掉本次增量
      dragRotation.value = 0;

      // 回调父组件（比如触发掉扭蛋逻辑）
      if (onRelease) {
        runOnJS(onRelease)(deltaThisTurn, newTotal);
      }
    });

  // 最终展示出来的旋钮角度 = 历史累计角度 + 当前本次手势增量
  const animatedStyle = useAnimatedStyle(() => {
    const currentDeg = totalRotation.value + dragRotation.value;
    return {
      transform: [
        {
          rotate: `${currentDeg}deg`,
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={styles.wrapper}>
        <Animated.View style={[styles.dial, animatedStyle]}>
          <Image source={ASSETS.turnKnobButton} style={styles.image} resizeMode="contain" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  dial: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SIZE,
    height: SIZE,
  },
});
