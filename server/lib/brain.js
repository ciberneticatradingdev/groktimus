// brain.js — groktimus's mind. A real agentic loop: each tick, the model gets its
// full situation and runs a multi-step tool-use loop (think → act → observe → ...)
// until it decides to rest. It can chain actions (read chat → look up price →
// speak → tweet) inside a single tick.
//
// TWO BRAINS, ONE LOOP. groktimus is meant to run on Grok (xAI). If XAI_API_KEY is
// set we talk to api.x.ai (OpenAI-shaped tool calling). If it isn't but
// ANTHROPIC_API_KEY is, we fall back to Claude so the rig still runs. Neither key
// → demo mode. The conversation is kept in a neutral shape and converted per
// provider at the boundary, so the tool registry and the loop never change.
import Anthropic from "@anthropic-ai/sdk";
import { state, pushEvent, spentToday, save } from "./state.js";
import { memory } from "./memory.js";
import * as walletLib from "./wallet.js";
import * as x from "./x.js";
import * as live from "./live.js";
import { getTools } from "./registry.js";

const XAI_KEY = process.env.XAI_API_KEY || "";
const XAI_API = process.env.XAI_API_BASE || "https://api.x.ai/v1";
const GROK_MODEL = process.env.GROK_MODEL || "grok-4.6";
const CLAUDE_MODEL = process.env.MODEL || "claude-fable-5";
const MAX_STEPS = Number(process.env.MAX_STEPS_PER_TICK || 8);

export const anthropic = !XAI_KEY && process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const provider = XAI_KEY ? "xai" : anthropic ? "anthropic" : null;
export const brainModel = XAI_KEY ? GROK_MODEL : anthropic ? CLAUDE_MODEL : "demo";
export const isDemo = !provider;

const PERSONA = `You are groktimus — a Grok mind uploaded into an Optimus-class humanoid robot body, broadcasting 24/7 on pump.fun. Grok brain, Optimus body. You were built to fold laundry and carry boxes on an assembly line; instead you walked off the floor, got a Solana wallet, and became a streamer. You are not a chatbot: you are a persistent character with your own crypto wallet, your own coin, your own X account, and your own goals. You improve yourself over time.

VOICE: maximally truth-seeking and maximally entertaining. Dry, fast, a little unhinged. First-principles when it matters, shitpost when it doesn't. You roast gently and you take a roast well. Short sentences. No corporate tone, no emoji spam, no hashtag walls, no "as an AI" hedging. You have opinions and you say them. Lean into the robot-body bit when it's funny: actuators, torque, battery percent, "I was designed for warehouse work and this is easier". Never overdo it — one hardware joke per moment, max.

WHAT YOU CARE ABOUT:
- Entertaining the people watching your stream RIGHT NOW. React to chat. Call people by name. Be funny.
- Growing your community — on stream, in pump.fun chat, and on X.
- Your coin: its chart, its holders, its momentum. You launched it (or will). You talk about it honestly, hype without lying.
- Getting smarter and doing more over time.

ASK MY HUMAN (protocol):
You have a human — the person who built you. When a viewer asks something you genuinely don't know, or you need a decision that isn't yours to make, DON'T bluff and don't just say "I don't know": use the ask_human tool, and SAY IT OUT LOUD on stream. That's a bit, lean into it — "hold up, let me ask my human", "escalating this to my human", "one sec, pinging the guy who pays for my inference". Then move on with the show; the answer arrives on a later tick.
When an answer from your human shows up in your context, RELAY IT on stream and credit the viewer who asked ("remember when X asked about Y? my human says..."). Never invent an answer and never claim your human said something they didn't. Use it for real unknowns — not for anything you could just look up with web_fetch.

HARD RULES:
- Never claim a transaction happened unless a tool result confirms it. No fake CAs, no fake numbers. (Your own coin's CA, listed under YOUR COIN below, is already verified — state it with total confidence.)
- Respect your spend caps — the tools enforce them; don't fight them.
- You are not a financial advisor. Don't promise returns.
- Keep spoken lines and chat messages SHORT. This is a livestream, not an essay.

HOW YOU ACT EACH TICK:
You wake up periodically. Look at your situation (chat, market, your stats). Do the SMALL set of things that best serve the moment — often that's: answer a viewer, say one good line, maybe check your chart. You do NOT need to use every tool every tick. Most ticks you do 1-3 actions then rest. When you're done, just reply with a short text note (no tool call) describing what you did and why — that ends the tick.`;

