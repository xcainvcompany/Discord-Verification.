import { REST, Routes } from "discord.js";
import fs from "fs"; import path from "path";
import config from "./config.json" with { type: "json" };
const commandsPath=path.resolve("commands"); const files=fs.readdirSync(commandsPath).filter(f=>f.endsWith(".js"));
const built=[]; for(const f of files){ const mod=await import(`./commands/${f}`); built.push(mod.data.toJSON()); }
const rest=new REST({version:"10"}).setToken(config.token);
await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: built });
console.log("[DEPLOY] Slash registered:", files.join(", "));