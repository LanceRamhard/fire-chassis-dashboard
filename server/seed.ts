/**
 * seed.ts — runs once on first startup to create tables and insert default data.
 * Safe to call on every startup (uses INSERT OR IGNORE).
 */
import { sqlite, db } from "./storage";
import {
  chassisRequests, chassisConfigs, dropdownOptions, dependencyRules,
} from "@shared/schema";

// ─── Create tables (DDL) ──────────────────────────────────────────────────────
export function createTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chassis_requests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      config_name  TEXT    NOT NULL,
      manufacturer TEXT    NOT NULL,
      form_data    TEXT    NOT NULL,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chassis_configs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      manufacturer TEXT    NOT NULL,
      model_id     TEXT    NOT NULL,
      model_label  TEXT    NOT NULL,
      field_rules  TEXT,
      updated_at   INTEGER NOT NULL,
      UNIQUE(manufacturer, model_id)
    );

    CREATE TABLE IF NOT EXISTS dropdown_options (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      field_key  TEXT    NOT NULL UNIQUE,
      options    TEXT    NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dependency_rules (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      if_field             TEXT    NOT NULL,
      if_value             TEXT    NOT NULL,
      then_field           TEXT    NOT NULL,
      then_allowed_values  TEXT    NOT NULL,
      action               TEXT    NOT NULL DEFAULT 'filter',
      updated_at           INTEGER NOT NULL
    );
  `);

  // Idempotent migration: add `action` to dependency_rules for pre-existing DBs.
  const cols = sqlite.prepare(`PRAGMA table_info(dependency_rules)`).all() as { name: string }[];
  if (!cols.some(c => c.name === "action")) {
    sqlite.exec(`ALTER TABLE dependency_rules ADD COLUMN action TEXT NOT NULL DEFAULT 'filter'`);
  }
}

// ─── Default seed data ────────────────────────────────────────────────────────
const DEFAULT_CONFIGS = [
  // ── FREIGHTLINER ───────────────────────────────────────────────────────────
  { manufacturer: "freightliner", modelId: "m2_106",  modelLabel: "M2 106",
    fieldRules: { engines: ["l9","dd8"], transmissions: ["3000_evs","3500_evs"], hp: ["350","360","400","450"], frontAxles: ["12k","13k","14.6k","14.6k_AWD"], rearAxles: ["19k","21k","23k","24k"], cabs: ["regular","extended"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  { manufacturer: "freightliner", modelId: "m2_112",  modelLabel: "M2 112",
    fieldRules: { engines: ["l9","x12","dd8","dd13"], transmissions: ["3000_evs","3500_evs","4000_evs"], hp: ["350","360","400","450","500"], frontAxles: ["12k","13k","14.6k","16k","14.6k_AWD","16k_AWD"], rearAxles: ["19k","21k","23k","24k","26k","27k","30k"], cabs: ["regular","extended","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  { manufacturer: "freightliner", modelId: "108sd",   modelLabel: "108SD",
    fieldRules: { engines: ["l9","x12","x15","dd13"], transmissions: ["3000_evs","3500_evs","4000_evs","4500_evs"], hp: ["350","400","450","500","525","565"], frontAxles: ["14.6k","16k","18k","20k","14.6k_AWD","16k_AWD","18k_AWD"], rearAxles: ["23k","24k","26k","27k","30k","31k","33.5k","40k"], cabs: ["regular","extended","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  { manufacturer: "freightliner", modelId: "114sd",   modelLabel: "114SD",
    fieldRules: { engines: ["x12","x15","dd13","dd15"], transmissions: ["4000_evs","4500_evs"], hp: ["400","450","500","525","565","605"], frontAxles: ["16k","18k","20k","16k_AWD","18k_AWD","23k_AWD"], rearAxles: ["26k","27k","30k","31k","33.5k","40k","44k","46k","50k","52k"], cabs: ["regular","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  // ── INTERNATIONAL ──────────────────────────────────────────────────────────
  { manufacturer: "international", modelId: "mv_series", modelLabel: "MV Series",
    fieldRules: { engines: ["a26_400","a26_450","l9"], transmissions: ["3000_evs","3500_evs"], hp: ["350","400","450"], frontAxles: ["12k","14k","16k"], rearAxles: ["21k","23k","25k"], cabs: ["regular","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  { manufacturer: "international", modelId: "hv_series", modelLabel: "HV Series",
    fieldRules: { engines: ["a26_400","a26_450","a26_500","x12","x15"], transmissions: ["3000_evs","3500_evs","4000_evs"], hp: ["400","450","500","525"], frontAxles: ["14k","16k","18k","20k"], rearAxles: ["23k","25k","27k","30k","33k"], cabs: ["regular","extended","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  // ── KENWORTH ───────────────────────────────────────────────────────────────
  { manufacturer: "kenworth", modelId: "t370", modelLabel: "T370",
    fieldRules: { engines: ["px7","px9","l9"], transmissions: ["3000_evs","3500_evs"], hp: ["300","350","400"], frontAxles: ["12k","14k","16k"], rearAxles: ["21k","23k","25k"], cabs: ["regular","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  { manufacturer: "kenworth", modelId: "t470", modelLabel: "T470",
    fieldRules: { engines: ["px9","l9","x12"], transmissions: ["3000_evs","3500_evs","4000_evs"], hp: ["350","400","450","500"], frontAxles: ["14k","16k","18k"], rearAxles: ["23k","25k","27k","30k"], cabs: ["regular","extended","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  // ── PETERBILT ──────────────────────────────────────────────────────────────
  { manufacturer: "peterbilt", modelId: "348", modelLabel: "348",
    fieldRules: { engines: ["px7","px9","l9"], transmissions: ["3000_evs","3500_evs"], hp: ["300","350","400"], frontAxles: ["12k","14k","16k"], rearAxles: ["21k","23k","25k"], cabs: ["regular","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
  { manufacturer: "peterbilt", modelId: "365", modelLabel: "365",
    fieldRules: { engines: ["px9","l9","x12","x15"], transmissions: ["3000_evs","3500_evs","4000_evs"], hp: ["350","400","450","500"], frontAxles: ["14k","16k","18k"], rearAxles: ["23k","25k","27k","30k"], cabs: ["regular","extended","crew"], brakes: ["air_disc","drum"], apparatusTypes: ["pumper","tanker_pumper","tanker"] } },
];

const DEFAULT_DROPDOWNS = [
  { fieldKey: "engines",         options: [{id:"l9",label:"Cummins L9",code:"101"},{id:"x12",label:"Cummins X12",code:"101"},{id:"x15",label:"Cummins X15",code:"101"},{id:"dd8",label:"Detroit DD8",code:"101"},{id:"dd13",label:"Detroit DD13",code:"101"},{id:"dd15",label:"Detroit DD15",code:"101"},{id:"a26_400",label:"International A26 (400HP)",code:"101"},{id:"a26_450",label:"International A26 (450HP)",code:"101"},{id:"a26_500",label:"International A26 (500HP)",code:"101"},{id:"px7",label:"PACCAR PX-7",code:"101"},{id:"px9",label:"PACCAR PX-9",code:"101"}] },
  { fieldKey: "hp",              options: [{id:"300",label:"300 HP"},{id:"350",label:"350 HP"},{id:"360",label:"360 HP"},{id:"400",label:"400 HP"},{id:"450",label:"450 HP"},{id:"500",label:"500 HP"},{id:"525",label:"525 HP"},{id:"565",label:"565 HP"},{id:"605",label:"605 HP"}] },
  { fieldKey: "engineBrakes",    options: [{id:"exhaust_brake",label:"Exhaust Brake",code:"128"},{id:"jake_brake",label:"Jake Brake",code:"128"}] },
  { fieldKey: "transmissions",   options: [{id:"3000_evs",label:"Allison 3000 EVS",code:"342"},{id:"3500_evs",label:"Allison 3500 EVS",code:"342"},{id:"4000_evs",label:"Allison 4000 EVS",code:"342"},{id:"4500_evs",label:"Allison 4500 EVS",code:"342"}] },
  { fieldKey: "frontAxles",      options: [{id:"12k",label:"12,000 Lbs",code:"400"},{id:"13k",label:"13,000 Lbs",code:"400"},{id:"14k",label:"14,000 Lbs",code:"400"},{id:"14.6k",label:"14,600 Lbs",code:"400"},{id:"16k",label:"16,000 Lbs",code:"400"},{id:"18k",label:"18,000 Lbs",code:"400"},{id:"20k",label:"20,000 Lbs",code:"400"},{id:"14.6k_AWD",label:"14,000 Lbs AWD",code:"400"},{id:"16k_AWD",label:"16,000 Lbs AWD",code:"400"},{id:"18k_AWD",label:"18,000 Lbs AWD",code:"400"},{id:"23k_AWD",label:"23,000 Lbs AWD",code:"400"}] },
  { fieldKey: "rearAxles",       options: [{id:"19k",label:"19,000 Lbs",code:"420"},{id:"21k",label:"21,000 Lbs",code:"420"},{id:"23k",label:"23,000 Lbs",code:"420"},{id:"24k",label:"24,000 Lbs",code:"420"},{id:"25k",label:"25,000 Lbs",code:"420"},{id:"26k",label:"26,000 Lbs",code:"420"},{id:"27k",label:"27,000 Lbs",code:"420"},{id:"30k",label:"30,000 Lbs",code:"420"},{id:"31k",label:"31,000 Lbs",code:"420"},{id:"33k",label:"33,000 Lbs",code:"420"},{id:"33.5k",label:"33,500 Lbs",code:"420"},{id:"40k",label:"40,000 Lbs",code:"420"},{id:"44k",label:"44,000 Lbs",code:"420"},{id:"46k",label:"46,000 Lbs",code:"420"},{id:"50k",label:"50,000 Lbs",code:"420"},{id:"52k",label:"52,000 Lbs",code:"420"}] },
  { fieldKey: "cabs",            options: [{id:"regular",label:"Regular Cab",code:"829"},{id:"extended",label:"Extended Cab",code:"829"},{id:"crew",label:"Crew Cab",code:"829"}] },
  { fieldKey: "brakes",          options: [{id:"air_disc",label:"Air Disc Brakes"},{id:"drum",label:"Drum Brakes"}] },
  { fieldKey: "apparatusTypes",  options: [{id:"pumper",label:"Pumper"},{id:"tanker_pumper",label:"Tanker Pumper"},{id:"tanker",label:"Tanker"}] },
  { fieldKey: "driverSeats",     options: [{id:"911_air_ride",label:"911 Air Ride",code:"756"},{id:"911_nonsuspension",label:"911 Non-Suspension",code:"756"},{id:"bostrum_airride",label:"HO Bostrom Air Ride",code:"756"}] },
  { fieldKey: "officerSeats",    options: [{id:"911_Non-Suspension_1F1",label:"911 Non-Suspension 1F1",code:"760"},{id:"911_Air-Ride_1E7",label:"911 Air-Ride 1E7",code:"760"},{id:"911_2-Man_Bench_351",label:"911 2-Man Bench 351",code:"760"},{id:"911_SCBA_Air-Ride_ext_or_crew_cab_1E8",label:"911 SCBA Air-Ride (Ext/Crew) 1E8",code:"760"},{id:"911_SCBA_Non-Suspension_ext_or_crew_cab_1E9",label:"911 SCBA Non-Suspension (Ext/Crew) 1E9",code:"760"},{id:"HO_Bostrom_Air-Ride_1G6",label:"HO Bostrom Air-Ride 1G6",code:"760"},{id:"HO_Bostrom_Non-Suspension_149",label:"HO Bostrom Non-Suspension 149",code:"760"},{id:"HO_Bostrom_SCBA_Air-Ride_1EA",label:"HO Bostrom SCBA Air-Ride 1EA",code:"760"}] },
  { fieldKey: "rearSeats",       options: [{id:"2_911_SCBA_086",label:"2 × 911 SCBA 086",code:"762"},{id:"3_911_SCBA_1E9",label:"3 × 911 SCBA 1E9",code:"762"},{id:"3_911_bucket_170",label:"3 × 911 Bucket 170",code:"762"},{id:"3_HO_Bostrom_SCBA_1EC",label:"3 × HO Bostrom SCBA 1EC",code:"762"},{id:"2_HO_Bostrom_SCBA_1EB",label:"2 × HO Bostrom SCBA 1EB",code:"762"},{id:"2_HO_Bostrom_bucket_096",label:"2 × HO Bostrom Bucket 096",code:"762"}] },
  { fieldKey: "seatMaterials",   options: [{id:"cloth",label:"Cloth",code:"758"},{id:"vinyl",label:"Vinyl",code:"758"}] },
  { fieldKey: "sunVisors",       options: [{id:"no_sun_visor",label:"No Sun Visor",code:"764"},{id:"stainless",label:"Stainless",code:"764"},{id:"painted",label:"Painted",code:"764"}] },
  { fieldKey: "ramMounts",       options: [{id:"no_ram_mount",label:"No Ram Mount"},{id:"ram_mount_overhead_console",label:"Overhead Console"},{id:"ram_mount_dash",label:"On Top of Dash"}] },
  { fieldKey: "rearViewCameras", options: [{id:"mwf_installed",label:"MWF Installed"},{id:"freightliner_single_camera",label:"Single Camera"},{id:"freightliner_triple_camera",label:"Triple Camera"},{id:"freightliner_quad_camera",label:"Quad Camera"}] },
  { fieldKey: "paintSchemes",    options: [{id:"single_tone",label:"Single Tone",code:"065"},{id:"065-370",label:"FTL Emergency 1",code:"065-370"},{id:"065-372",label:"FTL Emergency 3",code:"065-372"},{id:"065-373",label:"FTL Emergency 4",code:"065-373"},{id:"065-374",label:"FTL Emergency 5",code:"065-374"},{id:"065-375",label:"FTL Emergency 6",code:"065-375"},{id:"065-376",label:"FTL Emergency 7",code:"065-376"},{id:"065-377",label:"FTL Emergency 8",code:"065-377"},{id:"065-378",label:"FTL Emergency 9",code:"065-378"}] },
  { fieldKey: "airHornControls", options: [{id:"rh_foot_switch",label:"RH Foot Switch",code:"264"},{id:"rh_lh_foot_switch",label:"RH & LH Foot Switch",code:"264"},{id:"single_lanyard",label:"Single Lanyard",code:"264"},{id:"dual_lanyard",label:"Dual Lanyard",code:"264"}] },
  { fieldKey: "tankScr",         options: [{id:"polished",label:"Polished",code:"677"},{id:"unpolished",label:"Unpolished",code:"677"}] },
  { fieldKey: "airHorns",        options: [{id:"fender_mounted",label:"Fender Mounted",code:"727"},{id:"firewall_capped",label:"Capped At Firewall",code:"727"}] },
  { fieldKey: "bumpers",         options: [{id:"Chrome",label:"Chrome",code:"556"},{id:"Chrome_with_LH_cut_out",label:"Chrome w/ LH Cut Out",code:"556"},{id:"Extended_Chrome_Bumper",label:"Extended Chrome",code:"556"},{id:"Black_Steel_bumper",label:"Black Steel",code:"556"},{id:"Cab_Color_Steel_bumper",label:"Cab Color Steel",code:"556"}] },
  { fieldKey: "wheels",          options: [{id:"steel",label:"Steel",code:"502/505"},{id:"aluminum_steel",label:"Aluminum w/ Steel Inside",code:"502/505"},{id:"full_aluminum",label:"Full Aluminum",code:"502/505"},{id:"simulators",label:"Simulators",code:"502/505"},{id:"durablack",label:"Durablack",code:"502/505"}] },
  { fieldKey: "ptoConfigs",      options: [{id:"AP50-TRANS_3000",label:"AP50-TRANS 3000-871XEFJP-B5XV 2JP",code:"362"},{id:"AP50-TRANS_4000",label:"AP50-TRANS 4000-281GDFJP-B5XV MWF Install",code:"362"},{id:"MBP750-TRANS_3000",label:"MBP750/1000-TRANS 3000 871XEFJP-B5XV 2JP",code:"362"},{id:"MBP750-TRANS_4000",label:"MBP750/1000-TRANS 4000-MWF Install",code:"362"},{id:"RSD1000-TRANS_3000",label:"RSD1000-TRANS 3000-871XEFJP-B5XV 2JP",code:"362"},{id:"RSD1250-TRANS_3000",label:"RSD1250-TRANS-3000 (9 & 1 o'clock PTO) MWF",code:"362"},{id:"RSD1250-TRANS_4000",label:"RSD1250-TRANS 4000-MWF Install",code:"362"},{id:"HM500-TRANS_3000",label:"HM500-TRANS 3000-281GMFJP-B5XV MWF Install",code:"362"},{id:"HM500-TRANS_4000",label:"HM500-TRANS 4000-281GDFJP-B5XV MWF Install",code:"362"},{id:"LSP750-TRANS_3000",label:"LSP750/1000-TRANS 3000-871XEFJP-B5XV 2JP",code:"362"},{id:"LSP750-TRANS_4000",label:"LSP750/1000-TRANS 4000-871XBFJP-B5XV MWF",code:"362"},{id:"PSP1250-TRANS_3000",label:"PSP1250-TRANS 3000-871XEFJP-B5XV 2JP",code:"362"},{id:"PSP1250-TRANS_4000",label:"PSP1250-TRANS 4000-MWF Install",code:"362"},{id:"PSP1500-TRANS_3000",label:"PSP1500-TRANS 3000 (9 & 1 o'clock PORTS) 2JN",code:"362"},{id:"PSP1500-TRANS_4000",label:"PSP 1500-TRANS-4000-MWF Install",code:"362"},{id:"CLK500-TRANS_3000",label:"CLK500-TRANS 3000-281GGFJP-B5XV 2JG",code:"362"},{id:"CLPA500-TRANS_3000",label:"CLPA500-TRANS-3000-MWF Install",code:"362"},{id:"CXPA750-TRANS_3000",label:"CXPA750/1000-TRANS 3000-871XEFJP-B5XV 2JP",code:"362"},{id:"CXPA1250-TRANS_3000",label:"CXPA1250-TRANS 3000-871XDFJP-B5XV 2JN",code:"362"},{id:"CXPA1250-TRANS_4000",label:"CXPA1250-TRANS 4000-871XAFJP-B5XV MWF",code:"362"},{id:"CXPA1500-TRANS_4000",label:"CXPA1500-TRANS 4000-871XBFJP (9 & 1 PORTS) MWF",code:"362"}] },
  { fieldKey: "pumpTypes",       options: [{id:"pto",label:"Midship PTO",code:"AA3"},{id:"driveline",label:"Midship Driveline",code:"AA3"},{id:"portable",label:"Portable",code:"AA3"}] },
  { fieldKey: "salesPersons",    options: [{id:"joe",label:"Joe Juhl"},{id:"newt",label:"Newt Johnson"},{id:"scott",label:"Scott Boll"},{id:"craig",label:"Craig Nekali"},{id:"brett",label:"Brett Jenson"}] },
];

export function seedDefaults() {
  const now = Math.floor(Date.now() / 1000); // Unix seconds for SQLite integer timestamps

  // Seed chassis configs (INSERT OR IGNORE — won't overwrite user edits)
  const insertConfig = sqlite.prepare(`
    INSERT OR IGNORE INTO chassis_configs (manufacturer, model_id, model_label, field_rules, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const cfg of DEFAULT_CONFIGS) {
    insertConfig.run(cfg.manufacturer, cfg.modelId, cfg.modelLabel, JSON.stringify(cfg.fieldRules), now);
  }

  // Seed dropdown options (INSERT OR IGNORE — won't overwrite user edits)
  const insertDropdown = sqlite.prepare(`
    INSERT OR IGNORE INTO dropdown_options (field_key, options, updated_at)
    VALUES (?, ?, ?)
  `);
  for (const d of DEFAULT_DROPDOWNS) {
    insertDropdown.run(d.fieldKey, JSON.stringify(d.options), now);
  }

  console.log("[seed] Default configs and dropdowns ready.");
}
