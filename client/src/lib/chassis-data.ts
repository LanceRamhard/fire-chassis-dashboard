// ─── Master option tables — these are the global "library" of all possible choices ──

export const MANUFACTURERS = [
  { id: "freightliner", label: "Freightliner" },
  { id: "international", label: "International" },
  { id: "kenworth", label: "Kenworth" },
  { id: "peterbilt", label: "Peterbilt" },
] as const;

export type ManufacturerId = "freightliner" | "international" | "kenworth" | "peterbilt";

export const APPARATUS_TYPES = [
  { id: "pumper", label: "Pumper" },
  { id: "tanker_pumper", label: "Tanker Pumper" },
  { id: "tanker", label: "Tanker" },
];

export const ALL_ENGINES = [
  { id: "l9",      label: "Cummins L9",     code: "101" },
  { id: "x12",     label: "Cummins X12",    code: "101" },
  { id: "x15",     label: "Cummins X15",    code: "101" },
  { id: "dd8",     label: "Detroit DD8",    code: "101" },
  { id: "dd13",    label: "Detroit DD13",   code: "101" },
  { id: "dd15",    label: "Detroit DD15",   code: "101" },
  { id: "a26_400", label: "International A26 (400HP)", code: "101" },
  { id: "a26_450", label: "International A26 (450HP)", code: "101" },
  { id: "a26_500", label: "International A26 (500HP)", code: "101" },
  { id: "px7",     label: "PACCAR PX-7",    code: "101" },
  { id: "px9",     label: "PACCAR PX-9",    code: "101" },
];

export const ALL_HP = [
  { id: "300", label: "300 HP" },
  { id: "350", label: "350 HP" },
  { id: "360", label: "360 HP" },
  { id: "400", label: "400 HP" },
  { id: "450", label: "450 HP" },
  { id: "500", label: "500 HP" },
  { id: "525", label: "525 HP" },
  { id: "565", label: "565 HP" },
  { id: "605", label: "605 HP" },
];

export const ALL_ENGINE_BRAKES = [
  { id: "exhaust_brake", label: "Exhaust Brake", code: "128" },
  { id: "jake_brake",    label: "Jake Brake",    code: "128" },
];

export const ALL_TRANSMISSIONS = [
  { id: "3000_evs", label: "Allison 3000 EVS", code: "342" },
  { id: "3500_evs", label: "Allison 3500 EVS", code: "342" },
  { id: "4000_evs", label: "Allison 4000 EVS", code: "342" },
  { id: "4500_evs", label: "Allison 4500 EVS", code: "342" },
];

export const ALL_FRONT_AXLES = [
  { id: "12k",      label: "12,000 Lbs",       code: "400" },
  { id: "13k",      label: "13,000 Lbs",       code: "400" },
  { id: "14k",      label: "14,000 Lbs",       code: "400" },
  { id: "14.6k",    label: "14,600 Lbs",       code: "400" },
  { id: "16k",      label: "16,000 Lbs",       code: "400" },
  { id: "18k",      label: "18,000 Lbs",       code: "400" },
  { id: "20k",      label: "20,000 Lbs",       code: "400" },
  { id: "14.6k_AWD", label: "14,000 Lbs AWD", code: "400" },
  { id: "16k_AWD",  label: "16,000 Lbs AWD",   code: "400" },
  { id: "18k_AWD",  label: "18,000 Lbs AWD",   code: "400" },
  { id: "23k_AWD",  label: "23,000 Lbs AWD",   code: "400" },
];

export const ALL_REAR_AXLES = [
  { id: "19k",   label: "19,000 Lbs", code: "420" },
  { id: "21k",   label: "21,000 Lbs", code: "420" },
  { id: "23k",   label: "23,000 Lbs", code: "420" },
  { id: "24k",   label: "24,000 Lbs", code: "420" },
  { id: "25k",   label: "25,000 Lbs", code: "420" },
  { id: "26k",   label: "26,000 Lbs", code: "420" },
  { id: "27k",   label: "27,000 Lbs", code: "420" },
  { id: "30k",   label: "30,000 Lbs", code: "420" },
  { id: "31k",   label: "31,000 Lbs", code: "420" },
  { id: "33k",   label: "33,000 Lbs", code: "420" },
  { id: "33.5k", label: "33,500 Lbs", code: "420" },
  { id: "40k",   label: "40,000 Lbs", code: "420" },
  { id: "44k",   label: "44,000 Lbs", code: "420" },
  { id: "46k",   label: "46,000 Lbs", code: "420" },
  { id: "50k",   label: "50,000 Lbs", code: "420" },
  { id: "52k",   label: "52,000 Lbs", code: "420" },
];

