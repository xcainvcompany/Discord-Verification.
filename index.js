import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } from "discord.js";
import fs from "fs"; import path from "path";
import config from "./config.json" with { type: "json" };
import onGuildMemberAdd from "./events/guildMemberAdd.js";
import { putCode, purgeExpired } from "./utils/store.js";
import { makeCode } from "./utils/codegen.js";
import { hit } from "./utils/ratelimit.js";

const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.DirectMessages], partials:[Partials.Channel]});
client.commands=new Collection();
for(const file of fs.readdirSync(path.resolve("commands")).filter(f=>f.endsWith(".js"))){
  const cmd=await import(`./commands/${file}`); client.commands.set(cmd.data.name, cmd);
}
client.once("ready",()=>console.log(`[BOT] Logged in as ${client.user.tag}`));
client.on("guildMemberAdd", onGuildMemberAdd);

setInterval(()=>{ const r=purgeExpired(); if(r.removed){ console.log(`[PURGE] Removed ${r.removed}, left ${r.left}`); } }, 300000);

client.on("interactionCreate", async (i)=>{
  try{
    if(i.isButton() && i.customId==="getcode_btn"){
      if(i.channelId !== config.channels.getCode) return i.reply({content: config.messages?.wrongPlace || "Use the right channel.", ephemeral:true});
      const m=await i.guild.members.fetch(i.user.id);
      if(m.roles.cache.has(config.roles.verified) && m.roles.cache.has(config.roles.member)){
        const msg=(config.messages?.alreadyVerifiedButton||"You’re already verified, {name}.").replace("{name}", i.user.username);
        return i.reply({content: msg, ephemeral: true});
      }
      const rl=hit(i.user.id, 60_000);
      if(!rl.ok){
        const s=Math.ceil(rl.retryAfterMs/1000);
        return i.reply({content:`Too fast — try again in **${s}s**.`,ephemeral:true});
      }
      const code=makeCode(config.codeLength); const expiresAt=Date.now()+config.codeTtlMin*60*1000;
      try{
        const emb=new EmbedBuilder()
          .setColor(0x60A5FA).setTitle("Your Magic Key")
          .setDescription(`**Code:** \`${code}\`\nValid for **${config.codeTtlMin} minutes** ${config.emojis.stars}\n\nNext step: go to <#${config.channels.verify}> and run:\n\`/verify ${code}\``)
          .setFooter({text:"Keep this code private • Auto-deletes in 5 minutes"});
        const dm=await i.user.send({embeds:[emb]});
        setTimeout(()=>dm.delete().catch(()=>{}), config.dmDeleteAfterSec*1000);
      }catch{
        if (config.toggles.fallbackEphemeralCode){
          const shortTTL=60*1000; const expiresEp=Date.now()+shortTTL;
          putCode({userId:i.user.id, code, expiresAt: expiresEp});
          return i.reply({ content: `DMs closed. One-time code (60s): \`${code}\` — use \`/verify ${code}\`.`, ephemeral: true });
        }
        return i.reply({content:"Open your DMs, then press again.",ephemeral:true});
      }
      putCode({userId:i.user.id, code, expiresAt});
      const ok=new EmbedBuilder().setColor(0x60A5FA).setTitle("Sent!").setDescription(`${config.emojis.stars} Check your DMs.`);
      return i.reply({embeds:[ok],ephemeral:true});
    }
    if(!i.isChatInputCommand()) return;
    const cmd=client.commands.get(i.commandName); if(!cmd) return; await cmd.execute(i);
  }catch(e){ console.error(e); if(i.deferred||i.replied) await i.followUp({content:"Something went wrong.",ephemeral:true}); else await i.reply({content:"Something went wrong.",ephemeral:true}); }
});

client.login(config.token);
