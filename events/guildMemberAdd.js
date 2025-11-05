import { EmbedBuilder } from "discord.js";
import config from "../config.json" with { type: "json" };
import { isStickyVerified } from "../utils/store.js";

const UI = {
  enabled: config.toggles.welcomeOnJoin,
  color: "#9e00fa",
  author: { name: "Our Name Server!", iconUrl: "" },
  title: "Welcome°·☆",
  description: (member) => `ʚɞ  Welcome <@${member.id}> to **${member.guild.name}**! ʚɞ\nSay hi in <#${config.channels.welcome}> ${config.emojis.stars}`,
  thumbnailMode: "avatar",
  imageUrl: "https://cdn.discordapp.com/attachments/1404645711597010986/1412334167865167953/green-landscape-against-dramatic-sky.jpg?ex=68b7ea31&is=68b698b1&hm=3c1b5358d839e0d2db61daea6ab0af78af9723b8e86690b7b65ad4b39706bdd8&",
  fields: [
    { name: "Start Here", value: `• <#${config.channels.welcome}> · Rules\n• <#${config.channels.getCode}> · Get Code`, inline: true },
    { name: "Get Social", value: `• <#${config.channels.verify}> · Verify\n• <#${config.channels.chat}> · Chat`, inline: true }
  ],
  footer: { text: "Be kind · Have fun · Stay hydrated", iconUrl: "" }
};

export default async function onGuildMemberAdd(member){
  if(isStickyVerified(member.id)){
    await member.roles.add([config.roles.member, config.roles.verified]).catch(()=>{});
  } else if(config.autoAssignOnJoin && config.roles?.member){
    await member.roles.add(config.roles.member).catch(()=>{});
  }

  if(!UI.enabled) return;
  const chId=config.channels?.welcome; if(!chId) return;
  const channel=await member.guild.channels.fetch(chId).catch(()=>null); if(!channel) return;

  const emb=new EmbedBuilder().setColor(0x9e00fa).setTitle(UI.title).setDescription(UI.description(member));
  if(UI.author?.name) emb.setAuthor({ name: UI.author.name, iconURL: UI.author.iconUrl || undefined });
  if(UI.thumbnailMode==="avatar") emb.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
  if(UI.imageUrl) emb.setImage(UI.imageUrl);
  if(UI.fields?.length) emb.addFields(...UI.fields);
  if(UI.footer?.text) emb.setFooter({ text: UI.footer.text, iconURL: UI.footer.iconUrl || undefined });

  await channel.send({ embeds:[emb], content:`<@${member.id}>` });
}
