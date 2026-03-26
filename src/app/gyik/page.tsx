import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GYIK – Minden, amit a magyar podcastekről tudni érdemes | hallod.hu',
  description:
    'Legjobb magyar podcastek egy helyen. Mi az a podcast? Hogyan hallgatok podcastot? Letölthetem? Megtalálod a választ – és az összes magyar podcastet is.',
  openGraph: {
    title: 'GYIK – Magyar podcastek, egy helyen, felesleges hype nélkül',
    description:
      'Minden kérdésed a hallod.hu-val és a magyar podcastekkel kapcsolatban – érthetően, magyarul, tömören.',
    url: 'https://hallod.hu/gyik',
  },
};

const faqs = [
  {
    q: 'Mi az a hallod.hu?',
    a: 'A hallod.hu egy magyar podcast gyűjtő – egy hely, ahol megtalálod az összes érdemi magyar nyelvű podcastet. Nincs hírlevél-feliratkozási kényszer, nincs végtelen regisztrációs folyamat, nincs algoritmus, ami a leghangosabb tartalmat tolja az arcodba. Csak a műsorok. Keress, kattints, hallgass.',
  },
  {
    q: 'Mi az a podcast, podcast-ek és podcast-ok?',
    a: 'A podcast egy hangos műsor, amit mikor akarsz, ahol akarsz meghallgathatsz. Olyan, mint a rádió – csak te döntöd el, mikor indul és nem kell végighallgatnod a reklámokat. A "podcastek" és "podcastok" ugyanannak a szónak két elfogadott magyar többes száma, tehát mindkettő helyes. Találsz itt podcasteket politikáról, tudományról, pszichológiáról, komédiáról, sportról, gazdaságról – és mindenről, ami között.',
  },
  {
    q: 'Podkaszt vagy podkeszt? Hogy kell kiejteni magyarul?',
    a: 'Podkaszt. Az amerikaiak "pádkeszt"-et mondanak, az angolok viszont "podkaszt"-ot – és mivel a magyarban a hasonló jövevényszavak az angol ejtést követik (lásd: "bródkasztingot" mondunk, nem "bródkeszting"-et), a helyes magyar kiejtés: podkaszt. Szóval ha valaki podkesztnek mondja, nem baj – mindenki érti –, de a nyelvtanilag következetes változat a podkaszt.',
  },
  {
    q: 'Hol találom a legjobb magyar podcasteket?',
    a: 'Nos, éppen itt vagy. A hallod.hu célja, hogy az összes aktív magyar podcast elérhető legyen egy helyen – a nagyon jóktól a kísérleti fázisban lévő egyszemélyesekig. A platform nem rangsorol és nem ítélkezik: te döntöd el, mi a legjobb neked. Az "Aktuális kedvenceink" rovat azért létezik, mert valamit mégiscsak ki kellett emelni a kezdőlapra.',
  },
  {
    q: 'Ingyenes az oldal?',
    a: 'Igen. Teljesen. Nem kell fiók, nem kell kártya, nem kell semmit megadnod. Megnyitod, hallgatod, elmész. Ha mégis szeretnéd támogatni a projektet, a legjobb módja az, ha ajánlasz egy podcasternek, hogy tüntessen fel minket.',
  },
  {
    q: 'Le tudom tölteni a podcastokat offline hallgatáshoz?',
    a: 'Igen. Minden epizódnál ott van egy letöltés gomb. Ha barlangtúrára mész, vonatozol, repülsz, vagy csak nincs internet egy ideig – töltsd le előre és visz magaddal. Nem kell hozzá semmi extra alkalmazás, simán elmenti a telefonodra vagy a gépedre.',
  },
  {
    q: 'Hogyan kerülnek fel a podcastek az oldalra?',
    a: 'Az RSS feed alapján automatikusan frissülünk – ahogy a podcaster feltölt egy új epizódot, az néhány percen belül megjelenik nálunk is. Az új podcasteket manuálisan adjuk hozzá, a hallgatói ajánlások alapján. Ha hiányzik valami, jelezd lent az oldalon.',
  },
  {
    q: 'Miért nincs rajta az a podcast, amit keresek?',
    a: 'Valószínűleg még nem adtuk hozzá. A platform folyamatosan bővül – de azért még messze vagyunk a teljességtől. Az oldal alján tudsz podcastereket ajánlani: cím vagy RSS link alapján megnézzük és hozzáadjuk. Az elbírálás szempontja egyszerű: aktív legyen, és magyarul szóljon.',
  },
  {
    q: 'Van mobilalkalmazás?',
    a: 'Egyelőre nincs – de az oldal mobilon is teljesen jól működik, közvetlenül a böngészőből tudsz hallgatni és letölteni. Egy iOS és Android app tervben van, szóval ha ez fontos neked, kövesd az oldalt mert hamarosan jön.',
  },
  {
    q: 'Mikor frissülnek az epizódok?',
    a: 'Minden aktív podcastet félóránként ellenőrzünk. Az új epizód általában 15-30 percen belül megjelenik azután, hogy a podcaster publikálta. Néhány host lassabb szerveren tartja a feedjét, ott kivételesen késhet egy kicsit.',
  },
  {
    q: 'Ki csinálja ezt az oldalt?',
    a: 'Nyics Viktor – aki mellesleg maga is podcaster (Viclondonban). Az oldal egy személyes projekt, és szó szerint fejlesztés közben van: folyamatosan jönnek az új funkciók. Ha van javaslatod, ötleted, vagy csak szólnál valamit, az email cím a lábléc alján megtalálható.',
  },
];

export default function GyikPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-8 transition-colors"
        >
          ← Vissza a főoldalra
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
          Magyar podcastek – minden, amit tudni kell
        </h1>
        <p className="text-gray-500 mb-10 leading-relaxed">
          Végre egy podcast hub felesleges hype nélkül. Csak a jó műsorok, egy helyen.
          Az oldal még fejlesztés alatt van – de a lényeg már működik.
        </p>

        <div className="space-y-6">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">{q}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-100 rounded-xl p-6 text-sm text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-800 mb-1">Még nem találtad meg a kedvenc műsorod?</p>
          <p>
            Ajánlj podcastereket a lábléc ajánló mezőjében – cím vagy RSS link alapján megnézzük és hozzáadjuk.
            Az összes magyar podcast itt a helye.
          </p>
        </div>

      </div>
    </>
  );
}
