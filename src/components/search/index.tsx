import "./index.scss";
import { children, createSignal, For, useContext } from "solid-js";
import { platforms } from "~/parser";
import { AiOutlineCheck } from "solid-icons/ai";
import { AppContext } from "~/context";
import BiliCookieEditor from "./bili-cookie";
import {
  LazyButton,
  LazyDialog,
  LazyFlex,
  LazyInput,
  LazySpace,
  LazySpaceCompact,
  LazyTag,
} from "~/lazy";

const Search = () => {
  const [_, { setToast }, { config }, { setParsedResult }] =
    useContext(AppContext)!;

  const [input, setInput] = createSignal("");
  const [currentPlatform, setCurrentPlatform] = createSignal<Platform | null>(
    null,
  );

  const [loading, setLoading] = createSignal(false);

  const [showBilibiliCookieEditor, setShowBilibiliCookieEditor] =
    createSignal(false);

  const resetParseResult = () => setParsedResult(null);
  const resetInput = () => setInput("");

  const selectPlatform = (value: Platform) => {
    if (currentPlatform() === value) return;

    if (currentPlatform()) resetInput();

    setCurrentPlatform(value);
    resetParseResult();
  };

  const buttons = children(() => (
    <For each={Object.keys(platforms)}>
      {(key) => {
        const item = platforms[key as Platform];

        return (
          <LazyTag
            color={currentPlatform() === key ? "#87d068" : "default"}
            onClick={() => selectPlatform(key as Platform)}
          >
            {item.label}
          </LazyTag>
        );
      }}
    </For>
  ));

  const onParse = async () => {
    setLoading(true);

    const platform = currentPlatform();

    let result: ParsedResult | Error | null = null;

    if (platform === "bilibili") {
      if (!config()?.platform.bilibili.cookie.length) {
        setShowBilibiliCookieEditor(true);
      } else {
        result = await platforms.bilibili.parser(
          input(),
          config()!.platform.bilibili.cookie,
        );
      }
    } else {
      result = await platforms[platform!].parser(input());
    }

    if (result) {
      if (result instanceof Error) {
        setToast({ type: "error", message: result.message });
        setLoading(false);
        return;
      }

      setParsedResult(result);
    }

    setLoading(false);
  };

  return (
    <>
      <LazyFlex id="search" direction="vertical">
        <LazySpaceCompact>
          <LazyInput
            placeholder="输入房间号或直播间链接"
            value={input()}
            onInput={(v) => setInput(v)}
            disabled={loading()}
          />
          <LazyButton
            icon={<AiOutlineCheck />}
            isLoading={loading()}
            disabled={!currentPlatform() || !input().length}
            onClick={onParse}
          />
        </LazySpaceCompact>

        <LazySpace gap={8} style={{ "margin-top": "1rem" }}>
          {buttons()}
        </LazySpace>
      </LazyFlex>

      <LazyDialog
        class="bili-cookie-dialog"
        title="输入 B 站 cookie"
        show={showBilibiliCookieEditor()}
        onClose={() => setShowBilibiliCookieEditor(false)}
        maskClosable={false}
      >
        <BiliCookieEditor onCancel={() => setShowBilibiliCookieEditor(false)} />
      </LazyDialog>
    </>
  );
};

export default Search;
