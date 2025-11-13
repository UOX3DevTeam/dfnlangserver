export enum DefinitionCategory {
  items = 0,
  npc,
  create,
  regions,
  misc,
  skills,
  location,
  menus,
  spells,
  newbie,
  titles,
  advance,
  house,
  colors,
  spawn,
  html,
  race,
  weathab,
  hard_items,
  command,
  msgboard,
  carve,
  creatures,
  maps,
}

export const dirNames: Record<DefinitionCategory, string> = {
  [DefinitionCategory.items]:      'items',
  [DefinitionCategory.npc]:        'npc',
  [DefinitionCategory.create]:     'create',
  [DefinitionCategory.regions]:    'regions',
  [DefinitionCategory.misc]:       'misc',
  [DefinitionCategory.skills]:     'skills',
  [DefinitionCategory.location]:   'location',
  [DefinitionCategory.menus]:      'menus',
  [DefinitionCategory.spells]:     'spells',
  [DefinitionCategory.newbie]:     'newbie',
  [DefinitionCategory.titles]:     'titles',
  [DefinitionCategory.advance]:    'advance',
  [DefinitionCategory.house]:      'house',
  [DefinitionCategory.colors]:     'colors',
  [DefinitionCategory.spawn]:      'spawn',
  [DefinitionCategory.html]:       'html',
  [DefinitionCategory.race]:       'race',
  [DefinitionCategory.weathab]:    'weather',
  [DefinitionCategory.hard_items]: 'harditems',
  [DefinitionCategory.command]:    'command',
  [DefinitionCategory.msgboard]:   'msgboard',
  [DefinitionCategory.carve]:      'carve',
  [DefinitionCategory.creatures]:  'creatures',
  [DefinitionCategory.maps]:       'maps',
};

export interface Section {
  header:    string;
  entries:   Record<string, string>;
  startLine: number;
}

export interface Definition {
  name:     string;
  uri:      string;
  cat:      DefinitionCategory | undefined;
  sections: Section[];
}

export type OptionalCategory = DefinitionCategory | undefined;
export type OptionalSection = Section | undefined;
export type OptionalDefinition = Definition | undefined;

function enumValues<E extends Record<string, string | number>>(e: E): E[keyof E][] {
  return Object.values(e).filter((v): v is E[keyof E] => typeof v === 'number');
}

export function getDefinitionCategories(): DefinitionCategory[] {
  return enumValues(DefinitionCategory);
}
