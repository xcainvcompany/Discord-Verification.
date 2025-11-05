import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import config from "../config.json" with { type: "json" };

const UI = {
  color: "#9900ff",
  title: "⋆˚࿔ Welcome 𝜗𝜚˚⋆ Verification Lounge── .✦",
  description: "Quick check-in to unlock the server.",
  imageUrl: "https://cdn.discordapp.com/attachments/1404645711597010986/1412298969861853236/getcode.jpg",
  steps: [
    "Tap **Get Code** (button below)",
    "Open your DMs — grab the 6-char code",
    `Go to <#${config.channels.verify}> and run \`/verify <code>\``,
    `Done — roles applied automatically ${config.emojis.stars}`
  ],
  perks: ["All channels", "Role perks", "Events & drops"],
  buttonLabel: "Get Code",
  buttonEmoji: config.emojis.button
};

export const data = new SlashCommandBuilder().setName("panel").setDescription("Post the verification panel (owner only)");

const hexToInt = (hex)=>{ try{return parseInt(String(hex).replace("#",""),16)||0x5865F2;}catch{return 0x5865F2;} };

export async function execute(interaction){
  if(interaction.user.id !== config.ownerId) return interaction.reply({content:"Only owner can use this.",ephemeral:true});
  if(interaction.channelId !== config.channels.getCode) return interaction.reply({content:"Run this in the Get Code channel.",ephemeral:true});

  const stepsBlock = UI.steps.map((s,i)=>`${i+1}. ${s}`).join("\n");
  const perksBlock = UI.perks?.length ? UI.perks.map(p=>`• ${p}`).join("\n") : "";

  const embed = {
    color: hexToInt(UI.color),
    title: UI.title,
    description: UI.description,
    image: UI.imageUrl ? { url: UI.imageUrl } : undefined,
    fields: [
      { name: "How it works", value: stepsBlock, inline: false },
      ...(perksBlock ? [{ name: "Perks", value: perksBlock, inline: false }] : [])
    ]
  };

  const btn = new ButtonBuilder().setCustomId("getcode_btn").setLabel(UI.buttonLabel).setStyle(ButtonStyle.Primary);
  const be = UI.buttonEmoji;
  if (be){ if (typeof be === "string") btn.setEmoji(be); else if (be.id) btn.setEmoji({ id: be.id, name: be.name || undefined, animated: !!be.animated }); }
  const row = new ActionRowBuilder().addComponents(btn);

  await interaction.reply({content:"Panel posted ✔️",ephemeral:true});
  await interaction.channel.send({ embeds:[embed], components:[row] });
}