export const ALL_CABS = [
  { id: "regular",  label: "Regular Cab",  code: "829" },
  { id: "extended", label: "Extended Cab", code: "829" },
  { id: "crew",     label: "Crew Cab",     code: "829" },
];

export const ALL_BRAKES = [
  { id: "air_disc", label: "Air Disc Brakes" },
  { id: "drum",     label: "Drum Brakes" },
];

// ─── Interior ─────────────────────────────────────────────────────────────────

export const DRIVER_SEATS = [
  { id: "911_air_ride",       label: "911 Air Ride",        code: "756" },
  { id: "911_nonsuspension",  label: "911 Non-Suspension",  code: "756" },
  { id: "bostrum_airride",    label: "HO Bostrom Air Ride", code: "756" },
];

export const OFFICER_SEATS = [
  { id: "911_Non-Suspension_1F1",                       label: "911 Non-Suspension 1F1",                         code: "760" },
  { id: "911_Air-Ride_1E7",                             label: "911 Air-Ride 1E7",                               code: "760" },
  { id: "911_2-Man_Bench_351",                          label: "911 2-Man Bench 351",                            code: "760" },
  { id: "911_SCBA_Air-Ride_ext_or_crew_cab_1E8",        label: "911 SCBA Air-Ride (Ext/Crew) 1E8",              code: "760" },
  { id: "911_SCBA_Non-Suspension_ext_or_crew_cab_1E9",  label: "911 SCBA Non-Suspension (Ext/Crew) 1E9",        code: "760" },
  { id: "HO_Bostrom_Air-Ride_1G6",                      label: "HO Bostrom Air-Ride 1G6",                       code: "760" },
  { id: "HO_Bostrom_Non-Suspension_149",                label: "HO Bostrom Non-Suspension 149",                 code: "760" },
  { id: "HO_Bostrom_SCBA_Air-Ride_1EA",                 label: "HO Bostrom SCBA Air-Ride 1EA",                  code: "760" },
];

export const REAR_SEATS = [
  { id: "2_911_SCBA_086",       label: "2 × 911 SCBA 086",          code: "762" },
  { id: "3_911_SCBA_1E9",       label: "3 × 911 SCBA 1E9",          code: "762" },
  { id: "3_911_bucket_170",     label: "3 × 911 Bucket 170",        code: "762" },
  { id: "3_HO_Bostrom_SCBA_1EC",label: "3 × HO Bostrom SCBA 1EC",  code: "762" },
  { id: "2_HO_Bostrom_SCBA_1EB",label: "2 × HO Bostrom SCBA 1EB",  code: "762" },
  { id: "2_HO_Bostrom_bucket_096",label:"2 × HO Bostrom Bucket 096",code: "762" },
];

export const SEAT_MATERIALS = [
  { id: "cloth", label: "Cloth", code: "758" },
  { id: "vinyl", label: "Vinyl", code: "758" },
];

export const SUN_VISORS = [
  { id: "no_sun_visor", label: "No Sun Visor",  code: "764" },
  { id: "stainless",    label: "Stainless",      code: "764" },
  { id: "painted",      label: "Painted",        code: "764" },
];

export const RAM_MOUNTS = [
  { id: "no_ram_mount",              label: "No Ram Mount" },
  { id: "ram_mount_overhead_console", label: "Overhead Console" },
  { id: "ram_mount_dash",            label: "On Top of Dash" },
];

export const REAR_VIEW_CAMERAS = [
  { id: "mwf_installed",               label: "MWF Installed" },
  { id: "freightliner_single_camera",  label: "Single Camera" },
  { id: "freightliner_triple_camera",  label: "Triple Camera" },
  { id: "freightliner_quad_camera",    label: "Quad Camera" },
];

// ─── Exterior ─────────────────────────────────────────────────────────────────

