import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from "discord.js";
import config from "../config.json" with { type: "json" };
import { getCode, markUsed, markStickyVerified } from "../utils/store.js";
import { renderWelcomeCard } from "../utils/welcome_image.js";

const UI = {
  success: {
    color: "#9e00fa",
    title: `Verification Complete ${config.emojis.verify_black}`,
    description: (user) => `Welcome aboard, ${user}!\nYou now have: <@&${config.roles.member}> + <@&${config.roles.verified}>`
  },
  errors: {
    baseColor: "#9e00fa",
    wrongChannel: { title: "Not here, bestie", desc: "Use this in the **Verify** channel." },
    noCode:      { title: "No code found", desc: "Tap the button in Get Code channel or run \`/getcode\` again." },
    expired:     { title: "Code expired", desc: "Ask for a new one — they’re quick to refresh." },
    mismatch:    { title: "That ain’t it", desc: "The code doesn’t match. Copy-paste from DM." }
  },

  announce: {
    color: "#9e00fa",
    author: { name: "Verification · Status", iconUrl: "" },
    title: () => `${config.emojis.verify_blue} Access Unlocked`,
    description: (user, guild) => `Welcome to **${guild}**, ${user}!\n${config.emojis.stars} You now have full access.`,
    thumbnailMode: "avatar",
    imageUrl: "https://cdn.discordapp.com/attachments/1377927164732641290/1380724989753561158/Picsart_25-06-01_14-53-37-404.jpg",
    fields: [
      { name: "Unlocks", value: `• <@&${config.roles.member}> + <@&${config.roles.verified}>\n• All channels opened`, inline: false },
      { name: "Next Steps", value: "• Read <#1377931004567748659>\n• Pick roles in <#1412259983340474448>", inline: false }
    ],
    links: {
      chat:    config.channels.chat    || config.channels.verify,
      support: config.channels.support || config.channels.welcome,
      labels:  { chat: "Open Chat", support: "Support Desk" }
    },
    footer: { text: "Access unlocked", iconUrl: "https://cdn.discordapp.com/attachments/1404645711597010986/1409127650466857000/profile_2919906.png" }
  }
};

export const data=new SlashCommandBuilder().setName("verify").setDescription("Submit your verification code").addStringOption(o=>o.setName("code").setDescription("The code you got from the bot").setRequired(true));

export async function execute(interaction){
  if(interaction.channelId !== config.channels.verify){
    const e=new EmbedBuilder().setColor(parseInt(UI.errors.baseColor.replace("#",""),16)).setTitle(UI.errors.wrongChannel.title).setDescription(UI.errors.wrongChannel.desc);
    return interaction.reply({embeds:[e],ephemeral:true});
  }
  const m=await interaction.guild.members.fetch(interaction.user.id);
  if(m.roles.cache.has(config.roles.verified) && m.roles.cache.has(config.roles.member)){
    const emb=new EmbedBuilder().setColor(0x60A5FA).setTitle("Already verified").setDescription(config.messages.alreadyVerifiedSlash.replace("{name}",interaction.user.username));
    return interaction.reply({embeds:[emb],ephemeral:true});
  }
  const input=interaction.options.getString("code").trim().toUpperCase();
  const rec=getCode(interaction.user.id);
  if(!rec){ const e=new EmbedBuilder().setColor(parseInt(UI.errors.baseColor.replace("#",""),16)).setTitle(UI.errors.noCode.title).setDescription(UI.errors.noCode.desc); return interaction.reply({embeds:[e],ephemeral:true}); }
  if(Date.now()>rec.expiresAt){ const e=new EmbedBuilder().setColor(parseInt(UI.errors.baseColor.replace("#",""),16)).setTitle(UI.errors.expired.title).setDescription(UI.errors.expired.desc); return interaction.reply({embeds:[e],ephemeral:true}); }
  if(rec.code!==input){ const e=new EmbedBuilder().setColor(parseInt(UI.errors.baseColor.replace("#",""),16)).setTitle(UI.errors.mismatch.title).setDescription(UI.errors.mismatch.desc); return interaction.reply({embeds:[e],ephemeral:true}); }

  await m.roles.add([config.roles.member, config.roles.verified]).catch(()=>{});
  markUsed(interaction.user.id);
  markStickyVerified(interaction.user.id);

  // success (ephemeral)
  const ok=new EmbedBuilder().setColor(parseInt(UI.success.color.replace("#",""),16)).setTitle(UI.success.title).setDescription(UI.success.description(`${interaction.user}`));
  await interaction.reply({embeds:[ok],ephemeral:true});

  // public announce
  if(!config.toggles.announceOnVerify) return;
  const ch=await interaction.guild.channels.fetch(config.channels.verifiedAnnounce).catch(()=>null);
  if(ch){
    const a=new EmbedBuilder().setColor(parseInt(UI.announce.color.replace("#",""),16));

    if(UI.announce.author?.name) a.setAuthor({ name: UI.announce.author.name, iconURL: UI.announce.author.iconUrl || undefined });

    const titleVal=typeof UI.announce.title==="function"?UI.announce.title():UI.announce.title; if(titleVal) a.setTitle(titleVal);
    const descVal=typeof UI.announce.description==="function"?UI.announce.description(`${interaction.user}`, interaction.guild.name):UI.announce.description; if(descVal) a.setDescription(descVal);

    if(UI.announce.thumbnailMode==="avatar") a.setThumbnail(interaction.user.displayAvatarURL({ size: 256 }));
    if(UI.announce.imageUrl) a.setImage(UI.announce.imageUrl);

    const fields=[];
    if(UI.announce.fields?.length) fields.push(...UI.announce.fields);
    const quickLines = [
      UI.announce.links?.chat    ? `• <#${UI.announce.links.chat}> · Chat`     : null,
      UI.announce.links?.support ? `• <#${UI.announce.links.support}> · Support` : null
    ].filter(Boolean).join("\n");
    if(quickLines) fields.push({ name: "Quick Links", value: quickLines, inline: false });
    if(fields.length) a.addFields(...fields);

    if(UI.announce.footer?.text) a.setFooter({text:UI.announce.footer.text, iconURL:UI.announce.footer.iconUrl || undefined });

    const components = [];
    const row = new ActionRowBuilder();
    const mkUrl = (gid, cid) => `https://discord.com/channels/${gid}/${cid}`;
    if(UI.announce.links?.chat){
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(UI.announce.links.labels?.chat || "Open Chat").setURL(mkUrl(interaction.guild.id, UI.announce.links.chat)));
    }
    if(UI.announce.links?.support){
      row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(UI.announce.links.labels?.support || "Support Desk").setURL(mkUrl(interaction.guild.id, UI.announce.links.support)));
    }
    if(row.components.length) components.push(row);

    let files = undefined;
    try {
      const buf = await renderWelcomeCard(interaction.user.displayName || interaction.user.username);
      if (buf) files = [ new AttachmentBuilder(buf, { name: "welcome.png" }) ];
    } catch {}

    ch.send({ embeds:[a], components, files }).catch(()=>{});
  }

if (config.channels.logs) {
    const logCh = await interaction.guild.channels.fetch(config.channels.logs).catch(() => null);
    if (logCh) {
        logCh.send(
            `**Log Verifikasi**\n` +
            `Status: <a:Verification_blue:1404659981399101591> Done\n` +
            `User: ${interaction.user.tag}\n` +
            `ID: ${interaction.user.id}\n` +
            `Time: <t:${Math.floor(Date.now() / 1000)}:F>\n` +
            `About: Prvt code.`
        );
    }
}
}