import { LazyLabel, LazySpace, LazySwitch } from "~/lazy";

interface TransparentProps {
  enabled: boolean;
  onSwitch: (enabled: boolean) => void;
}

const Transparent = (props: TransparentProps) => {
  return (
    <LazySpace gap={16}>
      <LazyLabel>窗口透明</LazyLabel>

      <LazySwitch checked={props.enabled} setChecked={props.onSwitch} />
    </LazySpace>
  );
};

export default Transparent;
