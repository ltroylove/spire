import { ModelsItemsEvolvingDetail } from "@/app/api";
import { RACES } from "@/app/constants/eq-race-constants";
import { Items } from "@/app/items";
import { Zones } from "@/app/zones";

export const EVOLVING_TYPE_OPTIONS = [
  { value: 1, text: "Experience" },
  { value: 2, text: "Kills" },
  { value: 3, text: "Mob Race" },
  { value: 4, text: "Zone" },
  { value: 99, text: "Unknown" },
];

export const EVOLVING_EXPERIENCE_SUBTYPES = {
  "0": "All EXP",
  "1": "Solo EXP",
  "2": "Group EXP",
  "3": "Raid EXP",
};

function toNumber(value: any, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEvolutionType(type: any) {
  const raw = `${type ?? ""}`.trim().toLowerCase();
  const numeric = Number(raw);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  if (raw === "experience" || raw === "amount of exp" || raw === "exp") {
    return 1;
  }

  if (raw === "kills" || raw === "number of kills" || raw === "kill") {
    return 2;
  }

  if (raw === "mob race" || raw === "specific mob race" || raw === "race") {
    return 3;
  }

  if (raw === "zone" || raw === "specific zone id" || raw === "zone id") {
    return 4;
  }

  if (raw === "unk" || raw === "unknown") {
    return 99;
  }

  return 0;
}

export function getEvolutionSubtypeValues(subType: any) {
  return `${subType ?? ""}`
    .split(/[.,|/;]+|\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function cloneEvolvingDetail(detail: ModelsItemsEvolvingDetail | null | undefined): ModelsItemsEvolvingDetail {
  return {
    id: toNumber(detail?.id),
    item_evo_id: toNumber(detail?.item_evo_id),
    item_evolve_level: toNumber(detail?.item_evolve_level),
    item_id: toNumber(detail?.item_id),
    type: toNumber(detail?.type, 1),
    sub_type: `${detail?.sub_type ?? "0"}`,
    required_amount: toNumber(detail?.required_amount),
  };
}

export function sortEvolvingDetails(details: ModelsItemsEvolvingDetail[] = []) {
  return [...details].sort((a, b) => {
    return (
      toNumber(a.item_evo_id) - toNumber(b.item_evo_id) ||
      toNumber(a.item_evolve_level) - toNumber(b.item_evolve_level) ||
      toNumber(a.id) - toNumber(b.id)
    );
  });
}

export function groupEvolvingDetails(details: ModelsItemsEvolvingDetail[] = []) {
  const groups: Record<number, ModelsItemsEvolvingDetail[]> = {};

  sortEvolvingDetails(details).forEach((detail) => {
    const evoId = toNumber(detail.item_evo_id);
    if (!groups[evoId]) {
      groups[evoId] = [];
    }
    groups[evoId].push(detail);
  });

  return Object.keys(groups)
    .map((evoId) => ({
      evoId: Number(evoId),
      details: groups[evoId],
    }))
    .sort((a, b) => a.evoId - b.evoId);
}

export function getEvolvingTypeLabel(type: any) {
  const value = normalizeEvolutionType(type);
  const option = EVOLVING_TYPE_OPTIONS.find((entry) => entry.value === value);
  return option ? option.text : `${type || value || 0}`;
}

export function getEvolutionChain(details: ModelsItemsEvolvingDetail[] = [], evoId: any) {
  const parsedEvoId = toNumber(evoId);
  return sortEvolvingDetails(details).filter((detail) => toNumber(detail.item_evo_id) === parsedEvoId);
}

export function getCurrentEvolutionDetail(item: any, details: ModelsItemsEvolvingDetail[] = []) {
  const itemId = toNumber(item?.id);
  const evolvingLevel = toNumber(item?.evolvinglevel);

  return (
    details.find((detail) => toNumber(detail.item_id) === itemId) ||
    details.find((detail) => toNumber(detail.item_evolve_level) === evolvingLevel) ||
    null
  );
}

export function getEvolutionSubtypeLabel(detail: ModelsItemsEvolvingDetail) {
  const type = normalizeEvolutionType(detail?.type);
  const values = getEvolutionSubtypeValues(detail?.sub_type);

  if (values.length === 0) {
    return "-";
  }

  if (type === 1) {
    return EVOLVING_EXPERIENCE_SUBTYPES[values[0]] || values[0];
  }

  if (type === 2) {
    const minimumLevel = toNumber(values[0]);
    return minimumLevel > 0 ? `Mob level ${minimumLevel}+` : "Any mob level";
  }

  if (type === 3) {
    return values
      .map((value) => (RACES[value] ? `${RACES[value]} (${value})` : value))
      .join(", ");
  }

  if (type === 4) {
    return values
      .map((value) => {
        const zone = Zones.getZoneByIdSync(toNumber(value));
        if (zone && zone.long_name) {
          return `${zone.long_name} (${value})`;
        }

        const zoneByShortName = (Zones.zones || []).find((entry) => `${entry.short_name || ""}`.toLowerCase() === value.toLowerCase());
        if (zoneByShortName && zoneByShortName.long_name) {
          return `${zoneByShortName.long_name} (${zoneByShortName.short_name})`;
        }

        return value;
      })
      .join(", ");
  }

  return values.join(", ");
}

export function getCachedItemName(itemId: any) {
  const parsedItemId = toNumber(itemId);
  const item = Items.cacheExists(parsedItemId);
  if (item && item.name) {
    return item.name;
  }

  if (parsedItemId > 0) {
    return `Item #${parsedItemId}`;
  }

  return "(none)";
}

export function summarizeEvolutionChain(details: ModelsItemsEvolvingDetail[] = []) {
  const labels = details.slice(0, 3).map((detail) => getCachedItemName(detail.item_id));
  if (details.length > 3) {
    labels.push(`+${details.length - 3} more`);
  }
  return labels.join(", ");
}

export function getNextEvolutionId(details: ModelsItemsEvolvingDetail[] = []) {
  if (details.length === 0) {
    return 1;
  }

  return Math.max(...details.map((detail) => toNumber(detail.item_evo_id))) + 1;
}

export function getNextEvolutionDetailId(details: ModelsItemsEvolvingDetail[] = []) {
  if (details.length === 0) {
    return 1;
  }

  return Math.max(...details.map((detail) => toNumber(detail.id))) + 1;
}

export function getNextEvolutionLevel(details: ModelsItemsEvolvingDetail[] = [], evoId: any) {
  const chain = getEvolutionChain(details, evoId);
  if (chain.length === 0) {
    return 1;
  }

  return Math.max(...chain.map((detail) => toNumber(detail.item_evolve_level))) + 1;
}

export function createNewEvolutionDraft(details: ModelsItemsEvolvingDetail[] = []) {
  return cloneEvolvingDetail({
    id: getNextEvolutionDetailId(details),
    item_evo_id: getNextEvolutionId(details),
    item_evolve_level: 1,
    item_id: 0,
    type: 1,
    sub_type: "0",
    required_amount: 1,
  });
}

export function createExistingEvolutionDraft(details: ModelsItemsEvolvingDetail[] = [], evoId: any) {
  const chain = getEvolutionChain(details, evoId);
  const lastEntry = chain.length > 0 ? chain[chain.length - 1] : null;
  const nextLevel = getNextEvolutionLevel(details, evoId);
  const nextEvoId = toNumber(lastEntry?.item_evo_id, toNumber(evoId));

  return cloneEvolvingDetail({
    id: getNextEvolutionDetailId(details),
    item_evo_id: nextEvoId,
    item_evolve_level: nextLevel,
    item_id: 0,
    type: toNumber(lastEntry?.type, 1),
    sub_type: lastEntry?.sub_type ?? "0",
    required_amount: toNumber(lastEntry?.required_amount, 1),
  });
}

export function itemHasEvolvingConfiguration(item: any) {
  return (
    toNumber(item?.evoitem) === 1 ||
    toNumber(item?.evoid) > 0 ||
    toNumber(item?.evolvinglevel) > 0 ||
    toNumber(item?.evomax) > 0
  );
}

export function getEvolutionMisconfiguration(item: any, details: ModelsItemsEvolvingDetail[] = []) {
  const issues: string[] = [];
  const evoItem = toNumber(item?.evoitem);
  const evoId = toNumber(item?.evoid);
  const evolvingLevel = toNumber(item?.evolvinglevel);
  const evoMax = toNumber(item?.evomax);
  const chain = getEvolutionChain(details, evoId);
  const itemId = toNumber(item?.id);

  if (!itemHasEvolvingConfiguration(item) && chain.length === 0) {
    return null;
  }

  if (evoItem === 1 && chain.length === 0) {
    issues.push("Item is marked as evolving, but no evolution chain entries were found.");
  }

  if (chain.length > 0) {
    if (evoItem !== 1 || evoId === 0 || evolvingLevel === 0) {
      issues.push("Evolution chain exists, but evoitem, evoid, or evolvinglevel is incomplete.");
    }

    if (evoMax !== chain.length) {
      issues.push(`evomax (${evoMax}) does not match the chain length (${chain.length}).`);
    }

    if (itemId > 0 && !chain.some((detail) => toNumber(detail.item_id) === itemId)) {
      issues.push("Current item is not present in the configured evolution chain.");
    }

    if (evolvingLevel > 0 && !chain.some((detail) => toNumber(detail.item_evolve_level) === evolvingLevel)) {
      issues.push("Configured evolvinglevel does not exist in the evolution chain.");
    }
  }

  if (issues.length === 0) {
    return null;
  }

  return {
    title: "Potentially misconfigured evolving item",
    issues,
  };
}
