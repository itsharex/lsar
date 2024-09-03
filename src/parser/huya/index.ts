import { computeMD5, debug, get, info, post } from "~/command";
import { NOT_LIVE } from "..";
import LiveStreamParser from "../base";

interface CacheProfileOffData {
  liveStatus: "OFF";
}

interface CacheProfileReplayData {
  liveStatus: "REPLAY";
}

interface CacheProfileOnData {
  liveStatus: "ON";
  stream: {
    baseSteamInfoList: {
      sCdnType: keyof typeof cdn;
      sStreamName: string;
      sFlvUrl: string;
      sFlvAntiCode: string;
      sFlvUrlSuffix: string;
      sHlsUrl: string;
      sHlsAntiCode: string;
      sHlsUrlSuffix: string;
      newCFlvAntiCode: string;
    }[];
  };
}

type CacheProfileData =
  | CacheProfileOffData
  | CacheProfileReplayData
  | CacheProfileOnData;

interface CacheProfile {
  status: number;
  message: string;
  data: CacheProfileData & {
    liveData: {
      nick: string;
      gameFullName: string;
      introduction: string;
    };
  };
}

const cdn = {
  AL: "阿里",
  AL13: "阿里13",
  TX: "腾讯",
  HW: "华为",
  HS: "火山",
  WS: "网宿",
} as const;

const LOG_REFIX = "huya";

class HuyaParser extends LiveStreamParser {
  baseURL = "https://m.huya.com/";
  private pageURL = "";
  private headers: Record<string, string>;

  constructor(roomID: number, url = "") {
    super(roomID, "https://m.huya.com/");
    this.pageURL = url;
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    };
  }

  async parse(): Promise<ParsedResult | typeof NOT_LIVE | Error> {
    try {
      const roomID = await this.getFinalRoomID();
      if (roomID instanceof Error) return roomID;

      const result = await this.getRoomProfile(roomID);
      return result;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  private async getFinalRoomID() {
    let url: string;
    if (this.roomID) {
      url = this.roomURL;
    } else {
      url = this.pageURL;
    }

    const { body: html } = await get<string>(url, this.headers);

    const ptn = /stream: (\{.+"iFrameRate":\d+\})/;

    const streamStr = ptn.exec(html)?.[1];
    if (!streamStr) {
      return Error(
        `获取 streamStr 失败, 可能因为网页解码错误, 房间号: ${this.roomID}`,
      );
    }

    const stream = JSON.parse(streamStr);
    const roomID = stream.data[0].gameLiveInfo.profileRoom as string;
    info(LOG_REFIX, `真实房间 id：${roomID}`);

    return roomID;
  }

  private async getRoomProfile(roomID: string) {
    const { body: text } = await get<string>(
      `https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid=${roomID}`,
      this.headers,
    );

    const profile = JSON.parse(text) as CacheProfile;

    if (profile.status !== 200) {
      return Error(profile.message);
    }

    const {
      liveStatus,
      liveData: { nick, gameFullName, introduction },
    } = profile.data;

    debug(LOG_REFIX, `房间状态：${liveStatus}`);

    if (liveStatus === "REPLAY") {
      return Error("此间正在重播，本程序不解析重播视频源");
    }

    if (liveStatus === "OFF") {
      return NOT_LIVE;
    }

    const { baseSteamInfoList } = profile.data.stream;
    const uid = await this.getAnonymousUid();

    const parsedResult: ParsedResult = {
      platform: "huya",
      links: await this.getStreamLinks(baseSteamInfoList, uid),
      title: introduction,
      anchor: nick,
      roomID: Number(roomID),
      category: gameFullName,
    };

    return parsedResult;
  }

  private async getStreamLinks(
    baseSteamInfoList: CacheProfileOnData["stream"]["baseSteamInfoList"],
    uid: string,
  ): Promise<string[]> {
    const links: string[] = [];
    for (const item of baseSteamInfoList) {
      if (item.sFlvAntiCode && item.sFlvAntiCode.length > 0) {
        const anticode = await this.parseAnticode(
          item.sFlvAntiCode,
          uid,
          item.sStreamName,
        );
        const url = `${item.sFlvUrl}/${item.sStreamName}.${item.sFlvUrlSuffix}?${anticode}`;
        links.push(url);
      }
      if (item.sHlsAntiCode && item.sHlsAntiCode.length > 0) {
        const anticode = await this.parseAnticode(
          item.sHlsAntiCode,
          uid,
          item.sStreamName,
        );
        const url = `${item.sHlsUrl}/${item.sStreamName}.${item.sHlsUrlSuffix}?${anticode}`;
        links.push(url);
      }
    }
    return links;
  }

  private async getAnonymousUid() {
    const url = "https://udblgn.huya.com/web/anonymousLogin";
    const json = {
      appId: 5002,
      byPass: 3,
      context: "",
      version: "2.4",
      data: {},
    };

    const { body: obj } = await post<{ data: { uid: string } }>(
      url,
      JSON.stringify(json),
      "json",
    );

    return obj.data.uid;
  }

  private newUuid() {
    const now = new Date().getTime();
    const rand = Math.floor(Math.random() * 1000) | 0;
    return ((now % 10000000000) * 1000 + rand) % 4294967295;
  }

  private async parseAnticode(code: string, uid: string, streamname: string) {
    const q = {} as Record<string, [string]>;
    for (const [k, v] of new URLSearchParams(code)) {
      q[k] = [v];
    }
    q.ver = ["1"];
    q.sv = ["2110211124"];

    q.seqid = [String(Number.parseInt(uid) + new Date().getTime())];
    console.log("seqid", q.seqid);

    q.uid = [uid];
    q.uuid = [String(this.newUuid())];
    console.log("uuid", q.uuid);

    const ss = await computeMD5(`${q.seqid[0]}|${q.ctype[0]}|${q.t[0]}`);
    console.log("ss", ss);

    q.fm[0] = Buffer.from(q.fm[0], "base64")
      .toString("utf-8")
      .replace("$0", q.uid[0])
      .replace("$1", streamname)
      .replace("$2", ss)
      .replace("$3", q.wsTime[0]);

    q.wsSecret[0] = await computeMD5(q.fm[0]);
    console.log("wsSecret", q.wsSecret);

    delete q.fm;
    if ("txyp" in q) {
      delete q.txyp;
    }

    const queryString = Object.entries(q)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value[0])}`,
      )
      .join("&");

    return queryString;
  }
}

function parseRoomID(input: string | number): number {
  if (typeof input === "number") return input;

  const trimmedInput = input.trim();
  const parsedValue = Number.parseInt(trimmedInput);

  if (!Number.isNaN(parsedValue)) {
    return parsedValue;
  }

  try {
    const url = new URL(trimmedInput);
    const basepath = url.pathname.slice(1);
    return Number.parseInt(basepath);
  } catch {
    throw new Error("Invalid input: not a number or valid URL");
  }
}

export default function createHuyaParser(input: string | number): HuyaParser {
  const roomID = parseRoomID(input);
  return new HuyaParser(roomID);
}
