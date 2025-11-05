import { SlashCommandBuilder } from "discord.js";
import config from "../config.json" with { type: "json" };
import { purgeExpired, loadStore, setSetting } from "../utils/store.js";

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Owner tools")
  .addSubcommand(s=>s.setName("clean_expired").setDescription("Purge expired verification codes"))
  .addSubcommand(s=>s.setName("stats").setDescription("Show verification counters"))
  .addSubcommand(s=>s.setName("setwelcomebg").setDescription("Set welcome bg id (used for image render)").
    addStringOption(o=>o.setName("id").setDescription("Background ID used in welcomeImage.baseUrl").setRequired(true)));

export async function execute(interaction){
  if(interaction.user.id !== config.ownerId) return interaction.reply({content:"Owner only.", ephemeral:true});

  const sub = interaction.options.getSubcommand();
  if (sub === "clean_expired"){
    const r = purgeExpired();
    return interaction.reply({ content: `Purged **${r.removed}** expired code(s). Left: ${r.left}.`, ephemeral: true });
  }
  if (sub === "stats"){
    const db = loadStore();
    const totalSticky = Object.keys(db.sticky||{}).length;
    const activeCodes = (db.entries||[]).filter(e=>!e.used).length;
    return interaction.reply({ content: `Stats:\n• Sticky verified: **${totalSticky}**\n• Active codes: **${activeCodes}**`, ephemeral: true });
  }
  if (sub === "setwelcomebg"){
    const id = interaction.options.getString("id");
    setSetting("welcomeBgId", id);
    return interaction.reply({ content: `Welcome background set to **${id}**.`, ephemeral: true });
  }
}