export const PAINT_SCHEMES = [
  { id: "single_tone",  label: "Single Tone",       code: "065" },
  { id: "065-370",      label: "FTL Emergency 1",   code: "065-370" },
  { id: "065-372",      label: "FTL Emergency 3",   code: "065-372" },
  { id: "065-373",      label: "FTL Emergency 4",   code: "065-373" },
  { id: "065-374",      label: "FTL Emergency 5",   code: "065-374" },
  { id: "065-375",      label: "FTL Emergency 6",   code: "065-375" },
  { id: "065-376",      label: "FTL Emergency 7",   code: "065-376" },
  { id: "065-377",      label: "FTL Emergency 8",   code: "065-377" },
  { id: "065-378",      label: "FTL Emergency 9",   code: "065-378" },
];

export const AIR_HORN_CONTROLS = [
  { id: "rh_foot_switch",    label: "RH Foot Switch",       code: "264" },
  { id: "rh_lh_foot_switch", label: "RH & LH Foot Switch",  code: "264" },
  { id: "single_lanyard",    label: "Single Lanyard",       code: "264" },
  { id: "dual_lanyard",      label: "Dual Lanyard",         code: "264" },
];

export const TANK_SCR = [
  { id: "polished",   label: "Polished",   code: "677" },
  { id: "unpolished", label: "Unpolished", code: "677" },
];

export const AIR_HORNS = [
  { id: "fender_mounted",  label: "Fender Mounted",    code: "727" },
  { id: "firewall_capped", label: "Capped At Firewall", code: "727" },
];

export const BUMPERS = [
  { id: "Chrome",                 label: "Chrome",                   code: "556" },
  { id: "Chrome_with_LH_cut_out", label: "Chrome w/ LH Cut Out",    code: "556" },
  { id: "Extended_Chrome_Bumper", label: "Extended Chrome",          code: "556" },
  { id: "Black_Steel_bumper",     label: "Black Steel",              code: "556" },
  { id: "Cab_Color_Steel_bumper", label: "Cab Color Steel",          code: "556" },
];

export const WHEELS = [
  { id: "steel",          label: "Steel",                    code: "502/505" },
  { id: "aluminum_steel", label: "Aluminum w/ Steel Inside", code: "502/505" },
  { id: "full_aluminum",  label: "Full Aluminum",            code: "502/505" },
  { id: "simulators",     label: "Simulators",               code: "502/505" },
  { id: "durablack",      label: "Durablack",                code: "502/505" },
];

// ─── PTO options ──────────────────────────────────────────────────────────────
export const PTO_CONFIGS = [
  { id: "AP50-TRANS_3000",     label: "AP50-TRANS 3000-871XEFJP-B5XV 2JP",              code: "362" },
  { id: "AP50-TRANS_4000",     label: "AP50-TRANS 4000-281GDFJP-B5XV MWF Install",      code: "362" },
  { id: "MBP750-TRANS_3000",   label: "MBP750/1000-TRANS 3000 871XEFJP-B5XV 2JP",       code: "362" },
  { id: "MBP750-TRANS_4000",   label: "MBP750/1000-TRANS 4000-MWF Install",             code: "362" },
  { id: "RSD1000-TRANS_3000",  label: "RSD1000-TRANS 3000-871XEFJP-B5XV 2JP",           code: "362" },
  { id: "RSD1250-TRANS_3000",  label: "RSD1250-TRANS-3000 (9 & 1 o'clock PTO) MWF",    code: "362" },
  { id: "RSD1250-TRANS_4000",  label: "RSD1250-TRANS 4000-MWF Install",                 code: "362" },
  { id: "HM500-TRANS_3000",    label: "HM500-TRANS 3000-281GMFJP-B5XV MWF Install",     code: "362" },
  { id: "HM500-TRANS_4000",    label: "HM500-TRANS 4000-281GDFJP-B5XV MWF Install",     code: "362" },
  { id: "LSP750-TRANS_3000",   label: "LSP750/1000-TRANS 3000-871XEFJP-B5XV 2JP",       code: "362" },
  { id: "LSP750-TRANS_4000",   label: "LSP750/1000-TRANS 4000-871XBFJP-B5XV MWF",       code: "362" },
  { id: "PSP1250-TRANS_3000",  label: "PSP1250-TRANS 3000-871XEFJP-B5XV 2JP",           code: "362" },
  { id: "PSP1250-TRANS_4000",  label: "PSP1250-TRANS 4000-MWF Install",                 code: "362" },
  { id: "PSP1500-TRANS_3000",  label: "PSP1500-TRANS 3000 (9 & 1 o'clock PORTS) 2JN",  code: "362" },
  { id: "PSP1500-TRANS_4000",  label: "PSP 1500-TRANS-4000-MWF Install",                code: "362" },
  { id: "CLK500-TRANS_3000",   label: "CLK500-TRANS 3000-281GGFJP-B5XV 2JG",            code: "362" },
  { id: "CLPA500-TRANS_3000",  label: "CLPA500-TRANS-3000-MWF Install",                 code: "362" },
  { id: "CXPA750-TRANS_3000",  label: "CXPA750/1000-TRANS 3000-871XEFJP-B5XV 2JP",      code: "362" },
  { id: "CXPA1250-TRANS_3000", label: "CXPA1250-TRANS 3000-871XDFJP-B5XV 2JN",          code: "362" },
  { id: "CXPA1250-TRANS_4000", label: "CXPA1250-TRANS 4000-871XAFJP-B5XV MWF",          code: "362" },
  { id: "CXPA1500-TRANS_4000", label: "CXPA1500-TRANS 4000-871XBFJP (9 & 1 PORTS) MWF", code: "362" },
];

