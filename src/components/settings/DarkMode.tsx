import { children } from "solid-js";
import { LazyLabel, LazySpace, LazyTag } from "~/lazy";

interface DarkModeProps {
  mode: Config["dark_mode"];
  onChoice: (mode: Config["dark_mode"]) => void;
}

const modes: Array<{ value: Config["dark_mode"]; label: string }> = [
  { value: "light", label: "亮色" },
  { value: "dark", label: "暗色" },
  { value: "system", label: "跟随系统" },
];

const DarkMode = (props: DarkModeProps) => {
  const items = children(() =>
    modes.map((mode) => (
      <LazyTag
        onClick={() => props.onChoice(mode.value)}
        color={props.mode === mode.value ? "success" : "default"}
      >
        {mode.label}
      </LazyTag>
    )),
  );
  return (
    <LazySpace gap={16}>
      <LazyLabel>暗色模式</LazyLabel>

      <LazySpace gap={8}>{items()}</LazySpace>
    </LazySpace>
  );
};

export default DarkMode;
