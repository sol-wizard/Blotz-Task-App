interface DividerProps {
  text: string;
}
const SectionHeading = ({ text }: DividerProps) => {
  return (
    <div className="flex items-center space-x-7">
      <p className="font-hind font-semibold text-[25px] leading-[30px] text-primary-dark -tracking-[0.41]">
        {text}
      </p>
    </div>
  );
};

export default SectionHeading;