export const PUMP_TYPES = [
  { id: "pto",       label: "Midship PTO",      code: "AA3" },
  { id: "driveline", label: "Midship Driveline", code: "AA3" },
  { id: "portable",  label: "Portable",          code: "AA3" },
];

// ─── Sales persons ───────────────────────────────────────────────────────────
export const SALES_PERSONS = [
  { id: "joe",   label: "Joe Juhl" },
  { id: "newt",  label: "Newt Johnson" },
  { id: "scott", label: "Scott Boll" },
  { id: "craig", label: "Craig Nekali" },
  { id: "brett", label: "Brett Jenson" },
];

// ─── US States ───────────────────────────────────────────────────────────────
export const US_STATES = [
  { id: "AL", label: "Alabama" }, { id: "AK", label: "Alaska" },
  { id: "AZ", label: "Arizona" }, { id: "AR", label: "Arkansas" },
  { id: "CA", label: "California" }, { id: "CO", label: "Colorado" },
  { id: "CT", label: "Connecticut" }, { id: "DE", label: "Delaware" },
  { id: "FL", label: "Florida" }, { id: "GA", label: "Georgia" },
  { id: "HI", label: "Hawaii" }, { id: "ID", label: "Idaho" },
  { id: "IL", label: "Illinois" }, { id: "IN", label: "Indiana" },
  { id: "IA", label: "Iowa" }, { id: "KS", label: "Kansas" },
  { id: "KY", label: "Kentucky" }, { id: "LA", label: "Louisiana" },
  { id: "ME", label: "Maine" }, { id: "MD", label: "Maryland" },
  { id: "MA", label: "Massachusetts" }, { id: "MI", label: "Michigan" },
  { id: "MN", label: "Minnesota" }, { id: "MS", label: "Mississippi" },
  { id: "MO", label: "Missouri" }, { id: "MT", label: "Montana" },
  { id: "NE", label: "Nebraska" }, { id: "NV", label: "Nevada" },
  { id: "NH", label: "New Hampshire" }, { id: "NJ", label: "New Jersey" },
  { id: "NM", label: "New Mexico" }, { id: "NY", label: "New York" },
  { id: "NC", label: "North Carolina" }, { id: "ND", label: "North Dakota" },
  { id: "OH", label: "Ohio" }, { id: "OK", label: "Oklahoma" },
  { id: "OR", label: "Oregon" }, { id: "PA", label: "Pennsylvania" },
  { id: "RI", label: "Rhode Island" }, { id: "SC", label: "South Carolina" },
  { id: "SD", label: "South Dakota" }, { id: "TN", label: "Tennessee" },
  { id: "TX", label: "Texas" }, { id: "UT", label: "Utah" },
  { id: "VT", label: "Vermont" }, { id: "VA", label: "Virginia" },
  { id: "WA", label: "Washington" }, { id: "WV", label: "West Virginia" },
  { id: "WI", label: "Wisconsin" }, { id: "WY", label: "Wyoming" },
];

