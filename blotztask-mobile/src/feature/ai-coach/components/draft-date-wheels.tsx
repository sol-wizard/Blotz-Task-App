import { useCallback } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";
import { DatePicker, type PickerItem, type RenderItemProps } from "@quidone/react-native-wheel-picker";

const ITEM_HEIGHT = 40;
const ORDER = ["year", "month", "date"] as const;
const PAST_COLOR = "#D1D5DB";

const TEXT_STYLE: TextStyle = { fontSize: 20, color: "#1E1E1E" };

type WheelItem = RenderItemProps<PickerItem<number>>;

/**
 * Light grey band behind the selected row of a 5-row wheel. The wheel library's own band (black at 5%,
 * drawn over the text) doesn't show in this app, so the coach sheet draws this one instead.
 */
export function WheelBand({ itemHeight }: { itemHeight: number }) {
  return (
    <View pointerEvents="none" className="absolute left-0 right-0 rounded-[15px] bg-[#F1F1F3]"
      style={{ top: itemHeight * 2, height: itemHeight }} />
  );
}

function WheelText({ label, style, past }: { label: string; style: StyleProp<TextStyle>; past: boolean }) {
  return (
    <Text style={[{ textAlign: "center", lineHeight: ITEM_HEIGHT }, style, past && { color: PAST_COLOR }]}>
      {label}
    </Text>
  );
}

/**
 * Year · Month · Day wheels, in that order in every language. Months and days before `min` show grey;
 * the picker itself snaps a pick outside `min`..`max` back inside, so a grey item springs back to `min`.
 * Dates are yyyy-MM-dd.
 */
export function DraftDateWheels({ value, min, max, locale, onChange }: {
  value: string;
  min: string;
  max: string;
  /** BCP 47 tag for month names, e.g. "en" or "zh-CN". */
  locale: string;
  onChange: (date: string) => void;
}) {
  const [year, month] = value.split("-").map(Number);
  const [minYear, minMonth, minDay] = min.split("-").map(Number);
  // The picker does new Date(value): a bare yyyy-MM-dd is read as UTC midnight, the day before west of UTC.
  const local = (date: string) => `${date}T00:00:00`;

  // Month values are 0–11, day values 1–31.
  const renderMonth = useCallback(({ item, itemTextStyle }: WheelItem) => (
    <WheelText label={item.label ?? String(item.value)} style={itemTextStyle}
      past={year === minYear && item.value + 1 < minMonth} />
  ), [year, minYear, minMonth]);
  const renderDay = useCallback(({ item, itemTextStyle }: WheelItem) => (
    <WheelText label={String(item.value)} style={itemTextStyle}
      past={year === minYear && month === minMonth && item.value < minDay} />
  ), [year, month, minYear, minMonth, minDay]);

  return (
    <View>
      <WheelBand itemHeight={ITEM_HEIGHT} />
      <DatePicker
        date={local(value)}
        minDate={local(min)}
        maxDate={local(max)}
        locale={locale}
        itemHeight={ITEM_HEIGHT}
        visibleItemCount={5}
        itemTextStyle={TEXT_STYLE}
        enableScrollByTapOnItem
        onDateChanged={({ date }) => onChange(date)}
        renderYear={() => <DatePicker.Year width={76} renderOverlay={null} />}
        renderMonth={() => <DatePicker.Month width={124} renderOverlay={null} renderItem={renderMonth} />}
        renderDate={() => <DatePicker.Date width={56} renderOverlay={null} renderItem={renderDay} />}
      >
        {({ dateNodes }) => ORDER.map((type) => dateNodes.find((node) => node.type === type)?.node)}
      </DatePicker>
    </View>
  );
}
