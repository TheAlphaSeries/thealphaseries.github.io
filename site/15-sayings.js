/* ==========================================================================
   14d. THE DAY'S SAYING
   One saying a day, the same for every visitor, chosen by the date in San
   Francisco. They are written in the manner of the grave maxims that head
   the chapters of old desert epics, as they might be set down under a dying
   sun. To add one, add a line; to change who is quoted, edit SOURCES.
   ========================================================================== */
const SAYINGS_OF_THE_DAY = [
  "He who plans for a thousand years must first arrange to be remembered for a week.",
  "The sun is old and cannot be hurried. Take your example from it and be late with dignity.",
  "A prophecy is a debt drawn on the future. Note who is asked to pay.",
  "There is no escape from the tax collector; there is only a longer road, and he owns the road.",
  "Do not ask what a magician wants. Ask what he has already taken, and whether you will miss it.",
  "Water remembers every vessel it has left. So do creditors.",
  "The patient man inherits what the hasty man has broken.",
  "To know a city, learn what it charges strangers for water.",
  "Every empire believes itself the last. One of them will be right, and it will be no comfort.",
  "Power is the art of being elsewhere when the bill arrives.",
  "The wise fear three things: the sea at night, the sun at noon, and a favour from a prince.",
  "A plan that cannot survive a bad dinner will not survive a war.",
  "He who would rule the fish must first learn to wait like the heron and lie like the angler.",
  "The desert teaches thrift. The marsh teaches patience. The city teaches both, at a price.",
  "No oath outlives the man who profits from breaking it.",
  "Count the exits before you count the silver.",
  "The future is a country from which no traveller has sent a reliable map.",
  "It is not the long night one should fear, but the short day, which gives so little time to prepare for it.",
  "A secret shared with one is a rumour; shared with two, a policy.",
  "Those who say the sun will go out tomorrow have been saying so for an age, and have done well by it.",
  "Discipline is remembering what you want when you are offered what you like.",
  "The strong take what they can. The clever take what will not be missed. The wise take notes.",
  "When the great houses quarrel, the price of bread is the first to be informed.",
  "A man is known by the quality of his enemies and the patience of his landlord.",
  "Prophets are plentiful in a dry season.",
  "He who controls the ferry need not own either bank.",
  "The eye sees what the purse expects.",
  "Any road will do for a man fleeing; only one will do for a man arriving.",
  "Of all weapons, the calendar is the slowest and the surest.",
  "To be feared is expensive. To be underestimated costs nothing and pays for years.",
  "The dying sun still casts a shadow. Stand in it accordingly.",
  "A wise ruler listens to every counsellor and then asks the cook.",
  "What the old call wisdom is largely a record of what did not kill them.",
  "Bargain as though the world will last; pay as though it will not.",
  "The man who cannot be bought has usually not been asked by the right buyer.",
  "There are no ancient mysteries, only filing errors of great antiquity.",
  "Trust the map for distance, the guide for danger, and neither for the price.",
  "He who speaks of destiny is about to ask you for something.",
  "A long view is a fine thing, provided one is not standing in the road to take it.",
  "The first rule of the deep places: whatever is glowing has a reason.",
  "Mercy is cheapest before the battle and dearest after it.",
  "A garden is a war fought slowly, and the weeds have the better generals.",
  "No tyranny is so complete that it has thought of everything; no rebellion so pure that it has thought of anything.",
  "That which is written endures. This is why so little is written honestly.",
  "The fish that is caught was the one that was certain.",
  "To study the ancients is to learn that they also studied the ancients, and were also disappointed.",
  "A full purse makes many friends and no witnesses.",
  "Patience is not waiting. Patience is waiting without telling everyone.",
  "The mind tires before the legs. Give it the lighter pack.",
  "He who wakes the sleeper must be ready to make breakfast.",
  "All roads lead somewhere. This is the whole of geography and most of regret.",
  "In the last days, as in the first, someone will be selling charms against them.",
  "One does not conquer the waste. One is tolerated by it, for a season, at a cost.",
  "A threat is a promise made by a man short of funds.",
  "The house that plans for generations is undone by a nephew.",
  "Never mistake the end of your patience for the end of the matter.",
  "The heavens are indifferent, which is more than can be said for the neighbours.",
  "He who knows the hour of his death is merely punctual. He who knows the hour of yours is to be watched.",
  "Three things cannot be recalled: the spoken word, the loosed arrow, and the deposit.",
  "Great changes arrive quietly, like damp.",
  "The dark does not hide dangers. It merely declines to announce them.",
  "A people is governed by its fears and taxed on its hopes.",
  "Say little at court, less at table, and nothing on the stairs.",
  "The sun's last light will fall on someone arguing about whose turn it was.",
  "Knowledge is a lamp. Mind who you let stand behind you while you hold it.",
  "It is easier to found a religion than to get a straight answer from one.",
  "The ambitious climb. The wise find out first what is kept at the top.",
  "A river does not argue with the mountain. It simply arranges to be elsewhere, and the mountain is smaller for it.",
  "Do not despise small beginnings; most disasters had one.",
  "When a wizard says the matter is simple, pack for a long journey.",
  "The longest reign is that of the man nobody thought to depose.",
  "Hope is a good breakfast and a poor supper. Under this sun, eat early.",
  "Every wall was built by someone who had met the neighbours.",
  "Beware the man with one book, and the man with a thousand who has read the last page of each.",
  "The hunter and the hunted both rise early. Only one of them calls it a virtue.",
  "To see the future clearly is a curse. To see it dimly is a profession.",
  "A crown is a hat that lets the rain in.",
  "What cannot be mended must be described as intended.",
  "The stars keep their appointments. It is the sun one worries about.",
  "Respect the old magic. It has had longer to go wrong.",
  "There is a time to speak and a time to be thought profound.",
  "The last coin spends the same as the first, and is watched more closely.",
  "Whoever said the journey matters more than the arrival had not yet paid for the journey.",
  "At the world's end, as at any inn, settle up before you are asked."];
