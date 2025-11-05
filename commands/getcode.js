import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import config from "../config.json" with { type: "json" };
import { putCode } from "../utils/store.js";
import { makeCode } from "../utils/codegen.js";
import { hit } from "../utils/ratelimit.js";

const UI = {
  dm: {
    color: "#60A5FA",
    title: "Your Magic Key",
    description: (code) => `**Code:** \`${code}\`\nValid for **${config.codeTtlMin} minutes** ${config.emojis.stars}\n\nNext step: go to <#${config.channels.verify}> and run:\n\`/verify ${code}\``,
    footer: "Keep this code private • Auto-deletes in 5 minutes",
    imageUrl: ""
  },
  confirm: {
    color: "#60A5FA",
    title: "Sent!",
    description: `${config.emojis.stars} Check your DMs. If you can’t see it, enable DMs and press again.`
  }
};

export const data = new SlashCommandBuilder().setName("getcode").setDescription("DM me a verification code (auto-deletes in 5 min)");

export async function execute(interaction){
  if(interaction.channelId !== config.channels.getCode) return interaction.reply({content:config.messages.wrongPlace,ephemeral:true});
  const m=await interaction.guild.members.fetch(interaction.user.id);
  if(m.roles.cache.has(config.roles.verified) && m.roles.cache.has(config.roles.member)) return interaction.reply({content:config.messages.alreadyVerifiedButton.replace("{name}",interaction.user.username),ephemeral:true});

  const rl = hit(interaction.user.id, 60_000);
  if (!rl.ok) {
    const s = Math.ceil(rl.retryAfterMs / 1000);
    return interaction.reply({ content: `Too fast — try again in **${s}s**.`, ephemeral: true });
  }

  const code = makeCode(config.codeLength); const expiresAt = Date.now() + config.codeTtlMin*60*1000;
  try{
    const emb=new EmbedBuilder().setColor(0x60A5FA).setTitle(UI.dm.title).setDescription(UI.dm.description(code)).setFooter({text:UI.dm.footer});
    if(UI.dm.imageUrl) emb.setImage(UI.dm.imageUrl);
    const dm=await interaction.user.send({embeds:[emb]});
    setTimeout(()=>dm.delete().catch(()=>{}), config.dmDeleteAfterSec*1000);
  }catch{
    if (config.toggles.fallbackEphemeralCode){
      const shortTTL=60*1000; const expiresEp = Date.now()+shortTTL;
      putCode({userId:interaction.user.id, code, expiresAt: expiresEp});
      return interaction.reply({ content: `DMs closed. One-time code (60s): \`${code}\` — use \`/verify ${code}\`.`, ephemeral: true });
    }
    return interaction.reply({content:"Open your DMs first, then press again.",ephemeral:true});
  }

  putCode({userId:interaction.user.id, code, expiresAt});

  const ok=new EmbedBuilder().setColor(0x60A5FA).setTitle(UI.confirm.title).setDescription(UI.confirm.description);
  return interaction.reply({embeds:[ok],ephemeral:true});
}