// ─── Server fieldKey metadata ────────────────────────────────────────────────
// Maps dropdown fieldKey → human label + admin grouping. Used by the admin UI
// and by the request form to explain dependency-rule effects to the user.
export const FIELD_KEY_META: Record<string, { label: string; group: string }> = {
  engines:          { label: "Engines",            group: "Vehicle" },
  hp:               { label: "Horsepower",         group: "Vehicle" },
  engineBrakes:     { label: "Engine Brakes",      group: "Vehicle" },
  transmissions:    { label: "Transmissions",      group: "Vehicle" },
  frontAxles:       { label: "Front Axles",        group: "Vehicle" },
  rearAxles:        { label: "Rear Axles",         group: "Vehicle" },
  cabs:             { label: "Cab Config",         group: "Vehicle" },
  brakes:           { label: "Brakes",             group: "Vehicle" },
  apparatusTypes:   { label: "Apparatus Types",    group: "Vehicle" },
  driverSeats:      { label: "Driver Seats",       group: "Interior" },
  officerSeats:     { label: "Officer Seats",      group: "Interior" },
  rearSeats:        { label: "Rear Seats",         group: "Interior" },
  seatMaterials:    { label: "Seat Materials",     group: "Interior" },
  sunVisors:        { label: "Sun Visors",         group: "Interior" },
  ramMounts:        { label: "RAM Mounts",         group: "Interior" },
  rearViewCameras:  { label: "Rear View Cameras",  group: "Interior" },
  paintSchemes:     { label: "Paint Schemes",      group: "Exterior" },
  airHornControls:  { label: "Air Horn Controls",  group: "Exterior" },
  tankScr:          { label: "Tank SCR",           group: "Exterior" },
  airHorns:         { label: "Air Horns",          group: "Exterior" },
  bumpers:          { label: "Bumpers",            group: "Exterior" },
  wheels:           { label: "Wheels",             group: "Exterior" },
  ptoConfigs:       { label: "PTO Configs",        group: "Water/Pump" },
  pumpTypes:        { label: "Pump Types",         group: "Water/Pump" },
  salesPersons:     { label: "Sales Persons",      group: "General" },
};

// ─── Helper to filter master list by allowed IDs ─────────────────────────────
export function filterOptions<T extends { id: string }>(
  all: T[],
  allowed: string[] | null | undefined
): T[] {
  if (!allowed || allowed.length === 0) return all;
  return all.filter(o => allowed.includes(o.id));
}

// ─── Per-model field visibility ──────────────────────────────────────────────
// Sentinel key stored inside chassisConfigs.fieldRules. Its value is an array
// of FormState formKey strings to HIDE for the selected model. Manufacturer
// and truckModel are intentionally excluded — they are required for the rest
// of the form to function.
export const HIDDEN_FIELDS_KEY = "__hiddenFields__";

