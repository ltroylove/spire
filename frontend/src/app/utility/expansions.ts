import {EXPANSION_ICONS_SMALL} from "@/app/constants/eq-expansion-icons";
import {App}                   from "@/constants/app";
import {EXPANSION_NAMES}       from "@/app/constants/eq-expansions";

// Local icon overrides for expansion icons that are incorrect in the upstream
// eq-asset-preview asset pack. Files are served from /assets/expansion-icons/.
const EXPANSION_ICON_LOCAL_OVERRIDES: Record<number, string> = {
  3: '/assets/expansion-icons/luclinicon.gif', // upstream asset has wrong image
  8: '/assets/expansion-icons/omensicon.gif',  // missing from upstream asset cache
}

export default class Expansions {
  static getExpansionIconUrlSmall(expansionId) {
    const id = Number(expansionId)
    if (EXPANSION_ICON_LOCAL_OVERRIDES[id]) {
      return EXPANSION_ICON_LOCAL_OVERRIDES[id]
    }

    if (EXPANSION_ICONS_SMALL[expansionId]) {
      return App.ASSET_EXPANSION_ICON_SMALL_URL + EXPANSION_ICONS_SMALL[expansionId]
    }

    // return transparent base64 encoded image if nothing found
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  }
  static getExpansionName(expansionId) {
    if (EXPANSION_NAMES[expansionId]) {
      return EXPANSION_NAMES[expansionId]
    }

    if (expansionId === -1) {
      return 'All'
    }

    // return unknown expansion if not found
    return 'Unknown'
  }
}
