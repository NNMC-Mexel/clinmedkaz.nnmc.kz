// Payment landing content for the ClinMedKaz online scientific medical journal
// (published by NNMC, indexed in Scopus Q3). UI copy is trilingual RU / KK / EN.
// Requisites and the publication fee come from the public config (single source of truth).

export function getLandingContent(lang, config) {
  const b = config.business || {};
  const fee = config.publicationFeeDisplay || "300 USD";
  const email = b.supportEmail || "";
  const phone = b.supportPhone || "";

  const ru = {
    hero: {
      pill: "Рецензируемый научный медицинский журнал",
      title: "Оплата публикации в журнале",
      titleAccent: "ClinMedKaz",
      lead: "Платформа безопасной оплаты для авторов Journal of Clinical Medicine of Kazakhstan. Оплата доступна только по персональной ссылке после решения редакции.",
      primaryCta: "Оплатить статью",
      secondaryCta: "О журнале",
      scroll: "Узнать больше",
      card: {
        title: "Journal of Clinical Medicine of Kazakhstan",
        subtitle: "Online ISSN 2313-1519 · Print ISSN 1812-2892",
        features: [
          { title: "Индексация", text: "Scopus, DOAJ, CrossRef, Google Scholar, Index Copernicus" },
          { title: "Периодичность", text: "6 выпусков в год: февраль, апрель, июнь, август, октябрь, декабрь" },
          { title: "Подача рукописей", text: "Основная подача выполняется через официальный EditorialPark" },
        ],
        cta: "Оплатить статью",
      },
    },
    stats: [
      { value: "ISSN", label: "Online 2313-1519 · Print 1812-2892" },
      { value: "Scopus", label: "Международная индексация" },
      { value: "6", label: "Выпусков в год, публикации на английском" },
      { value: fee, label: "Стоимость публикации статьи" },
    ],
    about: {
      title: "О журнале",
      paragraphs: [
        `${b.name} является владельцем и издателем Journal of Clinical Medicine of Kazakhstan — международного рецензируемого медицинского журнала в области трансляционной и клинической медицины.`,
        "Основной сайт журнала: clinmedkaz.org. Подача рукописей выполняется через EditorialPark; эта платформа предназначена для оплаты по персональной ссылке администратора.",
      ],
      scopeTitle: "Официальные данные",
      scope: ["Online ISSN: 2313-1519", "Print ISSN: 1812-2892", "Индексация: Scopus, DOAJ, CrossRef, Google Scholar", "Периодичность: 6 выпусков в год", "Основной язык публикации: английский"],
    },
    officialLinks: {
      journal: "Основной сайт журнала",
      submission: "Подача через EditorialPark",
    },
    benefits: {
      title: "Почему авторы выбирают ClinMedKaz",
      items: [
        { title: "Индексация в Scopus (Q3)", text: "Ваша статья попадает в международную базу цитирования и учитывается в наукометрических показателях." },
        { title: "Честное рецензирование", text: "Двойное слепое рецензирование профильными экспертами и объективная оценка научной новизны." },
        { title: "DOI и открытый доступ", text: "Каждой статье присваивается DOI, публикация доступна читателям без платного барьера." },
        { title: "Английский формат", text: "С 2020 года регулярные выпуски журнала публикуются на английском языке." },
        { title: "Прозрачные сроки", text: "Понятный процесс от подачи до публикации с обратной связью на каждом этапе." },
        { title: "Поддержка авторов", text: "Редакция сопровождает автора по вопросам оформления, оплаты и публикации." },
      ],
    },
    process: {
      title: "Как опубликоваться",
      steps: [
        { title: "Подача рукописи", text: "Автор направляет статью в редакцию по требованиям журнала." },
        { title: "Рецензирование", text: "Статья проходит двойное слепое рецензирование и редакционную оценку." },
        { title: "Принятие и оплата", text: "После принятия редакция присылает персональную ссылку на оплату публикации." },
        { title: "Публикация", text: "Статье присваивается DOI, она выходит в открытом доступе и индексируется в Scopus." },
      ],
    },
    pricing: {
      title: "Стоимость публикации",
      lead: `Организационный взнос за редакционно-издательскую подготовку и публикацию одной статьи — ${fee}. Для резидентов Республики Казахстан оплата производится в тенге.`,
      note: "Оплата возможна только после принятия статьи, по персональной ссылке от редакции. Прямая оплата с сайта без приглашения не производится.",
      cta: "Подробнее об услуге",
    },
    cta: {
      title: "Готовы опубликовать исследование?",
      text: "Свяжитесь с редакцией — расскажем о требованиях к рукописи и сроках рассмотрения.",
      button: "Написать в редакцию",
      subject: "Подача статьи в ClinMedKaz",
      email,
      phone,
    },
  };

  const kk = {
    hero: {
      pill: "Рецензияланатын ғылыми медициналық журнал",
      title: "Мақаланы жариялау ақысын төлеу —",
      titleAccent: "ClinMedKaz",
      lead: "Journal of Clinical Medicine of Kazakhstan авторларына арналған қауіпсіз төлем платформасы. Төлем редакция шешімінен кейін жеке сілтеме арқылы ғана қолжетімді.",
      primaryCta: "Мақаланы төлеу",
      secondaryCta: "Журнал туралы",
      scroll: "Толығырақ",
      card: {
        title: "Journal of Clinical Medicine of Kazakhstan",
        subtitle: "Online ISSN 2313-1519 · Print ISSN 1812-2892",
        features: [
          { title: "Индекстеу", text: "Scopus, DOAJ, CrossRef, Google Scholar, Index Copernicus" },
          { title: "Жиілігі", text: "Жылына 6 шығарылым: ақпан, сәуір, маусым, тамыз, қазан, желтоқсан" },
          { title: "Қолжазба жіберу", text: "Негізгі жіберу ресми EditorialPark арқылы орындалады" },
        ],
        cta: "Мақаланы төлеу",
      },
    },
    stats: [
      { value: "ISSN", label: "Online 2313-1519 · Print 1812-2892" },
      { value: "Scopus", label: "Халықаралық индекстеу" },
      { value: "6", label: "Жылына шығарылым, жарияланым тілі ағылшын" },
      { value: fee, label: "Мақаланы жариялау құны" },
    ],
    about: {
      title: "Журнал туралы",
      paragraphs: [
        `${b.name} Journal of Clinical Medicine of Kazakhstan журналының иесі және баспагері болып табылады. Бұл трансляциялық және клиникалық медицина саласындағы халықаралық рецензияланатын медициналық журнал.`,
        "Журналдың негізгі сайты: clinmedkaz.org. Қолжазбалар EditorialPark арқылы жіберіледі; бұл платформа әкімші жіберген жеке сілтеме бойынша төлем жасауға арналған.",
      ],
      scopeTitle: "Ресми деректер",
      scope: ["Online ISSN: 2313-1519", "Print ISSN: 1812-2892", "Индекстеу: Scopus, DOAJ, CrossRef, Google Scholar", "Жиілігі: жылына 6 шығарылым", "Негізгі жарияланым тілі: ағылшын"],
    },
    officialLinks: {
      journal: "Журналдың негізгі сайты",
      submission: "EditorialPark арқылы жіберу",
    },
    benefits: {
      title: "Авторлар ClinMedKaz-ты неге таңдайды",
      items: [
        { title: "Scopus-та индекстеу (Q3)", text: "Мақалаңыз халықаралық дәйексөз базасына түсіп, наукометриялық көрсеткіштерде ескеріледі." },
        { title: "Әділ рецензиялау", text: "Бейінді сарапшылардың қос жасырын рецензиясы және ғылыми жаңалықты объективті бағалау." },
        { title: "DOI және ашық қолжетімділік", text: "Әр мақалаға DOI беріледі, жарияланым оқырмандарға ақысыз қолжетімді." },
        { title: "Ағылшын форматы", text: "2020 жылдан бастап журналдың тұрақты шығарылымдары ағылшын тілінде жарияланады." },
        { title: "Айқын мерзімдер", text: "Берілуден жариялауға дейінгі түсінікті процесс, әр кезеңде кері байланыс." },
        { title: "Авторларға қолдау", text: "Редакция авторды рәсімдеу, төлем және жариялау мәселелері бойынша сүйемелдейді." },
      ],
    },
    process: {
      title: "Қалай жариялауға болады",
      steps: [
        { title: "Қолжазба беру", text: "Автор мақаланы журнал талаптары бойынша редакцияға жібереді." },
        { title: "Рецензиялау", text: "Мақала қос жасырын рецензиядан және редакциялық бағалаудан өтеді." },
        { title: "Қабылдау және төлем", text: "Қабылданғаннан кейін редакция жариялау төлеміне жеке сілтеме жібереді." },
        { title: "Жариялау", text: "Мақалаға DOI беріледі, ол ашық қолжетімділікте шығып, Scopus-та индекстеледі." },
      ],
    },
    pricing: {
      title: "Жариялау құны",
      lead: `Бір мақаланы редакциялық-баспалық дайындау және жариялау үшін ұйымдастыру жарнасы — ${fee}. Қазақстан Республикасының резиденттері теңгемен төлейді.`,
      note: "Төлем тек мақала қабылданғаннан кейін, редакцияның жеке сілтемесі арқылы жүргізіледі. Шақыртусыз сайттан тікелей төлем жасалмайды.",
      cta: "Қызмет туралы толығырақ",
    },
    cta: {
      title: "Зерттеуіңізді жариялауға дайынсыз ба?",
      text: "Редакциямен байланысыңыз — қолжазба талаптары мен қарау мерзімдері туралы айтамыз.",
      button: "Редакцияға жазу",
      subject: "ClinMedKaz-қа мақала беру",
      email,
      phone,
    },
  };

  const en = {
    hero: {
      pill: "Peer-reviewed scientific medical journal",
      title: "Article publication payment for",
      titleAccent: "ClinMedKaz",
      lead: "A secure payment platform for authors of the Journal of Clinical Medicine of Kazakhstan. Payment is available only through a personal link after editorial approval.",
      primaryCta: "Pay for article",
      secondaryCta: "About the journal",
      scroll: "Learn more",
      card: {
        title: "Journal of Clinical Medicine of Kazakhstan",
        subtitle: "Online ISSN 2313-1519 · Print ISSN 1812-2892",
        features: [
          { title: "Indexing", text: "Scopus, DOAJ, CrossRef, Google Scholar, Index Copernicus" },
          { title: "Publication schedule", text: "6 issues per year: February, April, June, August, October and December" },
          { title: "Submission", text: "Manuscripts are submitted through the official EditorialPark system" },
        ],
        cta: "Pay for article",
      },
    },
    stats: [
      { value: "ISSN", label: "Online 2313-1519 · Print 1812-2892" },
      { value: "Scopus", label: "International indexing" },
      { value: "6", label: "Issues per year, English publications" },
      { value: fee, label: "Article publication fee" },
    ],
    about: {
      title: "About the journal",
      paragraphs: [
        `${b.name} is the owner and publisher of the Journal of Clinical Medicine of Kazakhstan, an international peer-reviewed medical journal in translational and clinical medicine.`,
        "The main journal website is clinmedkaz.org. Manuscripts are submitted through EditorialPark; this platform is intended for payment by a personal administrator link.",
      ],
      scopeTitle: "Official details",
      scope: ["Online ISSN: 2313-1519", "Print ISSN: 1812-2892", "Indexing: Scopus, DOAJ, CrossRef, Google Scholar", "Schedule: 6 issues per year", "Primary publication language: English"],
    },
    officialLinks: {
      journal: "Official journal website",
      submission: "Submit via EditorialPark",
    },
    benefits: {
      title: "Why authors choose ClinMedKaz",
      items: [
        { title: "Indexed in Scopus (Q3)", text: "Your article enters the international citation database and counts toward scientometric metrics." },
        { title: "Fair peer review", text: "Double-blind review by subject experts and an objective assessment of scientific novelty." },
        { title: "DOI and open access", text: "Every article receives a DOI and is available to readers with no paywall." },
        { title: "English format", text: "Since 2020, regular journal issues have been published in English." },
        { title: "Transparent timelines", text: "A clear process from submission to publication with feedback at every stage." },
        { title: "Author support", text: "The editorial office guides authors on formatting, payment and publication." },
      ],
    },
    process: {
      title: "How to get published",
      steps: [
        { title: "Manuscript submission", text: "The author submits the article to the editorial office per the journal's requirements." },
        { title: "Peer review", text: "The article undergoes double-blind review and editorial assessment." },
        { title: "Acceptance and payment", text: "Once accepted, the editorial office sends a personal link to pay for publication." },
        { title: "Publication", text: "The article gets a DOI, is published open access and indexed in Scopus." },
      ],
    },
    pricing: {
      title: "Publication fee",
      lead: `The processing fee for editorial preparation and publication of one article is ${fee}. Residents of Kazakhstan pay in tenge.`,
      note: "Payment is only possible after the article is accepted, via a personal link from the editorial office. Direct payment from the site without an invitation is not available.",
      cta: "More about the service",
    },
    cta: {
      title: "Ready to publish your research?",
      text: "Contact the editorial office — we'll explain the manuscript requirements and review timelines.",
      button: "Email the editorial office",
      subject: "Article submission to ClinMedKaz",
      email,
      phone,
    },
  };

  return { ru, kk, en }[lang] || ru;
}
