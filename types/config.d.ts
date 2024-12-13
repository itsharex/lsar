interface Player {
  path: string;
  args: string[];
}

interface Config {
  dark_mode: "dark" | "light" | "system";
  transparent: boolean;
  player: Player;
  platform: { bilibili: { cookie: string } };
}