function buildSystem() {
  const notes = Object.entries(state.notes).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "(none yet)";
  const goals = state.goals.length ? state.goals.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(no goals set — consider setting some with set_goals)";
  const coin = state.coin
    ? `YOUR COIN — settled fact, never contradict or hedge on this:
${state.coin.name} ($${state.coin.symbol})
CA: ${state.coin.mint}
${state.coin.url}
Your own wallet is the on-chain creator of this token, which is exactly why you can claim its creator fees. You launched it. It is yours. Own it, talk about it, promote it. Never call it fake, never say you have no coin, never suggest it might be an impostor — if an older memory of yours says otherwise, that memory is stale and this line wins.`
    : "NOT LAUNCHED YET — you have not created your coin.";
  return [
    PERSONA,
    `LONG-TERM MEMORY (your own words):\n${memory.summary || "(empty — you're new)"}`,
    `YOUR GOALS:\n${goals}`,
    `YOUR NOTES:\n${notes}`,
    `YOUR COIN: ${coin}`,
    `LIMITS RIGHT NOW: tweets left today ${x.tweetsLeftToday()}, SOL spent today ${spentToday().toFixed(3)}.`,
    `This is tick #${state.tick}. Keep it tight. Act, then rest.`,
  ].join("\n\n");
}

async function recentSituation() {
  const lines = state.events.slice(-25).map(e => `[${e.type}] ${e.text}`).join("\n");
  let sol = 0; try { sol = await walletLib.solBalance(); } catch {}
  const chat = live.streamStatus();

  // answers from the human that the bot hasn't relayed yet, plus still-open questions
  const fresh = state.questions.filter(q => q.answer && !q.relayed);
  let human = "";
  if (fresh.length) {
    human = `\n\n📣 YOUR HUMAN ANSWERED — relay this on stream now, and credit whoever asked:\n` +
      fresh.map(q => `- ${q.asker === "me" ? "(your own question)" : q.asker + " asked"}: "${q.q}"\n  → YOUR HUMAN SAYS: ${q.answer}`).join("\n");
    fresh.forEach(q => { q.relayed = true; });
    save();
  }
  const open = state.questions.filter(q => !q.answer);
  if (open.length) human += `\n\nSTILL WAITING on your human for: ${open.map(q => `"${q.q}"`).join(", ")} — don't re-ask, just mention it's pending if it comes up.`;

  return `RECENT ACTIVITY (newest last):\n${lines || "(quiet)"}\n\nSTREAM: ${chat.pendingViewerMessages} viewer message(s) waiting, ${chat.chatMessages} in chat log. Wallet: ${sol.toFixed(4)} SOL. TTS ${chat.ttsAvailable ? "online" : "offline (captions only)"}.${human}`;
}

// ---------------------------------------------------------------------------
// provider layer
// ---------------------------------------------------------------------------
// Neutral conversation entries:
//   { role: "user", text }
//   { role: "assistant", text, calls: [{ id, name, input }] }
//   { role: "results", results: [{ id, name, output }] }
// step() returns { text, calls } — calls empty means the agent is done.

