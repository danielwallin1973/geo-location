-- Schemainitialisering för geo-audio-databasen.
-- Körs automatiskt av postgis-imagen vid första uppstart.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pois (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                     TEXT NOT NULL,
    description              TEXT NOT NULL,
    -- Längre berättartext som läses upp. Faller tillbaka till description om NULL.
    narration                TEXT,
    -- Vi lagrar som geography(Point) → meter-baserade avstånd "out of the box".
    location                 geography(Point, 4326) NOT NULL,
    trigger_radius_meters    INTEGER NOT NULL DEFAULT 50 CHECK (trigger_radius_meters > 0),
    audio_url                TEXT NOT NULL,
    audio_duration_seconds   INTEGER,
    image_url                TEXT,
    category                 TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatialt index – avgörande för snabba "POI:er nära mig"-queries.
CREATE INDEX IF NOT EXISTS pois_location_gix ON pois USING GIST (location);

-- Några demo-POI:er i Stockholm så vi har något att klicka på direkt.
-- Audio-URLer pekar på public-mappen i web-appen (genereras av audio-scriptet).
INSERT INTO pois (name, description, narration, location, trigger_radius_meters, audio_url, category)
VALUES
  (
    'Stortorget, Gamla stan',
    'Stockholms äldsta torg, mitt i Gamla stan.',
    'Du står nu på Stortorget, Stockholms äldsta torg, beläget mitt i hjärtat av Gamla stan. Torget har varit en samlingsplats sedan medeltiden och det var här som Stockholms blodbad ägde rum i november år 1520, då den danske kungen Kristian den andre lät avrätta omkring åttio personer ur den svenska eliten. De färgglada husen runt torget vilar fortfarande på medeltida grunder och det smala röda huset, som kallas Schantzska huset, har en fasad från sextonhundratalet med åttiotvå vita stenar – en för varje halshuggen person enligt folktron, även om historikerna är oeniga. Gå runt torget och titta upp på fasaderna, så ser du hur arkitekturen berättar Stockholms historia.',
    ST_SetSRID(ST_MakePoint(18.0710, 59.3251), 4326)::geography,
    40,
    '/audio/stortorget.mp3',
    'historia'
  ),
  (
    'Skeppsholmsbron',
    'Gjutjärnsbro från 1861 mellan Blasieholmen och Skeppsholmen.',
    'Skeppsholmsbron som du nu står på byggdes år 1861 och förbinder Blasieholmen med ön Skeppsholmen. Bron är gjuten i järn med eleganta dekorationer och de gyllene kronorna på räckena är ett populärt fotomotiv. Men titta gärna ner på klipporna intill bron – berggrunden här består av urgammal gnejs, en av Sveriges äldsta bergarter, bildad för nästan två miljarder år sedan. Du kan se hur isen under den senaste istiden, för bara tiotusen år sedan, slipade hällarna släta. Skeppsholmen var länge militärt område och husar ännu idag flera av Stockholms finaste museer.',
    ST_SetSRID(ST_MakePoint(18.0826, 59.3275), 4326)::geography,
    60,
    '/audio/skeppsholmsbron.mp3',
    'geologi'
  ),
  (
    'Långholmen',
    'Ö med dramatisk istidsgeologi och tidigare fängelseö.',
    'Välkommen till Långholmen, en ö som bär tydliga spår av den senaste istiden. Om du tittar på berghällarna runt omkring dig kan du se långa, parallella räfflor – de kallas isräfflor och bildades när inlandsisen, flera kilometer tjock, långsamt rörde sig söderut och slipade berget med stenar som låg fastfrusna i isens botten. Ön består av samma urberg av granit och gnejs som resten av Stockholm. Långholmen har också en mörk historia: här låg Sveriges största fängelse mellan 1840 och 1975, och den sista avrättningen i Sverige genomfördes här år 1910. Idag är ön ett populärt rekreationsområde med klippbad och vandrarhem i de gamla fängelsebyggnaderna.',
    ST_SetSRID(ST_MakePoint(18.0327, 59.3197), 4326)::geography,
    80,
    '/audio/langholmen.mp3',
    'geologi'
  ),
  (
    'Mariatorget',
    'Lummigt torg på Södermalm, anlagt på 1700-talet.',
    'Du står nu vid Mariatorget, en av Södermalms vackraste platser. Torget anlades år 1759 och fick sitt namn efter den närliggande Maria Magdalena kyrka. I mitten av torget står Tors fiske, en bronsskulptur av Anders Wissler från 1903 som föreställer åskguden Tor i kamp mot Midgårdsormen. Husen runt torget är typiska för det sena artonhundratalets Stockholm, med praktfulla fasader i nyrenässans och nybarock. Under början av nittonhundratalet var Mariatorget centrum för svensk arbetarrörelse, och kulturpersonligheter som August Strindberg bodde i kvarteren runt omkring. Idag är torget en grön oas mitt i staden, omringad av kaféer och bokhandlare.',
    ST_SetSRID(ST_MakePoint(18.0648, 59.3175), 4326)::geography,
    50,
    '/audio/mariatorget.mp3',
    'historia'
  ),
  (
    'Maria Magdalena kyrka',
    'Barockkyrka från 1600-talet, skapad av Nicodemus Tessin d.ä.',
    'Framför dig reser sig Maria Magdalena kyrka, en av Stockholms äldsta bevarade kyrkor på Södermalm. Den ursprungliga kyrkan började byggas redan på 1580-talet, men det vi ser idag fick sin form efter en omfattande ombyggnad under Nicodemus Tessin den äldres ledning på 1620-talet. En förödande brand år 1759 förstörde stora delar, men kyrkan återuppbyggdes i barockstil. På kyrkogården vilar flera kända svenskar, bland annat skalden Lasse Lucidor som dödades i en duell år 1674, och författaren Erik Johan Stagnelius. Kyrkan har också en akustisk särprägel – orgelmusiken här klingar exceptionellt tack vare det höga tunnvalvet.',
    ST_SetSRID(ST_MakePoint(18.0640, 59.3186), 4326)::geography,
    40,
    '/audio/maria-magdalena.mp3',
    'historia'
  ),
  (
    'Bellmansgatan 1',
    'Adressen från Stieg Larssons Millennium-trilogi.',
    'Den här lilla gatan, Bellmansgatan, gjordes världsberömd av Stieg Larssons romaner om Lisbeth Salander och Mikael Blomkvist. Det är på Bellmansgatan ett, högst upp i hörnhuset, som journalisten Mikael Blomkvist har sin lägenhet i böckerna. Gatan i sig har en lång historia – den är uppkallad efter Carl Michael Bellman, Sveriges nationalskald som föddes på Södermalm år 1740. Bellman besjöng själv det här området i sina Fredmans epistlar, och om du går några kvarter söderut hittar du hans födelseplats. Den branta trappan som leder ner mot Mariahissen ger en av Stockholms finaste utsikter över Riddarfjärden.',
    ST_SetSRID(ST_MakePoint(18.0671, 59.3194), 4326)::geography,
    35,
    '/audio/bellmansgatan.mp3',
    'kultur'
  ),
  (
    'Åkerbyvägen 240, Täby',
    'Mitt i 1960-talets Täby – Storstugan, Tibble och framväxten av Täby Centrum.',
    'Du står nu på Åkerbyvägen i kommundelen Tibble, en gata som anlades på 1960-talet i samband med en av Sveriges mest ambitiösa förortsutbyggnader. Husen omkring dig är typexempel på det svenska miljonprogrammets modernism – de flesta uppförda runt 1965, då HSB byggde de stora bostadsrättsföreningarna Farmen och Storstugan. Storstugan, det svängda sjuttonvåningshuset alldeles intill Täby Centrum, var när det stod klart ett av Sveriges längsta bostadshus och blev en symbol för den nya tidens stadsplanering, där bostäder, arbete och handel skulle samlas i självförsörjande satellitstäder. Täby Centrum, som öppnade 1968, var ett av landets första moderna inomhusköpcentrum och drog besökare från hela norra Storstockholm. Området ramas in av de stora trafiklederna Stockholmsvägen och Bergtorpsvägen – tidstypiskt för en epok då bilen stod i centrum för stadsplaneringen. Idag har området förtätats och renoverats, och utvecklingen mot nya Täby Park visar hur den svenska förorten förvandlas på nytt, ett halvt sekel efter att Åkerbyvägen drogs fram över de gamla åkermarkerna som gett gatan dess namn.',
    ST_SetSRID(ST_MakePoint(18.0727983, 59.4501764), 4326)::geography,
    50,
    '/audio/akerbyvagen-taby.mp3',
    'historia'
  ),
  (
    'Skinnarviksberget',
    'Stockholms högsta naturpunkt med urgammal urbergsklippa.',
    'Du har just bestigit Skinnarviksberget, med sina 53 meter över havet en av Stockholms högsta naturliga utsiktspunkter. Klippan består av två miljarder år gammal gnejs, en av jordens äldsta bergarter, formad djupt nere i jordskorpan under enorma tryck och temperaturer. När du tittar ut över Riddarfjärden ser du ett landskap som höjs ur havet sedan istidens slut – fenomenet kallas landhöjning och Stockholmsregionen lyfter fortfarande ungefär en halv centimeter per år. För några tusen år sedan låg denna klippa under vatten, och Mälaren var en havsvik. Berget var länge en samlingsplats för skinnberedare, vilket gett platsen sitt namn. Idag är det en favoritplats för stockholmare som vill se solnedgången över Gamla stan.',
    ST_SetSRID(ST_MakePoint(18.0573, 59.3192), 4326)::geography,
    45,
    '/audio/skinnarviksberget.mp3',
    'geologi'
  ),
  {
    'Brännkyrkagatan',
  }
ON CONFLICT DO NOTHING;
