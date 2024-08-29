import { AiFillChrome, AiFillCopy, AiFillPlayCircle } from "solid-icons/ai";
import { createEffect, For, Show, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { insertHistory, open, play } from "~/command";
import { AppContext } from "~/context";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { platforms } from "~/parser";
import {
  LazyButton,
  LazyCol,
  LazyDivider,
  LazyFlex,
  LazyLabel,
  LazyRow,
  LazySpace,
  LazyTooltip,
} from "~/lazy";

const Result = (props: ParsedResult) => {
  const [{ refetchHistoryItems }] = useContext(AppContext)!;

  const [links, setLinks] = createStore<string[]>([]);

  createEffect(() => setLinks(props.links ?? []));

  const onPlay = async (index: number) => {
    await play(props.links[index]);

    // 解析出来的链接只能访问一次，访问后即删除
    setLinks((prev) => prev.filter((_, idx) => index !== idx));

    await insertHistory({
      id: 0,
      platform: props.platform,
      anchor: props.anchor,
      room_id: props.roomID,
      category: props.category,
      last_title: props.title,
      last_play_time: new Date(),
    });
    refetchHistoryItems();
  };

  return (
    <LazyFlex class="parsed-result" direction="vertical" gap={8}>
      <Show when={links.length}>
        <LazySpace justify="between">
          <h3>{props.title}</h3>

          <LazyTooltip text="浏览器中打开直播间" delay={1000}>
            <LazyButton
              icon={<AiFillChrome />}
              shape="circle"
              size="small"
              type="plain"
              onClick={() =>
                open(platforms[props.platform].roomBaseURL + props.roomID)
              }
            />
          </LazyTooltip>
        </LazySpace>

        <LazySpace gap={16}>
          <LazySpace>
            <LazyLabel>分类</LazyLabel>
            <span>{props.category ?? "无"}</span>
          </LazySpace>

          <LazySpace>
            <LazyLabel>主播</LazyLabel>
            <span>{props.anchor}</span>
          </LazySpace>
        </LazySpace>

        <LazyDivider
          dashed
          style={{ "--alley-color-split": "#fff", margin: "8px 0" }}
        />

        <div class="parsed-links">
          <For each={links}>
            {(link, index) => (
              <LazyRow>
                <LazyCol span={21} align="center">
                  <span class="link">{link}</span>
                </LazyCol>

                <LazyCol span={3} align="center" justify="end">
                  <LazyTooltip
                    text="播放此直播流"
                    delay={1000}
                    placement="bottom"
                  >
                    <LazyButton
                      icon={<AiFillPlayCircle />}
                      shape="circle"
                      size="small"
                      type="plain"
                      onClick={() => onPlay(index())}
                    />
                  </LazyTooltip>

                  <LazyTooltip text="复制链接" delay={1000} placement="bottom">
                    <LazyButton
                      icon={<AiFillCopy />}
                      shape="circle"
                      size="small"
                      type="plain"
                      onClick={() => writeText(link)}
                    />
                  </LazyTooltip>
                </LazyCol>
              </LazyRow>
            )}
          </For>
        </div>
      </Show>
    </LazyFlex>
  );
};

export default Result;