// Toggle-able request-form fields, grouped by section. The order here drives
// the order they appear in the ConfigAdmin "Visible Fields" panel.
export const FIELD_DISPLAY_META: { key: string; label: string; section: string }[] = [
  // Basic Information
  { key: "configName",     label: "Config Name",      section: "Basic Information" },
  { key: "requestDate",    label: "Request Date",     section: "Basic Information" },
  { key: "dateRequired",   label: "Date Required",    section: "Basic Information" },
  { key: "salesPerson",    label: "Sales Person",     section: "Basic Information" },
  { key: "customerName",   label: "Customer Name",    section: "Basic Information" },
  { key: "city",           label: "City",             section: "Basic Information" },
  { key: "state",          label: "State",            section: "Basic Information" },
  // Chassis
  { key: "cabConfig",      label: "Cab Config",       section: "Chassis Selection" },
  { key: "apparatusType",  label: "Apparatus Type",   section: "Chassis Selection" },
  // Engine & Drivetrain
  { key: "engine",         label: "Engine",           section: "Engine & Drivetrain" },
  { key: "engineHp",       label: "Engine HP",        section: "Engine & Drivetrain" },
  { key: "engineBrake",    label: "Engine Brake",     section: "Engine & Drivetrain" },
  { key: "transmission",   label: "Transmission",     section: "Engine & Drivetrain" },
  { key: "topSpeed",       label: "Top Speed",        section: "Engine & Drivetrain" },
  // Axles & Brakes
  { key: "caMeasurement",  label: "CA Measurement",   section: "Axles & Brakes" },
  { key: "frontAxle",      label: "Front Axle",       section: "Axles & Brakes" },
  { key: "awd",            label: "AWD",              section: "Axles & Brakes" },
  { key: "rearAxle",       label: "Rear Axle",        section: "Axles & Brakes" },
  { key: "diffLock",       label: "Diff Lock",        section: "Axles & Brakes" },
  { key: "brakes",         label: "Brakes",           section: "Axles & Brakes" },
  // Water & Pump
  { key: "waterTankSize",  label: "Water Tank Size",  section: "Water & Pump" },
  { key: "pumpType",       label: "Pump Type",        section: "Water & Pump" },
  { key: "ptoConfig",      label: "PTO Config",       section: "Water & Pump" },
  { key: "heatExchanger",  label: "Heat Exchanger",   section: "Water & Pump" },
  // Interior
  { key: "driverSeat",     label: "Driver Seat",      section: "Interior" },
  { key: "officerSeat",    label: "Officer Seat",     section: "Interior" },
  { key: "rearSeats",      label: "Rear Seats",       section: "Interior" },
  { key: "seatMaterial",   label: "Seat Material",    section: "Interior" },
  { key: "sunVisor",       label: "Sun Visor",        section: "Interior" },
  { key: "ramMount",       label: "Ram Mount",        section: "Interior" },
  { key: "rearViewCamera", label: "Rear View Camera", section: "Interior" },
  // Exterior
  { key: "paintColor",     label: "Paint Color",      section: "Exterior" },
  { key: "paintCode",      label: "Paint Code",       section: "Exterior" },
  { key: "paintScheme",    label: "Paint Scheme",     section: "Exterior" },
  { key: "airHornControls",label: "Air Horn Controls",section: "Exterior" },
  { key: "tankScr",        label: "Tank / SCR",       section: "Exterior" },
  { key: "airHorns",       label: "Air Horns",        section: "Exterior" },
  { key: "bumper",         label: "Bumper",           section: "Exterior" },
  { key: "wheels",         label: "Wheels",           section: "Exterior" },
  { key: "ledHeadlights",  label: "LED Headlights",   section: "Exterior" },
  // Comments
  { key: "comments",       label: "Comments",         section: "Comments" },
];

// Read the hidden formKey list from a config's fieldRules JSON.
export function getHiddenFields(
  fieldRules: Record<string, unknown> | null | undefined
): string[] {
  if (!fieldRules) return [];
  const v = (fieldRules as Record<string, unknown>)[HIDDEN_FIELDS_KEY];
  return Array.isArray(v) ? (v as string[]) : [];
}

// ─── Required fields (admin-configurable) ────────────────────────────────────
// Settings key under which the required-field list is stored on the server.
export const REQUIRED_FIELDS_KEY = "requiredFields";

// Manufacturer and Truck Model are always required — the rest of the form
// cannot function without them, so they aren't togglable in the admin.
export const ALWAYS_REQUIRED_FIELDS: string[] = ["manufacturer", "truckModel"];

// Boolean (checkbox) fields can't be meaningfully "required" — a checkbox always
// has a value — so they're excluded from the requirable set.
const BOOLEAN_FIELD_KEYS = new Set(["awd", "diffLock", "heatExchanger", "ledHeadlights"]);

// Fields an admin may mark as required, grouped/ordered as in the request form.
// Excludes the always-required keys and boolean checkboxes.
export const REQUIRABLE_FIELDS: { key: string; label: string; section: string }[] =
  FIELD_DISPLAY_META.filter(f => !BOOLEAN_FIELD_KEYS.has(f.key));

// Default required selection — matches the form's original hardcoded list,
// minus the always-required manufacturer/truckModel.
export const DEFAULT_REQUIRED_FIELDS: string[] = [
  "apparatusType", "engine", "transmission", "cabConfig", "frontAxle", "rearAxle",
];
