"use client";
/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useDeferredValue, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import {
  AppMode,
  BattleAction,
  BattleState,
  PokemonRecord,
  SortMode,
  ViewMode,
  createBattleState,
  evolutionChains,
  filterPokemon,
  formatEvolutionTrigger,
  getActiveIndex,
  getPokemon,
  getTypeMultiplier,
  pickInitialDeck,
  pickRandomDeck,
  pokemonList,
  resolveBattleTurn,
  typeMeta,
} from "@/lib/pokemon";

const PokemonScene = dynamic(() => import("@/components/pokemon-scene"), {
  ssr: false,
  loading: () => (
    <div className="panel grid h-[420px] place-items-center rounded-[28px] text-sm text-slate-300">
      正在装载 3D 全息舞台…
    </div>
  ),
});

const TYPE_OPTIONS = ["all", ...Object.keys(typeMeta)];
const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "cards", label: "卡片矩阵" },
  { key: "table", label: "数据表" },
  { key: "evolution", label: "进化链" },
];
const MODE_OPTIONS: { key: AppMode; label: string; copy: string }[] = [
  { key: "dex", label: "图鉴档案", copy: "浏览、筛选、比较前 50 位宝可梦。" },
  { key: "battle", label: "卡牌对战", copy: "组建 3 卡牌战队，在赛博擂台里回合对决。" },
];
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "dex", label: "按图鉴编号" },
  { value: "total", label: "按总种族值" },
  { value: "attack", label: "按攻击" },
  { value: "speed", label: "按速度" },
  { value: "name", label: "按中文名" },
];
const ACTIONS: { key: BattleAction; title: string; copy: string }[] = [
  { key: "strike", title: "霓虹突袭", copy: "基础攻击，稳定叠加爆发充能。" },
  { key: "guard", title: "棱镜护盾", copy: "立刻获得护盾与少量回复。" },
  { key: "burst", title: "属性爆发", copy: "消耗 2 点充能，打出高额类型伤害。" },
];

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/6">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min((value / 160) * 100, 100)}%`,
            background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.82))`,
            boxShadow: `0 0 18px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