const SOURCES = ["the Sayings of the Later Aeons", "A Child's Primer of the Red Sun", "the Table-Talk of the Keeper", "Maxims for the Conduct of the Last Days", "the Manual of the Prudent Traveller", "a wall at the customs house at Embry Gap",
  "the Collected Regrets of a Minor Magician", "the Ferryman's Catechism", "Conversations Overheard at the Halt of Seven Scales", "the Angler's Breviary", "the Ninth Book of Sensible Fears", "a tax assessor, in confidence",
  "the Reflections of One Who Left Early", "Proverbs of the Fog Farms", "the Margins of a Borrowed Almanac", "On Empire, and Other Seasonal Complaints", "the Commonplace Book of an Unlicensed Prophet"];
/* the hour, the day and the month in San Francisco, where the keeper is: everyone sees his sky and his saying, whatever their own clock says */
function keeperTime() {
  const asked = /[?&]sky=(\d{1,2})(?:[.,](\d{1,2}))?/.exec(location.search);   /* add ?sky=7 or ?sky=19,12 (hour, month) to the address to see another hour or season */
  let h = 12, month = 6, dayNo = Math.floor(Date.now() / 864e5);
  try { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    h = (+p.hour % 24) + +p.minute / 60; month = +p.month; dayNo = Math.floor(Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5); } catch (e) {}
  if (asked) { h = Math.min(23.9, +asked[1]); if (asked[2]) month = Math.min(12, Math.max(1, +asked[2])); }
  return { h, month, dayNo, season: month === 12 || month < 3 ? "winter" : month < 6 ? "spring" : month < 9 ? "summer" : "autumn" };
}
function sayingOfTheDay() {
  const { dayNo } = keeperTime(), n = SAYINGS_OF_THE_DAY.length, m = SOURCES.length;
  return { words: SAYINGS_OF_THE_DAY[(((dayNo * 37) % n) + n) % n], from: SOURCES[(((dayNo * 11) % m) + m) % m] };   /* stepping by 37 and 11 walks through every saying and source before any repeats */
}
function showSaying() {
  const s = sayingOfTheDay(), box = el("blockquote", "saying");
  box.append(el("p", "sayhead", "The day's saying"), el("p", "saywords", s.words), el("p", "sayfrom", "from " + s.from));
  main.append(box);
}
/* ---- Encounters: now and then, as an entry is opened, someone passes on the road and says a word ---- */
const PASSING = { Wanderer: "I have been where you are going. Take a hat.", Knight: "I am sworn to defend this road. It has not thanked me.", Mage: "Do not read that aloud. I say this to everyone, and it is occasionally important.",
  Rogue: "Whatever is missing, I was elsewhere, with witnesses.", Ranger: "Something large passed this way. I chose not to learn more.", Cleric: "Blessings upon you. A small offering is customary and, today, urgent.",
  Bard: "I am composing a song of your deeds. It is short, so far.", Alchemist: "If you smell almonds, we were never introduced.", Angler: "They are not biting. They are merely watching.", Lamplighter: "It gets dark earlier than it used to. I have raised this with no one, to no effect.",
  Porter: "Do not ask what is in the box. I did not, and I sleep well.", Cartographer: "This road is not on my map, which is the road's error.", Cook: "It is stew. That is all the law requires me to say.", Boatman: "The far bank is no better, but I am paid by the crossing.",
  Monk: "I have taken a vow of silence. This is the exception.", Berserker: "I am in a perfectly good mood. Tell the others.", Necromancer: "The dead send their regards, and one complaint about the noise.", Merchant: "For you, a special price. It is higher.",
  Gardener: "Everything grows toward the light, which is why I worry.", Smith: "I can mend that. I did not say well.", Paladin: "I seek the wicked. You may go.", Witch: "The curse is free. The removing of it is where I earn.", Duelist: "You looked at my hat. I shall let it pass, this once.", Hermit: "I came out for salt. I am already regretting the conversation." };
