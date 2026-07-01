// Marketing landing content for the ClinMedKaz online scientific medical journal
// (published by NNMC, indexed in Scopus Q3). Trilingual RU / KK / EN.
// Requisites and the publication fee come from the public config (single source of truth).

export function getLandingContent(lang, config) {
  const b = config.business || {};
  const fee = config.publicationFeeDisplay || "300 USD";
  const email = b.supportEmail || "";
  const phone = b.supportPhone || "";

  const ru = {
    hero: {
      pill: "Рецензируемый научный медицинский журнал",
      title: "Публикуйте исследования в журнале",
      titleAccent: "ClinMedKaz",
      lead: "Международный рецензируемый журнал Национального научного медицинского центра (ННМЦ). Оригинальные исследования, клинические наблюдения и обзоры по медицине. Индексация в Scopus — квартиль Q3.",
      primaryCta: "Подать статью",
      secondaryCta: "О журнале",
      scroll: "Узнать больше",
      card: {
        title: "Публикация статьи",
        subtitle: "Международный научный журнал",
        features: [
          { title: "Индексация в Scopus", text: "Квартиль Q3, международная база цитирования" },
          { title: "Рецензирование и DOI", text: "Двойное слепое рецензирование, DOI каждой статье" },
          { title: "Открытый доступ", text: "Полные тексты доступны читателям бесплатно" },
        ],
        cta: "Подать статью",
      },
    },
    stats: [
      { value: "Q3", label: "Квартиль в Scopus" },
      { value: "Scopus", label: "Международная индексация" },
      { value: "3", label: "Языка публикации: KZ · RU · EN" },
      { value: fee, label: "Стоимость публикации статьи" },
    ],
    about: {
      title: "О журнале",
      paragraphs: [
        `${b.name} издаёт научный журнал ClinMedKaz — площадку для публикации результатов клинических и экспериментальных исследований в области медицины и здравоохранения.`,
        "Журнал придерживается принципов научной этики (COPE), двойного слепого рецензирования и открытого доступа: полные тексты статей доступны читателям по всему миру бесплатно.",
      ],
      scopeTitle: "Тематика",
      scope: ["Клиническая медицина", "Хирургия и трансплантология", "Кардиология и онкология", "Общественное здоровье", "Экспериментальная и трансляционная медицина"],
    },
    benefits: {
      title: "Почему авторы выбирают ClinMedKaz",
      items: [
        { title: "Индексация в Scopus (Q3)", text: "Ваша статья попадает в международную базу цитирования и учитывается в наукометрических показателях." },
        { title: "Честное рецензирование", text: "Двойное слепое рецензирование профильными экспертами и объективная оценка научной новизны." },
        { title: "DOI и открытый доступ", text: "Каждой статье присваивается DOI, публикация доступна читателям без платного барьера." },
        { title: "Три языка", text: "Принимаем рукописи на казахском, русском и английском языках." },
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
      title: "Ғылыми зерттеулерді жариялаңыз —",
      titleAccent: "ClinMedKaz",
      lead: "Ұлттық ғылыми медициналық орталықтың (ҰҒМО) халықаралық рецензияланатын журналы. Медицина бойынша түпнұсқа зерттеулер, клиникалық бақылаулар мен шолулар. Scopus-та индекстеу — Q3 квартилі.",
      primaryCta: "Мақала жіберу",
      secondaryCta: "Журнал туралы",
      scroll: "Толығырақ",
      card: {
        title: "Мақаланы жариялау",
        subtitle: "Халықаралық ғылыми журнал",
        features: [
          { title: "Scopus-та индекстеу", text: "Q3 квартилі, халықаралық дәйексөз базасы" },
          { title: "Рецензиялау және DOI", text: "Қос жасырын рецензиялау, әр мақалаға DOI" },
          { title: "Ашық қолжетімділік", text: "Толық мәтіндер оқырмандарға тегін қолжетімді" },
        ],
        cta: "Мақала жіберу",
      },
    },
    stats: [
      { value: "Q3", label: "Scopus квартилі" },
      { value: "Scopus", label: "Халықаралық индекстеу" },
      { value: "3", label: "Жариялау тілі: KZ · RU · EN" },
      { value: fee, label: "Мақаланы жариялау құны" },
    ],
    about: {
      title: "Журнал туралы",
      paragraphs: [
        `${b.name} ClinMedKaz ғылыми журналын шығарады — медицина және денсаулық сақтау саласындағы клиникалық және эксперименттік зерттеу нәтижелерін жариялау алаңы.`,
        "Журнал ғылыми этика (COPE) қағидаттарын, қос жасырын рецензиялауды және ашық қолжетімділікті ұстанады: мақалалардың толық мәтіні әлем оқырмандарына тегін қолжетімді.",
      ],
      scopeTitle: "Тақырыптама",
      scope: ["Клиникалық медицина", "Хирургия және трансплантология", "Кардиология және онкология", "Қоғамдық денсаулық", "Эксперименттік және трансляциялық медицина"],
    },
    benefits: {
      title: "Авторлар ClinMedKaz-ты неге таңдайды",
      items: [
        { title: "Scopus-та индекстеу (Q3)", text: "Мақалаңыз халықаралық дәйексөз базасына түсіп, наукометриялық көрсеткіштерде ескеріледі." },
        { title: "Әділ рецензиялау", text: "Бейінді сарапшылардың қос жасырын рецензиясы және ғылыми жаңалықты объективті бағалау." },
        { title: "DOI және ашық қолжетімділік", text: "Әр мақалаға DOI беріледі, жарияланым оқырмандарға ақысыз қолжетімді." },
        { title: "Үш тіл", text: "Қолжазбаларды қазақ, орыс және ағылшын тілдерінде қабылдаймыз." },
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
      title: "Publish your research in",
      titleAccent: "ClinMedKaz",
      lead: "An international peer-reviewed journal of the National Scientific Medical Center (NNMC). Original research, clinical cases and reviews in medicine. Indexed in Scopus — Q3 quartile.",
      primaryCta: "Submit an article",
      secondaryCta: "About the journal",
      scroll: "Learn more",
      card: {
        title: "Article publication",
        subtitle: "International scientific journal",
        features: [
          { title: "Indexed in Scopus", text: "Q3 quartile, international citation database" },
          { title: "Peer review & DOI", text: "Double-blind review, a DOI for every article" },
          { title: "Open access", text: "Full texts available to readers free of charge" },
        ],
        cta: "Submit an article",
      },
    },
    stats: [
      { value: "Q3", label: "Scopus quartile" },
      { value: "Scopus", label: "International indexing" },
      { value: "3", label: "Languages: KZ · RU · EN" },
      { value: fee, label: "Article publication fee" },
    ],
    about: {
      title: "About the journal",
      paragraphs: [
        `${b.name} publishes the ClinMedKaz scientific journal — a venue for clinical and experimental research in medicine and public health.`,
        "The journal follows research-ethics principles (COPE), double-blind peer review and open access: full texts are available to readers worldwide free of charge.",
      ],
      scopeTitle: "Scope",
      scope: ["Clinical medicine", "Surgery and transplantology", "Cardiology and oncology", "Public health", "Experimental and translational medicine"],
    },
    benefits: {
      title: "Why authors choose ClinMedKaz",
      items: [
        { title: "Indexed in Scopus (Q3)", text: "Your article enters the international citation database and counts toward scientometric metrics." },
        { title: "Fair peer review", text: "Double-blind review by subject experts and an objective assessment of scientific novelty." },
        { title: "DOI and open access", text: "Every article receives a DOI and is available to readers with no paywall." },
        { title: "Three languages", text: "We accept manuscripts in Kazakh, Russian and English." },
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
