interface Player {
  path: string;
  args: string[];
}

interface Config {
  dark_mode: "dark" | "light" | "system";
  player: Player;
  platform: { bilibili: { cookie: string } };
}