function HpBar({
  current,
  max,
  shield,
  accent,
}: {
  current: number;
  max: number;
  shield: number;
  accent: string;
}) {
  const hpPct = Math.max(0, Math.min(100, (current / max) * 100));
  const shieldPct = Math.max(0, Math.min(100, (shield / max) * 100));

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>HP {current}/{max}</span>
        <span>护盾 {shield}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/6">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${hpPct}%`,
            background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.85))`,
          }}
        />
        {shieldPct > 0 ? (
          <div
            className="absolute inset-y-0 rounded-full bg-cyan-200/55"
            style={{ left: `${hpPct}%`, width: `${Math.min(100 - hpPct, shieldPct)}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function BattleAvatar({
  pokemon,
  perspective,
}: {
  pokemon: PokemonRecord;
  perspective: "player" | "ai";
}) {
  const accent = typeMeta[pokemon.typeKeys[0]]?.color ?? "#68f0ff";
  const typeEdge = typeMeta[pokemon.typeKeys[1]]?.ring ?? "#5b83ff";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[28px] border border-white/10 p-4",
        perspective === "player" ? "bg-cyan-500/6" : "bg-fuchsia-500/6"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 24%, ${accent}32, transparent 34%), radial-gradient(circle at 85% 18%, ${typeEdge}22, transparent 22%)`,
        }}
      />
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">
              {perspective === "player" ? "Player active" : "AI active"}
            </p>
            <h3 className="font-display text-3xl uppercase">{pokemon.nameZh}</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200">
            {pokemon.dex}
          </span>
        </div>
        <div className="flex gap-2">
          {pokemon.typeKeys.map((type) => {
            const meta = typeMeta[type];
            return (
              <span
                key={type}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ color: meta.color, background: meta.glow }}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
        <div className="grid place-items-center rounded-[22px] border border-white/8 bg-black/15 p-6">
          <img
            src={pokemon.artwork}
            alt={pokemon.nameZh}
            className={clsx(
              "h-44 w-44 object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.45)]",
              perspective === "ai" ? "scale-x-[-1]" : ""
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function PokemonCyberArenaApp() {
  const sceneMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [mode, setMode] = useState<AppMode>("dex");
  const [view, setView] = useState<ViewMode>("cards");
  const [sort, setSort] = useState<SortMode>("dex");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState(25);
  const [deckIds, setDeckIds] = useState<number[]>([25, 6, 9]);
  const [aiDeckIds, setAiDeckIds] = useState<number[]>(() => pickInitialDeck(pokemonList, [25, 6, 9]));
  const [battle, setBattle] = useState<BattleState | null>(null);

  const visiblePokemon = filterPokemon(pokemonList, {
    search: deferredSearch,
    type: typeFilter,
    sort,
  });

  const effectiveSelectedId = visiblePokemon.some((pokemon) => pokemon.id === selectedId)
    ? selectedId
    : (visiblePokemon[0]?.id ?? pokemonList[0].id);

  const selectedPokemon = getPokemon(effectiveSelectedId) ?? visiblePokemon[0] ?? pokemonList[0];
  const primaryType = typeMeta[selectedPokemon.typeKeys[0]];
  const activeChain = evolutionChains.find(
    (chain) => chain.id === selectedPokemon.evolutionChainId
  );
  const playerDeck = deckIds.map((id) => getPokemon(id)).filter((pokemon): pokemon is PokemonRecord => Boolean(pokemon));
  const aiDeck = aiDeckIds.map((id) => getPokemon(id)).filter((pokemon): pokemon is PokemonRecord => Boolean(pokemon));
  const playerActiveIndex = battle ? getActiveIndex(battle.playerTeam) : -1;
  const aiActiveIndex = battle ? getActiveIndex(battle.aiTeam) : -1;
  const playerActive =
    battle && playerActiveIndex !== -1 ? getPokemon(battle.playerTeam[playerActiveIndex].pokemonId) : null;
  const aiActive =
    battle && aiActiveIndex !== -1 ? getPokemon(battle.aiTeam[aiActiveIndex].pokemonId) : null;
  const playerMultiplier =
    playerActive && aiActive ? getTypeMultiplier(playerActive.typeKeys, aiActive.typeKeys) : 1;
  const aiMultiplier =
    aiActive && playerActive ? getTypeMultiplier(aiActive.typeKeys, playerActive.typeKeys) : 1;

  function updateSelected(nextId: number) {
    startTransition(() => {
      setSelectedId(nextId);
    });
  }

  function toggleDeck(id: number) {
    if (battle) return;

    setDeckIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 3) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  }

  function randomizeAi() {
    const next = pickRandomDeck(pokemonList, deckIds);
    setAiDeckIds(next);
  }

  function startBattle() {
    if (deckIds.length !== 3) return;
    const nextAiDeck = aiDeckIds.length === 3 ? aiDeckIds : pickRandomDeck(pokemonList, deckIds);
    setAiDeckIds(nextAiDeck);
    setBattle(createBattleState(deckIds, nextAiDeck));
    setMode("battle");
  }

  function performAction(action: BattleAction) {
    if (!battle || battle.winner) return;
    setBattle((current) => (current ? resolveBattleTurn(current, action) : current));
  }

  function resetBattle() {
    setBattle(null);
    setAiDeckIds(pickRandomDeck(pokemonList, deckIds));
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel rounded-[32px] border border-cyan-300/12 px-6 py-6 sm:px-8"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="mb-3 text-xs uppercase tracking-[0.38em] text-cyan-200">
                Next.js / Tailwind / Framer Motion / React Three Fiber
              </p>
              <h1 className="font-display text-5xl uppercase leading-none sm:text-7xl">
                Pokemon Cyber Arena
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                一个真正现代前端栈重构版的中文宝可梦站点：上半区是用 React Three Fiber
                驱动的全息 3D 展示，下半区则把图鉴探索和卡牌对战并进同一个战术面板里。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { value: pokemonList.length, label: "前 50 位" },
                { value: evolutionChains.length, label: "进化家族" },
                { value: Object.keys(typeMeta).length, label: "属性类型" },
                { value: "3D + Battle", label: "升级方向" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-cyan-300/12 bg-slate-950/35 px-4 py-4"
                >
                  <div className="font-display text-2xl text-white">{item.value}</div>
                  <div className="mt-1 text-xs tracking-[0.18em] text-slate-400 uppercase">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_420px]">
          <motion.div
            layout
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel overflow-hidden rounded-[32px] p-6 sm:p-7"
          >
            <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/90">
                  Holographic creature engine
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-cyan-300/18 bg-cyan-300/8 px-4 py-2 font-display text-sm tracking-[0.18em] text-cyan-100">
                    {selectedPokemon.dex}
                  </span>
                  <div>
                    <h2 className="font-display text-4xl uppercase sm:text-6xl">
                      {selectedPokemon.nameZh}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {selectedPokemon.nameEn} · {selectedPokemon.genus || "原型档案"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPokemon.typeKeys.map((type) => {
                  const meta = typeMeta[type];
                  return (
                    <span
                      key={type}
                      className="rounded-full px-4 py-2 text-sm font-medium"
                      style={{
                        color: meta.color,
                        background: meta.glow,
                        border: `1px solid ${meta.color}55`,
                      }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
              {sceneMounted ? (
                <PokemonScene pokemon={selectedPokemon} />
              ) : (
                <div className="panel grid h-[420px] place-items-center rounded-[28px] text-sm text-slate-300">
                  正在装载 3D 全息舞台…
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="rounded-[24px] border border-cyan-300/12 bg-slate-950/35 p-5">
                  <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                    <span>档案摘要</span>
                    <span className="text-cyan-200">Live</span>
                  </div>
                  <p className="text-sm leading-7 text-slate-300">{selectedPokemon.flavor}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "总种族值", value: selectedPokemon.statTotal },
                    { label: "身高", value: `${selectedPokemon.heightM}m` },
                    { label: "体重", value: `${selectedPokemon.weightKg}kg` },
                    {
                      label: "完整进化成员",
                      value: selectedPokemon.evolutionFamily?.length ?? 1,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[20px] border border-cyan-300/10 bg-white/[0.03] px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-2 font-display text-3xl text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-cyan-300/12 bg-slate-950/35 p-5">
                  <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                    <span>六维战力</span>
                    <span>{selectedPokemon.statTotal}</span>
                  </div>
                  <div className="grid gap-3">
                    {Object.entries(selectedPokemon.stats).map(([label, value]) => (
                      <StatBar
                        key={label}
                        label={label}
                        value={value}
                        color={primaryType.color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            className="panel rounded-[32px] p-5"
          >
            <div className="grid gap-5">
              <div className="rounded-[24px] border border-cyan-300/10 bg-slate-950/35 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/90">Mode switch</p>
                <div className="mt-4 grid gap-3">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMode(option.key)}
                      className={clsx(
                        "rounded-[20px] border px-4 py-4 text-left transition",
                        mode === option.key
                          ? "border-cyan-300/45 bg-cyan-300/12 text-white"
                          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-cyan-300/25"
                      )}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="mt-1 text-sm text-slate-400">{option.copy}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-300/10 bg-slate-950/35 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/90">
                    Evolution pulse
                  </p>
                  <span className="rounded-full bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                    {activeChain?.members.length ?? 1} nodes
                  </span>
                </div>
                <div className="grid gap-3">
                  {(activeChain?.members ?? []).map((member, index) => {
                    const pokemon = getPokemon(member.id);
                    return (
                      <button
                        key={`${member.id}-${index}`}
                        type="button"
                        onClick={() => pokemon && updateSelected(pokemon.id)}
                        className={clsx(
                          "flex items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition",
                          pokemon?.id === selectedPokemon.id
                            ? "border-cyan-300/45 bg-cyan-300/10"
                            : "border-white/8 bg-white/[0.03] hover:border-cyan-300/25"
                        )}
                      >
                        {pokemon ? (
                          <img
                            src={pokemon.sprite || pokemon.artwork}
                            alt={member.nameZh}
                            className="h-12 w-12 rounded-xl bg-white/5 object-contain"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-white/5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{member.nameZh}</p>
                          <p className="truncate text-xs text-slate-400">
                            {index === 0 ? "起始形态" : formatEvolutionTrigger(member)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-300/10 bg-slate-950/35 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/90">Battle deck</p>
                <div className="mt-4 grid gap-3">
                  {playerDeck.map((pokemon) => (
                    <button
                      key={pokemon.id}
                      type="button"
                      onClick={() => updateSelected(pokemon.id)}
                      className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-left hover:border-cyan-300/25"
                    >
                      <img
                        src={pokemon.sprite || pokemon.artwork}
                        alt={pokemon.nameZh}
                        className="h-12 w-12 rounded-xl bg-white/5 object-contain"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-white">{pokemon.nameZh}</p>
                        <p className="text-xs text-slate-400">{pokemon.types.join(" / ")}</p>
                      </div>
                      <span className="font-display text-sm text-cyan-100">{pokemon.statTotal}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="panel rounded-[32px] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">Explorer controls</p>
              <h2 className="mt-3 font-display text-3xl uppercase sm:text-4xl">
                {mode === "dex" ? "图鉴探索矩阵" : "卡牌对战擂台"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                {mode === "dex"
                  ? "用搜索、属性和多视图浏览前 50 位宝可梦。每一次选择都会同步 3D 舞台。"
                  : "挑 3 张牌组队，对手也会自动生成 3 张牌。利用属性克制、护盾和爆发管理拿下比赛。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mode === "dex"
                ? VIEW_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setView(option.key)}
                      className={clsx(
                        "rounded-full border px-4 py-2 text-sm transition",
                        view === option.key
                          ? "border-cyan-300/45 bg-cyan-300/12 text-white"
                          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-cyan-300/25"
                      )}
                    >
                      {option.label}
                    </button>
                  ))
                : (
                  <>
                    <button
                      type="button"
                      onClick={randomizeAi}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-300/25"
                    >
                      重新洗 AI 牌组
                    </button>
                    <button
                      type="button"
                      onClick={battle ? resetBattle : startBattle}
                      className="rounded-full border border-cyan-300/45 bg-cyan-300/12 px-4 py-2 text-sm text-white transition hover:bg-cyan-300/18"
                    >
                      {battle ? "重置战局" : "开始对战"}
                    </button>
                  </>
                )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === "dex" ? (
              <motion.div
                key="dex"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid gap-5"
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索：皮卡丘 / Pikachu / #025 / 电"
                    className="rounded-[20px] border border-cyan-300/12 bg-slate-950/35 px-5 py-4 outline-none transition focus:border-cyan-300/35"
                  />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortMode)}
                    className="rounded-[20px] border border-cyan-300/12 bg-slate-950/35 px-5 py-4 outline-none transition focus:border-cyan-300/35"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((type) => {
                    const meta = typeMeta[type];
                    const isActive = typeFilter === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        className={clsx(
                          "rounded-full border px-4 py-2 text-sm transition",
                          isActive
                            ? "border-cyan-300/45 bg-cyan-300/12 text-white"
                            : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-cyan-300/25"
                        )}
                        style={isActive && meta ? { color: meta.color } : undefined}
                      >
                        {type === "all" ? "全部" : meta.label}
                      </button>
                    );
                  })}
                </div>

                {view === "cards" ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {visiblePokemon.map((pokemon, index) => {
                      const primary = typeMeta[pokemon.typeKeys[0]]?.color ?? "#68f0ff";
                      const isSelected = pokemon.id === selectedPokemon.id;
                      const inDeck = deckIds.includes(pokemon.id);

                      return (
                        <motion.article
                          key={pokemon.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.012 }}
                          onClick={() => updateSelected(pokemon.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              updateSelected(pokemon.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={clsx(
                            "relative overflow-hidden rounded-[26px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60",
                            isSelected
                              ? "border-cyan-300/45 bg-cyan-300/10"
                              : "border-white/8 bg-white/[0.03] hover:border-cyan-300/25"
                          )}
                        >
                          <div
                            className="pointer-events-none absolute inset-0 opacity-60"
                            style={{
                              background: `radial-gradient(circle at top right, ${primary}24, transparent 32%)`,
                            }}
                          />
                          <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-semibold text-white">{pokemon.nameZh}</h3>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                  {pokemon.dex} / {pokemon.nameEn}
                                </p>
                              </div>
                              {inDeck ? (
                                <span className="rounded-full bg-cyan-300/12 px-3 py-1 text-xs text-cyan-100">
                                  已入牌组
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {pokemon.typeKeys.map((type) => {
                                const meta = typeMeta[type];
                                return (
                                  <span
                                    key={type}
                                    className="rounded-full px-3 py-1 text-xs"
                                    style={{ color: meta.color, background: meta.glow }}
                                  >
                                    {meta.label}
                                  </span>
                                );
                              })}
                            </div>
                            <div className="grid min-h-40 place-items-center rounded-[22px] border border-white/8 bg-black/15 p-4">
                              <img
                                src={pokemon.artwork}
                                alt={pokemon.nameZh}
                                className="h-32 w-32 object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,0.4)]"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                ["总值", pokemon.statTotal],
                                ["攻击", pokemon.stats["攻击"]],
                                ["速度", pokemon.stats["速度"]],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3"
                                >
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                    {label}
                                  </p>
                                  <p className="mt-1 font-display text-xl text-white">{value}</p>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleDeck(pokemon.id);
                              }}
                              className={clsx(
                                "rounded-full border px-4 py-2 text-sm transition",
                                inDeck
                                  ? "border-cyan-300/25 bg-cyan-300/8 text-cyan-50"
                                  : "border-white/8 bg-white/[0.03] text-slate-200 hover:border-cyan-300/25"
                              )}
                            >
                              {inDeck ? "移出战队" : "加入战队"}
                            </button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                ) : null}

                {view === "table" ? (
                  <div className="cyber-scrollbar overflow-auto rounded-[28px] border border-cyan-300/12">
                    <table className="min-w-[1080px] w-full text-left">
                      <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                        <tr>
                          {["编号", "宝可梦", "属性", "总值", "HP", "攻击", "防御", "特攻", "特防", "速度"].map((label) => (
                            <th key={label} className="px-4 py-4 font-medium">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePokemon.map((pokemon) => (
                          <tr
                            key={pokemon.id}
                            onClick={() => updateSelected(pokemon.id)}
                            className={clsx(
                              "cursor-pointer border-t border-white/6 transition hover:bg-cyan-300/6",
                              pokemon.id === selectedPokemon.id ? "bg-cyan-300/8" : ""
                            )}
                          >
                            <td className="px-4 py-4">{pokemon.dex}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={pokemon.sprite || pokemon.artwork}
                                  alt={pokemon.nameZh}
                                  className="h-10 w-10 rounded-xl bg-white/5 object-contain"
                                />
                                <div>
                                  <div className="font-medium text-white">{pokemon.nameZh}</div>
                                  <div className="text-xs text-slate-400">{pokemon.nameEn}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">{pokemon.types.join(" / ")}</td>
                            <td className="px-4 py-4">{pokemon.statTotal}</td>
                            <td className="px-4 py-4">{pokemon.stats["HP"]}</td>
                            <td className="px-4 py-4">{pokemon.stats["攻击"]}</td>
                            <td className="px-4 py-4">{pokemon.stats["防御"]}</td>
                            <td className="px-4 py-4">{pokemon.stats["特攻"]}</td>
                            <td className="px-4 py-4">{pokemon.stats["特防"]}</td>
                            <td className="px-4 py-4">{pokemon.stats["速度"]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {view === "evolution" ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {evolutionChains
                      .filter((chain) =>
                        chain.members.some((member) =>
                          visiblePokemon.some((pokemon) => pokemon.id === member.id)
                        )
                      )
                      .map((chain) => (
                        <div
                          key={chain.id}
                          className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5"
                        >
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/90">
                                Evolution family
                              </p>
                              <h3 className="mt-2 text-2xl font-semibold text-white">{chain.family}</h3>
                            </div>
                            <span className="rounded-full bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                              命中 {chain.focusIds.length}
                            </span>
                          </div>
                          <div className="cyber-scrollbar flex gap-3 overflow-auto pb-1">
                            {chain.members.map((member, index) => {
                              const pokemon = getPokemon(member.id);
                              const accent = pokemon
                                ? typeMeta[pokemon.typeKeys[0]]?.color ?? "#68f0ff"
                                : "#68f0ff";
                              return (
                                <div key={`${chain.id}-${member.id}-${index}`} className="flex items-center gap-3">
                                  {index > 0 ? (
                                    <div className="min-w-24 text-center text-xs text-slate-400">
                                      <div className="mb-1 text-cyan-200">→</div>
                                      {formatEvolutionTrigger(member)}
                                    </div>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => pokemon && updateSelected(pokemon.id)}
                                    className={clsx(
                                      "min-w-40 rounded-[24px] border px-4 py-4 text-left transition",
                                      pokemon?.id === selectedPokemon.id
                                        ? "border-cyan-300/45 bg-cyan-300/10"
                                        : "border-white/8 bg-white/[0.03] hover:border-cyan-300/25"
                                    )}
                                  >
                                    <div className="grid place-items-center rounded-[18px] border border-white/8 bg-black/10 p-4">
                                      {pokemon ? (
                                        <img
                                          src={pokemon.artwork}
                                          alt={member.nameZh}
                                          className="h-20 w-20 object-contain"
                                        />
                                      ) : (
                                        <div className="h-20 w-20 rounded-2xl bg-white/5" />
                                      )}
                                    </div>
                                    <div className="mt-3">
                                      <p className="font-medium text-white">{member.nameZh}</p>
                                      <p className="text-xs text-slate-400">
                                        {member.id ? `#${String(member.id).padStart(3, "0")}` : member.nameEn}
                                      </p>
                                      <p className="mt-2 text-xs" style={{ color: accent }}>
                                        {pokemon?.types.join(" / ")}
                                      </p>
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="battle"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]"
              >
                <div className="grid gap-5">
                  <div className="rounded-[28px] border border-cyan-300/10 bg-slate-950/35 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/90">
                          Your lineup
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">玩家牌组</h3>
                      </div>
                      <span className="rounded-full bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                        {deckIds.length}/3
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {playerDeck.map((pokemon) => (
                        <div
                          key={pokemon.id}
                          className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3"
                        >
                          <img
                            src={pokemon.sprite || pokemon.artwork}
                            alt={pokemon.nameZh}
                            className="h-12 w-12 rounded-xl bg-white/5 object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{pokemon.nameZh}</p>
                            <p className="truncate text-xs text-slate-400">{pokemon.types.join(" / ")}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleDeck(pokemon.id)}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-slate-300">
                      在“图鉴档案”模式下点击卡片即可把宝可梦加入或移出战队。当前版本默认 3v3，
                      AI 也会自动洗出 3 张卡。
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-cyan-300/10 bg-slate-950/35 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/90">
                          Rival lineup
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">AI 牌组</h3>
                      </div>
                      <button
                        type="button"
                        onClick={randomizeAi}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-300/25"
                      >
                        洗牌
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {aiDeck.map((pokemon) => (
                        <div
                          key={pokemon.id}
                          className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3"
                        >
                          <img
                            src={pokemon.sprite || pokemon.artwork}
                            alt={pokemon.nameZh}
                            className="h-12 w-12 rounded-xl bg-white/5 object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{pokemon.nameZh}</p>
                            <p className="truncate text-xs text-slate-400">{pokemon.types.join(" / ")}</p>
                          </div>
                          <span className="font-display text-sm text-cyan-100">{pokemon.statTotal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <div className="rounded-[28px] border border-cyan-300/10 bg-slate-950/35 p-5">
                      {playerActive && battle && playerActiveIndex !== -1 ? (
                        <>
                          <BattleAvatar pokemon={playerActive} perspective="player" />
                          <div className="mt-4">
                            <HpBar
                              current={battle.playerTeam[playerActiveIndex].currentHp}
                              max={battle.playerTeam[playerActiveIndex].maxHp}
                              shield={battle.playerTeam[playerActiveIndex].shield}
                              accent={typeMeta[playerActive.typeKeys[0]]?.color ?? "#68f0ff"}
                            />
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                              <span>充能 {battle.playerTeam[playerActiveIndex].charge}</span>
                              <span>
                                对位倍率 {playerMultiplier >= 1.5 ? "优势" : playerMultiplier < 1 ? "劣势" : "均势"}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid min-h-[380px] place-items-center rounded-[28px] border border-dashed border-white/8 text-center text-slate-400">
                          <div>
                            <p className="font-display text-2xl text-white">准备你的牌组</p>
                            <p className="mt-2 text-sm">集齐 3 张牌后点击“开始对战”。</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-fuchsia-300/10 bg-slate-950/35 p-5">
                      {aiActive && battle && aiActiveIndex !== -1 ? (
                        <>
                          <BattleAvatar pokemon={aiActive} perspective="ai" />
                          <div className="mt-4">
                            <HpBar
                              current={battle.aiTeam[aiActiveIndex].currentHp}
                              max={battle.aiTeam[aiActiveIndex].maxHp}
                              shield={battle.aiTeam[aiActiveIndex].shield}
                              accent={typeMeta[aiActive.typeKeys[0]]?.color ?? "#ff4edb"}
                            />
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                              <span>充能 {battle.aiTeam[aiActiveIndex].charge}</span>
                              <span>
                                对位倍率 {aiMultiplier >= 1.5 ? "优势" : aiMultiplier < 1 ? "劣势" : "均势"}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid min-h-[380px] place-items-center rounded-[28px] border border-dashed border-white/8 text-center text-slate-400">
                          <div>
                            <p className="font-display text-2xl text-white">AI 正待命</p>
                            <p className="mt-2 text-sm">开始战斗后，这里会出现对手的当前出战宝可梦。</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="rounded-[28px] border border-cyan-300/10 bg-slate-950/35 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/90">
                            Battle actions
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold text-white">
                            {battle ? `第 ${battle.turn} 回合` : "战术指令"}
                          </h3>
                        </div>
                        {battle?.winner ? (
                          <span className="rounded-full bg-cyan-300/12 px-4 py-2 text-sm text-cyan-50">
                            {battle.winner === "player" ? "你赢了" : "AI 获胜"}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {ACTIONS.map((action) => (
                          <button
                            key={action.key}
                            type="button"
                            disabled={!battle || Boolean(battle.winner)}
                            onClick={() => performAction(action.key)}
                            className={clsx(
                              "rounded-[22px] border px-4 py-4 text-left transition",
                              battle && !battle.winner
                                ? "border-cyan-300/20 bg-white/[0.03] hover:border-cyan-300/35 hover:bg-cyan-300/8"
                                : "border-white/8 bg-white/[0.02] text-slate-500"
                            )}
                          >
                            <div className="font-medium text-white">{action.title}</div>
                            <div className="mt-1 text-sm text-slate-400">{action.copy}</div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">战术提示</p>
                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            爆发适合在你拥有属性优势时打出；护盾则适合在血量较低、想拖到下一次爆发时使用。
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">牌组切换</p>
                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            当前版本会在一只宝可梦倒下后自动换上下一只未倒下的成员，直到某一方 3 张牌全部失去战斗能力。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-cyan-300/10 bg-slate-950/35 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/90">
                            Combat log
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold text-white">战斗日志</h3>
                        </div>
                        <span className="rounded-full bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                          {battle?.logs.length ?? 0} 条
                        </span>
                      </div>
                      <div className="cyber-scrollbar max-h-[420px] overflow-auto pr-1">
                        <div className="grid gap-3">
                          {(battle?.logs ?? [
                            "等待开战：先完成牌组配置，然后点击“开始对战”。",
                          ]).map((log, index) => (
                            <div
                              key={`${log}-${index}`}
                              className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-slate-300"
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