const PASSING_ANY = ["The keeper writes it all down, you know. Mind what you do near him.", "Fine weather, for the end of the world.", "I read that entry. I have notes.", "Have you seen a fish about so long? It owes me.", "Keep to the road. The road is merely dull.",
  "They say the sun has a few good years in it. They are selling something.", "I was told there would be an inn.", "If anyone asks, I went the other way."];
let opened = 0, encounterTimer = null;
function encounter(force) {
  opened++; if (typeof conjure !== "function" || (!force && (opened < 2 || Math.random() > .3))) return;
  const old = reader.querySelector(".encounter"); if (old) old.remove(); clearTimeout(encounterTimer);
  const seed = Math.floor(Math.random() * 2147483646) + 1, f = conjure(seed), box = el("button", "encounter win"), pic = el("canvas", "fellowpic"), words = el("span", "ewords");
  box.type = "button"; pic.setAttribute("aria-hidden", "true"); pic.width = FW; pic.height = FH; pic.getContext("2d").putImageData(new ImageData(f.pixels, FW, FH), 0, 0);
  const here = current && current.place ? current.place : "", lvl = tally().level, kname = STATUS.name || "the keeper";   /* some strangers know where you are reading about, and of whom */
  const knowing = [here ? "I was at " + here + " once. It was not as described." : "", here ? "They still speak of " + kname + " at " + here + ". Not warmly, but at length." : "", current ? "I have read \u201c" + current.title + "\u201d. I was promised it would be shorter." : "",
    kname + " is level " + lvl + " now, I hear. He was level " + Math.max(1, lvl - 1) + " when I knew him, and no better company.", "The day's saying was \u201c" + sayingOfTheDay().words.split(" ").slice(0, 6).join(" ") + "...\u201d I did not stay for the rest."].filter(Boolean);
  const line = Math.random() < .35 ? knowing[Math.floor(Math.random() * knowing.length)] : Math.random() < .7 && owns(PASSING, f.calling) ? PASSING[f.calling] : PASSING_ANY[Math.floor(Math.random() * PASSING_ANY.length)];
  words.append(el("span", "ewho", (/^[AEIOU]/.test(f.kind) ? "An " : "A ") + f.title + " passes on the road."), el("span", "esays", "“" + line + "”"));
  box.append(pic, words); box.setAttribute("aria-label", words.textContent + " Dismiss"); box.addEventListener("click", () => box.remove());
  reader.append(box); encounterTimer = setTimeout(() => box.remove(), 11000);
}
