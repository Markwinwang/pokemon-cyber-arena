import rawData from "@/data/pokemon-data.json";

export type ViewMode = "cards" | "table" | "evolution";
export type AppMode = "dex" | "battle";
export type SortMode = "dex" | "total" | "attack" | "speed" | "name";
export type BattleAction = "strike" | "guard" | "burst";
export type Winner = "player" | "ai" | null;

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
}

export interface PokemonRecord {
  id: number;
  dex: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  genus: string;
  types: string[];
  typeKeys: string[];
  heightM: number;
  weightKg: number;
  abilities: PokemonAbility[];
  stats: Record<string, number>;
  statTotal: number;
  color: string;
  habitat: string | null;
  shape: string | null;
  captureRate: number;
  baseHappiness: number;
  flavor: string;
  artwork: string;
  sprite: string;
  evolutionChainId: number;
  evolutionFamily: number[];
  evolutionSummary: string[];
  focusFamily: number[];
}

export interface ChainMember {
  slug: string;
  nameZh: string;
  nameEn: string;
  id: number;
  depth: number;
  stage: number;
  trigger: string | null;
  minLevel: number | null;
  item: string | null;
  needsTrade: boolean;
  timeOfDay: string | null;
  knownMove: string | null;
  knownMoveType: string | null;
  minHappiness: number | null;
}

export interface EvolutionChain {
  id: number;
  family: string;
  members: ChainMember[];
  focusIds: number[];
}

interface PokemonDataset {
  generatedAt: string;
  count: number;
  pokemon: PokemonRecord[];
  chains: EvolutionChain[];
}

export interface BattleCardState {
  pokemonId: number;
  currentHp: number;
  maxHp: number;
  shield: number;
  charge: number;
  fainted: boolean;
}

export interface BattleState {
  playerTeam: BattleCardState[];
  aiTeam: BattleCardState[];
  turn: number;
  logs: string[];
  winner: Winner;
}

const dataset = rawData as PokemonDataset;

export const pokemonData = dataset;
export const pokemonList = dataset.pokemon;
export const evolutionChains = dataset.chains;
export const pokemonById = new Map(pokemonList.map((pokemon) => [pokemon.id, pokemon]));

export const typeMeta: Record<
  string,
  { label: string; color: string; glow: string; ring: string }
> = {
  normal: { label: "一般", color: "#c7c1aa", glow: "rgba(199, 193, 170, 0.35)", ring: "#e5d7a8" },
  fire: { label: "火", color: "#ff8d5d", glow: "rgba(255, 141, 93, 0.35)", ring: "#ffc073" },
  water: { label: "水", color: "#5ab8ff", glow: "rgba(90, 184, 255, 0.35)", ring: "#88e0ff" },
  grass: { label: "草", color: "#6ce57e", glow: "rgba(108, 229, 126, 0.35)", ring: "#a7ff78" },
  electric: { label: "电", color: "#ffd34d", glow: "rgba(255, 211, 77, 0.35)", ring: "#fff59b" },
  ice: { label: "冰", color: "#8ff4ff", glow: "rgba(143, 244, 255, 0.35)", ring: "#d7ffff" },
  fighting: { label: "格斗", color: "#ff7a7a", glow: "rgba(255, 122, 122, 0.35)", ring: "#ffb39f" },
  poison: { label: "毒", color: "#d178ff", glow: "rgba(209, 120, 255, 0.35)", ring: "#f2a8ff" },
  ground: { label: "地面", color: "#d7a65d", glow: "rgba(215, 166, 93, 0.35)", ring: "#f3cf8d" },
  flying: { label: "飞行", color: "#95b8ff", glow: "rgba(149, 184, 255, 0.35)", ring: "#d9e2ff" },
  psychic: { label: "超能力", color: "#ff63b3", glow: "rgba(255, 99, 179, 0.35)", ring: "#ffb1db" },
  bug: { label: "虫", color: "#b8e35b", glow: "rgba(184, 227, 91, 0.35)", ring: "#e5ff89" },
  rock: { label: "岩石", color: "#d2b56d", glow: "rgba(210, 181, 109, 0.35)", ring: "#f1dd96" },
  ghost: { label: "幽灵", color: "#8d8aff", glow: "rgba(141, 138, 255, 0.35)", ring: "#c2c0ff" },
  dragon: { label: "龙", color: "#7674ff", glow: "rgba(118, 116, 255, 0.35)", ring: "#a9a7ff" },
  dark: { label: "恶", color: "#74707c", glow: "rgba(116, 112, 124, 0.35)", ring: "#c4b9d0" },
  steel: { label: "钢", color: "#94b7d1", glow: "rgba(148, 183, 209, 0.35)", ring: "#dcefff" },
  fairy: { label: "妖精", color: "#ffb6d7", glow: "rgba(255, 182, 215, 0.35)", ring: "#ffe0f2" },
};

