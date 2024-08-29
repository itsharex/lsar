import { open } from "@tauri-apps/plugin-dialog";
import { createSignal, Show, useContext } from "solid-js";
import { writeConfigFile } from "~/command";
import { AppContext } from "~/context";
import {
  LazyButton,
  LazyDialog,
  LazyFlex,
  LazyLabel,
  LazySpace,
  LazyText,
} from "~/lazy";

const Settings = () => {
  const { config, refetchConfig } = useContext(AppContext)![2];

  const [path, setPath] = createSignal(config()?.player.path);

  const onSelectFile = async () => {
    const file = await open({
      multiple: false,
      directory: false,
    });
    setPath(file?.path);
  };

  const onCancel = () => {
    if (!config()?.player.path) {
      // TODO: 关闭程序
    } else {
      // TODO: 关闭设置对话框
    }
  };

  const onOk = async () => {
    const p = path();
    if (!p) return;

    const c = config()!; // 到这里时 config 不可能为 undefined
    c.player.path = p;

    await writeConfigFile(c);
    refetchConfig();
  };

  return (
    <LazyDialog
      show={!config()?.player.path}
      onClose={() => {}}
      maskClosable={false}
    >
      <LazyFlex direction="vertical" gap={8}>
        <LazySpace justify="around">
          <LazyLabel>播放器绝对路径</LazyLabel>

          <Show when={path()}>
            <LazyText type="secondary" style={{ "margin-right": "8px" }}>
              {path()}
            </LazyText>
          </Show>

          <LazyButton size="small" onClick={onSelectFile}>
            <Show when={!path()} fallback={"重新选择"}>
              选择文件
            </Show>
          </LazyButton>
        </LazySpace>

        <LazySpace justify="around">
          <LazyButton
            danger
            onClick={onCancel}
            disabled={!config()?.player.path || !path()}
          >
            取消
          </LazyButton>
          <LazyButton onClick={onOk} disabled={!path()}>
            确认
          </LazyButton>
        </LazySpace>
      </LazyFlex>
    </LazyDialog>
  );
};

export default Settings;