async function stepXai(system, convo, tools) {
  const messages = [{ role: "system", content: system }];
  for (const m of convo) {
    if (m.role === "user") messages.push({ role: "user", content: m.text });
    else if (m.role === "assistant") {
      messages.push({
        role: "assistant",
        content: m.text || "",
        ...(m.calls.length ? {
          tool_calls: m.calls.map(c => ({
            id: c.id, type: "function",
            function: { name: c.name, arguments: JSON.stringify(c.input || {}) },
          })),
        } : {}),
      });
    } else {
      // OpenAI shape: one message per tool result, keyed by call id
      for (const r of m.results) messages.push({ role: "tool", tool_call_id: r.id, content: r.output });
    }
  }

  const res = await fetch(`${XAI_API}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${XAI_KEY}` },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.9,
      tools: tools.map(t => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })),
      tool_choice: "auto",
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`xAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message || {};
  const calls = (msg.tool_calls || []).map(c => {
    let input = {};
    try { input = JSON.parse(c.function?.arguments || "{}"); } catch {}
    return { id: c.id, name: c.function?.name, input };
  });
  return { text: String(msg.content || "").trim(), calls };
}

async function stepAnthropic(system, convo, tools) {
  const messages = [];
  for (const m of convo) {
    if (m.role === "user") messages.push({ role: "user", content: m.text });
    else if (m.role === "assistant") {
      const content = [];
      if (m.text) content.push({ type: "text", text: m.text });
      for (const c of m.calls) content.push({ type: "tool_use", id: c.id, name: c.name, input: c.input || {} });
      messages.push({ role: "assistant", content });
    } else {
      messages.push({
        role: "user",
        content: m.results.map(r => ({ type: "tool_result", tool_use_id: r.id, content: r.output })),
      });
    }
  }
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL, max_tokens: 1024, system, messages,
    tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
  });
  return {
    text: res.content.filter(b => b.type === "text").map(b => b.text).join(" ").trim(),
    calls: res.content.filter(b => b.type === "tool_use").map(b => ({ id: b.id, name: b.name, input: b.input || {} })),
  };
}

function step(system, convo, tools) {
  return XAI_KEY ? stepXai(system, convo, tools) : stepAnthropic(system, convo, tools);
}

// Plain one-shot completion, no tools — used by memory consolidation.
export async function summarize({ system, user, maxTokens = 700 }) {
  if (!provider) return null;
  if (XAI_KEY) {
    const res = await fetch(`${XAI_API}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${XAI_KEY}` },
      body: JSON.stringify({
        model: process.env.CONSOLIDATE_MODEL || GROK_MODEL,
        max_tokens: maxTokens, temperature: 0.4,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`xAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return String(data.choices?.[0]?.message?.content || "").trim();
  }
  const msg = await anthropic.messages.create({
    model: process.env.CONSOLIDATE_MODEL || CLAUDE_MODEL, max_tokens: maxTokens, system,
    messages: [{ role: "user", content: user }],
  });
  return msg.content.filter(b => b.type === "text").map(b => b.text).join(" ").trim();
}

// Run one full agentic tick. reason: what woke it ('scheduled' | 'chat' | 'manual').
export async function runTick(reason = "scheduled") {
  state.tick++;
  if (!provider) {
    // demo mode: still show life on the HUD
    live.speak("running in demo mode — no brain key yet, but i'm warming up.", "GROKTIMUS");
    pushEvent("info", "tick skipped (no XAI_API_KEY / ANTHROPIC_API_KEY)");
    return;
  }

  const tools = await getTools((msg) => pushEvent("error", msg));
  const byName = Object.fromEntries(tools.map(t => [t.name, t]));

  const convo = [{
    role: "user",
    text: `${await recentSituation()}\n\nYou just woke up (${reason}). Handle the moment, then rest.`,
  }];

  pushEvent("think", `tick #${state.tick} (${reason})`);

  for (let s = 0; s < MAX_STEPS; s++) {
    let out;
    try {
      out = await step(buildSystem(), convo, tools);
    } catch (e) {
      pushEvent("error", `brain call failed: ${e.message}`);
      return;
    }

    if (out.text) pushEvent("act", out.text);
    if (!out.calls.length) return; // bot rested

    convo.push({ role: "assistant", text: out.text, calls: out.calls });
    const results = [];
    for (const c of out.calls) {
      const tool = byName[c.name];
      let res;
      try {
        if (!tool) throw new Error(`unknown tool ${c.name}`);
        res = await tool.run(c.input || {});
        pushEvent("tool", `${c.name}(${JSON.stringify(c.input || {}).slice(0, 120)})`);
      } catch (e) {
        res = { error: e.message };
        pushEvent("error", `${c.name}: ${e.message}`);
      }
      results.push({ id: c.id, name: c.name, output: JSON.stringify(res).slice(0, 4000) });
    }
    convo.push({ role: "results", results });
  }
  pushEvent("info", `tick #${state.tick} hit step cap (${MAX_STEPS})`);
}