const typeChart: Record<string, Record<string, number>> = {
  fire: { grass: 2, bug: 2, ice: 2, water: 0.5, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, grass: 0.5, water: 0.5, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5 },
  fighting: { normal: 2, rock: 2, ice: 2, dark: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, bug: 2, fighting: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { ghost: 2, psychic: 2, dark: 0.5, normal: 0 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { ghost: 2, psychic: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { rock: 2, ice: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

export function getPokemon(id: number) {
  return pokemonById.get(id);
}

export function filterPokemon(
  list: PokemonRecord[],
  {
    search,
    type,
    sort,
  }: {
    search: string;
    type: string;
    sort: SortMode;
  }
) {
  const keyword = search.trim().toLowerCase();

  const filtered = list.filter((pokemon) => {
    const matchesSearch =
      !keyword ||
      pokemon.nameZh.toLowerCase().includes(keyword) ||
      pokemon.nameEn.toLowerCase().includes(keyword) ||
      pokemon.dex.toLowerCase().includes(keyword) ||
      pokemon.types.some((typeName) => typeName.toLowerCase().includes(keyword));

    const matchesType = type === "all" || pokemon.typeKeys.includes(type);
    return matchesSearch && matchesType;
  });

  const sorters: Record<SortMode, (a: PokemonRecord, b: PokemonRecord) => number> = {
    dex: (a, b) => a.id - b.id,
    total: (a, b) => b.statTotal - a.statTotal || a.id - b.id,
    attack: (a, b) => b.stats["攻击"] - a.stats["攻击"] || a.id - b.id,
    speed: (a, b) => b.stats["速度"] - a.stats["速度"] || a.id - b.id,
    name: (a, b) => a.nameZh.localeCompare(b.nameZh, "zh-Hans-CN"),
  };

  return filtered.sort(sorters[sort]);
}

export function getTypeMultiplier(attackerTypes: string[], defenderTypes: string[]) {
  return attackerTypes.reduce((best, attackerType) => {
    const map = typeChart[attackerType] ?? {};
    const total = defenderTypes.reduce((multiplier, defenderType) => {
      return multiplier * (map[defenderType] ?? 1);
    }, 1);

    return Math.max(best, total);
  }, 1);
}

export function formatEvolutionTrigger(member: ChainMember) {
  if (!member.trigger) return "起始形态";
  if (member.item) return `使用 ${member.item}`;
  if (member.minLevel) return `Lv.${member.minLevel}`;
  if (member.minHappiness) return `亲密度 ${member.minHappiness}+`;
  if (member.needsTrade) return "交换进化";
  if (member.timeOfDay) return `${member.timeOfDay} 进化`;
  if (member.knownMove) return `学会 ${member.knownMove}`;
  return member.trigger;
}

export function pickRandomDeck(source: PokemonRecord[], excluded: number[] = [], size = 3) {
  const candidates = source.filter((pokemon) => !excluded.includes(pokemon.id));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size).map((pokemon) => pokemon.id);
}

export function pickInitialDeck(source: PokemonRecord[], excluded: number[] = [], size = 3) {
  return source
    .filter((pokemon) => !excluded.includes(pokemon.id))
    .sort((left, right) => right.statTotal - left.statTotal || left.id - right.id)
    .slice(0, size)
    .map((pokemon) => pokemon.id);
}

export function createTeam(ids: number[]): BattleCardState[] {
  return ids
    .map((id) => getPokemon(id))
    .filter((pokemon): pokemon is PokemonRecord => Boolean(pokemon))
    .map((pokemon) => ({
      pokemonId: pokemon.id,
      currentHp: Math.round(pokemon.stats["HP"] * 2.4 + 110),
      maxHp: Math.round(pokemon.stats["HP"] * 2.4 + 110),
      shield: 0,
      charge: 1,
      fainted: false,
    }));
}

export function createBattleState(playerIds: number[], aiIds: number[]): BattleState {
  return {
    playerTeam: createTeam(playerIds),
    aiTeam: createTeam(aiIds),
    turn: 1,
    logs: ["战斗开始：选择你的行动，抢下这场赛博擂台。"],
    winner: null,
  };
}

export function getActiveIndex(team: BattleCardState[]) {
  return team.findIndex((member) => !member.fainted);
}

function isTeamDefeated(team: BattleCardState[]) {
  return team.every((member) => member.fainted);
}

function getActionLabel(action: BattleAction) {
  if (action === "guard") return "棱镜护盾";
  if (action === "burst") return "属性爆发";
  return "霓虹突袭";
}

function resolveDamage(target: BattleCardState, incoming: number) {
  const next = { ...target };
  let remaining = incoming;
  let absorbed = 0;

  if (next.shield > 0) {
    absorbed = Math.min(next.shield, remaining);
    next.shield -= absorbed;
    remaining -= absorbed;
  }

  next.currentHp = Math.max(0, next.currentHp - remaining);
  next.fainted = next.currentHp <= 0;

  return { target: next, dealt: remaining, absorbed };
}

function calculateDamage(
  attacker: PokemonRecord,
  defender: PokemonRecord,
  action: BattleAction
) {
  const attackStat =
    action === "burst" ? attacker.stats["特攻"] : attacker.stats["攻击"];
  const defenseStat =
    action === "burst" ? defender.stats["特防"] : defender.stats["防御"];
  const multiplier = getTypeMultiplier(attacker.typeKeys, defender.typeKeys);
  const burstBonus = action === "burst" ? 1.22 : 1;
  const base = Math.max(
    18,
    attackStat * (action === "burst" ? 1.02 : 0.82) +
      attacker.stats["速度"] * 0.22 -
      defenseStat * 0.32 +
      multiplier * 10
  );

  return Math.round(base * burstBonus);
}

function chooseAiAction(
  aiState: BattleCardState,
  aiPokemon: PokemonRecord,
  playerPokemon: PokemonRecord
): BattleAction {
  const multiplier = getTypeMultiplier(aiPokemon.typeKeys, playerPokemon.typeKeys);
  const hpRatio = aiState.currentHp / aiState.maxHp;

  if (aiState.charge >= 2 && multiplier >= 1.5) {
    return "burst";
  }

  if (hpRatio < 0.38 && aiState.shield < 24) {
    return "guard";
  }

  if (aiState.charge >= 3) {
    return "burst";
  }

  return "strike";
}

function autoSwitchLogs(sideLabel: "我方" | "对手", team: BattleCardState[]) {
  const nextIndex = getActiveIndex(team);
  if (nextIndex === -1) return null;
  const pokemon = getPokemon(team[nextIndex].pokemonId);
  return pokemon ? `${sideLabel}换上 ${pokemon.nameZh} 继续战斗。` : null;
}

export function resolveBattleTurn(
  state: BattleState,
  playerAction: BattleAction
): BattleState {
  if (state.winner) return state;

  const nextPlayerTeam = state.playerTeam.map((member) => ({ ...member }));
  const nextAiTeam = state.aiTeam.map((member) => ({ ...member }));
  const playerIndex = getActiveIndex(nextPlayerTeam);
  const aiIndex = getActiveIndex(nextAiTeam);

  if (playerIndex === -1 || aiIndex === -1) {
    return { ...state, winner: playerIndex === -1 ? "ai" : "player" };
  }

  const playerFighter = nextPlayerTeam[playerIndex];
  const aiFighter = nextAiTeam[aiIndex];
  const playerPokemon = getPokemon(playerFighter.pokemonId)!;
  const aiPokemon = getPokemon(aiFighter.pokemonId)!;
  const aiAction = chooseAiAction(aiFighter, aiPokemon, playerPokemon);
  const logs: string[] = [];

  if (playerAction === "guard") {
    playerFighter.shield += Math.round(playerPokemon.stats["防御"] * 0.4 + 26);
    playerFighter.currentHp = Math.min(
      playerFighter.maxHp,
      playerFighter.currentHp + Math.round(playerPokemon.stats["特防"] * 0.14 + 8)
    );
    playerFighter.charge = Math.min(4, playerFighter.charge + 1);
    logs.push(`我方 ${playerPokemon.nameZh} 展开棱镜护盾，吸收下一波火力。`);
  }

  if (aiAction === "guard") {
    aiFighter.shield += Math.round(aiPokemon.stats["防御"] * 0.4 + 26);
    aiFighter.currentHp = Math.min(
      aiFighter.maxHp,
      aiFighter.currentHp + Math.round(aiPokemon.stats["特防"] * 0.14 + 8)
    );
    aiFighter.charge = Math.min(4, aiFighter.charge + 1);
    logs.push(`对手 ${aiPokemon.nameZh} 充能防御阵列。`);
  }

  const turnOrder = [
    {
      side: "player" as const,
      action: playerAction,
      initiative:
        playerPokemon.stats["速度"] +
        (playerAction === "burst" ? 12 : playerAction === "guard" ? 4 : 0),
    },
    {
      side: "ai" as const,
      action: aiAction,
      initiative:
        aiPokemon.stats["速度"] +
        (aiAction === "burst" ? 12 : aiAction === "guard" ? 4 : 0),
    },
  ].sort((a, b) => b.initiative - a.initiative);

  for (const actor of turnOrder) {
    const actingTeam = actor.side === "player" ? nextPlayerTeam : nextAiTeam;
    const targetTeam = actor.side === "player" ? nextAiTeam : nextPlayerTeam;
    const actingIndex = getActiveIndex(actingTeam);
    const targetIndex = getActiveIndex(targetTeam);

    if (actingIndex === -1 || targetIndex === -1) continue;
    if (actor.action === "guard") continue;

    const actingState = actingTeam[actingIndex];
    const targetState = targetTeam[targetIndex];
    const actingPokemon = getPokemon(actingState.pokemonId)!;
    const targetPokemon = getPokemon(targetState.pokemonId)!;

    let resolvedAction = actor.action;
    if (resolvedAction === "burst" && actingState.charge < 2) {
      resolvedAction = "strike";
      logs.push(
        `${actor.side === "player" ? "我方" : "对手"} ${actingPokemon.nameZh} 充能不足，只能改用霓虹突袭。`
      );
    }

    const rawDamage = calculateDamage(actingPokemon, targetPokemon, resolvedAction);
    const { target, dealt, absorbed } = resolveDamage(targetState, rawDamage);
    targetTeam[targetIndex] = target;

    if (resolvedAction === "burst") {
      actingState.charge = Math.max(0, actingState.charge - 2);
    } else {
      actingState.charge = Math.min(4, actingState.charge + 1);
    }

    const typeMultiplier = getTypeMultiplier(
      actingPokemon.typeKeys,
      targetPokemon.typeKeys
    );
    const multiplierCopy =
      typeMultiplier >= 1.5 ? "效果拔群" : typeMultiplier < 1 ? "被克制" : "命中";

    logs.push(
      `${actor.side === "player" ? "我方" : "对手"} ${actingPokemon.nameZh} 使用 ${getActionLabel(
        resolvedAction
      )}，对 ${targetPokemon.nameZh} 造成 ${dealt} 伤害${
        absorbed > 0 ? `（护盾吸收 ${absorbed}）` : ""
      }，${multiplierCopy}。`
    );

    if (target.fainted) {
      logs.push(`${targetPokemon.nameZh} 倒下。`);
      const switchLog = autoSwitchLogs(actor.side === "player" ? "对手" : "我方", targetTeam);
      if (switchLog) logs.push(switchLog);
    }
  }

  const winner: Winner = isTeamDefeated(nextPlayerTeam)
    ? "ai"
    : isTeamDefeated(nextAiTeam)
      ? "player"
      : null;

  if (winner) {
    logs.push(winner === "player" ? "你赢下了这场赛博擂台。" : "对手赢下了这场赛博擂台。");
  }

  return {
    playerTeam: nextPlayerTeam,
    aiTeam: nextAiTeam,
    turn: state.turn + 1,
    logs: [...logs, ...state.logs].slice(0, 10),
    winner,
  };
}
